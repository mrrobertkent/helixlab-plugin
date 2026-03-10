<required_reading>

Read these reference files NOW:
1. references/browser-commands.md
2. references/snapshot-refs.md

</required_reading>

<process>

**Step 1: Snapshot the page**

Always start with an interactive snapshot to discover the page structure:
```bash
cmux browser surface:N snapshot --interactive --compact
```

Read the output carefully. Interactive elements are listed with refs like `[e1]`, `[e2]`, etc.

**Step 2: Identify target elements**

From the snapshot output, identify the elements you need to interact with:
- Buttons: `[e1] button "Submit"`
- Inputs: `[e2] input[type=email] "Email"`
- Links: `[e3] a "Learn more"`
- Dropdowns: `[e4] select "Country"`

You can target elements by ref OR CSS selector.

**Step 3: Perform actions**

Use the appropriate command for each interaction. **Always use `--snapshot-after` on mutating actions.**

```bash
# Click
cmux browser surface:N click e1 --snapshot-after

# Fill input (clears existing value first)
cmux browser surface:N fill e2 --value "user@example.com" --snapshot-after

# Type text (appends to existing value)
cmux browser surface:N type e2 --text "additional text" --snapshot-after

# Press key
cmux browser surface:N press --key "Enter" --snapshot-after

# Check/uncheck checkbox
cmux browser surface:N check e5 --snapshot-after
cmux browser surface:N uncheck e5 --snapshot-after

# Select dropdown option
cmux browser surface:N select e4 --value "US" --snapshot-after

# Scroll
cmux browser surface:N scroll --direction down --amount 500
```

**Step 4: Wait for state changes**

After actions that trigger loading (form submit, navigation):
```bash
cmux browser surface:N wait --text "Success" --timeout-ms 10000
# or
cmux browser surface:N wait --load-state complete --timeout-ms 15000
```

**Step 5: Re-snapshot after DOM changes**

If you didn't use `--snapshot-after`, take a fresh snapshot now:
```bash
cmux browser surface:N snapshot --interactive --compact
```

**Refs from the previous snapshot are now STALE.** Use only refs from the latest snapshot.

**Step 6: Inspect results**

```bash
# Get text from an element
cmux browser surface:N get text "#result"

# Check for errors
cmux browser surface:N errors

# Get element count
cmux browser surface:N get count ".list-item"
```

**Step 7: Handle failures**

If something doesn't work:
1. Check for JavaScript errors: `cmux browser surface:N errors`
2. Check console: `cmux browser surface:N console`
3. Take a full snapshot for debugging: `cmux browser surface:N snapshot --mode full`
4. Verify the correct surface: `cmux browser identify`

</process>

<form_filling_pattern>

For multi-field forms, use this pattern:

```bash
# 1. Snapshot to discover fields
cmux browser surface:N snapshot --interactive --compact

# 2. Fill each field (no snapshot-after until last field)
cmux browser surface:N fill e2 --value "John Doe"
cmux browser surface:N fill e3 --value "john@example.com"
cmux browser surface:N fill e4 --value "password123"

# 3. Submit with snapshot-after
cmux browser surface:N click e1 --snapshot-after

# 4. Wait for response
cmux browser surface:N wait --text "Welcome" --timeout-ms 10000
```

Or use the template: `templates/form-automation.sh`

</form_filling_pattern>

<success_criteria>

This workflow is complete when:
- [ ] Target elements were identified via interactive snapshot
- [ ] Actions were performed using refs or CSS selectors
- [ ] `--snapshot-after` was used on mutating actions
- [ ] Page state changes were waited for appropriately
- [ ] Final page state was verified
- [ ] No stale ref errors occurred

</success_criteria>
