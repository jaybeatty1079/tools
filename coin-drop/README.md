# The Payroll Coin Drop

Section 125 Wellness Illustration Tool: a Section 125 wellness plan shown as an arcade coin pusher. Press Start and a month of payroll drops from the Company through a field of posts into its trays: payroll taxes, health insurance, the 401(k), and what is left reaches the employee. Switch the plan on and the machine transforms: $1,200 is withheld before tax into Section 125, a lift on each side carries the company's savings back up, the last coin trips the Trigger, and a hidden door pays the Wellness Reward.

Two machines on one cabinet: **One paycheck** and **Whole company** (enter a headcount and the share who qualify; it defaults to 200 employees).

Beside the cabinet, on a wide screen, sits **the bench model**: the same month as a conveyor on a bench, built with the anatomy kit. Plain payroll is a hopper, a belt, three diverter arms with their bins and the cart in front. Switch the plan on and the fourth arm and the Section 125 bin are fitted, a weighbridge at the end of the belt tips when the last coin lands and the reward hopper empties down a chute into the cart, a return belt carries the company's coins to its cup and the fee cup, and the Plan $ get their own cup. Its heaps follow the machine as it runs; click any part to zoom to it and read what it does.

## Files

- `index.html`: the page and its controls.
- `model.js`: every number. One illustrative paycheck for a smaller company's worker (single, 0/0, $40,000 a year, weekly, California, the $1,200 level), withholding worked out from the 2026 federal and California tables and scaled to a month; a $160 a month health premium and a 1% 401(k), both illustrative. The coin value adjusts so no tray overflows. It checks itself when it loads.
- `machine.js`: the cabinet, drawn on a canvas. Each coin's destination is set by the model before it drops; the posts only decide its route, so the piles always match the numbers.
- `sound.js`: the sounds, synthesized in the browser. No audio files.
- `iso-build.mjs`: builds the bench model once with the anatomy kit (`node coin-drop/iso-build.mjs`) into `iso.js` (the figure, its parts and eleven heap levels per bin) and copies the kit's `iso.css`. The page ships no kit code.
- `test.mjs`: `node coin-drop/test.mjs`.

No libraries, no server, no tracking.

## Illustrative only

Every employee's number is different. No specific tax outcome is guaranteed; results depend on a payroll analysis and on current federal and state law. Figures leave out any workers' compensation, FUTA or SUTA effect.
