#!/usr/bin/env node
// recorder.js — Raw CDP browser recorder with glassmorphism toolbar,
// fabric.js annotation canvas, HUD overlays, and post-recording dialog.
// Usage: node recorder.js <url> <output-path> <chrome-path> [viewport]

const { launchChrome, connectCDP } = require('./cdp');
const path = require('path');
const fs = require('fs');

const url = process.argv[2];
const outputPath = process.argv[3];
const chromePath = process.argv[4];
const viewport = process.argv[5] || '1280x720';
const [vpWidth, vpHeight] = viewport.split('x').map(Number);
const STRIP_HEIGHT = 60;

if (!url || !outputPath || !chromePath) {
  process.stderr.write('Usage: node recorder.js <url> <output-path> <chrome-path> [viewport]\n');
  process.exit(1);
}

(async () => {
  let chromeProc;
  let cdp;
  let recordingState = 'idle'; // idle | recording | paused | stopped
  // Fresh temp profile per session — no history, no restore dialog
  const tmpProfile = path.join(require('os').tmpdir(), `helix-chrome-${Date.now()}`);

  // ── Cleanup ──────────────────────────────────────────────────────────
  let cleaningUp = false;
  const cleanup = async () => {
    if (cleaningUp) return;
    cleaningUp = true;
    // Step 1: Ask Chrome to close itself via CDP (initiates orderly shutdown)
    if (cdp) {
      try { await cdp.send('Browser.close'); } catch (_) {}
    }
    // Step 2: Wait for the process to exit naturally (do NOT close WebSocket yet)
    const exited = await new Promise((resolve) => {
      if (!chromeProc || chromeProc.exitCode !== null) return resolve(true);
      const exitTimer = setTimeout(() => resolve(false), 5000);
      chromeProc.once('exit', () => { clearTimeout(exitTimer); resolve(true); });
    });
    // Step 3: Close WebSocket AFTER Chrome has exited (or timed out)
    if (cdp) {
      try { cdp.close(); } catch (_) {}
    }
    // Step 4: Hard kill only if Chrome did not exit within 5s (SIGKILL, not SIGTERM)
    if (!exited && chromeProc && chromeProc.exitCode === null) {
      try {
        process.kill(-chromeProc.pid, 'SIGKILL');
      } catch (_) {
        try { chromeProc.kill('SIGKILL'); } catch (_2) {}
      }
      await new Promise(resolve => {
        chromeProc.once('exit', resolve);
        setTimeout(resolve, 2000);
      });
    }
    // Clean up temp Chrome profile
    try { fs.rmSync(tmpProfile, { recursive: true, force: true }); } catch (_) {}
    console.log('HELIX_SESSION_END');
    process.exit(0);
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);

  try {
    // ── Launch Chrome with raw CDP ──────────────────────────────────
    const chromeArgs = [
      `--user-data-dir=${tmpProfile}`,
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-infobars',
      '--disable-session-crashed-bubble',
      '--hide-crash-restore-bubble',
      '--auto-select-tab-capture-source-by-title=Helix Recording',
      '--autoplay-policy=no-user-gesture-required',
      '--disable-breakpad',
      '--disable-crash-reporter',
      '--no-zygote',
      '--remote-debugging-port=0',
      `--window-size=${vpWidth || 1280},${(vpHeight || 720) + STRIP_HEIGHT}`,
      'about:blank',
    ];

    const { proc, wsUrl } = await launchChrome(chromePath, chromeArgs);
    chromeProc = proc;

    cdp = await connectCDP(wsUrl);

    // ── Find and attach to the page target ──────────────────────────
    const { targetInfos } = await cdp.send('Target.getTargets');
    const pageTarget = targetInfos.find(t => t.type === 'page');
    if (!pageTarget) throw new Error('No page target found');

    const { sessionId } = await cdp.send('Target.attachToTarget', {
      targetId: pageTarget.targetId,
      flatten: true,
    });

    // Enable domains on the page session
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Page.setLifecycleEventsEnabled', { enabled: true }, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);

    // ── Exposed functions via Runtime.addBinding ────────────────────
    // Save flow state
    let saveStream = null;

    const bindings = {
      __helixStartRecording: async () => {
        if (recordingState !== 'idle' && recordingState !== 'stopped' && recordingState !== 'ready') return false;
        recordingState = 'recording';
        console.log('Recording started');
        return true;
      },
      __helixPauseRecording: async () => {
        if (recordingState === 'recording') {
          recordingState = 'paused';
          console.log('Recording paused');
          return true;
        }
        return false;
      },
      __helixResumeRecording: async () => {
        if (recordingState === 'paused') {
          recordingState = 'recording';
          console.log('Recording resumed');
          return true;
        }
        return false;
      },
      __helixStopRecording: async (payload) => {
        recordingState = 'stopped';
        if (payload) console.log('HELIX_DURATION=' + payload);
        console.log('Recording stopped — waiting for user to save or discard');
        return true;
      },
      __helixBeginSave: async () => {
        try {
          saveStream = fs.createWriteStream(outputPath);
          return true;
        } catch (e) {
          console.error('Failed to begin save:', e.message);
          return false;
        }
      },
      __helixWriteChunk: async (payload) => {
        if (!saveStream) return false;
        try {
          const base64Data = payload;
          const buffer = Buffer.from(base64Data, 'base64');
          return new Promise((resolve) => {
            saveStream.write(buffer, () => resolve(true));
          });
        } catch (e) {
          console.error('Failed to write chunk:', e.message);
          return false;
        }
      },
      __helixCommitSave: async (payload) => {
        const filename = payload;
        return new Promise((resolve) => {
          if (!saveStream) { resolve(''); return; }
          saveStream.end(() => {
            saveStream = null;
            try {
              const dir = path.dirname(outputPath);
              const dest = path.join(dir, filename);
              fs.copyFileSync(outputPath, dest);
              try { fs.unlinkSync(outputPath); } catch (_) {}
              console.log('HELIX_SAVED=' + dest);
              resolve(dest);
            } catch (e) {
              console.error('Save failed:', e.message);
              resolve('');
            }
          });
        });
      },
      __helixCloseBrowser: async () => {
        console.log('Browser close requested');
        if (saveStream) {
          try { saveStream.end(); saveStream = null; } catch (_) {}
        }
        setTimeout(cleanup, 500);
        return true;
      },
      __helixStartOver: async () => {
        if (saveStream) {
          try { saveStream.end(); saveStream = null; } catch (_) {}
        }
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch (_) {}
        recordingState = 'idle';
        console.log('State reset — ready for new recording');
        return true;
      },
      __helixNoSave: async () => {
        console.log('HELIX_NO_SAVE');
        return true;
      },
    };

    // Register all bindings
    for (const name of Object.keys(bindings)) {
      await cdp.send('Runtime.addBinding', { name }, sessionId);
    }

    // Handle binding calls from the page
    cdp.on('Runtime.bindingCalled', async (params) => {
      const { name, payload } = params;
      const handler = bindings[name];
      if (!handler) return;
      try {
        // Parse payload if it's a non-empty JSON string
        let arg;
        if (payload && payload.length > 0) {
          try { arg = JSON.parse(payload); } catch (_) { arg = payload; }
        }
        const result = await handler(arg);
        const resultJson = JSON.stringify(result);
        await cdp.send('Runtime.evaluate', {
          expression: `__helixBridge['${name}'](${resultJson})`,
        }, sessionId);
      } catch (e) {
        console.error('Binding handler error for ' + name + ':', e.message);
        // Resolve with undefined to prevent hanging promises
        await cdp.send('Runtime.evaluate', {
          expression: `__helixBridge['${name}'](undefined)`,
        }, sessionId).catch(() => {});
      }
    });

    // ── Build and inject UI script ──────────────────────────────────
    const uiScript = '(' + function() {
      // Bridge: in-page function that calls Runtime.addBinding and waits for Node to respond
      var __helixBridge = {};
      window.__helixBridge = __helixBridge;
      function helixCall(name, payload) {
        return new Promise(function(resolve) {
          __helixBridge[name] = resolve;
          window[name](typeof payload !== 'undefined' ? JSON.stringify(payload) : '');
        });
      }

      window.addEventListener('DOMContentLoaded', function() {

        // ================================================================
        // CSS
        // ================================================================
        var style = document.createElement('style');
        style.textContent = [
          '/* ===== PAGE EXTENSION — ensure content renders behind toolbar strip ===== */',
          'html, body { min-height: 100vh !important; }',
          'body { padding-bottom: 60px !important; box-sizing: border-box; }',
          '',
          '/* ===== ANNOTATION CANVAS ===== */',
          '#helix-annotation-canvas-container { position: fixed; top: 0; left: 0; width: 100%; height: calc(100vh - 60px); z-index: 2147483646; pointer-events: none; overflow: hidden; }',
          '#helix-annotation-canvas-container .canvas-container { width: 100% !important; height: 100% !important; }',
          '#helix-annotation-canvas-container.draw-mode { pointer-events: auto; cursor: crosshair; }',
          '#helix-annotation-canvas-container.text-mode { cursor: text; }',
          '',
          '/* ===== TEXT INPUT OVERLAY ===== */',
          '#helix-text-input-overlay {',
          '  position: fixed; z-index: 2147483647; display: none;',
          '  min-width: 100px; padding: 2px 4px;',
          '  background: transparent; border: 1px dashed rgba(255,255,255,0.4);',
          '  color: white; font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;',
          '  font-size: 18px; font-weight: 600; outline: none; caret-color: white;',
          '  white-space: pre; overflow: visible;',
          '}',
          '',
          '/* ===== HUD OVERLAY ===== */',
          '#helix-hud-overlay { position: fixed; inset: 0; z-index: 2147483647; display: flex; align-items: center; justify-content: center; pointer-events: none; opacity: 0; }',
          '#helix-hud-overlay.visible { animation: helixHudFade 800ms ease-out forwards; }',
          '#helix-hud-content { display: flex; flex-direction: column; align-items: center; gap: 12px; padding: 32px 56px; background: rgba(15,15,15,0.6); backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%); border: 1px solid rgba(255,255,255,0.1); border-radius: 24px; box-shadow: 0 16px 64px rgba(0,0,0,0.5); transform: scale(0.8); opacity: 0; }',
          '#helix-hud-overlay.visible #helix-hud-content { animation: helixHudBounce 800ms cubic-bezier(0.34,1.56,0.64,1) forwards; }',
          '#helix-hud-icon { font-size: 48px; line-height: 1; display: flex; align-items: center; justify-content: center; }',
          '#helix-hud-text { font-size: 22px; font-weight: 600; color: rgba(255,255,255,0.9); letter-spacing: 0.5px; }',
          '@keyframes helixHudBounce { 0% { transform: scale(0.8); opacity: 0; } 15% { opacity: 1; } 40% { transform: scale(1.02); } 60% { transform: scale(1); opacity: 1; } 85% { opacity: 1; } 100% { transform: scale(1); opacity: 0; } }',
          '@keyframes helixHudFade { 0% { opacity: 0; } 12% { opacity: 1; } 65% { opacity: 1; } 100% { opacity: 0; } }',
          '#helix-hud-overlay.countdown #helix-hud-content { background: transparent; backdrop-filter: none; -webkit-backdrop-filter: none; border: none; box-shadow: none; }',
          '#helix-hud-overlay.countdown #helix-hud-icon { font-size: 120px; font-weight: 800; color: white; text-shadow: 0 4px 40px rgba(0,0,0,0.6); }',
          '#helix-hud-overlay.countdown.visible #helix-hud-content { animation: helixCountPop 800ms cubic-bezier(0.34,1.56,0.64,1) forwards; }',
          '@keyframes helixCountPop { 0% { transform: scale(1.5); opacity: 0; } 25% { transform: scale(1); opacity: 1; } 75% { opacity: 1; } 100% { transform: scale(0.9); opacity: 0; } }',
          '',
          '/* ===== CROP ZONE ===== */',
          '#helix-crop-zone { position: fixed; top: 0; left: 0; right: 0; height: calc(100vh - 60px); z-index: 0; pointer-events: none; }',
          '',
          '/* ===== TOOLBAR STRIP ===== */',
          '#helix-toolbar-strip {',
          '  position: fixed; bottom: 0; left: 0; right: 0; height: 60px; z-index: 2147483647;',
          '  display: flex; align-items: center; justify-content: center;',
          '  background: rgba(15,15,15,0.35); backdrop-filter: blur(24px) saturate(180%); -webkit-backdrop-filter: blur(24px) saturate(180%);',
          '  border-top: 1px solid rgba(255,255,255,0.08);',
          '}',
          '',
          '/* ===== TOOLBAR ===== */',
          '#helix-toolbar {',
          '  position: relative; z-index: 2147483647;',
          '  display: flex; align-items: center; gap: 0; padding: 6px 10px;',
          '  background: rgba(30,30,30,0.65); backdrop-filter: blur(16px) saturate(160%); -webkit-backdrop-filter: blur(16px) saturate(160%);',
          '  border: 1px solid rgba(255,255,255,0.12); border-radius: 14px;',
          '  box-shadow: 0 4px 24px rgba(0,0,0,0.3);',
          '  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif;',
          '  font-size: 13px; color: white; user-select: none;',
          '}',
          '.htb-section { display: flex; align-items: center; gap: 3px; padding: 0 6px; }',
          '.htb-divider { width: 1px; height: 24px; background: rgba(255,255,255,0.12); margin: 0 4px; flex-shrink: 0; }',
          '.htb-collapsible { overflow: hidden; max-width: 0; opacity: 0; transition: max-width 0.35s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease, padding 0.35s cubic-bezier(0.4,0,0.2,1); padding: 0; }',
          '.htb-collapsible.expanded { max-width: 500px; opacity: 1; padding: 0 6px; }',
          '.htb-group-sep { width: 0; height: 20px; background: rgba(255,255,255,0.1); margin: 0; flex-shrink: 0; overflow: hidden; transition: width 0.25s ease, margin 0.25s ease, opacity 0.25s ease; opacity: 0; }',
          '.htb-collapsible.expanded + .htb-group-sep { width: 1px; margin: 0 3px; opacity: 1; }',
          '.htb-btn {',
          '  display: inline-flex; align-items: center; justify-content: center; gap: 6px;',
          '  height: 32px; min-width: 32px; padding: 0 10px;',
          '  border: none; border-radius: 8px; background: transparent;',
          '  color: rgba(255,255,255,0.75); font-size: 13px; font-weight: 500; font-family: inherit;',
          '  cursor: pointer; transition: background 0.15s, color 0.15s, box-shadow 0.15s;',
          '  white-space: nowrap; flex-shrink: 0; vertical-align: middle; line-height: 1;',
          '}',
          '.htb-btn svg { flex-shrink: 0; display: block; }',
          '.htb-btn:hover { background: rgba(255,255,255,0.1); color: white; }',
          '.htb-btn:active { background: rgba(255,255,255,0.15); }',
          '.htb-btn.active { background: rgba(255,255,255,0.15); color: white; box-shadow: 0 0 0 1.5px rgba(255,255,255,0.2) inset; }',
          '.htb-btn.record-btn { background: rgba(255,59,48,0.15); color: #ff6b6b; }',
          '.htb-btn.record-btn:hover { background: rgba(255,59,48,0.25); color: #ff3b30; }',
          '.htb-btn.action-btn { background: rgba(255,214,10,0.12); color: #ffd60a; }',
          '.htb-btn.action-btn:hover { background: rgba(255,214,10,0.2); }',
          '.htb-btn.stop-btn { background: rgba(255,59,48,0.12); color: #ff6b6b; }',
          '.htb-btn.stop-btn:hover { background: rgba(255,59,48,0.25); }',
          '.htb-icon-btn { padding: 0; width: 32px; }',
          '.htb-rec-dot { width: 8px; height: 8px; border-radius: 50%; background: #666; flex-shrink: 0; }',
          '.htb-rec-dot.recording { background: #ff3b30; animation: helixPulse 1.2s ease-in-out infinite; }',
          '.htb-rec-dot.ready { background: #ffd60a; animation: helixPulse 1.5s ease-in-out infinite; }',
          '.htb-rec-dot.paused { background: #ffd60a; }',
          '@keyframes helixPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.35; } }',
          '.htb-timer { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; color: rgba(255,255,255,0.85); min-width: 42px; }',
          '.htb-color-dot { width: 16px; height: 16px; border-radius: 50%; border: 2px solid transparent; cursor: pointer; transition: border-color 0.15s, box-shadow 0.15s; flex-shrink: 0; box-sizing: content-box; }',
          '.htb-color-dot:hover { box-shadow: 0 0 0 2px rgba(255,255,255,0.3); }',
          '.htb-color-dot.active { border-color: rgba(255,255,255,0.8); box-shadow: 0 0 0 1px rgba(255,255,255,0.15); }',
          '',
          '/* ===== CLICK INTERCEPTOR (Record on Action) ===== */',
          '#helix-click-interceptor { position: fixed; inset: 0; z-index: 2147483645; cursor: crosshair; background: transparent; }',
          '',
          '/* ===== POST-RECORDING DIALOG ===== */',
          '#helix-dialog-backdrop {',
          '  position: fixed; inset: 0; z-index: 2147483647;',
          '  background: rgba(0,0,0,0.55);',
          '  display: none; align-items: center; justify-content: center;',
          '}',
          '#helix-dialog-backdrop.visible { display: flex; }',
          '#helix-post-dialog {',
          '  width: 420px; padding: 32px;',
          '  background: rgba(20,20,20,0.9); backdrop-filter: blur(30px) saturate(180%); -webkit-backdrop-filter: blur(30px) saturate(180%);',
          '  border: 1px solid rgba(255,255,255,0.15); border-radius: 20px;',
          '  box-shadow: 0 24px 80px rgba(0,0,0,0.6);',
          '  pointer-events: auto;',
          '}',
          '#helix-post-dialog .hd-title { font-size: 20px; font-weight: 700; color: rgba(255,255,255,0.95); margin-bottom: 6px; }',
          '#helix-post-dialog .hd-duration { font-size: 14px; color: rgba(255,255,255,0.45); margin-bottom: 20px; }',
          '#helix-post-dialog .hd-video-wrap { margin-bottom: 20px; border-radius: 12px; overflow: hidden; background: #000; }',
          '#helix-post-dialog .hd-video-wrap video { width: 100%; display: block; max-height: 240px; }',
          '#helix-post-dialog .hd-video-wrap video::-webkit-media-controls-fullscreen-button { display: none !important; }',
          '#helix-post-dialog .hd-video-wrap video:fullscreen { max-height: none; }',
          '#helix-post-dialog .hd-label { font-size: 11px; color: rgba(255,255,255,0.4); text-transform: uppercase; letter-spacing: 0.8px; margin-bottom: 6px; }',
          '#helix-post-dialog .hd-input {',
          '  width: 100%; padding: 10px 12px; margin-bottom: 20px;',
          '  background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 10px;',
          '  color: rgba(255,255,255,0.9); font-size: 13px; font-family: "SF Mono", Menlo, monospace;',
          '  outline: none; transition: border-color 0.15s; box-sizing: border-box;',
          '}',
          '#helix-post-dialog .hd-input:focus { border-color: rgba(255,255,255,0.3); }',
          '#helix-post-dialog .hd-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; }',
          '#helix-post-dialog .hd-btn {',
          '  padding: 10px 16px; border: none; border-radius: 10px;',
          '  font-size: 13px; font-weight: 600; font-family: inherit;',
          '  cursor: pointer; transition: opacity 0.15s, transform 0.1s;',
          '}',
          '#helix-post-dialog .hd-btn:hover { opacity: 0.85; }',
          '#helix-post-dialog .hd-btn:active { transform: scale(0.97); }',
          '#helix-post-dialog .hd-btn-save-close { background: rgba(0,122,255,0.2); color: #007aff; }',
          '#helix-post-dialog .hd-btn-start-over { background: rgba(255,214,10,0.15); color: #ffd60a; }',
          '#helix-post-dialog .hd-btn-close { background: rgba(142,142,147,0.15); color: #8e8e93; }',
          '',
          '/* ===== EXPANDED VIDEO OVERLAY ===== */',
          '#helix-video-fullscreen {',
          '  position: fixed; inset: 0; z-index: 2147483648;',
          '  background: rgba(0,0,0,0.92); display: none;',
          '  align-items: center; justify-content: center; flex-direction: column;',
          '}',
          '#helix-video-fullscreen.visible { display: flex; }',
          '#helix-video-fullscreen video {',
          '  max-width: 95vw; max-height: 90vh; border-radius: 8px;',
          '  box-shadow: 0 0 60px rgba(0,0,0,0.5);',
          '}',
          '#helix-video-fullscreen .hd-expand-btn {',
          '  position: absolute; top: 16px; right: 16px;',
          '}',
          '.hd-expand-btn {',
          '  position: absolute; top: 8px; right: 8px; z-index: 2;',
          '  width: 28px; height: 28px; border: none; border-radius: 6px;',
          '  background: rgba(0,0,0,0.55); color: rgba(255,255,255,0.75);',
          '  cursor: pointer; display: flex; align-items: center; justify-content: center;',
          '  transition: background 0.15s, color 0.15s;',
          '}',
          '.hd-expand-btn:hover { background: rgba(0,0,0,0.75); color: white; }',
          '',
          '/* ===== CONTEXT MENU ===== */',
          '.helix-context-menu {',
          '  position: fixed; z-index: 2147483647; min-width: 120px; padding: 4px;',
          '  background: rgba(30,30,30,0.9); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);',
          '  border: 1px solid rgba(255,255,255,0.15); border-radius: 10px;',
          '  box-shadow: 0 8px 32px rgba(0,0,0,0.5); font-family: inherit;',
          '}',
          '.helix-context-menu-item {',
          '  display: flex; align-items: center; gap: 8px; padding: 6px 12px;',
          '  border: none; border-radius: 6px; background: transparent;',
          '  color: #ff453a; font-size: 13px; font-weight: 500; font-family: inherit;',
          '  cursor: pointer; width: 100%; text-align: left;',
          '}',
          '.helix-context-menu-item:hover { background: rgba(255,69,58,0.15); }',
          '',
          '/* ===== SELECT MODE CURSOR ===== */',
          '#helix-annotation-canvas-container.select-mode { cursor: default; }',
        ].join('\n');
        document.head.appendChild(style);

        // ================================================================
        // SVG helpers
        // ================================================================
        var SVG_NS = 'http://www.w3.org/2000/svg';

        function svgEl(tag, attrs) {
          var e = document.createElementNS(SVG_NS, tag);
          if (attrs) { Object.keys(attrs).forEach(function(k) { e.setAttribute(k, attrs[k]); }); }
          return e;
        }

        function makeSvg(w, h, children) {
          var s = svgEl('svg', { width: String(w), height: String(h), viewBox: '0 0 ' + w + ' ' + h, fill: 'none' });
          s.style.display = 'block';
          s.style.flexShrink = '0';
          children.forEach(function(c) { s.appendChild(c); });
          return s;
        }

        // ── SVG icon builders (14x14 viewBox) ──────────────────────────
        function iconRecord() {
          return makeSvg(14, 14, [svgEl('circle', { cx: '7', cy: '7', r: '5', fill: 'currentColor' })]);
        }
        function iconLightning() {
          return makeSvg(14, 14, [svgEl('polygon', { points: '4,1 10,6 7,6 10,13 4,8 7,8', fill: 'currentColor' })]);
        }
        function iconPause() {
          return makeSvg(14, 14, [
            svgEl('rect', { x: '3', y: '2', width: '3', height: '10', rx: '1', fill: 'currentColor' }),
            svgEl('rect', { x: '8', y: '2', width: '3', height: '10', rx: '1', fill: 'currentColor' })
          ]);
        }
        function iconStop() {
          return makeSvg(14, 14, [svgEl('rect', { x: '3', y: '3', width: '8', height: '8', rx: '2', fill: 'currentColor' })]);
        }
        function iconPlay() {
          return makeSvg(14, 14, [svgEl('polygon', { points: '4,2 12,7 4,12', fill: 'currentColor' })]);
        }
        function iconPen() {
          return makeSvg(14, 14, [svgEl('path', { d: 'M2 10 Q4 4, 7 7 Q10 10, 12 4', stroke: 'currentColor', 'stroke-width': '1.8', 'stroke-linecap': 'round', fill: 'none' })]);
        }
        function iconRect() {
          return makeSvg(14, 14, [svgEl('rect', { x: '2', y: '3', width: '10', height: '8', rx: '1.5', stroke: 'currentColor', 'stroke-width': '1.3', fill: 'none' })]);
        }
        function iconCircle() {
          return makeSvg(14, 14, [svgEl('ellipse', { cx: '7', cy: '7', rx: '5', ry: '5', stroke: 'currentColor', 'stroke-width': '1.3', fill: 'none' })]);
        }
        function iconText() {
          return makeSvg(14, 14, [
            svgEl('line', { x1: '3', y1: '3', x2: '11', y2: '3', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
            svgEl('line', { x1: '7', y1: '3', x2: '7', y2: '12', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
            svgEl('line', { x1: '5', y1: '12', x2: '9', y2: '12', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' })
          ]);
        }
        function iconUndo() {
          return makeSvg(14, 14, [
            svgEl('path', { d: 'M4 7a5 5 0 1 1 1 4', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', fill: 'none' }),
            svgEl('polyline', { points: '1,5 4,7 6,4', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })
          ]);
        }
        function iconTrash() {
          return makeSvg(14, 14, [
            svgEl('line', { x1: '2', y1: '4', x2: '12', y2: '4', stroke: 'currentColor', 'stroke-width': '1.3', 'stroke-linecap': 'round' }),
            svgEl('path', { d: 'M4 4v7a1.5 1.5 0 0 0 1.5 1.5h3A1.5 1.5 0 0 0 10 11V4', stroke: 'currentColor', 'stroke-width': '1.3', fill: 'none' }),
            svgEl('path', { d: 'M5.5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1', stroke: 'currentColor', 'stroke-width': '1.2', fill: 'none' })
          ]);
        }

        function iconLine() {
          return makeSvg(14, 14, [
            svgEl('line', { x1: '2', y1: '12', x2: '12', y2: '2', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
          ]);
        }
        function iconArrowEnd() {
          return makeSvg(14, 14, [
            svgEl('line', { x1: '2', y1: '7', x2: '10', y2: '7', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
            svgEl('polyline', { points: '7,4 11,7 7,10', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })
          ]);
        }
        function iconArrowStart() {
          return makeSvg(14, 14, [
            svgEl('line', { x1: '4', y1: '7', x2: '12', y2: '7', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
            svgEl('polyline', { points: '7,4 3,7 7,10', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })
          ]);
        }
        function iconArrowBoth() {
          return makeSvg(14, 14, [
            svgEl('line', { x1: '3', y1: '7', x2: '11', y2: '7', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
            svgEl('polyline', { points: '8,4 12,7 8,10', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
            svgEl('polyline', { points: '6,4 2,7 6,10', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })
          ]);
        }
        function iconFill() {
          return makeSvg(14, 14, [
            svgEl('path', { d: 'M7 2L3 8a4.2 4.2 0 0 0 8 0L7 2z', stroke: 'currentColor', 'stroke-width': '1.3', fill: 'none' }),
            svgEl('path', { d: 'M7 8a4.2 4.2 0 0 0 4 0L7 2v6z', fill: 'currentColor', opacity: '0.4' })
          ]);
        }
        function iconRestart() {
          return makeSvg(14, 14, [
            svgEl('path', { d: 'M2.5 7a4.5 4.5 0 0 1 8.2-2.5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', fill: 'none' }),
            svgEl('polyline', { points: '8,2 11,4.5 8.5,6', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
            svgEl('path', { d: 'M11.5 7a4.5 4.5 0 0 1-8.2 2.5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', fill: 'none' }),
            svgEl('polyline', { points: '6,12 3,9.5 5.5,8', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })
          ]);
        }
        function iconCursor() {
          return makeSvg(14, 14, [
            svgEl('path', { d: 'M3 1l8 6.5-3.5.5 2 4-1.5.7-2-4L4 11V1z', fill: 'currentColor' })
          ]);
        }
        function iconExpand() {
          return makeSvg(14, 14, [
            svgEl('polyline', { points: '9,1 13,1 13,5', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
            svgEl('polyline', { points: '5,13 1,13 1,9', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
            svgEl('line', { x1: '8', y1: '6', x2: '13', y2: '1', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' }),
            svgEl('line', { x1: '6', y1: '8', x2: '1', y2: '13', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round' })
          ]);
        }
        function iconCollapse() {
          return makeSvg(14, 14, [
            svgEl('polyline', { points: '4,10 1,13', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', fill: 'none' }),
            svgEl('polyline', { points: '10,4 13,1', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', fill: 'none' }),
            svgEl('polyline', { points: '1,6 5,6 5,10', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' }),
            svgEl('polyline', { points: '13,8 9,8 9,4', stroke: 'currentColor', 'stroke-width': '1.5', 'stroke-linecap': 'round', 'stroke-linejoin': 'round', fill: 'none' })
          ]);
        }

        // ================================================================
        // State machine
        // ================================================================
        var state = {
          mode: 'idle',
          drawMode: false,
          tool: 'pen',
          color: '#ff3b30',
          strokeWidth: 3,
          fillColor: 'transparent',
          fillEnabled: false,
          arrowMode: 'end', // none, start, end, both
          timerSeconds: 0,
          textSize: 18,
          textBg: false,
          textBd: false
        };
        var timerInterval = null;
        var fabricCanvas = null;
        var readyArmed = false;
        var fabricLoaded = false;
        function isConstrainKey(e) {
          return e && (e.shiftKey || e.metaKey || e.ctrlKey);
        }

        // ================================================================
        // DOM builder helper
        // ================================================================
        function mkEl(tag, attrs, children) {
          var node = document.createElement(tag);
          if (attrs) {
            Object.keys(attrs).forEach(function(k) {
              if (k === 'className') node.className = attrs[k];
              else if (k === 'textContent') node.textContent = attrs[k];
              else if (k.slice(0, 2) === 'on' && typeof attrs[k] === 'function') node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
              else if (k === 'style' && typeof attrs[k] === 'object') Object.assign(node.style, attrs[k]);
              else node.setAttribute(k, attrs[k]);
            });
          }
          if (children) {
            children.forEach(function(c) {
              if (typeof c === 'string') node.appendChild(document.createTextNode(c));
              else if (c) node.appendChild(c);
            });
          }
          return node;
        }

        // ================================================================
        // Build crop zone (transparent region above toolbar strip)
        // ================================================================
        var cropZone = mkEl('div', { id: 'helix-crop-zone' });
        document.body.appendChild(cropZone);

        // ================================================================
        // Build annotation canvas container
        // ================================================================
        var canvasContainer = mkEl('div', { id: 'helix-annotation-canvas-container' });
        var canvasEl = mkEl('canvas', { id: 'helix-annotation-canvas' });
        canvasEl.width = window.innerWidth;
        canvasEl.height = window.innerHeight - 60;
        canvasContainer.appendChild(canvasEl);
        document.body.appendChild(canvasContainer);

        // ================================================================
        // Build HUD overlay
        // ================================================================
        var hudOverlay = mkEl('div', { id: 'helix-hud-overlay' });
        var hudContent = mkEl('div', { id: 'helix-hud-content' });
        var hudIcon = mkEl('div', { id: 'helix-hud-icon' });
        var hudText = mkEl('div', { id: 'helix-hud-text' });
        hudContent.appendChild(hudIcon);
        hudContent.appendChild(hudText);
        hudOverlay.appendChild(hudContent);
        document.body.appendChild(hudOverlay);

        // ================================================================
        // Build text input overlay
        // ================================================================
        var textInputEl = mkEl('div', {
          id: 'helix-text-input-overlay',
          contentEditable: 'true',
          spellcheck: 'false'
        });
        document.body.appendChild(textInputEl);
        var activeTextInput = false;

        // ================================================================
        // Build toolbar strip + toolbar
        // ================================================================
        var toolbarStrip = mkEl('div', { id: 'helix-toolbar-strip' });
        var toolbar = mkEl('div', { id: 'helix-toolbar' });

        // -- Pre-record section --
        var preRecSection = mkEl('div', { className: 'htb-section', id: 'htb-pre-rec' });
        var btnRecord = mkEl('button', { className: 'htb-btn record-btn', onClick: function() { doRecord(); } }, [iconRecord(), 'Record']);
        var btnOnAction = mkEl('button', { className: 'htb-btn action-btn', onClick: function() { doOnAction(); } }, [iconLightning(), 'On Action']);
        preRecSection.appendChild(btnRecord);
        preRecSection.appendChild(btnOnAction);
        toolbar.appendChild(preRecSection);

        // -- Recording section --
        var recSection = mkEl('div', { className: 'htb-section', id: 'htb-rec-section', style: { display: 'none' } });
        var recDot = mkEl('div', { className: 'htb-rec-dot' });
        var timerEl = mkEl('span', { className: 'htb-timer', textContent: '0:00' });
        var btnPause = mkEl('button', { className: 'htb-btn htb-icon-btn', title: 'Pause', onClick: function() { doPause(); } });
        btnPause.appendChild(iconPause());
        var btnStop = mkEl('button', { className: 'htb-btn stop-btn htb-icon-btn', title: 'Stop', onClick: function() { doStop(); } });
        btnStop.appendChild(iconStop());
        var btnRestart = mkEl('button', { className: 'htb-btn htb-icon-btn', title: 'Restart', onClick: function() { doRestart(); } });
        btnRestart.appendChild(iconRestart());
        recSection.appendChild(recDot);
        recSection.appendChild(timerEl);
        recSection.appendChild(btnPause);
        recSection.appendChild(btnStop);
        recSection.appendChild(btnRestart);
        toolbar.appendChild(recSection);

        // -- Draw toggle divider + button --
        var divDraw = mkEl('div', { className: 'htb-divider', style: { display: 'none' } });
        toolbar.appendChild(divDraw);
        var drawToggleSection = mkEl('div', { className: 'htb-section', style: { display: 'none' } });
        var btnDrawToggle = mkEl('button', { className: 'htb-btn', onClick: function() { toggleDrawMode(); } }, [iconPen(), 'Draw']);
        drawToggleSection.appendChild(btnDrawToggle);
        toolbar.appendChild(drawToggleSection);

        // -- Tools divider --
        var divTools = mkEl('div', { className: 'htb-divider', style: { display: 'none' } });
        toolbar.appendChild(divTools);

        // -- Tools collapsible --
        var toolsSection = mkEl('div', { className: 'htb-collapsible' });
        var toolsRow = mkEl('div', { style: { display: 'flex', alignItems: 'center', gap: '3px' } });
        var toolDefs = [
          { id: 'htb-tool-select', icon: iconCursor, title: 'Select', tool: 'select' },
          { id: 'htb-tool-pen', icon: iconPen, title: 'Pen', tool: 'pen' },
          { id: 'htb-tool-line', icon: iconLine, title: 'Line', tool: 'line' },
          { id: 'htb-tool-rect', icon: iconRect, title: 'Rectangle', tool: 'rect' },
          { id: 'htb-tool-circle', icon: iconCircle, title: 'Circle', tool: 'circle' },
          { id: 'htb-tool-text', icon: iconText, title: 'Text', tool: 'text' }
        ];
        toolDefs.forEach(function(td) {
          var btn = mkEl('button', { className: 'htb-btn htb-icon-btn' + (td.tool === 'pen' ? ' active' : ''), id: td.id, title: td.title, onClick: (function(t) { return function() { selectTool(t); }; })(td.tool) });
          btn.appendChild(td.icon());
          toolsRow.appendChild(btn);
        });
        toolsSection.appendChild(toolsRow);
        toolbar.appendChild(toolsSection);
        toolbar.appendChild(mkEl('div', { className: 'htb-group-sep' }));

        // -- Colors collapsible --
        var colorsSection = mkEl('div', { className: 'htb-collapsible' });
        var colorsRow = mkEl('div', { style: { display: 'flex', alignItems: 'center', gap: '5px' } });
        var colorDefs = [
          { id: 'htb-color-red', hex: '#ff3b30' },
          { id: 'htb-color-yellow', hex: '#ffd60a' },
          { id: 'htb-color-blue', hex: '#007aff' },
          { id: 'htb-color-green', hex: '#30d158' },
          { id: 'htb-color-white', hex: '#ffffff' }
        ];
        colorDefs.forEach(function(cd, i) {
          var dot = mkEl('div', { className: 'htb-color-dot' + (i === 0 ? ' active' : ''), id: cd.id, style: { background: cd.hex }, onClick: (function(hex, dotId) { return function() { selectColor(hex, document.getElementById(dotId)); }; })(cd.hex, cd.id) });
          colorsRow.appendChild(dot);
        });
        colorsSection.appendChild(colorsRow);
        toolbar.appendChild(colorsSection);
        toolbar.appendChild(mkEl('div', { className: 'htb-group-sep' }));

        // -- Stroke width collapsible --
        var strokeSection = mkEl('div', { className: 'htb-collapsible' });
        var strokeRow = mkEl('div', { style: { display: 'flex', alignItems: 'center', gap: '3px' } });
        var strokeDefs = [
          { id: 'htb-sw-1', width: 1 },
          { id: 'htb-sw-2', width: 2 },
          { id: 'htb-sw-3', width: 3 },
          { id: 'htb-sw-5', width: 5 }
        ];
        strokeDefs.forEach(function(sd) {
          var btn = mkEl('button', { className: 'htb-btn htb-icon-btn' + (sd.width === 3 ? ' active' : ''), id: sd.id, title: sd.width + 'px stroke', onClick: (function(w) { return function() { setStrokeWidth(w); }; })(sd.width) });
          // Visual line thickness indicator
          var sw = makeSvg(14, 14, [svgEl('line', { x1: '2', y1: '7', x2: '12', y2: '7', stroke: 'currentColor', 'stroke-width': String(sd.width), 'stroke-linecap': 'round' })]);
          btn.appendChild(sw);
          strokeRow.appendChild(btn);
        });
        strokeSection.appendChild(strokeRow);
        toolbar.appendChild(strokeSection);
        toolbar.appendChild(mkEl('div', { className: 'htb-group-sep' }));

        // -- Fill toggle collapsible --
        var fillSection = mkEl('div', { className: 'htb-collapsible' });
        var fillRow = mkEl('div', { style: { display: 'flex', alignItems: 'center', gap: '3px' } });
        var btnFill = mkEl('button', { className: 'htb-btn htb-icon-btn', id: 'htb-btn-fill', title: 'Toggle fill', onClick: function() { toggleFill(); } });
        btnFill.appendChild(iconFill());
        fillRow.appendChild(btnFill);
        fillSection.appendChild(fillRow);
        toolbar.appendChild(fillSection);
        toolbar.appendChild(mkEl('div', { className: 'htb-group-sep' }));

        // -- Arrowhead options collapsible (line tool contextual) --
        var arrowSection = mkEl('div', { className: 'htb-collapsible' });
        var arrowRow = mkEl('div', { style: { display: 'flex', alignItems: 'center', gap: '3px' } });
        var arrowDefs = [
          { id: 'htb-arr-none', mode: 'none', icon: iconLine, title: 'No arrows' },
          { id: 'htb-arr-end', mode: 'end', icon: iconArrowEnd, title: 'Arrow at end' },
          { id: 'htb-arr-start', mode: 'start', icon: iconArrowStart, title: 'Arrow at start' },
          { id: 'htb-arr-both', mode: 'both', icon: iconArrowBoth, title: 'Arrows both ends' }
        ];
        arrowDefs.forEach(function(ad) {
          var btn = mkEl('button', { className: 'htb-btn htb-icon-btn' + (ad.mode === 'end' ? ' active' : ''), id: ad.id, title: ad.title, onClick: (function(m) { return function() { setArrowMode(m); }; })(ad.mode) });
          btn.appendChild(ad.icon());
          arrowRow.appendChild(btn);
        });
        arrowSection.appendChild(arrowRow);
        toolbar.appendChild(arrowSection);
        toolbar.appendChild(mkEl('div', { className: 'htb-group-sep' }));

        // -- Actions collapsible --
        var actionsSection = mkEl('div', { className: 'htb-collapsible' });
        var actionsRow = mkEl('div', { style: { display: 'flex', alignItems: 'center', gap: '3px' } });
        var btnUndo = mkEl('button', { className: 'htb-btn htb-icon-btn', title: 'Undo', onClick: function() { doUndo(); } });
        btnUndo.appendChild(iconUndo());
        var btnDelete = mkEl('button', { className: 'htb-btn htb-icon-btn', id: 'htb-btn-delete', title: 'Delete selected', onClick: function() { doDeleteSelected(); } });
        btnDelete.appendChild(iconTrash());
        var btnClear = mkEl('button', { className: 'htb-btn htb-icon-btn', title: 'Clear all', onClick: function() { doClear(); } });
        btnClear.textContent = '×';
        btnClear.style.fontSize = '16px';
        btnClear.style.fontWeight = '700';
        actionsRow.appendChild(btnUndo);
        actionsRow.appendChild(btnDelete);
        actionsRow.appendChild(btnClear);
        actionsSection.appendChild(actionsRow);
        toolbar.appendChild(actionsSection);
        toolbar.appendChild(mkEl('div', { className: 'htb-group-sep' }));

        // -- Text formatting collapsible (contextual: text tool or text selected) --
        var textFmtSection = mkEl('div', { className: 'htb-collapsible' });
        var textFmtRow = mkEl('div', { style: { display: 'flex', alignItems: 'center', gap: '4px' } });
        var sizeSmall = mkEl('button', { className: 'htb-btn htb-icon-btn', id: 'htb-tsize-14', title: 'Small (14px)', textContent: 'S', style: { fontSize: '10px', fontWeight: '700' }, onClick: function() { setTextSize(14); } });
        var sizeMed = mkEl('button', { className: 'htb-btn htb-icon-btn active', id: 'htb-tsize-18', title: 'Medium (18px)', textContent: 'M', style: { fontSize: '11px', fontWeight: '700' }, onClick: function() { setTextSize(18); } });
        var sizeLg = mkEl('button', { className: 'htb-btn htb-icon-btn', id: 'htb-tsize-28', title: 'Large (28px)', textContent: 'L', style: { fontSize: '12px', fontWeight: '700' }, onClick: function() { setTextSize(28); } });
        var sizeXl = mkEl('button', { className: 'htb-btn htb-icon-btn', id: 'htb-tsize-40', title: 'XL (40px)', textContent: 'XL', style: { fontSize: '10px', fontWeight: '700', minWidth: '36px' }, onClick: function() { setTextSize(40); } });
        var textDiv = mkEl('div', { style: { width: '1px', height: '18px', background: 'rgba(255,255,255,0.12)', margin: '0 2px', flexShrink: '0' } });
        var bgToggle = mkEl('button', { className: 'htb-btn htb-icon-btn', id: 'htb-btn-text-bg', title: 'Toggle background fill', style: { fontSize: '11px', fontWeight: '600', minWidth: '36px' }, textContent: 'BG', onClick: function() { toggleTextBg(); } });
        var bdToggle = mkEl('button', { className: 'htb-btn htb-icon-btn', id: 'htb-btn-text-bd', title: 'Toggle text border', style: { fontSize: '11px', fontWeight: '600', minWidth: '36px' }, textContent: 'BD', onClick: function() { toggleTextBd(); } });
        textFmtRow.appendChild(sizeSmall);
        textFmtRow.appendChild(sizeMed);
        textFmtRow.appendChild(sizeLg);
        textFmtRow.appendChild(sizeXl);
        textFmtRow.appendChild(textDiv);
        textFmtRow.appendChild(bgToggle);
        textFmtRow.appendChild(bdToggle);
        textFmtSection.appendChild(textFmtRow);
        toolbar.appendChild(textFmtSection);

        // Prevent toolbar clicks from stealing canvas focus/selection
        toolbar.addEventListener('mousedown', function(e) {
          // Only prevent default on buttons (not input fields like filename)
          if (e.target.closest('button, .htb-color-dot')) {
            e.preventDefault();
          }
        });

        // Nest toolbar inside the strip, append strip to body
        toolbarStrip.appendChild(toolbar);
        document.body.appendChild(toolbarStrip);

        // ================================================================
        // Post-recording dialog
        // ================================================================
        var dialogBackdrop = mkEl('div', { id: 'helix-dialog-backdrop' });
        var postDialog = mkEl('div', { id: 'helix-post-dialog' });

        var dialogTitle = mkEl('div', { className: 'hd-title', textContent: 'Recording Complete' });
        var dialogDuration = mkEl('div', { className: 'hd-duration', textContent: 'Duration: 0:00' });
        var dialogVideoWrap = mkEl('div', { className: 'hd-video-wrap', style: { position: 'relative' } });
        var dialogVideo = mkEl('video', { preload: 'metadata', controls: 'true' });
        dialogVideo.setAttribute('controlsList', 'nofullscreen nodownload');
        var expandBtn = mkEl('button', { className: 'hd-expand-btn', title: 'Expand video', onClick: function() { openVideoFullscreen(); } });
        expandBtn.appendChild(iconExpand());
        dialogVideoWrap.appendChild(dialogVideo);
        dialogVideoWrap.appendChild(expandBtn);

        // Fullscreen video overlay (detached from dialog)
        var videoFullscreen = mkEl('div', { id: 'helix-video-fullscreen' });
        var fsVideo = mkEl('video', { controls: 'true', preload: 'metadata', controlsList: 'nofullscreen nodownload' });
        var fsCloseBtn = mkEl('button', { className: 'hd-expand-btn', title: 'Close', onClick: function() { closeVideoFullscreen(); } });
        fsCloseBtn.appendChild(iconCollapse());
        videoFullscreen.appendChild(fsVideo);
        videoFullscreen.appendChild(fsCloseBtn);
        // Click on backdrop closes fullscreen
        videoFullscreen.addEventListener('click', function(e) {
          if (e.target === videoFullscreen) closeVideoFullscreen();
        });
        document.body.appendChild(videoFullscreen);
        var dialogFilenameLabel = mkEl('div', { className: 'hd-label', textContent: 'Filename' });
        var dialogFilenameInput = mkEl('input', { className: 'hd-input', type: 'text', value: '' });

        var dialogGrid = mkEl('div', { className: 'hd-grid' });
        var btnSaveClose = mkEl('button', { className: 'hd-btn hd-btn-save-close', textContent: 'Save & Close', onClick: function() { dialogSaveClose(); } });
        var btnStartOver = mkEl('button', { className: 'hd-btn hd-btn-start-over', textContent: 'Start Over', onClick: function() { dialogStartOver(); } });
        var btnDialogClose = mkEl('button', { className: 'hd-btn hd-btn-close', textContent: 'Close', onClick: function() { dialogClose(); } });
        dialogGrid.appendChild(btnSaveClose);
        dialogGrid.appendChild(btnStartOver);
        dialogGrid.appendChild(btnDialogClose);

        postDialog.appendChild(dialogTitle);
        postDialog.appendChild(dialogDuration);
        postDialog.appendChild(dialogVideoWrap);
        postDialog.appendChild(dialogFilenameLabel);
        postDialog.appendChild(dialogFilenameInput);
        postDialog.appendChild(dialogGrid);
        dialogBackdrop.appendChild(postDialog);
        document.body.appendChild(dialogBackdrop);

        // ================================================================
        // Toolbar update
        // ================================================================
        function updateToolbar() {
          var allCollapsible = [toolsSection, colorsSection, strokeSection, fillSection, arrowSection, actionsSection, textFmtSection];
          if (state.mode === 'idle' || state.mode === 'stopped') {
            preRecSection.style.display = 'flex';
            recSection.style.display = 'none';
            divDraw.style.display = 'none';
            drawToggleSection.style.display = 'none';
            divTools.style.display = 'none';
            allCollapsible.forEach(function(s) { s.classList.remove('expanded'); });
          } else {
            preRecSection.style.display = 'none';
            recSection.style.display = 'flex';
            divDraw.style.display = 'block';
            drawToggleSection.style.display = 'flex';
            divTools.style.display = state.drawMode ? 'block' : 'none';
            if (state.drawMode) {
              toolsSection.classList.add('expanded');
              actionsSection.classList.add('expanded');
              // Colors + stroke: show for drawing tools (not select without selection)
              if (state.tool !== 'select') {
                colorsSection.classList.add('expanded');
                strokeSection.classList.add('expanded');
              } else {
                // Select mode: colors/stroke hidden by default, shown by onSelectionChange when an object is selected
                colorsSection.classList.remove('expanded');
                strokeSection.classList.remove('expanded');
              }
              // Fill: show for shapes and text, not pen/select
              if (state.tool === 'rect' || state.tool === 'circle' || state.tool === 'text') {
                fillSection.classList.add('expanded');
              } else {
                fillSection.classList.remove('expanded');
              }
              // Arrowheads: show for line tool
              if (state.tool === 'line') {
                arrowSection.classList.add('expanded');
              } else {
                arrowSection.classList.remove('expanded');
              }
              // Text formatting: show for text tool
              if (state.tool === 'text') textFmtSection.classList.add('expanded');
              else textFmtSection.classList.remove('expanded');
            } else {
              allCollapsible.forEach(function(s) { s.classList.remove('expanded'); });
            }
            // rec dot
            recDot.className = 'htb-rec-dot';
            if (state.mode === 'recording') recDot.classList.add('recording');
            else if (state.mode === 'paused') recDot.classList.add('paused');
            else if (state.mode === 'ready') recDot.classList.add('ready');
            // pause button icon
            while (btnPause.firstChild) btnPause.removeChild(btnPause.firstChild);
            if (state.mode === 'paused') { btnPause.appendChild(iconPlay()); btnPause.title = 'Resume'; }
            else { btnPause.appendChild(iconPause()); btnPause.title = 'Pause'; }
          }

          // draw toggle button state
          if (state.drawMode) {
            btnDrawToggle.classList.add('active');
            canvasContainer.classList.add('draw-mode');
            if (state.tool === 'text') canvasContainer.classList.add('text-mode');
            else canvasContainer.classList.remove('text-mode');
            if (state.tool === 'select') canvasContainer.classList.add('select-mode');
            else canvasContainer.classList.remove('select-mode');
          } else {
            btnDrawToggle.classList.remove('active');
            canvasContainer.classList.remove('draw-mode');
            canvasContainer.classList.remove('text-mode');
            canvasContainer.classList.remove('select-mode');
          }

          // fabric.js draw mode sync
          syncFabricDrawMode();
        }

        // ================================================================
        // Timer
        // ================================================================
        function startTimer() {
          clearInterval(timerInterval);
          timerInterval = setInterval(function() {
            state.timerSeconds++;
            var m = Math.floor(state.timerSeconds / 60);
            var s = state.timerSeconds % 60;
            timerEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
          }, 1000);
        }

        function formatTime(totalSecs) {
          var m = Math.floor(totalSecs / 60);
          var s = totalSecs % 60;
          return m + ':' + (s < 10 ? '0' : '') + s;
        }

        // ================================================================
        // HUD system
        // ================================================================
        var hudConfig = {
          recording: { iconBuilder: iconRecord, text: 'Recording', iconColor: '#ff3b30' },
          paused: { iconBuilder: iconPause, text: 'Paused', iconColor: '#ffd60a' },
          resumed: { iconBuilder: iconPlay, text: 'Resumed', iconColor: '#30d158' },
          stopped: { iconBuilder: iconStop, text: 'Stopped', iconColor: '#ff3b30' },
          'ready-wait': { iconBuilder: iconLightning, text: 'Ready...', iconColor: '#ffd60a' },
          restart: { iconBuilder: iconRestart, text: 'Restarting...', iconColor: '#ffd60a' }
        };

        function showHUD(type) {
          hudOverlay.className = '';
          var cfg = hudConfig[type];
          if (!cfg) return;
          while (hudIcon.firstChild) hudIcon.removeChild(hudIcon.firstChild);
          var svgIcon = cfg.iconBuilder();
          svgIcon.setAttribute('width', '48');
          svgIcon.setAttribute('height', '48');
          svgIcon.style.color = cfg.iconColor;
          hudIcon.appendChild(svgIcon);
          hudText.textContent = cfg.text;
          void hudOverlay.offsetWidth;
          hudOverlay.classList.add('visible');
          setTimeout(function() { hudOverlay.className = ''; }, 850);
        }

        function showCountdown(cb) {
          var count = 3;
          function tick() {
            if (count <= 0) { hudOverlay.className = ''; if (cb) cb(); return; }
            hudOverlay.className = 'countdown';
            while (hudIcon.firstChild) hudIcon.removeChild(hudIcon.firstChild);
            hudIcon.appendChild(document.createTextNode(String(count)));
            hudIcon.style.color = 'white';
            hudText.textContent = '';
            void hudOverlay.offsetWidth;
            hudOverlay.classList.add('visible');
            setTimeout(function() {
              hudOverlay.classList.remove('visible');
              setTimeout(function() { count--; tick(); }, 100);
            }, 750);
          }
          tick();
        }

        // ================================================================
        // Region Capture: CropTarget initialization
        // ================================================================
        var helixCropTarget = null;
        (function() {
          if (typeof CropTarget !== 'undefined') {
            var cz = document.getElementById('helix-crop-zone');
            if (cz) {
              CropTarget.fromElement(cz).then(function(ct) {
                helixCropTarget = ct;
              }).catch(function(e) {
                console.warn('CropTarget init failed:', e.message);
              });
            }
          }
        })();

        function applyCrop(stream) {
          if (helixCropTarget) {
            var track = stream.getVideoTracks()[0];
            if (track && typeof track.cropTo === 'function') {
              return track.cropTo(helixCropTarget).then(function() {
                return stream;
              }).catch(function(e) {
                console.warn('cropTo failed:', e.message);
                return stream;
              });
            }
          }
          return Promise.resolve(stream);
        }

        // ================================================================
        // Tab capture state (getDisplayMedia + MediaRecorder)
        // Recording data stays in browser memory until user clicks Save.
        // ================================================================
        var helixCaptureStream = null;
        var helixMediaRecorder = null;
        var helixRecordingChunks = [];
        var helixBlobUrl = null;

        function helixStartMediaRecorder(stream) {
          helixRecordingChunks = [];
          var options = { mimeType: 'video/webm;codecs=vp9' };
          if (!MediaRecorder.isTypeSupported(options.mimeType)) {
            options = { mimeType: 'video/webm' };
          }
          helixMediaRecorder = new MediaRecorder(stream, options);
          helixMediaRecorder.ondataavailable = function(e) {
            if (e.data && e.data.size > 0) {
              helixRecordingChunks.push(e.data);
            }
          };
          helixMediaRecorder.start(1000);
        }

        function helixStopRecording(callback) {
          if (!helixMediaRecorder || helixMediaRecorder.state === 'inactive') {
            callback(false);
            return;
          }
          helixMediaRecorder.onstop = function() {
            helixCall('__helixStopRecording', state.timerSeconds).then(function() {
              callback(true);
            });
          };
          helixMediaRecorder.stop();
          helixMediaRecorder = null;
        }

        // Create a Blob URL for in-browser preview (no disk write needed)
        function helixGetPreviewUrl() {
          if (helixBlobUrl) URL.revokeObjectURL(helixBlobUrl);
          var blob = new Blob(helixRecordingChunks, { type: 'video/webm' });
          helixBlobUrl = URL.createObjectURL(blob);
          return helixBlobUrl;
        }

        // Send chunks to Node one at a time (called only when user clicks Save)
        function helixSaveToNode(filename, callback) {
          helixCall('__helixBeginSave').then(function() {
            var index = 0;
            function sendNext() {
              if (index >= helixRecordingChunks.length) {
                helixCall('__helixCommitSave', filename).then(function(dest) {
                  callback(dest);
                });
                return;
              }
              var reader = new FileReader();
              reader.onloadend = function() {
                var base64 = reader.result.split(',')[1];
                helixCall('__helixWriteChunk', base64).then(function() {
                  index++;
                  sendNext();
                });
              };
              reader.readAsDataURL(helixRecordingChunks[index]);
            }
            sendNext();
          });
        }

        // ================================================================
        // Recording actions
        // ================================================================
        function helixBeginRecording(stream) {
          showCountdown(function() {
            helixCall('__helixStartRecording').then(function(ok) {
              if (ok) {
                state.mode = 'recording';
                state.timerSeconds = 0;
                updateToolbar();
                showHUD('recording');
                // Start MediaRecorder AFTER HUD fades so the overlay is not captured
                setTimeout(function() {
                  helixStartMediaRecorder(stream);
                  startTimer();
                }, 900);
              }
            });
          });
        }

        function doRecord() {
          // Reuse existing capture stream if available (e.g., after Start Over)
          if (helixCaptureStream && helixCaptureStream.active) {
            helixBeginRecording(helixCaptureStream);
            return;
          }
          // Acquire tab capture BEFORE countdown (preserves user activation from click)
          var origTitle = document.title;
          document.title = 'Helix Recording';
          navigator.mediaDevices.getDisplayMedia({
            video: true,
            preferCurrentTab: true
          }).then(function(stream) {
            document.title = origTitle;
            return applyCrop(stream);
          }).then(function(stream) {
            helixCaptureStream = stream;
            helixBeginRecording(stream);
          }).catch(function(err) {
            document.title = origTitle;
            console.error('Screen capture failed:', err);
          });
        }

        function doOnAction() {
          state.mode = 'ready';
          state.timerSeconds = 0;
          timerEl.textContent = '0:00';
          readyArmed = false;
          updateToolbar();
          showHUD('ready-wait');
          // Arm after short delay so the On Action click itself does not trigger
          setTimeout(function() {
            readyArmed = true;
            armClickInterceptor();
          }, 300);
        }

        function doPause() {
          if (state.mode === 'recording') {
            if (helixMediaRecorder && helixMediaRecorder.state === 'recording') helixMediaRecorder.pause();
            helixCall('__helixPauseRecording').then(function() {
              state.mode = 'paused';
              clearInterval(timerInterval);
              updateToolbar();
              showHUD('paused');
            });
          } else if (state.mode === 'paused') {
            finalizeTextInput();
            showHUD('resumed');
            setTimeout(function() {
              if (helixMediaRecorder && helixMediaRecorder.state === 'paused') helixMediaRecorder.resume();
              helixCall('__helixResumeRecording').then(function() {
                state.mode = 'recording';
                startTimer();
                updateToolbar();
              });
            }, 500);
          }
        }

        function doStop() {
          var dur = state.timerSeconds;
          clearInterval(timerInterval);
          state.drawMode = false;
          finalizeTextInput();
          helixStopRecording(function() {
            state.mode = 'stopped';
            updateToolbar();
            showHUD('stopped');
            setTimeout(function() {
              showPostDialog(dur);
            }, 900);
          });
        }

        function doRestart() {
          clearInterval(timerInterval);
          state.drawMode = false;
          finalizeTextInput();
          showHUD('restart');
          // Stop current recording and discard
          if (helixMediaRecorder && helixMediaRecorder.state !== 'inactive') {
            try { helixMediaRecorder.stop(); } catch (_) {}
          }
          helixMediaRecorder = null;
          helixRecordingChunks = [];
          if (helixBlobUrl) { URL.revokeObjectURL(helixBlobUrl); helixBlobUrl = null; }
          // Tell Node to delete any partially saved file
          helixCall('__helixStartOver').then(function() {
            resetForNewRecording();
          });
        }

        // ================================================================
        // Draw mode toggle
        // ================================================================
        function toggleDrawMode() {
          if (state.mode !== 'recording' && state.mode !== 'paused') return;
          state.drawMode = !state.drawMode;
          if (!state.drawMode) finalizeTextInput();
          updateToolbar();
        }

        // ================================================================
        // Tool selection
        // ================================================================
        function selectTool(t) {
          state.tool = t;
          var toolBtns = document.querySelectorAll('[id^="htb-tool-"]');
          for (var i = 0; i < toolBtns.length; i++) toolBtns[i].classList.remove('active');
          var activeBtn = document.getElementById('htb-tool-' + t);
          if (activeBtn) activeBtn.classList.add('active');
          if (state.drawMode) {
            if (t === 'text') canvasContainer.classList.add('text-mode');
            else canvasContainer.classList.remove('text-mode');
            if (t === 'select') canvasContainer.classList.add('select-mode');
            else canvasContainer.classList.remove('select-mode');
          }
          // Update collapsible section visibility for the new tool
          if (state.drawMode) {
            // Colors + stroke: hide for select (shown by onSelectionChange when object selected)
            if (t !== 'select') {
              colorsSection.classList.add('expanded');
              strokeSection.classList.add('expanded');
            } else {
              colorsSection.classList.remove('expanded');
              strokeSection.classList.remove('expanded');
            }
            if (t === 'text') textFmtSection.classList.add('expanded');
            else textFmtSection.classList.remove('expanded');
            if (t === 'rect' || t === 'circle' || t === 'text') fillSection.classList.add('expanded');
            else fillSection.classList.remove('expanded');
            if (t === 'line') arrowSection.classList.add('expanded');
            else arrowSection.classList.remove('expanded');
          } else {
            colorsSection.classList.remove('expanded');
            strokeSection.classList.remove('expanded');
            textFmtSection.classList.remove('expanded');
            fillSection.classList.remove('expanded');
            arrowSection.classList.remove('expanded');
          }
          syncFabricDrawMode();
        }

        function doDeleteSelected() {
          if (!fabricCanvas) return;
          var sel = fabricCanvas.getActiveObject();
          if (sel) {
            fabricCanvas.remove(sel);
            fabricCanvas.discardActiveObject();
            fabricCanvas.renderAll();
            // Brief red flash on delete button
            var btn = document.getElementById('htb-btn-delete');
            if (btn) {
              btn.style.color = '#ff3b30';
              setTimeout(function() { btn.style.color = ''; }, 200);
            }
          }
        }

        function openVideoFullscreen() {
          dialogVideo.pause();
          fsVideo.src = dialogVideo.src;
          fsVideo.currentTime = dialogVideo.currentTime;
          dialogBackdrop.style.display = 'none';
          videoFullscreen.classList.add('visible');
          fsVideo.play();
        }

        function closeVideoFullscreen() {
          dialogVideo.currentTime = fsVideo.currentTime;
          fsVideo.pause();
          fsVideo.removeAttribute('src');
          videoFullscreen.classList.remove('visible');
          dialogBackdrop.style.display = '';
        }

        // ================================================================
        // Text size / background
        // ================================================================
        function setTextSize(size) {
          state.textSize = size;
          var ids = ['htb-tsize-14', 'htb-tsize-18', 'htb-tsize-28', 'htb-tsize-40'];
          ids.forEach(function(id) {
            var b = document.getElementById(id);
            if (b) b.classList.remove('active');
          });
          var act = document.getElementById('htb-tsize-' + size);
          if (act) act.classList.add('active');
          if (activeTextInput) {
            textInputEl.style.fontSize = size + 'px';
          }
          // Apply to selected text object
          if (fabricCanvas) {
            var sel = fabricCanvas.getActiveObject();
            if (sel && (sel.type === 'i-text' || sel.type === 'text')) {
              sel.set('fontSize', size);
              fabricCanvas.renderAll();
            }
          }
        }

        function toggleTextBg() {
          state.textBg = !state.textBg;
          var btn = document.getElementById('htb-btn-text-bg');
          if (btn) {
            if (state.textBg) btn.classList.add('active');
            else btn.classList.remove('active');
          }
          if (activeTextInput) {
            if (state.textBg) {
              textInputEl.style.background = 'rgba(0,0,0,0.65)';
              textInputEl.style.padding = '4px 8px';
              textInputEl.style.borderRadius = '6px';
            } else {
              textInputEl.style.background = 'transparent';
              textInputEl.style.padding = '2px 4px';
              textInputEl.style.borderRadius = '0';
            }
          }
          // Apply to selected text object
          if (fabricCanvas) {
            var sel = fabricCanvas.getActiveObject();
            if (sel && (sel.type === 'i-text' || sel.type === 'text')) {
              sel.set('backgroundColor', state.textBg ? 'rgba(0,0,0,0.65)' : '');
              fabricCanvas.renderAll();
            }
          }
        }

        function toggleTextBd() {
          state.textBd = !state.textBd;
          var btn = document.getElementById('htb-btn-text-bd');
          if (btn) {
            if (state.textBd) btn.classList.add('active');
            else btn.classList.remove('active');
          }
          if (activeTextInput) {
            if (state.textBd) {
              textInputEl.style.border = '2px solid ' + state.color;
              textInputEl.style.borderRadius = '4px';
            } else {
              textInputEl.style.border = 'none';
            }
          }
          // Apply to selected text object — use custom _helixBorder for box border
          if (fabricCanvas) {
            var sel = fabricCanvas.getActiveObject();
            if (sel && (sel.type === 'i-text' || sel.type === 'text')) {
              sel._helixBorder = state.textBd;
              sel._helixBorderColor = state.textBd ? state.color : '';
              // Clear any old character-level stroke
              sel.set({ stroke: '', strokeWidth: 0 });
              fabricCanvas.renderAll();
            }
          }
        }

        // ================================================================
        // Stroke width
        // ================================================================
        function setStrokeWidth(w) {
          state.strokeWidth = w;
          var ids = ['htb-sw-1', 'htb-sw-2', 'htb-sw-3', 'htb-sw-5'];
          ids.forEach(function(id) { var b = document.getElementById(id); if (b) b.classList.remove('active'); });
          var act = document.getElementById('htb-sw-' + w);
          if (act) act.classList.add('active');
          // Update pen brush
          if (fabricCanvas && fabricCanvas.freeDrawingBrush) {
            fabricCanvas.freeDrawingBrush.width = w;
          }
          // Apply to selected object
          if (fabricCanvas) {
            var sel = fabricCanvas.getActiveObject();
            if (sel) {
              if (sel.stroke && sel.type !== 'i-text' && sel.type !== 'text') {
                sel.set('strokeWidth', w);
                if (sel._helixLine) sel.dirty = true;
              }
              fabricCanvas.renderAll();
            }
          }
        }

        // ================================================================
        // Fill toggle
        // ================================================================
        function hexToRgba(hex, alpha) {
          var r = parseInt(hex.slice(1,3), 16);
          var g = parseInt(hex.slice(3,5), 16);
          var b = parseInt(hex.slice(5,7), 16);
          return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
        }
        function toggleFill() {
          state.fillEnabled = !state.fillEnabled;
          state.fillColor = state.fillEnabled ? hexToRgba(state.color, 0.25) : 'transparent';
          var btn = document.getElementById('htb-btn-fill');
          if (btn) {
            if (state.fillEnabled) btn.classList.add('active');
            else btn.classList.remove('active');
          }
          // Apply to selected object
          if (fabricCanvas) {
            var sel = fabricCanvas.getActiveObject();
            if (sel) {
              if (sel.type === 'i-text' || sel.type === 'text') {
                sel.set('backgroundColor', state.fillEnabled ? 'rgba(0,0,0,0.65)' : '');
              } else if (sel.type !== 'line') {
                sel.set('fill', state.fillEnabled ? hexToRgba(state.color, 0.25) : 'transparent');
              }
              fabricCanvas.renderAll();
            }
          }
        }

        // ================================================================
        // Arrow mode (for line tool)
        // ================================================================
        function setArrowMode(mode) {
          state.arrowMode = mode;
          var ids = ['htb-arr-none', 'htb-arr-end', 'htb-arr-start', 'htb-arr-both'];
          ids.forEach(function(id) { var b = document.getElementById(id); if (b) b.classList.remove('active'); });
          var act = document.getElementById('htb-arr-' + mode);
          if (act) act.classList.add('active');
          // Apply to selected line object
          if (fabricCanvas) {
            var sel = fabricCanvas.getActiveObject();
            if (sel && sel._helixLine) {
              updateLineArrows(sel, mode);
              fabricCanvas.renderAll();
            }
          }
        }

        // ================================================================
        // Color selection
        // ================================================================
        function selectColor(c, dotEl) {
          state.color = c;
          if (state.fillEnabled) state.fillColor = hexToRgba(c, 0.25);
          var dots = document.querySelectorAll('.htb-color-dot');
          for (var i = 0; i < dots.length; i++) dots[i].classList.remove('active');
          if (dotEl) dotEl.classList.add('active');
          if (activeTextInput) {
            textInputEl.style.color = c;
            if (state.textBd) textInputEl.style.borderColor = c;
          }
          // Update fabric.js brush/tool color
          if (fabricCanvas) {
            fabricCanvas.freeDrawingBrush.color = c;
            // Apply color to currently selected object
            var sel = fabricCanvas.getActiveObject();
            if (sel) {
              if (sel.type === 'i-text' || sel.type === 'text') {
                // Font color
                sel.set('fill', c);
                // Update box border color if active
                if (sel._helixBorder) sel._helixBorderColor = c;
              } else if (sel._helixLine) {
                sel.set('stroke', c);
                sel.dirty = true;
              } else {
                // Shapes: update stroke color only; fill stays independent (semi-transparent)
                if (sel.stroke) sel.set('stroke', c);
                if (sel.fill && sel.fill !== 'transparent') sel.set('fill', hexToRgba(c, 0.25));
              }
              fabricCanvas.renderAll();
            }
          }
        }

        // ================================================================
        // Undo / Clear (fabric.js)
        // ================================================================
        function doUndo() {
          if (!fabricCanvas) return;
          var objects = fabricCanvas.getObjects();
          if (objects.length > 0) {
            fabricCanvas.remove(objects[objects.length - 1]);
            fabricCanvas.renderAll();
          }
        }

        function doClear() {
          if (!fabricCanvas) return;
          fabricCanvas.clear();
          fabricCanvas.renderAll();
          finalizeTextInput();
        }

        // ================================================================
        // Text tool input overlay
        // ================================================================
        function openTextInput(x, y) {
          activeTextInput = true;
          textInputEl.textContent = '';
          textInputEl.style.display = 'block';
          textInputEl.style.left = x + 'px';
          textInputEl.style.top = y + 'px';
          textInputEl.style.color = state.color;
          textInputEl.style.borderColor = state.color;
          textInputEl.style.fontSize = state.textSize + 'px';
          textInputEl.style.zIndex = '2147483647';
          if (state.textBg) {
            textInputEl.style.background = 'rgba(0,0,0,0.65)';
            textInputEl.style.padding = '4px 8px';
            textInputEl.style.borderRadius = '6px';
          } else {
            textInputEl.style.background = 'transparent';
            textInputEl.style.padding = '2px 4px';
            textInputEl.style.borderRadius = '0';
          }
          if (state.textBd) {
            textInputEl.style.border = '2px solid ' + state.color;
            textInputEl.style.borderRadius = '4px';
          } else {
            textInputEl.style.border = '1px dashed rgba(255,255,255,0.4)';
          }
          requestAnimationFrame(function() {
            textInputEl.focus();
            var range = document.createRange();
            var sel = window.getSelection();
            range.selectNodeContents(textInputEl);
            range.collapse(false);
            sel.removeAllRanges();
            sel.addRange(range);
          });
        }

        function finalizeTextInput() {
          if (!activeTextInput) return;
          var txt = textInputEl.textContent.trim();
          if (txt && fabricCanvas) {
            var rect = textInputEl.getBoundingClientRect();
            var textObj = new fabric.IText(txt, {
              left: rect.left + window.scrollX,
              top: rect.top + window.scrollY,
              fontSize: state.textSize,
              fontWeight: '600',
              fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif',
              fill: state.color,
              editable: true,
              selectable: true,
              strokeUniform: true
            });
            if (state.textBg) {
              textObj.set('backgroundColor', 'rgba(0,0,0,0.65)');
            }
            if (state.textBd) {
              textObj._helixBorder = true;
              textObj._helixBorderColor = state.color;
            }
            fabricCanvas.add(textObj);
            fabricCanvas.renderAll();
          }
          textInputEl.style.display = 'none';
          textInputEl.textContent = '';
          activeTextInput = false;
        }

        textInputEl.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            finalizeTextInput();
          }
          e.stopPropagation();
        });

        document.addEventListener('mousedown', function(e) {
          if (activeTextInput && e.target !== textInputEl && !textInputEl.contains(e.target)) {
            setTimeout(function() { finalizeTextInput(); }, 10);
          }
        }, true);

        // ================================================================
        // Fabric.js integration
        // ================================================================
        function initFabric() {
          if (typeof fabric === 'undefined' || fabricLoaded) return;
          fabricLoaded = true;
          fabricCanvas = new fabric.Canvas('helix-annotation-canvas', {
            selection: true,
            selectionKey: ['metaKey', 'ctrlKey'],
            uniformScaling: false,
            width: window.innerWidth,
            height: window.innerHeight - 60
          });
          fabricCanvas.freeDrawingBrush = new fabric.PencilBrush(fabricCanvas);
          fabricCanvas.freeDrawingBrush.color = state.color;
          fabricCanvas.freeDrawingBrush.width = state.strokeWidth;

          // Shape drawing state
          var shapeOrigin = null;
          var shapePreview = null;

          // Handle mouse events for arrow/rect/circle tools
          fabricCanvas.on('mouse:down', function(opt) {
            if (!state.drawMode) return;
            var tool = state.tool;
            if (tool === 'pen' || tool === 'text' || tool === 'select') return;
            var pointer = fabricCanvas.getPointer(opt.e);
            shapeOrigin = { x: pointer.x, y: pointer.y };
            fabricCanvas.selection = false;
          });

          fabricCanvas.on('mouse:move', function(opt) {
            if (!shapeOrigin || !state.drawMode) return;
            var tool = state.tool;
            if (tool === 'pen' || tool === 'text' || tool === 'select') return;
            var pointer = fabricCanvas.getPointer(opt.e);
            if (isConstrainKey(opt.e) && (tool === 'rect' || tool === 'circle')) {
              var dx = pointer.x - shapeOrigin.x;
              var dy = pointer.y - shapeOrigin.y;
              var side = Math.max(Math.abs(dx), Math.abs(dy));
              pointer.x = shapeOrigin.x + (dx < 0 ? -side : side);
              pointer.y = shapeOrigin.y + (dy < 0 ? -side : side);
            }
            if (shapePreview) {
              fabricCanvas.remove(shapePreview);
              shapePreview = null;
            }
            if (tool === 'line') {
              shapePreview = createLine(shapeOrigin.x, shapeOrigin.y, pointer.x, pointer.y, state.color, state.arrowMode);
            } else if (tool === 'rect') {
              shapePreview = createRect(shapeOrigin.x, shapeOrigin.y, pointer.x, pointer.y, state.color);
            } else if (tool === 'circle') {
              shapePreview = createEllipse(shapeOrigin.x, shapeOrigin.y, pointer.x, pointer.y, state.color);
            }
            if (shapePreview) {
              shapePreview.set({ selectable: false, evented: false });
              fabricCanvas.add(shapePreview);
              fabricCanvas.renderAll();
            }
          });

          fabricCanvas.on('mouse:up', function(opt) {
            if (!shapeOrigin || !state.drawMode) return;
            var tool = state.tool;
            if (tool === 'pen' || tool === 'text' || tool === 'select') { shapeOrigin = null; return; }
            var pointer = fabricCanvas.getPointer(opt.e);
            if (isConstrainKey(opt.e) && (tool === 'rect' || tool === 'circle')) {
              var dx = pointer.x - shapeOrigin.x;
              var dy = pointer.y - shapeOrigin.y;
              var side = Math.max(Math.abs(dx), Math.abs(dy));
              pointer.x = shapeOrigin.x + (dx < 0 ? -side : side);
              pointer.y = shapeOrigin.y + (dy < 0 ? -side : side);
            }
            if (shapePreview) {
              fabricCanvas.remove(shapePreview);
              shapePreview = null;
            }
            var finalShape = null;
            if (tool === 'line') {
              finalShape = createLine(shapeOrigin.x, shapeOrigin.y, pointer.x, pointer.y, state.color, state.arrowMode);
            } else if (tool === 'rect') {
              finalShape = createRect(shapeOrigin.x, shapeOrigin.y, pointer.x, pointer.y, state.color);
            } else if (tool === 'circle') {
              finalShape = createEllipse(shapeOrigin.x, shapeOrigin.y, pointer.x, pointer.y, state.color);
            }
            if (finalShape) {
              finalShape.set({ selectable: true, evented: true });
              fabricCanvas.add(finalShape);
              fabricCanvas.renderAll();
            }
            shapeOrigin = null;
          });

          // Handle text tool click on canvas
          fabricCanvas.on('mouse:down', function(opt) {
            if (!state.drawMode || state.tool !== 'text') return;
            // Only handle clicks on the blank canvas, not on existing objects
            if (opt.target) return;
            var pointer = fabricCanvas.getPointer(opt.e);
            if (activeTextInput) {
              finalizeTextInput();
            }
            openTextInput(opt.e.clientX, opt.e.clientY);
          });

          // Sync toolbar UI when selecting/deselecting annotations
          function onSelectionChange(opt) {
            var sel = opt.selected ? opt.selected[0] : null;
            if (!sel) sel = opt.target;
            if (!sel) return;

            // Show colors + stroke when an object is selected (even in select mode)
            colorsSection.classList.add('expanded');
            strokeSection.classList.add('expanded');

            // --- Sync stroke width from selected object (updates state for next draw) ---
            var selStroke = null;
            if (sel._helixLine) {
              selStroke = sel.strokeWidth;
            } else if (sel.strokeWidth !== undefined && sel.type !== 'i-text' && sel.type !== 'text') {
              selStroke = sel.strokeWidth;
            }
            if (selStroke !== null) {
              state.strokeWidth = selStroke;
              var swIds = ['htb-sw-1', 'htb-sw-2', 'htb-sw-3', 'htb-sw-5'];
              swIds.forEach(function(id) { var b = document.getElementById(id); if (b) b.classList.remove('active'); });
              var swAct = document.getElementById('htb-sw-' + selStroke);
              if (swAct) swAct.classList.add('active');
            }

            // --- Sync fill button UI from selected object (visual only, don't mutate state) ---
            var selHasFill = false;
            if (sel.type === 'i-text' || sel.type === 'text') {
              selHasFill = !!(sel.backgroundColor && sel.backgroundColor !== '');
            } else if (sel.fill) {
              selHasFill = sel.fill !== 'transparent';
            }
            var fillBtn = document.getElementById('htb-btn-fill');
            if (fillBtn) { if (selHasFill) fillBtn.classList.add('active'); else fillBtn.classList.remove('active'); }

            // --- Arrowhead options: show ONLY for line objects ---
            if (sel._helixLine) {
              arrowSection.classList.add('expanded');
              fillSection.classList.remove('expanded');
              var selMode = sel._helixArrowMode || 'end';
              state.arrowMode = selMode;
              var arrIds = ['htb-arr-none', 'htb-arr-end', 'htb-arr-start', 'htb-arr-both'];
              arrIds.forEach(function(id) { var b = document.getElementById(id); if (b) b.classList.remove('active'); });
              var arrAct = document.getElementById('htb-arr-' + selMode);
              if (arrAct) arrAct.classList.add('active');
            } else {
              arrowSection.classList.remove('expanded');
            }

            // --- Text formatting ---
            if (sel.type === 'i-text' || sel.type === 'text') {
              textFmtSection.classList.add('expanded');
              fillSection.classList.add('expanded');
              var sz = sel.fontSize || 18;
              var tsIds = ['htb-tsize-14', 'htb-tsize-18', 'htb-tsize-28', 'htb-tsize-40'];
              tsIds.forEach(function(id) { var b = document.getElementById(id); if (b) b.classList.remove('active'); });
              var tsAct = document.getElementById('htb-tsize-' + sz);
              if (tsAct) tsAct.classList.add('active');
              state.textSize = sz;
              // Sync BG state
              var hasBg = sel.backgroundColor && sel.backgroundColor !== '';
              state.textBg = hasBg;
              var bgBtn = document.getElementById('htb-btn-text-bg');
              if (bgBtn) { if (hasBg) bgBtn.classList.add('active'); else bgBtn.classList.remove('active'); }
              // Sync BD state (box border via _helixBorder)
              var hasBd = !!sel._helixBorder;
              state.textBd = hasBd;
              var bdBtn = document.getElementById('htb-btn-text-bd');
              if (bdBtn) { if (hasBd) bdBtn.classList.add('active'); else bdBtn.classList.remove('active'); }
            } else if (state.tool !== 'text') {
              textFmtSection.classList.remove('expanded');
            }

            // --- Show fill section for shapes ---
            if (sel.type === 'rect' || sel.type === 'ellipse') {
              fillSection.classList.add('expanded');
            }
          }
          fabricCanvas.on('selection:created', onSelectionChange);
          fabricCanvas.on('selection:updated', onSelectionChange);
          fabricCanvas.on('selection:cleared', function() {
            if (state.tool !== 'text') textFmtSection.classList.remove('expanded');
            arrowSection.classList.remove('expanded');
            // In select mode with nothing selected, hide colors/stroke/fill
            if (state.tool === 'select') {
              colorsSection.classList.remove('expanded');
              strokeSection.classList.remove('expanded');
              fillSection.classList.remove('expanded');
            } else {
              // Restore fill button to actual state preference
              var fillBtn = document.getElementById('htb-btn-fill');
              if (fillBtn) { if (state.fillEnabled) fillBtn.classList.add('active'); else fillBtn.classList.remove('active'); }
              // Restore fill/arrow section based on current tool
              if (state.tool === 'rect' || state.tool === 'circle' || state.tool === 'text') fillSection.classList.add('expanded');
              else fillSection.classList.remove('expanded');
              if (state.tool === 'line') arrowSection.classList.add('expanded');
            }
          });

          fabricCanvas.on('object:scaling', function(opt) {
            var obj = opt.target;
            if (isConstrainKey(opt.e) && (obj.type === 'rect' || obj.type === 'ellipse')) {
              var max = Math.max(obj.scaleX, obj.scaleY);
              obj.set({ scaleX: max, scaleY: max });
            }
          });

          fabricCanvas.on('object:modified', function(opt) {
            var obj = opt.target;
            if (obj._helixLine) return;
            if (obj.type === 'i-text' || obj.type === 'text') return;
            if (obj.scaleX === 1 && obj.scaleY === 1) return;
            if (obj.type === 'rect') {
              obj.set({ width: obj.width * obj.scaleX, height: obj.height * obj.scaleY, scaleX: 1, scaleY: 1 });
            } else if (obj.type === 'ellipse') {
              obj.set({ rx: obj.rx * obj.scaleX, ry: obj.ry * obj.scaleY, scaleX: 1, scaleY: 1 });
            }
            obj.setCoords();
          });

          // Constrain annotations within canvas bounds
          fabricCanvas.on('object:moving', function(opt) {
            var obj = opt.target;
            var bound = obj.getBoundingRect();
            var cw = fabricCanvas.getWidth();
            var ch = fabricCanvas.getHeight();
            if (bound.left < 0) obj.left = obj.left - bound.left;
            if (bound.top < 0) obj.top = obj.top - bound.top;
            if (bound.left + bound.width > cw) obj.left = obj.left - (bound.left + bound.width - cw);
            if (bound.top + bound.height > ch) obj.top = obj.top - (bound.top + bound.height - ch);
          });

          // Draw box borders around text objects with _helixBorder
          fabricCanvas.on('after:render', function() {
            var ctx = fabricCanvas.getElement().getContext('2d');
            fabricCanvas.forEachObject(function(obj) {
              if ((obj.type === 'i-text' || obj.type === 'text') && obj._helixBorder && obj._helixBorderColor) {
                var bound = obj.getBoundingRect();
                var pad = 4;
                ctx.save();
                ctx.strokeStyle = obj._helixBorderColor;
                ctx.lineWidth = 2;
                ctx.setLineDash([]);
                ctx.strokeRect(bound.left - pad, bound.top - pad, bound.width + pad * 2, bound.height + pad * 2);
                ctx.restore();
              }
            });
          });

          // Right-click context menu for annotations
          var ctxMenu = null;
          function dismissCtxMenu() {
            if (ctxMenu) { ctxMenu.remove(); ctxMenu = null; }
          }
          canvasContainer.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            dismissCtxMenu();
            if (!state.drawMode) return;
            var target = fabricCanvas.findTarget(e);
            if (!target) return;
            fabricCanvas.setActiveObject(target);
            fabricCanvas.renderAll();
            ctxMenu = mkEl('div', { className: 'helix-context-menu', style: { left: e.clientX + 'px', top: e.clientY + 'px' } });
            var deleteItem = mkEl('button', { className: 'helix-context-menu-item', onClick: function() {
              fabricCanvas.remove(target);
              fabricCanvas.discardActiveObject();
              fabricCanvas.renderAll();
              dismissCtxMenu();
            } });
            var trashSvg = iconTrash();
            trashSvg.style.color = '#ff453a';
            deleteItem.appendChild(trashSvg);
            deleteItem.appendChild(document.createTextNode('Delete'));
            ctxMenu.appendChild(deleteItem);
            document.body.appendChild(ctxMenu);
          });
          document.addEventListener('click', function() { dismissCtxMenu(); });
          document.addEventListener('keydown', function() { dismissCtxMenu(); });

          // Sync canvas viewportTransform with page scroll (page-pinned annotations)
          // Use synchronous handler to avoid 1-frame jitter
          window.addEventListener('scroll', function() {
            if (!fabricCanvas) return;
            var vt = fabricCanvas.viewportTransform.slice();
            vt[4] = -window.scrollX;
            vt[5] = -window.scrollY;
            fabricCanvas.setViewportTransform(vt);
          }, { passive: true });

          // Clear annotations on SPA navigation (URL change without full page reload)
          var lastHref = location.href;
          setInterval(function() {
            if (location.href !== lastHref) {
              lastHref = location.href;
              if (fabricCanvas) {
                fabricCanvas.clear();
                fabricCanvas.renderAll();
              }
            }
          }, 500);

          // Resize handler — update fabric canvas and its wrapper
          window.addEventListener('resize', function() {
            if (fabricCanvas) {
              var w = window.innerWidth;
              var h = window.innerHeight - 60;
              fabricCanvas.setWidth(w);
              fabricCanvas.setHeight(h);
              fabricCanvas.calcOffset();
              fabricCanvas.renderAll();
            }
          });

          syncFabricDrawMode();
        }

        function arrowHeadLen(sw) { return Math.max(sw * 4, 10); }

        function renderEndpointControl(ctx, left, top) {
          ctx.save();
          ctx.fillStyle = '#007aff';
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(left, top, 5, 0, Math.PI * 2);
          ctx.fill();
          ctx.stroke();
          ctx.restore();
        }

        function createLine(x1, y1, x2, y2, color, arrowMode) {
          var sw = state.strokeWidth;
          var lineObj = new fabric.Line([x1, y1, x2, y2], {
            stroke: color,
            strokeWidth: sw,
            strokeLineCap: 'butt',
            strokeUniform: true,
            objectCaching: false,
            padding: 10,
            hasBorders: false
          });
          lineObj._helixLine = true;
          lineObj._helixArrowMode = arrowMode || 'none';

          lineObj._render = function(ctx) {
            var pts = this.calcLinePoints();
            var mode = this._helixArrowMode;
            var dx = pts.x2 - pts.x1;
            var dy = pts.y2 - pts.y1;
            var len = Math.sqrt(dx * dx + dy * dy);
            if (len === 0) return;
            var ux = dx / len;
            var uy = dy / len;
            var hLen = arrowHeadLen(this.strokeWidth);
            var hHalf = hLen * 0.35;

            // Compute shortened line endpoints (pull back at arrow ends)
            var lx1 = pts.x1, ly1 = pts.y1;
            var lx2 = pts.x2, ly2 = pts.y2;
            if (mode === 'start' || mode === 'both') {
              lx1 += ux * hLen;
              ly1 += uy * hLen;
            }
            if (mode === 'end' || mode === 'both') {
              lx2 -= ux * hLen;
              ly2 -= uy * hLen;
            }

            // Draw the line
            ctx.beginPath();
            ctx.moveTo(lx1, ly1);
            ctx.lineTo(lx2, ly2);
            ctx.lineWidth = this.strokeWidth;
            ctx.lineCap = 'round';
            ctx.strokeStyle = this.stroke;
            ctx.stroke();

            // Draw arrowheads as filled triangles
            ctx.fillStyle = this.stroke;
            var angle = Math.atan2(dy, dx);
            if (mode === 'end' || mode === 'both') {
              ctx.save();
              ctx.translate(pts.x2, pts.y2);
              ctx.rotate(angle);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(-hLen, -hHalf);
              ctx.lineTo(-hLen, hHalf);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
            if (mode === 'start' || mode === 'both') {
              ctx.save();
              ctx.translate(pts.x1, pts.y1);
              ctx.rotate(angle + Math.PI);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.lineTo(-hLen, -hHalf);
              ctx.lineTo(-hLen, hHalf);
              ctx.closePath();
              ctx.fill();
              ctx.restore();
            }
          };

          lineObj.controls = {
            p1: new fabric.Control({
              positionHandler: function(dim, finalMatrix, fabricObject) {
                var pts = fabricObject.calcLinePoints();
                return fabric.util.transformPoint(
                  new fabric.Point(pts.x1, pts.y1),
                  fabric.util.multiplyTransformMatrices(
                    fabricObject.canvas.viewportTransform,
                    fabricObject.calcTransformMatrix()
                  )
                );
              },
              actionHandler: function(eventData, transform, x, y) {
                var obj = transform.target;
                var pt = fabric.util.transformPoint(
                  new fabric.Point(x, y),
                  fabric.util.invertTransform(obj.canvas.viewportTransform)
                );
                obj.set({ x1: pt.x, y1: pt.y });
                obj._setWidthHeight();
                obj.setCoords();
                obj.dirty = true;
                return true;
              },
              actionName: 'modifyLine',
              cursorStyle: 'crosshair',
              render: renderEndpointControl
            }),
            p2: new fabric.Control({
              positionHandler: function(dim, finalMatrix, fabricObject) {
                var pts = fabricObject.calcLinePoints();
                return fabric.util.transformPoint(
                  new fabric.Point(pts.x2, pts.y2),
                  fabric.util.multiplyTransformMatrices(
                    fabricObject.canvas.viewportTransform,
                    fabricObject.calcTransformMatrix()
                  )
                );
              },
              actionHandler: function(eventData, transform, x, y) {
                var obj = transform.target;
                var pt = fabric.util.transformPoint(
                  new fabric.Point(x, y),
                  fabric.util.invertTransform(obj.canvas.viewportTransform)
                );
                obj.set({ x2: pt.x, y2: pt.y });
                obj._setWidthHeight();
                obj.setCoords();
                obj.dirty = true;
                return true;
              },
              actionName: 'modifyLine',
              cursorStyle: 'crosshair',
              render: renderEndpointControl
            })
          };

          return lineObj;
        }

        function updateLineArrows(lineObj, mode) {
          if (!lineObj._helixLine) return;
          lineObj._helixArrowMode = mode;
          lineObj.dirty = true;
          if (lineObj.canvas) lineObj.canvas.renderAll();
        }

        function createRect(x1, y1, x2, y2, color) {
          var left = Math.min(x1, x2);
          var top = Math.min(y1, y2);
          var width = Math.abs(x2 - x1);
          var height = Math.abs(y2 - y1);
          return new fabric.Rect({
            left: left, top: top, width: width, height: height,
            fill: state.fillEnabled ? hexToRgba(state.color, 0.25) : 'transparent',
            stroke: color,
            strokeWidth: state.strokeWidth,
            strokeUniform: true
          });
        }

        function createEllipse(x1, y1, x2, y2, color) {
          var left = Math.min(x1, x2);
          var top = Math.min(y1, y2);
          var rx = Math.abs(x2 - x1) / 2;
          var ry = Math.abs(y2 - y1) / 2;
          return new fabric.Ellipse({
            left: left, top: top, rx: rx || 1, ry: ry || 1,
            fill: state.fillEnabled ? hexToRgba(state.color, 0.25) : 'transparent',
            stroke: color,
            strokeWidth: state.strokeWidth,
            strokeUniform: true
          });
        }

        function syncFabricDrawMode() {
          if (!fabricCanvas) return;
          if (state.drawMode && state.tool === 'pen') {
            fabricCanvas.isDrawingMode = true;
            fabricCanvas.freeDrawingBrush.color = state.color;
            fabricCanvas.freeDrawingBrush.width = state.strokeWidth;
            fabricCanvas.selection = false;
            fabricCanvas.skipTargetFind = true;
            fabricCanvas.forEachObject(function(o) { o.selectable = false; o.evented = false; });
          } else if (state.drawMode && state.tool === 'select') {
            fabricCanvas.isDrawingMode = false;
            fabricCanvas.selection = true;
            fabricCanvas.skipTargetFind = false;
            fabricCanvas.forEachObject(function(o) { o.selectable = true; o.evented = true; });
          } else {
            fabricCanvas.isDrawingMode = false;
            if (!state.drawMode) {
              fabricCanvas.discardActiveObject();
              fabricCanvas.renderAll();
              fabricCanvas.selection = false;
              fabricCanvas.skipTargetFind = false;
              fabricCanvas.forEachObject(function(o) { o.selectable = false; o.evented = false; });
            } else {
              fabricCanvas.selection = false;
              fabricCanvas.skipTargetFind = true;
              fabricCanvas.forEachObject(function(o) { o.selectable = false; o.evented = false; });
            }
          }
        }

        // Poll for fabric.js availability (loaded via Runtime.evaluate)
        var fabricPollCount = 0;
        var fabricPoll = setInterval(function() {
          fabricPollCount++;
          if (typeof fabric !== 'undefined') {
            clearInterval(fabricPoll);
            initFabric();
          }
          if (fabricPollCount > 100) clearInterval(fabricPoll);
        }, 100);

        // ================================================================
        // Record on Action: click interceptor
        // ================================================================
        var interceptorEl = null;

        function armClickInterceptor() {
          if (interceptorEl) removeClickInterceptor();
          interceptorEl = mkEl('div', { id: 'helix-click-interceptor' });
          interceptorEl.addEventListener('click', function(e) {
            if (state.mode !== 'ready' || !readyArmed) return;
            var clickX = e.clientX;
            var clickY = e.clientY;
            readyArmed = false;
            removeClickInterceptor();
            // Start tab capture (click provides user activation), then replay click
            var origTitle = document.title;
            document.title = 'Helix Recording';
            navigator.mediaDevices.getDisplayMedia({
              video: true,
              preferCurrentTab: true
            }).then(function(stream) {
              document.title = origTitle;
              return applyCrop(stream);
            }).then(function(stream) {
              helixCaptureStream = stream;
              helixCall('__helixStartRecording').then(function(ok) {
                if (ok) {
                  state.mode = 'recording';
                  state.timerSeconds = 0;
                  updateToolbar();
                  showHUD('recording');
                  // Start MediaRecorder after HUD fades, then replay the click
                  setTimeout(function() {
                    helixStartMediaRecorder(stream);
                    startTimer();
                    var targetEl = document.elementFromPoint(clickX, clickY);
                    if (targetEl) {
                      targetEl.dispatchEvent(new MouseEvent('click', {
                        clientX: clickX,
                        clientY: clickY,
                        bubbles: true,
                        cancelable: true,
                        view: window
                      }));
                    }
                  }, 900);
                }
              });
            }).catch(function(err) {
              document.title = origTitle;
              console.error('Screen capture failed:', err);
              state.mode = 'idle';
              updateToolbar();
            });
          });
          document.body.appendChild(interceptorEl);
        }

        function removeClickInterceptor() {
          if (interceptorEl && interceptorEl.parentNode) {
            interceptorEl.parentNode.removeChild(interceptorEl);
          }
          interceptorEl = null;
        }

        // ================================================================
        // Post-recording dialog
        // ================================================================
        function generateFilename() {
          var now = new Date();
          var y = now.getFullYear();
          var mo = String(now.getMonth() + 1).padStart(2, '0');
          var d = String(now.getDate()).padStart(2, '0');
          var dateStr = y + '-' + mo + '-' + d;
          try {
            var loc = window.location;
            var domain = loc.hostname.replace(/\./g, '-');
            var pathStr = loc.pathname.replace(/^\//, '').replace(/\//g, '_').replace(/[^a-zA-Z0-9_-]/g, '');
            if (!pathStr) pathStr = 'index';
            return dateStr + '_' + domain + '_' + pathStr + '.webm';
          } catch (_) {
            return dateStr + '_recording.webm';
          }
        }

        function showPostDialog(durationSecs) {
          if (durationSecs === undefined) durationSecs = state.timerSeconds;
          dialogDuration.textContent = 'Duration: ' + formatTime(durationSecs);
          dialogFilenameInput.value = generateFilename();
          // Preview from browser memory (no disk write yet)
          dialogVideo.src = helixGetPreviewUrl();
          // Fix WebM blob duration: Chrome reports Infinity for MediaRecorder blobs.
          // Seek to a large time to force duration calculation, then reset.
          dialogVideo.addEventListener('loadedmetadata', function onMeta() {
            dialogVideo.removeEventListener('loadedmetadata', onMeta);
            if (!isFinite(dialogVideo.duration)) {
              dialogVideo.currentTime = 1e10;
              dialogVideo.addEventListener('timeupdate', function onSeek() {
                dialogVideo.removeEventListener('timeupdate', onSeek);
                dialogVideo.currentTime = 0;
              });
            }
          });
          dialogVideo.load();
          dialogBackdrop.classList.add('visible');
        }

        function hidePostDialog() {
          // Close fullscreen video overlay if open
          if (videoFullscreen.classList.contains('visible')) {
            fsVideo.pause();
            fsVideo.removeAttribute('src');
            videoFullscreen.classList.remove('visible');
          }
          dialogBackdrop.classList.remove('visible');
          dialogVideo.pause();
          dialogVideo.removeAttribute('src');
        }

        function dialogSaveClose() {
          var fn = dialogFilenameInput.value.trim();
          if (!fn) fn = generateFilename();
          // Send recording data to Node in chunks, then close
          helixSaveToNode(fn, function() {
            hidePostDialog();
            helixCall('__helixCloseBrowser');
          });
        }

        function dialogStartOver() {
          hidePostDialog();
          if (helixBlobUrl) { URL.revokeObjectURL(helixBlobUrl); helixBlobUrl = null; }
          helixCall('__helixStartOver').then(function() {
            resetForNewRecording();
          });
        }

        function dialogClose() {
          hidePostDialog();
          if (helixBlobUrl) { URL.revokeObjectURL(helixBlobUrl); helixBlobUrl = null; }
          helixCall('__helixNoSave').then(function() {
            helixCall('__helixCloseBrowser');
          });
        }

        function resetForNewRecording() {
          if (fabricCanvas) fabricCanvas.clear();
          // Stop MediaRecorder but keep capture stream alive for reuse
          if (helixMediaRecorder && helixMediaRecorder.state !== 'inactive') {
            try { helixMediaRecorder.stop(); } catch (_) {}
          }
          helixMediaRecorder = null;
          helixRecordingChunks = [];
          state.mode = 'idle';
          state.drawMode = false;
          state.timerSeconds = 0;
          timerEl.textContent = '0:00';
          updateToolbar();
        }

        // ================================================================
        // Keyboard shortcuts
        // ================================================================
        document.addEventListener('keydown', function(e) {
          var tag = e.target.tagName;
          if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
          // Guard: suppress when fabric.js IText is in editing mode
          if (fabricCanvas) {
            var activeObj = fabricCanvas.getActiveObject();
            if (activeObj && activeObj.isEditing) return;
          }
          if (dialogBackdrop.classList.contains('visible')) return;

          if (e.code === 'Space') {
            e.preventDefault();
            doPause();
          } else if (e.code === 'Escape') {
            state.drawMode = false;
            finalizeTextInput();
            updateToolbar();
          } else if (e.code === 'KeyD') {
            toggleDrawMode();
          } else if (e.code === 'KeyC') {
            if (state.drawMode) doClear();
          } else if ((e.ctrlKey || e.metaKey) && e.code === 'KeyZ') {
            e.preventDefault();
            doUndo();
          } else if (e.code === 'Delete' || e.code === 'Backspace') {
            if (fabricCanvas) {
              var sel = fabricCanvas.getActiveObject();
              if (sel) {
                fabricCanvas.remove(sel);
                fabricCanvas.renderAll();
              }
            }
          } else if (e.code === 'Digit1') {
            selectColor('#ff3b30', document.getElementById('htb-color-red'));
          } else if (e.code === 'Digit2') {
            selectColor('#ffd60a', document.getElementById('htb-color-yellow'));
          } else if (e.code === 'Digit3') {
            selectColor('#007aff', document.getElementById('htb-color-blue'));
          } else if (e.code === 'Digit4') {
            selectColor('#30d158', document.getElementById('htb-color-green'));
          }
        });

        // ── Init ──
        updateToolbar();

      }); // end DOMContentLoaded
    }.toString() + ')()';

    // Inject the UI script to run on every new document
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', {
      source: uiScript,
    }, sessionId);

    // ── Inject fabric.js on every navigation ───────────────────────────
    const fabricPath = path.join(__dirname, '..', 'vendor', 'fabric.min.js');
    const fabricSource = fs.readFileSync(fabricPath, 'utf-8');

    const injectFabric = async () => {
      try {
        await cdp.send('Runtime.evaluate', {
          expression: fabricSource,
        }, sessionId);
      } catch (_) {
        // Page may have navigated during injection
      }
    };

    // Listen for frame navigation to re-inject fabric.js
    cdp.on('Page.frameNavigated', async () => {
      // Small delay to let DOMContentLoaded fire and build the canvas element
      setTimeout(async () => {
        await injectFabric();
      }, 300);
    });

    // ── Navigate to URL ────────────────────────────────────────────────
    await cdp.send('Page.navigate', { url }, sessionId);

    // Wait for the page to load
    await new Promise((resolve) => {
      const handler = (params) => {
        if (params.name === 'DOMContentLoaded') {
          resolve();
        }
      };
      cdp.on('Page.lifecycleEvent', handler);
      // Timeout fallback
      setTimeout(resolve, 10000);
    });

    // Inject fabric.js on initial page
    await injectFabric();

    console.log('Browser opened at: ' + url);
    console.log('Use the toolbar controls to start/stop recording.');
    console.log('Or run stop-recorder.sh to stop from the terminal.');

    // Keep process alive until Chrome exits
    await new Promise((resolve) => {
      chromeProc.on('exit', resolve);
    });

    // Chrome was closed (by user clicking X, or via __helixCloseBrowser)
    if (saveStream) { try { saveStream.end(); saveStream = null; } catch (_) {} }
    await cleanup();

  } catch (err) {
    console.error('Recorder error:', err.message);
    await cleanup();
  }
})();
