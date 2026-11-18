# Protection Studio — Singapore protection needs checklist

A single-file web app (`index.html`) for sitting with a client and answering one
question per protection need: **how much is required, how much is already in
place, and what is the gap.** Seven boxes, one LIA checklist strip, and a source
line under every figure.

Open it by double-clicking `index.html`. No build step, no dependencies, no
network calls. Inputs persist in `localStorage`.

Same family as BTO Studio and ILP Studio: dark/light theme, sidebar of inputs,
one self-contained file, and an engine block that the tests extract and run
directly out of the shipped HTML.

| File | What it is |
|---|---|
| `index.html` | The whole app: engine (marked `PROTECTION ENGINE START/END`), UI, styles |
| `tests/engine.test.mjs` | 278 assertions run against the engine **extracted from `index.html`** |
| `reference/regulatory-sources.md` | Every statutory / guideline figure, with its source and effective date |
| `README.md` | This file |

Run the tests with `node tests/engine.test.mjs` (Node 22+). Current status:
**278 passed, 0 failed.**

## The seven boxes — and the plan layer on top

Eight panels. Six carry a requirement; the accidental-composition panel explains
the split inside death and TPD; the last shows what the employer is carrying.

| # | Box | Requirement | Offsets counted |
|---|---|---|---|
| 1 | Death | death multiple × annual income (9× default) | usable assets + client + company + CPF DPS + CPF savings |
| 2 | Severe critical illness | CI multiple × income (4× default) | usable assets + client + company |
| 3 | Early / intermediate CI | early multiple × income (1× placeholder) | usable assets + client (a **separate event** from severe CI) |
| 4 | Total & permanent disability | TPD multiple × income (9× default) | usable assets + client + company + CPF DPS |
| 5 | Accidental death & TPD composition | the accident-only slice of boxes 1 and 4 | accident-only cover held |
| 6 | Disability income | replacement ratio × monthly income, capped at 75% | client DI + company DI, with CareShield Life shown separately |
| 7 | Hospitalisation | MOH minimum deductible for the ward class + co-payment cap | ISP + rider, hospital cash benefit |
| 8 | Company cover | what the employer carries, and what is lost with the job | — |

## The plan layer: current + recommended = resulting coverage

Every panel answers three questions in the same order — **Required · In place ·
Missing after change** — and the bar under them is built from the same four
categories the adviser reads out loud:

| Segment | Meaning |
|---|---|
| Usable assets | cash / savings / investments the client would actually use |
| Existing cover | personal + company + national schemes, as one block |
| Recommended | the proposed top-up, in its own colour and **never** counted as in place |
| Missing capital | what is still unfunded after the recommendation |

Rules the engine enforces:

- **A recommendation is not protection.** It never moves "in place", it never
  flips the LIA checklist to green, and the footer says so. The pill changes to
  *closes with recommendation* when the top-up would clear the gap.
- **Events are independent.** Usable assets are counted against *every* event
  separately and are never added across events; cover is never summed across
  death, CI and TPD. That is the disclaimer printed under the strip.
- **`missing after change = max(0, gap − recommended)`**, and a top-up larger than
  the gap is credited only for the gap (`coveredByRec`) — over-recommending shows
  nothing extra.
- **The header carries the totals** — recommended, and missing after change — so
  the adviser sees the size of the proposal without reading eight boxes.
- Hospital recommendations are product switches (add an ISP, add a rider), so that
  panel has no capital recommendation; its "missing after" is the cash need left
  after the hospital cash benefit.

## The accidental split (his requirement, box 5)

Death and TPD are split into a base sum and an accident-only sum that add up to
the same total:

```
S$100,000 income × 10 = S$1,000,000 total need
                         ├─ S$800,000 base cover (pays on any cause)
                         └─ S$200,000 accident-only cover (pay on an accident)
```

Engine rules:

- `base target = total × (1 − accident share)`, `accident target = total × accident share`.
- Any-cause cover **above** its own target is credited against the accident-only
  target, because any-cause cover also pays on an accident. Without that credit a
  client holding the full 9× as base cover would show a phantom accidental gap.
- The claim-scenario strip tests the two claim paths separately:
  - accident path — base + accident-only, must reach the total (green/red);
  - other-cause path — base only, **amber** when the shortfall is no more than
    the accidental share, because that is the trade the split deliberately makes,
    red when it is worse than that.
- With CI set to accelerate, a CI claim reduces the death cover by the CI sum
  assured and the death box says so.

## Rules as implemented

**Multiples.** 9× death and TPD and 4× CI are the LIA / MAS Basic Financial
Planning Guide rules of thumb; LIA's own mortality FAQ says 9–10× and his brief
says 4–5× for CI, so every multiple is an input with the guide value as default —
never a constant in the code.

**Disability income.** Target = monthly income × replacement ratio, and the ratio
is clamped to 75% because insurers will not write more than 75% of
pre-disability income across all policies. The uncovered income is also expressed
as a pot: `monthly gap × 12 × assumed claim length` (default 3.5 years).

**Severe disability (CareShield Life) sits beside DI, not inside it.** DI pays
when the client cannot do their occupation, on any illness or injury; CareShield
Life pays only on severe disability (3 of 6 ADLs). The panel shows the care cost
per month, the CareShield payout, and the unfunded care over the chosen number of
years (S$2,000/month × 120 = S$240,000 from the LPA deck).

**Hospitalisation** is modelled as the worst-case out-of-pocket per policy year,
not as a hospital bill: MOH minimum deductible for the ward class (S$3,500
private/A, S$2,500 B1, S$2,000 B2, S$1,500 C) plus the co-payment cap (5% of the
bill above the deductible, capped at a minimum S$6,000 from 1 April 2026). A new
rider may not cover the deductible, so a rider+ISP client still bears the
deductible; a legacy full rider bears nothing. Both may be paid from MediSave,
which is why the panel reports cash need separately from cost.

**Group cover** is counted as in place — the LIA simplified calculator counts
group cover as an available resource — but box 7 states the contingent amount and
flags when more than half of any one need depends on the employer.

## Data contract

One document, all boxes read from it. `PS.cleanProfile()` repairs a partial or
foreign document rather than rejecting it, so a future import from the other apps
is a matter of mapping into this shape:

```js
{
  v: 1,
  client:   { age, annualIncome, dependants, retirementAge },
  basis:    { deathMult, tpdMult, ciMult, ciEarlyMult, accidentShare, ciAccelerated },
  have:     { deathAny, deathAcc, ci, ciEarly, tpdAny, tpdAcc,
              diMonthly, diTargetRatio, diClaimYears,
              hospital: { ward, isp, rider }, hospDays, hospCash,
              careMonthlyCost, careYears,
              rec: { death, deathAcc, ci, ciEarly, tpd, tpdAcc, diMonthly } },
  group:    { deathAny, deathAcc, tpdAny, tpdAcc, ci, diMonthly, hospital },
  national: { dps, cshlMonthly, cshlSupplement, cpfSavings },
  money:    { annualPremium, liquidSavings, monthlyExpenses, usableAssets }
}
```

Derived values are computed and never stored: totals, gaps, `missing`,
`resources`, funded fractions, claim payouts, care totals. Rates live in `PS.T` in
one table. Every calculator is a pure function — `splitBox(profile,
'death'|'tpd')`, `ciBox(profile, 'severe'|'early')`, `diBox`, `hospBox`,
`groupBox`, `accidentBox`, `planLayer`, `rules`, `build` — so a later component
costs one function plus tests, and the printed report can walk the same objects.

## Deliberate deferrals

- **No JSON import/export yet.** The contract above is the hook; the import
  panel, and the mapping from the Advisor Suite profile (`src/types/client.ts`),
  is the next component.
- **No PDF report pack.** Print / PDF prints the page as viewed; a self-documenting
  per-box report pack is a separate iteration.
- **No needs-based (LIA PGS) mode.** Only the multiple-of-income basis is built.
  The LIA simplified-calculator formula —
  `income × proportion × (retirement age − age)` — is the natural second basis.
- **No LIA 37-condition checklist** inside the CI box, only the reference to it.

## Judgement calls to confirm

1. **Accidental split credited against surplus base cover.** Without it a client
   holding the full 9× as base cover shows a phantom accidental gap.
2. **The other-cause path shows amber, not red,** when the shortfall equals the
   accidental share: it is your funding structure, not a defect — but it is
   printed, not hidden, because a non-accidental claim pays the base only.
3. **CPF savings offset death only, not TPD or CI** (the LIA calculator treats CPF
   balances as a mortality resource; CPF cannot be withdrawn for CI).
4. **CareShield Life default S$689/month** is the 2026 claim amount, not the
   client's claim-year amount (it rises 4%/yr to age 67, up to S$2,941). It is an
   editable input because the cohort matters.
5. **Emergency fund and 15%-premium tests are measured against gross income** and
   labelled as such — LIA's 15% is on take-home pay after CPF, so the test is
   conservative.
6. **Demo figures are seeded** (income S$60,000, care cost S$2,000/month) and
   flagged by a `demo figures` pill, with **Clear client** zeroing every money
   field — including the recommendation — while keeping the multiples.
7. **Early / intermediate CI defaults to 1× income.** That is a placeholder
   (≈25% of a 4× severe sum, matching the ratio in the reference plan screen),
   not a statutory rule. Set your own multiple, or 0 to switch the event off — a
   0× event drops out of the checklist and the score.
8. **Usable assets are one input counted per event**, not a shared pool. That
   follows the reference screen and the "each event is independent" rule; if you
   want a shared pool, the model has to stop treating events independently and the
   totals stop being comparable across boxes.
9. **Recommendations are per event and typed in by the adviser.** The app does not
   auto-size a top-up to the gap — an automatic recommendation would hide the
   adviser's judgement, and a typed one shows what is actually being proposed.

## Sources

Full citations, URLs and effective dates: `reference/regulatory-sources.md`.
Short version — LIA / MAS Basic Financial Planning Guide (9× / 4× / 15% / 3–6
months emergency), LIA 2022 Protection Gap Study (CI ≈ 3.9× on a five-year
recovery), LIA mortality FAQ (9–10×), LIA simplified-calculator assumptions (CPF
and group cover as resources), MOH's 26 Nov 2025 IP rider announcement (deductibles,
co-payment cap), CPF CareShield Life payout table and CPF DPS limits, and his own
LPA / incapacity-funding deck for the care-cost and disability-funding framing.
