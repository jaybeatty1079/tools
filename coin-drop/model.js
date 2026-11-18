/* Where a month of payroll goes, with Pulse off and with Pulse on. Shared by the page and the Node check.
   One employee (Jay, 2026-11-18: a smaller company's worker): single, W-4 and DE 4 with no adjustments (0/0), $40,000 a
   year, weekly, California, $1,200 level, withholding worked out from the 2026 tables (IRS Pub 15-T standard schedule;
   EDD Method B weekly; SDI 1.3%), weekly figures x 52 / 12. A $160 a month health premium and a 1% 401(k), both
   illustrative (Jay: a smaller premium and a low contribution). Pre-tax health is out of federal, FICA, CA and SDI wages; the 401(k) only
   out of federal and CA. A whole company: every employee paid like the sample, and
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
    // weekly gross $769.23; federal, Social Security, Medicare, California, SDI
    health: 36.92, k401: 7.69, // major medical premium ($160 a month) and 401(k) (1%), unchanged by the plan
    taxToday: 64.88 + 45.4 + 10.62 + 13.58 + 9.52, taxPlan: 31.65 + 28.23 + 6.6 + 5.08 + 5.92, // withheld from the employee
    employerToday: 45.4 + 10.62, // the employer matches Social Security and Medicare
    homeToday: 580.62, homePlan: 600.99, postTaxPlan: 370.22, // take-home today, take-home with the reward, and pay before the reward
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

  // Coins each tray holds before it spills over its rim (rows the tray can stack × columns), as filled by the $65,000 sample.
  const CAP = { taxes: 144, health: 84, k401: 36, pulse: 120 };
  const fits = (coin, modes) => modes.every((d) => Object.keys(CAP).every((k) => d[k] / coin <= CAP[k] + 0.5));
  /* A coin value that keeps the drop near FULL coins: the smallest round number at or just under total / FULL that
     still lets every tray hold its coins, so a smaller paycheck uses fewer, bigger coins rather than overflow a tray. */
  function coinFor(total, modes = []) {
    const v = total / FULL, p = Math.pow(10, Math.floor(Math.log10(v)));
    const steps = [1, 1.2, 1.25, 1.5, 1.6, 2, 2.5, 3, 3.5, 4, 4.5, 5, 6, 7, 7.5, 8, 9].flatMap((m) => [m * p, m * p * 10]).sort((a, b) => a - b);
    return steps.find((m) => m >= v * 0.98 && fits(m, modes));
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
    coin = coin || coinFor(total, [off, on]);
    const n = Math.round(total / coin), coins = { off: allot(off, coin, n), on: allot(on, coin, n) };
    const reward = enrolled * PLAN.reward, plan = enrolled * PLAN.planDollars;
    return {
      employees: all, enrolled, coin, n, total, dollars: { off, on }, coins,
      // What happens after the drop with Pulse on: the reward paid in, and the part of the Section 125 bucket that is Plan $.
      after: { reward, plan, rewardCoins: Math.round(reward / coin), planCoins: Math.min(coins.on.pulse, Math.round(plan / coin)), bank: r2(on.bank + reward) },
      delta: { taxes: r2(off.taxes - on.taxes), bank: r2(on.bank + reward - off.bank), company: on.company, fee: on.fee, plan, reward, section125: on.pulse },
    };
  }
  const single = () => scenario(1, 100);

  /* Self-check: the pay adds up both ways, every dollar no longer paid in tax lands somewhere, and the film's company figures fall out. */
  (function () {
    const near = (a, b, tol, what) => { if (Math.abs(a - b) > tol) throw new Error(what + ': ' + a + ' vs ' + b); };
    const s = single();
    near(sum(s.dollars.off), sum(s.dollars.on), 0.2, 'same payroll both ways');
    near(s.dollars.on.bank, WK.postTaxPlan * WEEKS, 0.05, 'pay before the reward matches the sample');
    near(s.delta.taxes, s.delta.plan + s.delta.fee + s.delta.company + s.delta.bank, 0.2, 'tax not paid lands somewhere');
    near(s.delta.section125, s.delta.reward + s.delta.plan, 0, 'Section 125 is the reward plus Plan $');
    near(s.delta.company, 56.8, 0.001, 'company keeps per employee');
    near(s.delta.bank, (600.99 - 580.62) * WEEKS, 0.05, 'take-home gain matches the sample');
    near(sum(s.dollars.off), (769.23 + 45.4 + 10.62) * WEEKS, 0.1, 'payroll is the $40,000 wage plus the employer match');
    if (s.n > FULL * 1.03 || s.n < FULL * 0.6) throw new Error('one paycheck drop size out of range: ' + s.n);
    for (const [e, q] of [[1, 100], [1, 80], [7, 80], [50, 80], [50, 100], [333, 65], [5000, 100]]) { const c = scenario(e, q); for (const m of ['off', 'on']) for (const k in CAP) if (c.coins[m][k] > CAP[k] + 1) throw new Error(k + ' tray overflows at ' + e + ' employees, ' + q + '%: ' + c.coins[m][k]); }
    const film = scenario(50, 90); // the film's Northside Heating & Air: 45 of 50 enrolled
    near(film.delta.company, 2556, 0.001, 'film: company keeps'); near(film.delta.plan, 9000, 0.001, 'film: Plan Dollars'); near(film.delta.plan + film.delta.fee, 10575, 0.001, 'film: invoice');
    for (const [e, q] of [[1, 100], [7, 80], [50, 80], [333, 65], [5000, 100]]) {
      const c = scenario(e, q);
      for (const mode of ['off', 'on']) near(KEYS.reduce((a, k) => a + c.coins[mode][k], 0), c.n, 0, 'coins add up at ' + e);
      if (c.n > FULL * 1.03 || c.n < FULL * 0.6) throw new Error('drop size out of range at ' + e + ': ' + c.n);
      if (c.coins.on.bank + c.after.rewardCoins > 390) throw new Error('bank tray overflows at ' + e);
    }
    near(scenario(50, 80).delta.company, 2272, 0.001, 'company at 50 employees, 80%');
  })();

  const api = { PLAN, KEYS, FULL, scenario, single };
  root.CoinModel = api;
  if (typeof module !== 'undefined') module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
