# Regulatory sources — every figure and where it came from

Retrieved and cross-checked 14 November 2026. Nothing in `index.html` is typed
from memory: each constant below appears in `PS.T` and this table is the audit
trail. When a figure changes, change it here and in `PS.T` in the same edit, then
recompute the affected test expectations by hand.

## LIA / MAS rules of thumb

| Figure | Value | Source |
|---|---|---|
| Death & TPD cover | **9× annual income** | *Basic Financial Planning Guide* (LIA with MAS/MoneySense, launched Jan 2024), "Key Needs Rules of Thumb" — https://www.lia.org.sg/media/4008/basic-financial-planning-guide.pdf |
| Death & TPD cover (FAQ wording) | **9–10× annual earnings** | LIA FAQ, *Mortality Protection* — https://www.lia.org.sg/tools-and-resources/faq/mortality-protection/ |
| Critical illness cover | **4× annual income** (standard CI) | Basic Financial Planning Guide, same page |
| CI need, measured | **3.9× annual income**, on an assumed **5-year recovery period**; medical costs assumed covered by MediShield Life / ISP / MediSave | LIA *2022 Protection Gap Study* (EY), §1.3 — https://www.lia.org.sg/media/3974/lia-pgs-2022-report_final_8-sep-2023.pdf |
| Mortality need, measured | **9.0× annual income** for the economically active population (varies by household profile) | LIA 2022 PGS, main highlights |
| Insurance spend cap | **at most 15% of take-home pay** on insurance protection (after CPF); bundled whole-life products may exceed it | Basic Financial Planning Guide |
| Emergency fund | **3–6 months** of expenses (12 if income is irregular) | Basic Financial Planning Guide |
| Rounding convention | Coverage may be rounded to the nearest **S$100,000**, after netting existing policies (CompareFirst presents in S$100k units) | *Industry/Representative FAQs on the Basic Financial Planning Guide*, 31 Jan 2024 — https://www.lia.org.sg/media/4132/faqs-for-financial-institutions-and-their-representatives-on-basic-financial-planning_31-jan-2024.pdf |

### LIA simplified-calculator methodology (the basis this app does **not** yet use)

- Mortality need = `income × proportion of income to cover dependants × (retirement age − age)`
- CI need = `income × proportion × expected CI recovery period`
- Resources: CPF balances (**mortality only** — CPF cannot be withdrawn for CI),
  individual + group insurance, and discretionary non-CPF savings.

Source: *Life Insurance Simplified Calculator — assumptions & caveats* (2024) —
https://www.lia.org.sg/Assets/pdfs/assumptions-caveats-for-lia-life-insurance-simplified-calculator-2024.pdf

## Disability income

| Figure | Value | Source |
|---|---|---|
| Maximum benefit | **75% of pre-disability income**, across all policies combined | Product terms: Singlife Disability Income ("up to 75% of your income replaced") https://singlife.com/en/disability-insurance/disability-income ; Great Eastern PayAssure ("protect up to 75% of your income") https://www.greateasternlife.com/sg/en/personal-insurance/our-products/health-insurance/pay-assure.html ; AIA Premier Disability Cover ("up to 75% of existing income") https://www.aia.com.sg/en/our-products/health/disability-income-insurance/aia-premier-disability-cover |
| Definition and mechanics | Own-occupation vs any-occupation; deferred period; partial disability; benefit to 60/65; premiums waived during claim | LIA *Insurance Terms* — https://www.lia.org.sg/tools-and-resources/insurance-terms/ |
| Claim duration (default in app) | **3.5 years** — median long-term disability claim duration reported by LIA | Secondary source only (*The Kopi Notes*, 2026) — **treat as an editable assumption, not a statutory figure** |

## Hospitalisation (MOH)

| Figure | Value | Source |
|---|---|---|
| Minimum IP deductible, per policy year | **S$3,500** private / Class A · **S$2,500** B1 · **S$2,000** B2 · **S$1,500** C | MOH, *New requirements for IP riders*, 26 Nov 2025 (Annex A) — https://www.moh.gov.sg/newsroom/new-requirements-for-integrated-shield-plan-riders-to-strengthen-sustainability-of-private-health-insurance-and-address-rising-healthcare-costs/ ; restated in AIA's rider FAQ — https://www.aia.com.sg/content/dam/sg-wise/en/docs/help-support/healthshieldsupport/aia-faqs-changes-to-IP-riders.pdf |
| Co-payment | minimum **5%** of the bill above the deductible | MOH, same announcement |
| Co-payment cap | **at least S$6,000 per policy year from 1 Apr 2026** (was S$3,000), excluding the minimum deductible | MOH, same announcement; MoneySense — https://www.moneysense.gov.sg/integrated-shield-plans/ |
| New riders | From **1 April 2026** new IP riders may not cover the MOH minimum deductible | MOH, same announcement |
| Payment | Deductible and co-payment can be paid from **MediSave**, subject to withdrawal limits | MOH, same announcement |

## National schemes (CPF)

| Figure | Value | Source |
|---|---|---|
| CareShield Life payout | **S$689/month** for a successful claim in **2026**; rises **4%/yr** until claim or age 67 (up to **S$2,941** for the 1980+ cohort at 67); S$612 fixed for those born 1954 or earlier | CPF — https://www.cpf.gov.sg/member/healthcare-financing/careshield-life ; payout quantum table 2020–2030 (updated 1 Jan 2026) — https://www.cpf.gov.sg/content/dam/web/member/healthcare/documents/Table%20of%20CSHL%20payout%20quantum%202020%20to%202030.pdf |
| Severe disability definition | Cannot perform **3 of 6** activities of daily living (washing, dressing, feeding, toileting, transferring, mobility) | CPF CareShield Life page |
| CPF DPS cover | **S$70,000** to the end of the policy year the member turns 60; **S$55,000** from 60 to 65; covers death, terminal illness and TPD; automatic on a valid CPF contribution, age 21–65 | CPF — https://ask.gov.sg/cpf/questions/cm0f52l1d029zpz7atvw4bfph ; Great Eastern (sole DPS administrator) — https://www.greateasternlife.com/sg/en/personal-insurance/our-products/life-insurance/dependants-protection-scheme/frequently-asked-questions.html |
| DPS premium (context only) | S$18–S$298/yr by age band | CPF — https://ask.gov.sg/cpf/questions/cm0f52l1f02b1pz7a58nsee6a |
| MediShield Life | Universal baseline for large hospital bills; IPs sit above it | Basic Financial Planning Guide |

## Client-facing framing from his own deck

*Prospecting Playbook (slides 1–14)*, Google Slides id
`1zBgHLUKXi_o0uq9fXs-YeOE4zzZdCkzBa6MR1Vh4NiE` — an adviser playbook on incapacity
(LPA) planning with funding. Supplied:

- Cost of care over ten years: basic care at home ≈ S$2,000/month → **S$240,000**;
  nursing home S$2,000–4,000/month; specialised private care ≈ S$6,000/month;
  plus S$200–500/month of incidentals.
- CareShield Life pays S$689/month for a 2026 claim (≈ S$82,680 over ten years),
  and the gap is what the family funds.
- The "have vs need" gap-and-one-number opening, and the five funding questions.

These are seeds for defaults, not statutory figures, so every one is an editable
input.

## Deliberately unchecked

- The "MAS Notice 316 / 75% DI cap" label appears in secondary write-ups but was
  **not** confirmed against the notice itself. The app therefore cites the
  insurer product terms, which state the 75% limit directly.
- The LIA 37-condition CI list is referenced by name only; the condition list is
  not reproduced.
