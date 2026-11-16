# The Payroll Coin Drop

Section 125 Wellness Illustration Tool: a Section 125 wellness plan shown as an arcade coin pusher. Press Start and a month of payroll drops from the Company through a field of posts into its trays: payroll taxes, health insurance, the 401(k), and what is left reaches the employee. Switch the plan on and the machine transforms: $1,200 is withheld before tax into Section 125, a lift on each side carries the company's savings back up, the last coin trips the Trigger, and a hidden door pays the Wellness Reward.

Two machines on one cabinet: **One paycheck** and **Whole company** (enter a headcount and the share who qualify).

## Files

- `index.html`: the page and its controls.
- `model.js`: every number. One sample paycheck from the plan's own deck (married, joint filer, $65,000 a year, California, the $1,200 level), scaled from weekly to a month. It checks itself when it loads.
- `machine.js`: the cabinet, drawn on a canvas. Each coin's destination is set by the model before it drops; the posts only decide its route, so the piles always match the numbers.
- `sound.js`: the sounds, synthesized in the browser. No audio files.
- `test.mjs`: `node coin-drop/test.mjs`.

No libraries, no server, no tracking.

## Illustrative only

Every employee's number is different. No specific tax outcome is guaranteed; results depend on a payroll analysis and on current federal and state law. Figures leave out any workers' compensation, FUTA or SUTA effect.
