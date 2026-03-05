<example_report type="workflow-review">
<metadata>
**Video:** checkout-flow-recording.mp4
**Duration:** 12.5s | **Source FPS:** 30 | **Extraction FPS:** 2 (scene-detect)
**Resolution:** 1920x1080 | **Frames analyzed:** 8 (unique states)
</metadata>

<summary>
The checkout flow has 5 distinct steps captured across 8 key frames. The user completes the flow in ~12 seconds. Navigation is clear but there is a notable 3-second delay between the payment form submission and the confirmation page. The cursor path suggests the user initially missed the "Continue" button on step 2.
</summary>

<steps_identified>
| Step | Frame(s) | Time | Description |
|------|----------|------|-------------|
| 1 - Cart review | 1 | 0s | Cart page showing 2 items, subtotal $45.99. "Checkout" button visible. |
| 2 - Shipping info | 2-3 | 2s-4s | Shipping form. Frame 2: empty form. Frame 3: form filled, cursor near "Continue" button. Cursor path suggests user searched for the button (moved right, then left to find it). |
| 3 - Payment | 4-5 | 5s-7s | Payment form with credit card fields. Frame 4: empty. Frame 5: filled. |
| 4 - Loading | 6 | 8s | Loading spinner visible after "Place Order" click. |
| 5 - Confirmation | 7-8 | 11s-12.5s | Order confirmation page. 3-second gap between loading start and confirmation render. |
</steps_identified>

<observations>
- **Step 2 UX issue:** Cursor movement pattern on the shipping form suggests the "Continue" button is not immediately visible or its position is unexpected. Consider making it more prominent or placing it in a more conventional position.
- **Payment processing delay:** 3 seconds from submission to confirmation is noticeable. Consider adding a progress indicator or intermediate "Processing..." state with status updates.
- **No error states captured:** The recording shows a happy path only. Consider recording error scenarios (invalid card, network timeout) for additional analysis.
</observations>

<recommendations>
- Make the "Continue" button on the shipping form more prominent (larger, higher contrast) or move it to a more conventional position (bottom-right of the form)
- Add a progress indicator during payment processing to manage user expectations during the 3-second wait
- Consider recording error paths (invalid card, network timeout) to verify error handling UX
</recommendations>
</example_report>
