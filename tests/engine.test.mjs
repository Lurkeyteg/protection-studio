/* Protection Studio engine tests.
 * Runs the real engine straight out of index.html (no copy), so the shipped file
 * is what gets verified. Node 22+.
 *
 *   node tests/engine.test.mjs
 *
 * Every expected figure below is hand-computed in the comment beside it. If a
 * constant in PS.T changes, recompute here by hand — never paste from failure
 * output.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const html = fs.readFileSync(path.join(here, '..', 'index.html'), 'utf8');
const m = html.match(/\/\* ==== PROTECTION ENGINE START ==== \*\/([\s\S]*?)\/\* ==== PROTECTION ENGINE END ==== \*\//);
if (!m) { console.error('FATAL: engine markers not found in index.html'); process.exit(1); }

const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(m[1], sandbox);
const PS = sandbox.PS;
if (!PS) { console.error('FATAL: engine did not export PS'); process.exit(1); }

let pass = 0, fail = 0;
const near = (a, b, tol = 0.6) => Math.abs(Number(a) - Number(b)) <= tol;
function eq(name, got, want, tol = 0.6) {
  if (typeof want === 'number') {
    if (near(got, want, tol)) pass++;
    else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${want}`); }
  } else if (got === want) pass++;
  else { fail++; console.log(`FAIL ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`); }
}
function ok(name, cond) { eq(name, !!cond, true); }

function base(over = {}) {
  const p = PS.defaultProfile();
  delete p.money.annualPremium; p.money.annualPremium = 0;
  Object.assign(p, over);
  return PS.cleanProfile(p);
}
/* his worked example: S$100,000 income, 10x, DPS off so the split is clean */
function example() {
  const p = PS.defaultProfile();
  p.client.annualIncome = 100000;
  p.basis.deathMult = 10; p.basis.tpdMult = 10; p.basis.accidentShare = 0.20;
  p.have.deathAny = 800000; p.have.deathAcc = 200000;
  p.have.tpdAny = 800000; p.have.tpdAcc = 200000;
  p.national.dps = false;
  return PS.cleanProfile(p);
}

/* ---------------- 1. constants and protective tables ---------------- */
eq('co-pay cap 6,000 (MOH from 1 Apr 2026)', PS.T.COPAY_CAP, 6000);
eq('co-pay rate 5%', PS.T.COPAY_RATE, 0.05);
eq('DI cap 75%', PS.T.DI_MAX, 0.75);
eq('CareShield Life 2026 payout', PS.T.CSHL_2026, 689);
eq('DPS sum assured', PS.T.DPS_ASSURED, 70000);
eq('DPS after 60', PS.T.DPS_ASSURED_60, 55000);
eq('premium cap 15%', PS.T.PREMIUM_CAP, 0.15);
eq('deductible private', PS.T.WARD_DEDUCTIBLE.Private, 3500);
eq('deductible A', PS.T.WARD_DEDUCTIBLE.A, 3500);
eq('deductible B1', PS.T.WARD_DEDUCTIBLE.B1, 2500);
eq('deductible B2', PS.T.WARD_DEDUCTIBLE.B2, 2000);
eq('deductible C', PS.T.WARD_DEDUCTIBLE.C, 1500);

/* ---------------- 2. national schemes ---------------- */
eq('DPS at 35 = 70,000', PS.dpsAssured(35, true), 70000);
eq('DPS at 59 = 70,000', PS.dpsAssured(59, true), 70000);
eq('DPS at 60 = 55,000', PS.dpsAssured(60, true), 55000);
eq('DPS at 65 = 55,000', PS.dpsAssured(65, true), 55000);
eq('DPS at 66 = 0', PS.dpsAssured(66, true), 0);
eq('DPS switched off = 0', PS.dpsAssured(35, false), 0);

/* ---------------- 3. formatting ---------------- */
eq('money 1,234,567', PS.money(1234567), 'S$1,234,567');
eq('money rounds', PS.money(999.6), 'S$1,000');
eq('compact under 1k', PS.compact(950), 'S$950');
eq('compact keeps small sums exact', PS.compact(3750), 'S$3,750');
eq('compact keeps 9,500 exact', PS.compact(9500), 'S$9,500');
eq('compact 10k switches to k', PS.compact(10000), 'S$10k');
eq('compact 540k', PS.compact(540000), 'S$540k');
eq('compact 1.00m', PS.compact(1000000), 'S$1.00m');
eq('pct 20%', PS.pct(0.2), '20%');
eq('pct 62.5%', PS.pct(0.625), '62.5%');
eq('num("abc") = 0', PS.num('abc'), 0);

/* ---------------- 4. the brief's worked example: 200k accidental + 800k base = 1m ---------------- */
const ex = example();
const dEx = PS.splitBox(ex, 'death');
eq('death total 10x of 100k', dEx.total, 1000000);
eq('death base need = 800,000', dEx.anyReq, 800000);
eq('death accidental need = 200,000', dEx.accReq, 200000);
eq('base + accidental = total', dEx.anyReq + dEx.accReq, dEx.total);
eq('accidental death cover met', dEx.gapAcc, 0);
eq('base death cover met', dEx.gapAny, 0);
eq('death gap 0', dEx.gap, 0);
eq('paid on accidental death = 1,000,000', dEx.accidentPayout, 1000000);
eq('paid on non-accidental death = 800,000', dEx.otherPayout, 800000);
ok('funded fraction = 1', dEx.funded > 0.999);

const tEx = PS.splitBox(ex, 'tpd');
eq('TPD total 10x', tEx.total, 1000000);
eq('TPD base need = 800,000', tEx.anyReq, 800000);
eq('TPD accidental need = 200,000', tEx.accReq, 200000);
eq('TPD gap 0', tEx.gap, 0);
eq('TPD paid on accident', tEx.accidentPayout, 1000000);
eq('TPD paid on illness = 800,000', tEx.otherPayout, 800000);

/* the accidental share is a deliberate shortfall on every other cause */
eq('non-accidental death is 20% short of the need', dEx.total - dEx.otherPayout, 200000);

/* ---------------- 5. no accidental split: base must carry the whole need ---------------- */
const noAcc = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  client: { age: 35, annualIncome: 100000, dependants: 1, retirementAge: 65 },
  basis: { deathMult: 10, tpdMult: 10, ciMult: 4, accidentShare: 0, ciAccelerated: false },
  have: Object.assign(PS.defaultProfile().have, { deathAny: 800000, deathAcc: 200000 }),
  national: Object.assign(PS.defaultProfile().national, { dps: false })
}));
const dNoAcc = PS.splitBox(noAcc, 'death');
eq('0% split: base need is the whole 1m', dNoAcc.anyReq, 1000000);
eq('0% split: accidental need 0', dNoAcc.accReq, 0);
eq('0% split: 800k base leaves a 200k gap', dNoAcc.gap, 200000);

/* surplus any-cause cover satisfies the accident-only target (it pays on accidents too) */
const surplusP = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  national: Object.assign(PS.defaultProfile().national, { dps: false }),
  have: Object.assign(PS.defaultProfile().have, { deathAny: 540000 })
}));
const dSur = PS.splitBox(surplusP, 'death');
eq('full base cover closes the base target', dSur.gapAny, 0);
eq('surplus base cover closes the accident-only target too', dSur.gapAcc, 0);
eq('surplus base cover => no gap', dSur.gap, 0);
eq('accident path is ok', dSur.accidentStatus, 'ok');
eq('illness path is ok at 9x base', dSur.otherStatus, 'ok');

/* the worked example's illness path is amber: the 200k is the split, not a mistake */
eq('worked example: accident path ok', dEx.accidentStatus, 'ok');
eq('worked example: illness path amber (deliberate 20% split)', dEx.otherStatus, 'wn');
eq('worked example: accident shortfall 0', dEx.accShort, 0);
eq('worked example: illness shortfall = the accidental share', dEx.otherShort, 200000);

/* a base cover short of its target fails outright */
const thin = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  national: Object.assign(PS.defaultProfile().national, { dps: false }),
  have: Object.assign(PS.defaultProfile().have, { deathAny: 100000 })
}));
const dThin = PS.splitBox(thin, 'death');
eq('thin base: base gap 332,000', dThin.gapAny, 332000);
eq('thin base: accident gap 108,000 (no surplus to credit)', dThin.gapAcc, 108000);
eq('thin base: total gap 440,000', dThin.gap, 440000);
eq('thin base: accident path red', dThin.accidentStatus, 'no');

/* ---------------- 6. default profile (income 60k, 9x, 20% accident, DPS on) ---------------- */
const dDef = PS.splitBox(PS.defaultProfile(), 'death');
eq('default death need 9x60k = 540,000', dDef.total, 540000);
eq('default base need 80% = 432,000', dDef.anyReq, 432000);
eq('default accidental need 20% = 108,000', dDef.accReq, 108000);
eq('default DPS counted 70,000', dDef.national, 70000);
eq('default base gap 432,000 - 70,000 = 362,000', dDef.gapAny, 362000);
eq('default accidental gap = 108,000', dDef.gapAcc, 108000);
eq('default death gap = 470,000', dDef.gap, 470000);
eq('default funded = 70,000/540,000', dDef.funded, 70000 / 540000, 1e-9);
eq('default paid on accident = DPS only', dDef.accidentPayout, 70000);

/* CPF savings count for death, not for TPD */
const withCpf = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  national: Object.assign(PS.defaultProfile().national, { cpfSavings: 100000 })
}));
eq('CPF savings offset the death need', PS.splitBox(withCpf, 'death').gapAny, 262000);
eq('CPF savings do not offset TPD', PS.splitBox(withCpf, 'tpd').gapAny, 362000);

/* ---------------- 7. critical illness ---------------- */
const cDef = PS.ciBox(PS.defaultProfile());
eq('CI need 4x60k = 240,000', cDef.total, 240000);
eq('CI gap = 240,000 with no cover', cDef.gap, 240000);
eq('CI recovery assumption 5 years', cDef.recoveryYears, 5);
const cFive = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  basis: { deathMult: 9, tpdMult: 9, ciMult: 5, accidentShare: 0.2, ciAccelerated: false }
}));
eq('CI at 5x = 300,000', PS.ciBox(cFive).total, 300000);
const cMixed = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { ci: 150000 }),
  group: Object.assign(PS.defaultProfile().group, { ci: 50000 })
}));
eq('CI personal + group = 200,000', PS.ciBox(cMixed).have, 200000);
eq('CI gap = 40,000', PS.ciBox(cMixed).gap, 40000);

/* accelerated CI burns the death sum */
const accel = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  client: { age: 35, annualIncome: 100000, dependants: 1, retirementAge: 65 },
  basis: { deathMult: 9, tpdMult: 9, ciMult: 4, accidentShare: 0.2, ciAccelerated: true },
  have: Object.assign(PS.defaultProfile().have, { deathAny: 500000, ci: 200000 }),
  national: Object.assign(PS.defaultProfile().national, { dps: false })
}));
const dAccel = PS.splitBox(accel, 'death');
eq('accelerated CI burns 200,000 of death cover', dAccel.ciBurn, 200000);
eq('death cover after a CI claim = 300,000', dAccel.otherAfterCI, 300000);
const notAccel = PS.cleanProfile(Object.assign({}, accel, { basis: Object.assign({}, accel.basis, { ciAccelerated: false }) }));
eq('additional CI burns nothing', PS.splitBox(notAccel, 'death').ciBurn, 0);

/* ---------------- 8. disability income ---------------- */
const diDef = PS.diBox(PS.defaultProfile());
eq('monthly income 5,000', diDef.monthly, 5000);
eq('DI target 75% = 3,750', diDef.target, 3750);
eq('DI gap = 3,750', diDef.gap, 3750);
eq('income at risk 3,750x12x3.5 = 157,500', diDef.atRisk, 157500);
eq('headroom under the 75% cap = 3,750', diDef.capHeadroom, 3750);

const diMix = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { diMonthly: 2000 }),
  group: Object.assign(PS.defaultProfile().group, { diMonthly: 500 })
}));
const diM = PS.diBox(diMix);
eq('DI personal + group = 2,500', diM.have, 2500);
eq('DI gap = 1,250', diM.gap, 1250);
eq('income at risk 1,250x12x3.5 = 52,500', diM.atRisk, 52500);
eq('headroom = 1,250', diM.capHeadroom, 1250);

/* the 75% cap binds: a 100% target is clamped */
const over = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { diTargetRatio: 1 })
}));
eq('100% target clamped to 75%', PS.diBox(over).ratio, 0.75);
eq('clamped target = 3,750', PS.diBox(over).target, 3750);

/* benefit cannot exceed the cap even if the client asks for more cover */
const maxed = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { diMonthly: 5000 })
}));
eq('over-insured DI shows 0 gap', PS.diBox(maxed).gap, 0);
eq('over-insured DI shows 0 headroom', PS.diBox(maxed).capHeadroom, 0);

/* ---------------- 9. severe disability / care funding (LPA deck figures) ---------------- */
const careDef = diDef.care;
eq('care 2,000/month x 12 x 10 = 240,000', careDef.totalCost, 240000);
eq('CareShield Life 689x120 = 82,680', careDef.totalPayout, 82680);
eq('care gap per month = 1,311', careDef.gapMonthly, 1311);
eq('unfunded care = 1,311x120 = 157,320', careDef.gapTotal, 157320);
const careSup = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  national: Object.assign(PS.defaultProfile().national, { cshlSupplement: 1000 }),
  have: Object.assign(PS.defaultProfile().have, { careMonthlyCost: 6000, careYears: 10 })
}));
eq('supplement adds to the CareShield payout', PS.diBox(careSup).care.payoutMonthly, 1689);
eq('6,000/month specialised care over 10 yrs = 720,000', PS.diBox(careSup).care.totalCost, 720000);
eq('supplement leaves 4,311/month unfunded', PS.diBox(careSup).care.gapMonthly, 4311);
const careCovered = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { careMonthlyCost: 500 }),
  national: Object.assign(PS.defaultProfile().national, { cshlSupplement: 0 })
}));
eq('CareShield above the care cost leaves 0 gap', PS.diBox(careCovered).care.gapMonthly, 0);

/* ---------------- 10. hospitalisation ---------------- */
const hDef = PS.hospBox(PS.defaultProfile());
eq('worst OOP class A = 3,500 + 6,000', hDef.worstOOP, 9500);
eq('no ISP = full 9,500 gap', hDef.gap, 9500);
eq('no ISP = nothing covered', hDef.covered, 0);
ok('no ISP is unfunded', hDef.funded === 0);

function hosp(over) {
  const p = PS.defaultProfile();
  Object.assign(p.have.hospital, over.hospital || {});
  if (over.cash !== undefined) p.have.hospCash = over.cash;
  if (over.days !== undefined) p.have.hospDays = over.days;
  return PS.hospBox(PS.cleanProfile(p));
}
eq('ISP, no rider: gap = deductible + co-pay', hosp({ hospital: { isp: true, rider: 'none' } }).gap, 9500);
eq('ISP + new rider: gap = deductible only', hosp({ hospital: { isp: true, rider: 'new' } }).gap, 3500);
eq('ISP + legacy rider: gap = 0', hosp({ hospital: { isp: true, rider: 'legacy' } }).gap, 0);
eq('class C deductible 1,500', hosp({ hospital: { ward: 'C' } }).deductible, 1500);
eq('class C worst OOP = 7,500', hosp({ hospital: { ward: 'C' } }).worstOOP, 7500);
eq('class C + new rider = 1,500 gap', hosp({ hospital: { ward: 'C', isp: true, rider: 'new' } }).gap, 1500);
eq('class B2 + new rider = 2,000 gap', hosp({ hospital: { ward: 'B2', isp: true, rider: 'new' } }).gap, 2000);
eq('private + new rider = 3,500 gap', hosp({ hospital: { ward: 'Private', isp: true, rider: 'new' } }).gap, 3500);
eq('hospital cash 5x200 = 1,000', hosp({ hospital: { isp: true, rider: 'new' }, cash: 200, days: 5 }).cash, 1000);
eq('cash reduces the net need to 2,500', hosp({ hospital: { isp: true, rider: 'new' }, cash: 200, days: 5 }).net, 2500);
eq('cash above the gap floors the net at 0', hosp({ hospital: { isp: true, rider: 'new' }, cash: 1000, days: 10 }).net, 0);
eq('legacy rider + cash still 0 net', hosp({ hospital: { isp: true, rider: 'legacy' }, cash: 0, days: 0 }).net, 0);

/* ---------------- 11. company / group cover ---------------- */
const gP = PS.defaultProfile();
Object.assign(gP.group, { deathAny: 60000, tpdAny: 60000, ci: 30000, diMonthly: 500 });
const gB = PS.groupBox(PS.cleanProfile(gP), { death: PS.splitBox(PS.defaultProfile(), 'death'), ci: PS.ciBox(PS.defaultProfile()), tpd: PS.splitBox(PS.defaultProfile(), 'tpd') });
eq('group lump sum = 60k + 60k + 30k + 6k DI = 156,000', gB.lump, 156000);
eq('group parts counted', gB.parts.length, 4);
eq('group DI annualised = 6,000', gB.parts.find(x => x.label === 'Group disability income').amount, 6000);
eq('group death share = 60k/540k', gB.shareDeath, 60000 / 540000, 1e-9);
eq('group CI share = 30k/240k', gB.shareCI, 30000 / 240000, 1e-9);
eq('hospital benefit counted in the count', PS.groupBox(PS.cleanProfile(Object.assign(PS.defaultProfile(), { group: Object.assign(PS.defaultProfile().group, { hospital: true }) })), { death: { total: 1 }, ci: { total: 1 }, tpd: { total: 1 } }).count, 1);

/* ---------------- 12. rules ---------------- */
function ruleSet(p) { const R = PS.build(p); return { R, map: Object.fromEntries(R.rules.map(r => [r.label.slice(0, 12), r])) }; }
const baseBoxes = (() => {
  const z = PS.defaultProfile();
  return {
    death: PS.splitBox(z, 'death'), tpd: PS.splitBox(z, 'tpd'), ci: PS.ciBox(z, 'severe'),
    ciEarly: PS.ciBox(z, 'early'), di: PS.diBox(z), hosp: PS.hospBox(z)
  };
})();
const rDef = PS.rules(PS.defaultProfile(), baseBoxes);
eq('9 LIA checklist rows (early CI adds one)', rDef.length, 9);
eq('unfunded death is a fail', rDef[0].status, 'bad');
eq('unfunded severe CI is a fail', rDef[1].status, 'bad');
eq('unfunded early CI is a fail', rDef[2].status, 'bad');
eq('no DI is a fail', rDef[3].status, 'bad');
eq('no ISP hospitalisation is a fail', rDef[4].status, 'bad');
eq('CareShield considered flags a warn when care is underfunded', rDef[5].status, 'warn');
eq('premium test asks for input', rDef[6].status, 'warn');
eq('emergency fund asks for input', rDef[7].status, 'warn');
eq('national schemes always ok', rDef[8].status, 'ok');

const funded = example();
const fR = PS.rules(funded, { death: PS.splitBox(funded, 'death'), tpd: PS.splitBox(funded, 'tpd'), ci: PS.ciBox(funded, 'severe'), ciEarly: PS.ciBox(funded, 'early'), di: PS.diBox(funded), hosp: PS.hospBox(funded) });
eq('funded death & TPD passes', fR[0].status, 'ok');
eq('no CI cover still fails', fR[1].status, 'bad');

/* early CI switched off removes its checklist row */
const noEarly = PS.build(PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  basis: Object.assign(PS.defaultProfile().basis, { ciEarlyMult: 0 })
})));
eq('early CI at 0× drops out of the checklist', noEarly.rules.length, 8);
eq('early CI at 0× has no requirement', noEarly.ciEarly.total, 0);
eq('early CI at 0× is not scored as a need', noEarly.summary.of, 5);

const premP = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  money: { annualPremium: 6000, liquidSavings: 30000, monthlyExpenses: 5000, usableAssets: 0 }
}));
const rPrem = PS.rules(premP, { death: PS.splitBox(premP, 'death'), tpd: PS.splitBox(premP, 'tpd'), ci: PS.ciBox(premP, 'severe'), ciEarly: PS.ciBox(premP, 'early'), di: PS.diBox(premP), hosp: PS.hospBox(premP) });
eq('6,000 of 60,000 = 10% passes the 15% test', rPrem[6].status, 'ok');
eq('30,000 savings / 5,000 expenses = 6 months passes', rPrem[7].status, 'ok');
const premHi = PS.cleanProfile(Object.assign(PS.defaultProfile(), { money: { annualPremium: 12000, liquidSavings: 5000, monthlyExpenses: 5000, usableAssets: 0 } }));
const rHi = PS.rules(premHi, { death: PS.splitBox(premHi, 'death'), tpd: PS.splitBox(premHi, 'tpd'), ci: PS.ciBox(premHi, 'severe'), ciEarly: PS.ciBox(premHi, 'early'), di: PS.diBox(premHi), hosp: PS.hospBox(premHi) });
eq('20% of income on premiums fails', rHi[6].status, 'bad');
eq('1 month of expenses fails the emergency test', rHi[7].status, 'bad');

/* ---------------- 13. build() assembly ---------------- */
const bDef = PS.build(PS.defaultProfile());
eq('build returns 8 boxes', bDef.boxes.length, 8);
eq('lump-sum gap = death + CI + TPD', bDef.summary.lumpGap, 470000 + 240000 + 470000);
eq('lump-sum gap = 1,180,000', bDef.summary.lumpGap, 1180000);
eq('nothing funded on defaults', bDef.summary.funded, 0);
eq('six fundable needs counted', bDef.summary.of, 6);
eq('contingent company cover on defaults = 0', bDef.summary.contingentLump, 0);
const bEx = PS.build(example());
eq('worked example funds death and TPD', bEx.summary.funded, 2);
eq('worked example leaves only the CI gap', bEx.summary.lumpGap, 400000);
eq('accident box mirrors the death need', bEx.accident.death.total, 1000000);
eq('accident box mirrors the TPD need', bEx.accident.tpd.accReq, 200000);

/* ---------------- 13b. the plan layer: current + recommended = resulting coverage ---------------- */
const plain = PS.cleanProfile(Object.assign(PS.defaultProfile(), { national: Object.assign(PS.defaultProfile().national, { dps: false }) }));
const p0 = PS.splitBox(plain, 'death');
eq('no assets, no cover, no recommendation', p0.resources, 0);
eq('gap before any recommendation = 540,000', p0.gapBefore, 540000);
eq('missing after change = 540,000', p0.missing, 540000);
eq('nothing supplied by a recommendation', p0.coveredByRec, 0);

const withAssets = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  national: Object.assign(PS.defaultProfile().national, { dps: false }),
  money: Object.assign(PS.defaultProfile().money, { usableAssets: 200000 })
}));
const pa = PS.splitBox(withAssets, 'death');
eq('usable assets count as resources', pa.resources, 200000);
eq('assets cut the gap to 340,000', pa.gap, 340000);
eq('assets appear on their own line', pa.assets, 200000);
eq('assets do not touch existing cover', pa.anyHave, 0);

const withRec = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  national: Object.assign(PS.defaultProfile().national, { dps: false }),
  money: Object.assign(PS.defaultProfile().money, { usableAssets: 200000 }),
  have: Object.assign(PS.defaultProfile().have, { rec: { death: 340000, deathAcc: 0, ci: 0, ciEarly: 0, tpd: 0, tpdAcc: 0, diMonthly: 0 } })
}));
const pr = PS.splitBox(withRec, 'death');
eq('recommendation is recorded but does not change "in place"', pr.resources, 200000);
eq('recommendation closes the gap', pr.missing, 0);
eq('recommendation credited = 340,000', pr.coveredByRec, 340000);
eq('funded before = 200,000/540,000', pr.fundedBefore, 200000 / 540000, 1e-9);
eq('funded after = 1', pr.fundedAfter, 1);

const overRec = PS.cleanProfile(Object.assign({}, withRec, {
  have: Object.assign({}, withRec.have, { rec: { death: 999999, deathAcc: 0, ci: 0, ciEarly: 0, tpd: 0, tpdAcc: 0, diMonthly: 0 } })
}));
eq('over-recommending leaves 0 missing', PS.splitBox(overRec, 'death').missing, 0);
eq('over-recommending credits only what was missing', PS.splitBox(overRec, 'death').coveredByRec, 340000);

/* assets are counted per event, never added across events */
const twoEvents = PS.build(withAssets);
eq('assets counted for death', twoEvents.death.assets, 200000);
eq('same assets counted for severe CI', twoEvents.ci.assets, 200000);
eq('same assets counted for TPD', twoEvents.tpd.assets, 200000);
eq('same assets counted for early CI', twoEvents.ciEarly.assets, 200000);

/* EARLY / INTERMEDIATE CI is a separate event: its own need, cover and recommendation */
const ciD = PS.ciBox(PS.defaultProfile(), 'severe');
const ciE = PS.ciBox(PS.defaultProfile(), 'early');
eq('severe CI need 4x60k = 240,000', ciD.total, 240000);
eq('early CI need 1x60k = 60,000', ciE.total, 60000);
eq('early CI is not the severe sum', ciE.total !== ciD.total, true);
const ciPair = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { ci: 100000, ciEarly: 20000 })
}));
eq('severe CI cover is not carried into early CI', PS.ciBox(ciPair, 'early').have, 20000);
eq('early CI cover is not carried into severe CI', PS.ciBox(ciPair, 'severe').have, 100000);
eq('severe CI gap = 140,000', PS.ciBox(ciPair, 'severe').gap, 140000);
eq('early CI gap = 40,000', PS.ciBox(ciPair, 'early').gap, 40000);
eq('early CI key', PS.ciBox(ciPair, 'early').key, 'ciEarly');

/* DI and hospitalisation carry the same "missing after" idea */
const diRec = PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { rec: { death: 0, deathAcc: 0, ci: 0, ciEarly: 0, tpd: 0, tpdAcc: 0, diMonthly: 3750 } })
}));
eq('DI recommendation closes the monthly gap', PS.diBox(diRec).missing, 0);
eq('DI recommendation does not change in place', PS.diBox(diRec).have, 0);
eq('hospital: missing after change = cash need', PS.hospBox(PS.defaultProfile()).missing, 9500);

/* recommendation totals in the summary */
const sumRec = PS.build(withRec);
eq('summary counts the recommended total', sumRec.summary.recTotal, 340000);
/* only early CI is funded today (200k assets vs a 60k need); death becomes funded once the 340k recommendation is counted */
eq('funded today counts only implemented cover', sumRec.summary.funded, 1);
eq('funded after recommendation counts the top-up', sumRec.summary.fundedAfter, 2);
/* assets 200k count for every event: severe CI 40k + TPD 340k + DI 3,750 + hospital 9,500 */
eq('summary missing after change = 393,250', sumRec.summary.missingTotal, 393250);

/* ---------------- 14. normaliser repairs instead of throwing ---------------- */
const junk = PS.cleanProfile({ client: { age: 'abc', annualIncome: -500 }, basis: { accidentShare: 5 }, have: { hospital: { ward: 'Z9', rider: 'weird' } }, nonsense: 1 });
eq('bad age falls back to 0 and clamps to 16', junk.client.age, 16);
eq('negative income clamped to 0', junk.client.annualIncome, 0);
eq('accident share clamped to 1', junk.basis.accidentShare, 1);
eq('unknown ward repaired to A', junk.have.hospital.ward, 'A');
eq('unknown rider repaired to none', junk.have.hospital.rider, 'none');
eq('missing keys filled in', junk.money.monthlyExpenses, 3000);
eq('garbage input yields a usable profile', typeof junk.have.careYears, 'number');
eq('null input yields defaults', PS.cleanProfile(null).client.age, 35);
eq('cap clamped at 75%', PS.cleanProfile({ have: { diTargetRatio: 3 } }).have.diTargetRatio, 0.75);
eq('schema version stamped', PS.cleanProfile({}).v, 1);

/* ---------------- 15. invariants over a spread of profiles ---------------- */
const samples = [
  PS.defaultProfile(),
  example(),
  PS.cleanProfile({ client: { age: 22, annualIncome: 24000 }, basis: { deathMult: 10, tpdMult: 10, ciMult: 5 } }),
  PS.cleanProfile({ client: { age: 58, annualIncome: 240000 }, basis: { accidentShare: 0 } }),
  PS.cleanProfile({ client: { age: 61, annualIncome: 0 }, national: { dps: true } }),
  PS.cleanProfile({ client: { annualIncome: 1 }, basis: { deathMult: 20, tpdMult: 20, ciMult: 20 } })
];
samples.forEach((s, i) => {
  const R = PS.build(s);
  const d = R.death, t = R.tpd;
  ok(`[${i}] death split adds up`, near(d.anyReq + d.accReq, d.total, 0.001));
  ok(`[${i}] TPD split adds up`, near(t.anyReq + t.accReq, t.total, 0.001));
  ok(`[${i}] no negative death gap`, d.gap >= 0);
  ok(`[${i}] no negative CI gap`, R.ci.gap >= 0);
  ok(`[${i}] no negative DI gap`, R.di.gap >= 0);
  ok(`[${i}] no negative hospital gap`, R.hosp.net >= 0);
  ok(`[${i}] funded in [0,1]`, d.funded >= 0 && d.funded <= 1);
  ok(`[${i}] accident payout = base + accident`, near(d.accidentPayout, d.anyHave + d.accHave, 0.001));
  ok(`[${i}] other-cause payout = base only`, near(d.otherPayout, d.anyHave, 0.001));
  ok(`[${i}] no NaN in the summary`, Object.values(R.summary).every(v => typeof v !== 'number' || isFinite(v)));
  ok(`[${i}] rules cover every row`, R.rules.length >= 8);
  ok(`[${i}] every rule has a status`, R.rules.every(r => ['ok', 'warn', 'bad'].indexOf(r.status) >= 0));
});

/* zero income must not divide by zero anywhere */
const zero = PS.build(PS.cleanProfile({ client: { annualIncome: 0 } }));
eq('zero income: death need 0', zero.death.total, 0);
eq('zero income: fully funded denominator safe', zero.death.funded, 1);
eq('zero income: DI target 0', zero.di.target, 0);
eq('zero income: premium % is finite', isFinite(zero.summary.premiumPct), true);

/* a client whose cover exceeds the need is still capped at 100% funded */
const rich = PS.build(PS.cleanProfile(Object.assign(PS.defaultProfile(), {
  have: Object.assign(PS.defaultProfile().have, { deathAny: 9000000, tpdAny: 9000000, ci: 9000000, diMonthly: 20000 }),
  money: { annualPremium: 9000, liquidSavings: 50000, monthlyExpenses: 4000 }
})));
eq('over-insured death funded = 1', rich.death.funded, 1);
eq('over-insured CI funded = 1', rich.ci.funded, 1);
eq('over-insured DI funded = 1', rich.di.funded, 1);
eq('over-insured summary counts 4 of 5 (hospital still short)', rich.summary.funded, 4);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
