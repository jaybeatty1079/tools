/* Where a month of payroll goes, with Pulse off and with Pulse on. Shared by the page and the Node check.
   One employee: the Pulse deck's sample paycheck (Pulse_365_Deck_White.pptx slide 15: married joint filer, $65,000 a year,
   weekly, California, $1,200 level), weekly figures x 52 / 12. A whole company: every employee paid like the sample, and
   the share who qualify enrolled. Illustrative: every employee's number is different.

   How the plan moves the money (Jay, 2026-11-15):
   - $1,200 comes out of the paycheck before tax into Pulse Section 125, beside the other withholdings.
   - A monthly trigger event (the wellness activity) pays a $1,000 Wellness Reward into the employee's account. The reward
     comes from Pulse, not from the company or from taxes, and runs through payroll for efficiency.
   - The other $200 is Pulse Plan $ (Plan Dollars), toward the benefits and the claims.
   - The company stops paying 7.65% payroll tax on the $1,200, pays the $35 Pulse admin fee out of that, and keeps the rest. */
(function (root) {
  const WEEKS = 52 / 12, r2 = (v) => Math.round(v * 100) / 100;
  const PLAN = { level: 1200, reward: 1000, planDollars: 200, fica: 0.0765, fee: 35 };
  const WK = {
    health: 173.41, k401: 37.5, // major medical premium and 401(k), unchanged by the plan
    taxToday: 115.5 + 64.42 + 15.07 + 17.81 + 12.47, taxPlan: 82.27 + 47.25 + 11.05 + 11.1 + 9.14, // withheld from the employee
    employerToday: 64.42 + 15.07, // the employer matches Social Security and Medicare
    homeToday: 813.71, homePlan: 832.0, postTaxPlan: 601.23, // take-home today, take-home with the reward, and pay before the reward
  };
  const employerSaved = r2(PLAN.level * PLAN.fica); // 91.80: employer payroll tax no longer paid
  // Where the payroll coins land. `pulse` is the Section 125 withholding; `bank` is take-home before any reward.
  const KEYS = ['taxes', 'health', 'k401', 'pulse', 'fee', 'company', 'bank'];
  const ONE = {
    off: { taxes: r2((WK.taxToday + WK.employerToday) * WEEKS), health: r2(WK.health * WEEKS), k401: r2(WK.k401 * WEEKS), pulse: 0, fee: 0, company: 0, bank: r2(WK.homeToday * WEEKS) },
    on: { taxes: r2((WK.taxPlan + WK.employerToday) * WEEKS - employerSaved), health: r2(WK.health * WEEKS), k401: r2(WK.k401 * WEEKS), pulse: PLAN.level, fee: PLAN.fee, company: r2(employerSaved - PLAN.fee), bank: r2(WK.homePlan * WEEKS - PLAN.reward) },
  };
  const sum = (o) => KEYS.reduce((a, k) => a + o[k], 0);
  const FULL = 576; // coins in a full drop; the trays are sized for it

  /* A coin value that keeps the drop near FULL coins: the smallest round number at or just under total / FULL. */
  function coinFor(total) {
    const v = total / FULL, p = Math.pow(10, Math.floor(Math.log10(v)));
    return [1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 7.5, 8, 10].map((m) => m * p).find((m) => m >= v * 0.98);
  }
  /* Whole coins per destination, by largest remainder, so both modes drop exactly n coins. */
  function allot(dollars, coin, n) {
    const raw = KEYS.map((k) => dollars[k] / coin), out = raw.map(Math.floor);
    let left = n - out.reduce((a, b) => a + b, 0);
    const order = raw.map((v, i) => [v - Math.floor(v), i]).sort((a, b) => b[0] - a[0]);
    for (let i = 0; left > 0; i++, left--) out[order[i % order.length][1]]++;
    return Object.fromEntries(KEYS.map((k, i) => [k, out[i]]));
  }
  /* The numbers for one machine: `employees` people on payroll, `qualify` percent of them enrolled. */
  function scenario(employees, qualify, coin) {
    const all = Math.max(1, Math.min(5000, Math.round(+employees || 1))), enrolled = Math.round((all * qualify) / 100);
    const off = {}, on = {};
    for (const k of KEYS) { off[k] = r2(ONE.off[k] * all); on[k] = r2(ONE.off[k] * all + (ONE.on[k] - ONE.off[k]) * enrolled); }
    const total = sum(off);
    coin = coin || coinFor(total);
    const n = Math.round(total / coin), coins = { off: allot(off, coin, n), on: allot(on, coin, n) };
    const reward = enrolled * PLAN.reward, plan = enrolled * PLAN.planDollars;
    return {
      employees: all, enrolled, coin, n, total, dollars: { off, on }, coins,
      // What happens after the drop with Pulse on: the reward paid in, and the part of the Section 125 bucket that is Plan $.
      after: { reward, plan, rewardCoins: Math.round(reward / coin), planCoins: Math.min(coins.on.pulse, Math.round(plan / coin)), bank: r2(on.bank + reward) },
      delta: { taxes: r2(off.taxes - on.taxes), bank: r2(on.bank + reward - off.bank), company: on.company, fee: on.fee, plan, reward, section125: on.pulse },
    };
  }
  const single = () => scenario(1, 100, 10);

  /* Self-check: the pay adds up both ways, every dollar no longer paid in tax lands somewhere, and the film's company figures fall out. */
  (function () {
    const near = (a, b, tol, what) => { if (Math.abs(a - b) > tol) throw new Error(what + ': ' + a + ' vs ' + b); };
    const s = single();
    near(sum(s.dollars.off), sum(s.dollars.on), 0.2, 'same payroll both ways');
    near(s.dollars.on.bank, WK.postTaxPlan * WEEKS, 0.05, 'pay before the reward matches the sample');
    near(s.delta.taxes, s.delta.plan + s.delta.fee + s.delta.company + s.delta.bank, 0.2, 'tax not paid lands somewhere');
    near(s.delta.section125, s.delta.reward + s.delta.plan, 0, 'Section 125 is the reward plus Plan $');
    near(s.delta.company, 56.8, 0.001, 'company keeps per employee');
    near(s.delta.bank, 18.29 * WEEKS, 0.05, 'take-home gain matches the sample');
    near(s.n, FULL, 0, 'one paycheck is a full drop');
    const film = scenario(50, 90); // the film's Northside Heating & Air: 45 of 50 enrolled
    near(film.delta.company, 2556, 0.001, 'film: company keeps'); near(film.delta.plan, 9000, 0.001, 'film: Plan Dollars'); near(film.delta.plan + film.delta.fee, 10575, 0.001, 'film: invoice');
    for (const [e, q] of [[1, 100], [7, 80], [50, 80], [333, 65], [5000, 100]]) {
      const c = scenario(e, q);
      for (const mode of ['off', 'on']) near(KEYS.reduce((a, k) => a + c.coins[mode][k], 0), c.n, 0, 'coins add up at ' + e);
      if (c.n > FULL * 1.03 || c.n < FULL * 0.75) throw new Error('drop size out of range at ' + e + ': ' + c.n);
      if (c.coins.on.bank + c.after.rewardCoins > 390) throw new Error('bank tray overflows at ' + e);
    }
    near(scenario(50, 80).delta.company, 2272, 0.001, 'company at 50 employees, 80%');
  })();

  const api = { PLAN, KEYS, FULL, scenario, single };
  root.CoinModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
