// cdp.js — Raw CDP WebSocket client (Node 22+ built-in WebSocket, zero deps)
// Replaces puppeteer-core for Chrome DevTools Protocol communication.

const { spawn } = require('child_process');

let msgId = 0;

/**
 * Connect to a Chrome DevTools Protocol WebSocket endpoint.
 * @param {string} wsUrl - The DevTools WebSocket URL (ws://...)
 * @returns {Promise<{ws: WebSocket, send: Function, on: Function, close: Function}>}
 */
function connectCDP(wsUrl) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(wsUrl);
    const pending = new Map();
    const listeners = new Map();

    const cdp = {
      ws,

      /**
       * Send a CDP command and wait for the result.
       * @param {string} method - CDP method (e.g. 'Page.navigate')
       * @param {object} params - Method parameters
       * @param {string} [sessionId] - Optional session ID for target-scoped commands
       * @returns {Promise<object>}
       */
      send(method, params = {}, sessionId) {
        return new Promise((res, rej) => {
          const id = ++msgId;
          pending.set(id, { resolve: res, reject: rej });
          const msg = { id, method, params };
          if (sessionId) msg.sessionId = sessionId;
          ws.send(JSON.stringify(msg));
        });
      },

      /**
       * Register a listener for a CDP event.
       * @param {string} event - Event name (e.g. 'Runtime.bindingCalled', 'close')
       * @param {Function} fn - Callback
       */
      on(event, fn) {
        if (!listeners.has(event)) listeners.set(event, []);
        listeners.get(event).push(fn);
      },

      /** Close the WebSocket connection. */
      close() {
        ws.close();
      }
    };

    ws.addEventListener('open', () => resolve(cdp));
    ws.addEventListener('error', () => reject(new Error('CDP WebSocket error')));

    ws.addEventListener('message', (evt) => {
      const msg = JSON.parse(evt.data);
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(msg.error.message));
        else p.resolve(msg.result || {});
      } else if (msg.method) {
        const fns = listeners.get(msg.method) || [];
        fns.forEach(fn => fn(msg.params || {}));
      }
    });

    ws.addEventListener('close', () => {
      const fns = listeners.get('close') || [];
      fns.forEach(fn => fn());
    });
  });
}

/**
 * Launch Chrome with the given args and parse the DevTools WebSocket URL from stderr.
 * @param {string} chromePath - Path to the Chrome binary
 * @param {string[]} args - Chrome launch arguments
 * @returns {Promise<{proc: ChildProcess, wsUrl: string}>}
 */
function launchChrome(chromePath, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(chromePath, args, { stdio: ['pipe', 'pipe', 'pipe'] });
    let resolved = false;
    let stderrBuf = '';

    proc.stderr.on('data', (chunk) => {
      stderrBuf += chunk.toString();
      const match = stderrBuf.match(/DevTools listening on (ws:\/\/[^\s]+)/);
      if (match && !resolved) {
        resolved = true;
        resolve({ proc, wsUrl: match[1] });
      }
    });

    proc.on('error', (err) => {
      if (!resolved) { resolved = true; reject(err); }
    });

    proc.on('exit', (code) => {
      if (!resolved) {
        resolved = true;
        reject(new Error('Chrome exited with code ' + code));
      }
    });

    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        proc.kill();
        reject(new Error('Chrome launch timeout'));
      }
    }, 15000);
  });
}

module.exports = { connectCDP, launchChrome };
