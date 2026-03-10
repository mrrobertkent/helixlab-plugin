<overview>
Demonstrates how control-cmux composes with domain-specific skills. In this example, control-cmux handles opening the browser and targeting it, while a domain skill (evaluation, testing, etc.) defines what to check.
</overview>

<scenario>
An agent needs to evaluate a website's landing page for accessibility and performance issues. control-cmux provides the browser infrastructure; the domain skill defines what to evaluate.
</scenario>

<walkthrough>

**Step 1: Open browser (control-cmux)**
```bash
# Open the target site in a split pane
cmux browser open-split https://example.com

# Wait for full load
cmux browser surface:2 wait --load-state complete --timeout-ms 15000
```

**Step 2: Take initial snapshot (control-cmux)**
```bash
cmux browser surface:2 snapshot --interactive --compact
```

**Step 3: Evaluate content (domain skill)**
The domain skill reads the snapshot output and determines what to check:
- Read all text content for accessibility
- Check form fields for labels
- Look for image alt text
- Verify navigation structure

**Step 4: Inspect specific elements (control-cmux)**
```bash
# Get text from key sections
cmux browser surface:2 get text "main"
cmux browser surface:2 get text "nav"

# Check for missing alt text
cmux browser surface:2 eval --expression "document.querySelectorAll('img:not([alt])').length"

# Check heading hierarchy
cmux browser surface:2 eval --expression "Array.from(document.querySelectorAll('h1,h2,h3')).map(h => h.tagName + ': ' + h.textContent).join('\\n')"
```

**Step 5: Navigate to additional pages (control-cmux)**
```bash
cmux browser surface:2 click "a[href='/about']" --snapshot-after
cmux browser surface:2 wait --load-state complete --timeout-ms 10000
```

**Step 6: Generate report (domain skill)**
The domain skill aggregates findings and generates a report.

</walkthrough>

<key_point>
control-cmux provides the HOW (open browser, snapshot, click, navigate). The domain skill provides the WHAT (what to check, how to evaluate, how to report). This separation enables reuse — the same control-cmux workflows work with any domain skill.
</key_point>
