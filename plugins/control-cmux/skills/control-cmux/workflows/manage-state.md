<required_reading>

Read these reference files NOW:
1. references/browser-commands.md (state & session section)
2. references/snapshot-refs.md

</required_reading>

<process>

**Step 1: Determine what state operation is needed**

- **Share auth between surfaces** → State save/load
- **Read/write cookies** → Cookie commands
- **Read/write localStorage/sessionStorage** → Storage commands
- **Clear everything** → Clear commands

**Step 2: Share auth between browser surfaces**

Each browser surface has isolated cookies and storage. To share login state:

```bash
# In the surface where you're logged in:
cmux browser surface:N state save /tmp/auth-state.json

# In the new surface where you need auth:
cmux browser surface:M state load /tmp/auth-state.json

# Reload to apply:
cmux browser surface:M reload
```

Or use the template: `templates/authenticated-session.sh`

**Step 3: Work with cookies**

```bash
# Get all cookies
cmux browser surface:N cookies get

# Get specific cookie
cmux browser surface:N cookies get --name "session_id"

# Get cookies for domain
cmux browser surface:N cookies get --domain "example.com"

# Set a cookie
cmux browser surface:N cookies set --name "token" --value "abc123" --domain "example.com"

# Clear all cookies
cmux browser surface:N cookies clear

# Clear cookies for domain
cmux browser surface:N cookies clear --domain "example.com"
```

**Step 4: Work with browser storage**

```bash
# localStorage
cmux browser surface:N storage local get --key "user_prefs"
cmux browser surface:N storage local set --key "user_prefs" --value '{"theme":"dark"}'
cmux browser surface:N storage local clear

# sessionStorage
cmux browser surface:N storage session get --key "form_draft"
cmux browser surface:N storage session set --key "form_draft" --value "draft content"
cmux browser surface:N storage session clear
```

</process>

<auth_workflow>

Full login-then-reuse workflow:

1. Open browser: `cmux browser open https://app.example.com/login`
2. Wait for load: `cmux browser surface:N wait --load-state complete --timeout-ms 15000`
3. Snapshot: `cmux browser surface:N snapshot --interactive --compact`
4. Fill login form and submit
5. Wait for redirect: `cmux browser surface:N wait --text "Dashboard" --timeout-ms 10000`
6. Save state: `cmux browser surface:N state save /tmp/auth-state.json`
7. Open new surface: `cmux browser open https://app.example.com/settings`
8. Load state in new surface: `cmux browser surface:M state load /tmp/auth-state.json`
9. Reload: `cmux browser surface:M reload`

</auth_workflow>

<success_criteria>

This workflow is complete when:
- [ ] State operation completed successfully
- [ ] Auth is shared across surfaces (if that was the goal)
- [ ] Cookies/storage values verified after setting
- [ ] State file created/loaded without errors

</success_criteria>
