# The Peptide Ride, the Peptide Supply Map and the glossary

Three pages built from one data set: where 65 peptides stand under US rules as of the date on the page, how each one is made, and who supplies them. The full account of what went into them is in the root [README](../README.md).

- `ride-template.html` is the ride; `map-template.html` the map; `glossary-template.html` the glossary. `build.py` reads the register, the 503B facility list and the research CSVs from Jay's vault (outside this repo), merges the compound grades from `data/`, and writes `index.html`, `map.html`, `glossary.html` and the artifact copies with the data inlined. Never edit the built pages by hand.
- `tools/evidence.py` grades the fifty compounds in `tools/compounds.txt` from PubMed, ClinicalTrials.gov, openFDA, Europe PMC and OpenAlex and writes `data/compounds.json`; `tools/named_evidence.py` does the same for the fifteen compounds the regulators have named, into `data/named-evidence.json`; `tools/refill_openalex.py` fills OpenAlex counts that a day's free budget could not cover. The grade rule is in the docstring: A an approved US product, B three or more human trials, C three or more human studies, D laboratory and animal work only. A count, not a verdict.
- `tests/` holds five browser checks for the ride (Chrome, network for three.js): `node tests/pause.test.mjs` proves Pause freezes the ride's clock, cart and door hold and Resume restores them; `node tests/walls.test.mjs` rides three compounds and proves the walls (see below); `node tests/features.test.mjs` proves the tunnel and the loop; `node tests/court.test.mjs` proves every ride ends in Mount Evidence; `node tests/stages.mjs` drives the ride at 1200 px and 375 px, pauses at every stage and checks the stage's text is whole (every window on screen and the pinned panel: on screen, opaque, not overlapping, 12 px or more, tabs 24 px or more), writing a screenshot per stage to `tests/out/`. The ride pauses with the Pause button or Space; the step in front of you is in one pinned panel at the bottom.
- Every standing card links the exact searches behind its counts, so a reader can check the decision.
- `data/` holds the two base maps and the compound grades. `assets/LICENSES.md` credits the models.

## The ride's barrier walls (2026-11-11)

The first piece of the revamp Jay set down on 2026-11-07: barrier walls with four steps each, a window on each side, the cart going through the wall, and words slow enough to read.

**What a rider sees.** One wall stands at the top of each of the three lifts, 14 units short of the crest. Its four numbered frames (two a side, in the windows' own north-west, south-west, north-east, south-east order) are dark until their step opens, then light in the step's colour. As the cart climbs, the four windows open one by one in the corners and stay up together. The panel at the bottom follows the newest step on its own; a tap on a number, or on a window, takes it over for the rest of that wall, so a slow reader can go back. Then the cart runs at the wall and goes through it in a burst of bricks, and the windows step aside over the crest.

Where the rules say no, the wall holds: the cart eases up, stops 15 units short and CLOSED shows across the barrier. That is the ending for 30 of the 65 compounds, so it had to look right. Where there is no lawful route at all (4 compounds), the cart is shunted onto the research-use-only siding before it reaches the second wall, and the steps it can never reach light red and flash on the wall ahead.

**Measured, not guessed** (2026-11-11, the ride's own clock, bpc-157, so a slow screen does not skew it).

| | Before (gates and banners) | After (walls) |
|---|---|---|
| Time a step is the one in front of you | 3.0 to 3.6 s, then replaced | 4.1 to 5.0 s, and all four of a wall stay up together for 16 to 20 s |
| Words in a step | 15 to 56, average 33 | the same, unchanged |
| Time to read a 33-word step (an estimate, at 200 words a minute) | about 10 s | the same; the tabs and Pause give the rest |
| Boarding to the standing (bpc-157) | 84 s | 95 s (a closed-gate ride, ipamorelin: 60 s) |

The note said the wording was too fast to read and the ride too long. The two pull against each other, so the lift now climbs at 6.5 units a second instead of 9, and the windows stay up together instead of replacing one another. The extra 11 seconds are all in the climbs; the drops and the run are as before. `LIFT_V` in `ride-template.html` is the one number to change if the ride should be slower (more reading time) or faster.

**Why it is built this way.**
- The windows stay in the corners of the screen. Windows painted on the wall itself would only be big enough to read in the last 30 units of the climb, about 4 or 5 seconds at this speed (by the camera's field of view); in the corners they are the same size for the whole approach. The wall carries the numbers and the colours, the corners carry the animation.
- The pinned panel moved between the two window columns, so the windows and the words can never meet. It now has four numbered tabs (buttons, so the keyboard and screen readers get the same choice a tap does).
- The twelve gate frames, their lamps, flags and hanging banners are gone: they repeated the step name three times over. Jay's note allowed that ("if not, scrap them"). The building signs (Synthesis plant, Testing lab, Facility, Pharmacy) stay, on their own posts. The CSS3D renderer that only drew the banners is gone too.
- A step opens by distance along the track, not by a timer, so Pause, a slow screen and the hold at a closed wall all keep the story in order.
- The break is physics, not an animation clip: about 100 bricks thrown clear of the line of sight so the camera rides through a burst, not into one; Pause freezes them mid-air.

## Tunnels and loops (2026-11-12)

The second item of the revamp. After wall one every compound rides the same swoop, and the standing's colour (the ride's own rule, unchanged) now picks what it does there: **green runs clear** (24 of 65), **yellow goes round a vertical loop** (22), **orange and red go through a tunnel** (19). The sign at the tunnel's mouth or the loop's foot, and the caption at the bottom, use the colour key's own words ("On FDA's radar", "Nobody looking", "No human evidence"); they restate the key and add no claim. The rule is one line in `build.py` (`FEATURE`).

- **Why this swoop.** Every compound passes it; 34 of the 65 stop at wall two (closed gates and the siding), so anything later would never be seen by them.
- **The loop** is a real inversion. The camera's forward and up come from a frame carried along the curve, not from the world's up, which is what lets it go over the top without the flip a `lookAt` gives at a vertical tangent. The circle drifts 4 units sideways so the way out clears the way in. The cart leaves the main line on its own curve and rejoins it; the stretch of main line it replaces is hidden for that ride only, so the track never shows a bypass.
- **The tunnel** is a dark tube round the track with ribs, flickering lamps and a stone portal at each end (a round mouth cut in an extruded slab). It changes nothing about the path, so it costs no ride time.
- **Checked** by `node tests/features.test.mjs` (about a minute: it teleports to the swoop): the rule has no exceptions across all 65 cards; the loop goes upside down (up.y below -0.9) and comes back level; Pause freezes it; the cart ends on the main line; the tunnel caption comes and goes and the camera stays upright.

## Mount Evidence (2026-11-13)

The third item. The track no longer parks at a terminal after wall three. It runs on, a 266-unit descent from the third crest, to a mountain shaped like a courthouse: six columns, a pediment carrying the scales of justice, and an arched doorway the track runs through into a dark tunnel where the ride ends. The name, **MOUNT EVIDENCE**, is planted in dark pines on the golden slope above the pediment.

- **Every ride ends there.** 34 of the 65 compounds never reach wall three (30 stop at wall two, 4 take the siding), so after the hold or the dead end the cart is cut to the top of the last stretch and runs the final 180 units. A caption says "Mount Evidence: court is in session". The ride that runs the whole track meets the same stretch without the cut.
- **The banner.** "Verdict?" hangs at the side of the view, in the windows' own column and in screen space, so it blocks nothing. It is dark while the cart approaches, comes up as it passes the doorway, and lights (bulbs and glow) a moment later; then the ruling comes up. For now the ruling is the standing page; the scorecard replaces it next.
- **How the name is planted.** The two words are drawn into a canvas in a condensed face, fitted to the slope's width, sampled on a grid, and a pine stands at every inked point (about 1,000 of them, an instanced mesh). The face is steep (62 degrees) and the letters are stretched to stand up on it, because a slope seen from the cart's low eye line shortens everything on it. A first try at 50 degrees read as two hedges; this one reads as words from about 120 units out.
- **How it is built.** The mountain is a height field (a front face that is a cliff behind the facade, wings that roll off to the sides, a back slope), painted by height, with the name's meadow in gold so the pines show dark on it. The ground under the plaza is flattened inside `terrainH`, the woods keep out of the footprint, and the tunnel is the same function the swoop's tunnel uses, with a cap on the far end (the mountain is a surface, so an open end showed the sky). One bug worth recording: the lamps first came out as long cream spikes, because a helper object shared with the loop's support columns was still stretched to a column's height.
- **Checked** by `node tests/court.test.mjs` (a few minutes, teleporting to each ride's end): a whole-track ride (semaglutide) goes through the doorway and the banner lights with the cart inside; a closed gate (ipamorelin) holds at wall two and is then taken to court; a no-route compound (retatrutide, at 375 px) takes the siding and is then taken to court. `tests/stages.mjs` also audits the court caption and the lit banner.

**Not done, still on Jay's list (in his order):** the PASS / FAIL / JURY STILL OUT scorecard with evidence links, which replaces the standing page behind the banner; upcoming changes and new peptides.

**Checked.** `node tests/pause.test.mjs` (quick). `node tests/walls.test.mjs` (about five minutes): three walls on three lifts, steps open in order, windows open one by one and stay, the four corners are where they should be, a tap takes the panel over and a newly opened step does not take it back, bpc-157 goes through all three walls, ipamorelin stops at the second, retatrutide is shunted before it, Pause freezes the debris. `node tests/stages.mjs` now audits every window on screen, not only the first, and the size of every tab.

Maps public guidance as of its date. Not legal advice, and no claim that any peptide is safe or works.
