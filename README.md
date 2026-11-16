# Jay Beatty's tools

Seven interactive tools built by Jay Beatty with AI, hosted here on GitHub Pages so the main site, [jaybeatty.com](https://www.jaybeatty.com), stays light. Each tool is a plain folder of static files: no server, no tracking, no accounts.

| Tool | Open it | What it is |
|---|---|---|
| `team-calculator/` | [Open](https://jaybeatty1079.github.io/tools/team-calculator/) | **CMS TEAM Episode Calculator.** What the Transforming Episode Accountability Model pays or costs any of the 721 participant hospitals, from public CMS files only |
| `biologics-atlas/` | [Open](https://jaybeatty1079.github.io/tools/biologics-atlas/) | **Biologics Atlas.** Every orthobiologic product on the US market or in trials, by surgical application, with its evidence grade and FDA status, on a 3D skeleton |
| `bonus-lot/` | [Open](https://jaybeatty1079.github.io/tools/bonus-lot/) | **Dealer City.** A Section 125 wellness plan explained to a dealership general manager as a city he builds, in WebGL |
| `coin-drop/` | [Open](https://jaybeatty1079.github.io/tools/coin-drop/) | **The Payroll Coin Drop.** A Section 125 Wellness Illustration Tool: a month of payroll falls through an arcade coin pusher into its trays, then the plan is switched on and the machine shows what changes, for one paycheck or a whole company. A conveyor bench model beside it zooms to any part and explains it |
| `aca-fountain/` | [Open](https://jaybeatty1079.github.io/tools/aca-fountain/) | **The Payroll Fountain.** A Section 125 Wellness Illustration Tool in brass plumbing: payroll comes in from the top, valves and pipes of different bore divert it into glass buckets, and switching the plan on fits a gear-driven Trigger and a separate reward supply. An isometric bench model beside it zooms to any part and explains it |
| `peptide-map/` | [Open](https://jaybeatty1079.github.io/tools/peptide-map/) | **The Peptide Ride**, the **Peptide Supply Map** and a glossary. Where 65 peptides stand under US rules, how each is made, and who supplies them |
| `iomist/` | [Open](https://jaybeatty1079.github.io/tools/iomist/) | **How Iomist Works.** A sales tool for a produce traceability company: one recall run twice, one clamshell followed from the field to the shelf, twelve common questions, and every published buyer requirement behind one link |

Each folder has its own README. The full story of how they were made is in the [site repository](https://github.com/jaybeatty1079/jaybeatty-site).

## How this repo works

- Pages serves the `main` branch from the root. `.nojekyll` turns off GitHub's Jekyll processing so files are served as they are.
- Every link inside a tool is relative, so the pages work under the `/tools/` subpath. Links back to the main site point at `https://www.jaybeatty.com`.
- Shared icons (`favicon.svg`, `favicon.ico`, `apple-touch-icon.png`) live at the repo root.
- Tests: `node --test team-calculator/tests/engine.test.js` (22 checks on the TEAM engine) and `node bonus-lot/test.mjs` (Dealer City model, copy and share-link checks), `node iomist/test.cjs` (the trace model, the dates and the sourced requirement rows), `node coin-drop/test.mjs` (the payroll model behind the coin drop) and `node aca-fountain/test.mjs` (the five-tier model behind the fountain). Node 18+, no dependencies.
- The `build/` and `tools/` folders are the scripts that regenerated each page. They were written to run inside Jay's site repository and read data from his private notes, so they are kept here as a record rather than something to run from this folder.

## Disclaimer

Independent educational tools built from public documents and Jay's own experience. None is affiliated with or endorsed by CMS, FDA, HHS or any company named in them. The Iomist tool is a sales illustration built with Iomist's own materials, and the Payroll Coin Drop and the Payroll Fountain are illustrations of Section 125 wellness plans built from sample paychecks in the plans' own documents; the retailers it names are cited from their published supplier requirements. Use the primary sources for decisions. Peptide and regulatory pages map public guidance as of the date shown and are not legal advice.

## License

Code and text © 2026 Jay Beatty. Shared for reading and learning; please ask before reusing. Third-party models and data keep their own licences, listed in `biologics-atlas/MODEL-LICENSE.md`, `biologics-atlas/MODEL-ATTRIBUTION.md`, `bonus-lot/models/` and `peptide-map/assets/LICENSES.md`.
