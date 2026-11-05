# CMS TEAM Episode Calculator

Live: https://jaybeatty1079.github.io/tools/team-calculator/

TEAM is a mandatory Medicare bundled-payment model that started January 1, 2026 for 711 hospitals across five surgical episodes. The calculator applies the published reconciliation rules (regional target prices, risk and quality adjustments, stop-gain and stop-loss by track) and shows the estimated net payment, service-line views, post-acute levers and a five-year projection. Pick any of the 721 participant hospitals and the page prefills its public CMS data, each fact with its source.

- `index.html` is the calculator, one self-contained page. `map.html` is the 2027 participant map. `docs/decisions.html` is the decision record.
- `TEAM_Calculator_Model_Spec.md` is the plain-English rulebook: every formula, every source, and what is left out.
- `build/engine.js` is the reconciliation engine on its own; `tests/engine.test.js` runs 22 checks against it (`node --test tests/engine.test.js`, Node 18+).
- `docs/` also holds the architecture notes and the essay on why it was built.

An independent educational model, not affiliated with or endorsed by CMS. No patient data.
