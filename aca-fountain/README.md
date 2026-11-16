# The Payroll Fountain

Section 125 Wellness Illustration Tool: a Section 125 wellness plan shown as brass plumbing on a navy plate, in gold and blue. Open the main valve and a month of payroll comes in as water from the top, into a header; branch pipes of different bore, each with a valve and a sight glass, pour into glass buckets for payroll taxes, health insurance and the 401(k), and what is left runs down the main pipe into the post-tax bucket, the employee's take-home. Switch the plan on and a Section 125 Wellness branch is fitted: the tier amount fills its bucket (the Plan Dollars part marked as a band at the bottom), the tax valve throttles back, and the tax no longer paid runs through a return line into the Company's vessel (the $40 admin fee tees off, in gold, from company savings). A float in the Section 125 bucket drives a rack and a train of three brass gears, the Trigger; when the bucket is full the gears' shaft opens the reward valve on a separate supply line that comes in from the right edge, the plan's fixed indemnity, and the Wellness Reward pours into the post-tax bucket in the plan's blue. The Section 125 bucket drains: the reward part through a grate in its floor back to the plan, the Plan Dollars part by pipe into the Plan Dollars vessel. The five tiers are handwheels beside the board; the selected one is turned tight.

Beside the board, on a wide screen, sits **the bench model**: the same month as an isometric figure built with the anatomy kit. Plain payroll is a plain bench: a plate on feet, the Company's tank, the header channel, three glass cisterns and the pool. Switch the plan on and the rest of the machine is fitted: the Section 125 cistern with a float on a threaded spindle, a bridge carrying the gear train the spindle turns, the last gear being the stem of the reward valve, the plan's tank with its raised line running under the bridge to the pool, a return line with a pump feeding the company's cup and the fee cup, and the drain to the Plan Dollars cup. Its water and its gears follow the board as it runs. Click any part to zoom to it and read what it does with the month's money; the switch itself is a handwheel, and the tier wheels come out only when the plan is on.

Two fountains on one cabinet: **One paycheck** and **Whole company** (enter a headcount and the share who qualify). Five tier buttons: $1,600, $1,400 (default), $1,200, $1,000, $675.

Water area is dollars: every basin, jar and pool uses one dollars-per-pixel scale, set from the payroll total, so a whole company draws like one paycheck.

## Files

- `index.html`: the page and its controls. `?scope=company`, `?tier=1600`; `#off`, `#on`, `#mid` show a finished or mid-pour picture. The company defaults to 200 employees, and an existing Section 125 FSA of $100 a month sits in the pre-tax row as an illustration, the same with the plan off and on.
- `model.js`: every number. One sample paycheck from the plan's own overview (married, joint filer, $65,000 a year, paid every two weeks, California, shown there at the $1,600 tier), scaled to a month. The $1,600 figures are the overview's own; the other tiers apply the same tax rates to the smaller contribution. It checks itself when it loads.
- `fountain.js`: the plumbing, drawn on a canvas. It exposes `FOUNTAIN.levels()` for the bench model. `v1-cabinet/` holds the first cut (a tiered fountain in the coin drop's cabinet) and the second (plumbing before the gear train), kept for the record.
- `iso-build.mjs`: builds the bench model once with the anatomy kit (`node aca-fountain/iso-build.mjs`) into `iso.js` (the figure, its named parts, 21 water levels per vessel and 11 poses of the trigger train) and copies the kit's `iso.css`. The page ships no kit code.
- `test.mjs`: `node aca-fountain/test.mjs`.

No libraries, no server, no tracking, no sound yet.

## Illustrative only

Every employee's number is different. No specific tax outcome is guaranteed; results depend on a payroll analysis and on current federal and state law. Figures leave out any workers' compensation, FUTA or SUTA effect. Reward payments in excess of unreimbursed medical expenses may be taxable to the employee.
