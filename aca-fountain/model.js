/* Where a month of payroll goes, with ACA off and with ACA on. Shared by the page and the Node check.
   One employee: the ACA overview's sample paycheck (married joint filer, $65,000 a year, paid every two weeks, California,
   shown there at the $1,600 tier), biweekly figures x 26 / 12. A whole company: every employee paid like the sample, and
   the share who qualify enrolled. Illustrative: every employee's number is different.

   How the plan moves the money (ACA overview pages 5 to 7; the same sequence Jay set for the coin drop, 2026-11-15):
   - The tier amount comes out of the paycheck before tax into ACA Section 125, beside the other withholdings.
   - A monthly trigger event (the wellness activity) pays the tier's Wellness Reward, post-tax, on the same paycheck.
   - The rest of the tier is the employee withholding remitted to the program (ACA Plan $).
   - The company stops paying 7.65% payroll tax on the tier amount, pays the $40 ACA admin fee out of that, and keeps the rest. */
(function (root) {
  const PER = 26 / 12, r2 = (v) => Math.round(v * 100) / 100;
  const FEE = 40, FICA = 0.0765;
  // A company of this size already has a Section 125 plan: the health premium runs through it, and many employees elect
  // an FSA. The FSA here is an illustration, $100 a month, taken before tax with the plan off and with it on alike, so it
  // changes nothing the plan is credited with. The sample paycheck itself has no FSA line.
  const FSA = 100;
  // Five tiers: monthly pre-tax contribution -> the Wellness Reward (post-tax) and the withholding remitted to the program.
  const TIERS = { 1600: { reward: 1325, plan: 275 }, 1400: { reward: 1200, plan: 200 }, 1200: { reward: 1050, plan: 150 }, 1000: { reward: 925, plan: 75 }, 675: { reward: 625, plan: 50 } };
  const LEVELS = [1600, 1400, 1200, 1000, 675], DEFAULT = 1400;
  // The sample paycheck, every two weeks: today, and with ACA at the $1,600 tier (overview page 9).
  const BW = { gross: 2500, health: 120, k401: 75, contrib: 738.46,
    taxToday: 180.06 + 147.56 + 34.51 + 19.63 + 28.56, taxPlan: 91.61 + 101.78 + 23.8 + 3.37 + 19.7, // the employee's federal, Social Security, Medicare, California and SDI
    homeToday: 1894.68, postTaxPlan: 1326.28, homePlan: 1937.82 };
  // The employee's own tax on each pre-tax dollar, from the $1,600 column. Exact there; the other tiers reuse it, so they are estimates.
  const RATE = (BW.taxToday - BW.taxPlan) / BW.contrib;
  const KEYS = ['taxes', 'health', 'fsa', 'k401', 'aca', 'fee', 'company', 'bank'];
  const OFF = { taxes: r2((BW.taxToday + BW.gross * FICA) * PER - (RATE + FICA) * FSA), health: r2(BW.health * PER), fsa: FSA, k401: r2(BW.k401 * PER), aca: 0, fee: 0, company: 0, bank: r2(BW.homeToday * PER - FSA + RATE * FSA) };
  function on(level) {
    const c = level;
    return { taxes: r2(OFF.taxes - RATE * c - FICA * c), health: OFF.health, fsa: FSA, k401: OFF.k401, aca: c, fee: FEE, company: r2(FICA * c - FEE), bank: r2(OFF.bank - c + RATE * c) };
  }
  const sum = (o) => KEYS.reduce((a, k) => a + o[k], 0);

  /* The numbers for one fountain: `employees` people on payroll, `qualify` percent of them enrolled, at one tier. */
  function scenario(employees, qualify, level) {
    level = TIERS[level] ? +level : DEFAULT;
    const all = Math.max(1, Math.min(5000, Math.round(+employees || 1))), enrolled = Math.round((all * qualify) / 100), ONE = on(level), T = TIERS[level];
    const off = {}, onD = {};
    for (const k of KEYS) { off[k] = r2(OFF[k] * all); onD[k] = r2(OFF[k] * all + (ONE[k] - OFF[k]) * enrolled); }
    const total = r2(sum(off)), reward = enrolled * T.reward, plan = enrolled * T.plan;
    return {
      employees: all, enrolled, level, total, dollars: { off, on: onD },
      after: { reward, plan, bank: r2(onD.bank + reward) },
      delta: { taxes: r2(off.taxes - onD.taxes), bank: r2(onD.bank + reward - off.bank), company: onD.company, fee: onD.fee, plan, reward, section125: onD.aca, invoice: r2(plan + onD.fee) },
    };
  }
  const single = (level) => scenario(1, 100, level);

  /* Self-check: the pay adds up both ways, the $1,600 figures match the overview's own paycheck, every tier's company figure
     matches the overview's table, and every dollar no longer paid in tax lands somewhere. */
  (function () {
    const near = (a, b, tol, what) => { if (Math.abs(a - b) > tol) throw new Error(what + ': ' + a + ' vs ' + b); };
    const s16 = single(1600);
    near(sum(s16.dollars.off), sum(s16.dollars.on), 0.05, 'same payroll both ways');
    near(s16.dollars.on.bank + FSA - RATE * FSA, BW.postTaxPlan * PER, 0.1, 'pay before the reward matches the sample, FSA aside');
    near(s16.delta.bank, (BW.homePlan - BW.homeToday) * PER, 0.1, 'take-home gain matches the sample');
    for (const [lvl, co] of [[1600, 82.4], [1400, 67.1], [1200, 51.8], [1000, 36.5], [675, 11.64]]) {
      const s = single(lvl);
      near(s.delta.company, co, 0.005, 'company keeps at ' + lvl);
      near(s.delta.taxes, s.delta.plan + s.delta.fee + s.delta.company + s.delta.bank, 0.05, 'tax not paid lands somewhere at ' + lvl);
      near(s.delta.section125, s.delta.reward + s.delta.plan, 0, 'Section 125 is the reward plus Plan $ at ' + lvl);
      if (s.delta.bank <= 0) throw new Error('employee not ahead at ' + lvl);
    }
    near(single(1400).delta.invoice, 240, 0, 'invoice at 1400');
    const co = scenario(50, 80, 1400);
    near(co.enrolled, 40, 0, 'enrolled'); near(co.delta.company, 2684, 0.005, 'company at 50, 80%'); near(co.delta.invoice, 9600, 0.005, 'invoice at 50, 80%');
    near(sum(co.dollars.off), sum(co.dollars.on), 0.5, 'company payroll adds up both ways');
  })();

  const api = { TIERS, LEVELS, DEFAULT, FEE, FICA, RATE, FSA, KEYS, scenario, single };
  root.FountainModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
