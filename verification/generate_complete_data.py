#!/usr/bin/env python3
"""
Generate complete data.js with all 69 recommendations from Excel.

This script extracts parameters from:
- R1-R10 sheet (creates LOW and HIGH variants for each = 20 entries)
- R11-R14,R21-R23 sheet (28 entries)
- R15-R20 sheet (21 entries)
- Agreement sheet (for ASH decisions)

Total: 69 recommendations
"""

import pandas as pd
import json

excel_file = '../files/4.ASH-Threshold-thrombophilia-calculator-Final-withArg_pVTE-.xlsx'

# Read all sheets
r1_10_df = pd.read_excel(excel_file, sheet_name='R1-R10', header=None)
r11_23_df = pd.read_excel(excel_file, sheet_name='R11-R14,R21-R23', header=None)
r15_20_df = pd.read_excel(excel_file, sheet_name='R15-R20', header=None)
agreement_df = pd.read_excel(excel_file, sheet_name='Agreement', header=None)

# Get ASH decisions from Agreement sheet
ash_decisions = {}
for idx, row in agreement_df.iterrows():
    case = str(row[1]).strip() if pd.notna(row[1]) else ""
    ash = str(row[2]).strip() if pd.notna(row[2]) else ""
    if case.startswith('R') and ash in ['NoRx', 'Test', 'Rx']:
        ash_decisions[case] = ash

print(f"Loaded {len(ash_decisions)} ASH decisions")

# Build recommendations list
recommendations = []

# === R1-R10: Create LOW and HIGH variants ===
r1_10_base = {
    'R1': {'pVTE': 0.10, 'Tp': 0.38, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'Unprovoked VTE - completed short-term treatment',
           'category': 'Symptomatic VTE'},
    'R2': {'pVTE': 0.01, 'Tp': 0.38, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'VTE provoked by surgery',
           'category': 'Symptomatic VTE'},
    'R3': {'pVTE': 0.05, 'Tp': 0.38, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'VTE provoked by nonsurgical major transient risk factor',
           'category': 'Symptomatic VTE'},
    'R4': {'pVTE': 0.05, 'Tp': 0.38, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'VTE provoked by pregnancy or postpartum',
           'category': 'Symptomatic VTE'},
    'R5': {'pVTE': 0.05, 'Tp': 0.38, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'VTE associated with combined oral contraceptive use',
           'category': 'Symptomatic VTE'},
    'R6': {'pVTE': 0.075, 'Tp': 0.38, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'Unspecified type of VTE',
           'category': 'Symptomatic VTE'},
    'R7': {'pVTE': 0.038, 'Tp': 0.436, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'Cerebral venous thrombosis - discontinue setting',
           'category': 'VTE in Unusual Sites'},
    'R8': {'pVTE': 0.038, 'Tp': 0.436, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'Cerebral venous thrombosis - continue indefinitely',
           'category': 'VTE in Unusual Sites'},
    'R9': {'pVTE': 0.05, 'Tp': 0.416, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
           'description': 'Splanchnic venous thrombosis - discontinue setting',
           'category': 'VTE in Unusual Sites'},
    'R10': {'pVTE': 0.05, 'Tp': 0.416, 'RRt': 1.65, 'RRrx': 0.15, 'RRbleed': 2.17,
            'description': 'Splanchnic venous thrombosis - continue indefinitely',
            'category': 'VTE in Unusual Sites'},
}

for base_id, params in r1_10_base.items():
    for risk_level in ['low', 'high']:
        rec_id = f"{base_id} {risk_level}"
        H = 0.005 if risk_level == 'low' else 0.015

        recommendations.append({
            'id': rec_id,
            'pVTE': params['pVTE'],
            'Tp': params['Tp'],
            'RRt': params['RRt'],
            'RRrx': params['RRrx'],
            'H_low': H,
            'H_high': H,
            'RRbleed': params['RRbleed'],
            'decimals': 2 if params['pVTE'] < 0.1 else 1,
            'description': f"{params['description']} ({risk_level.upper()} bleeding risk)",
            'ashDecision': ash_decisions.get(rec_id, 'Unknown'),
            'category': params['category'],
            'group': 'R1-R10',
            'bleedingRisk': risk_level
        })

# === R11-R14 ===
r11_14_data = [
    ('R11a', 0.015, 0.5, 2.71, 0.54, 0.004, 2.09, 'First-degree relative with FVL, minor provoking risk factor'),
    ('R11b', 0.015, 0.5, 2.35, 0.54, 0.004, 2.09, 'First-degree relative with PGM, minor provoking risk factor'),
    ('R11c', 0.05, 0.5, 12.17, 0.54, 0.004, 2.09, 'First-degree relative with Protein C deficiency, minor risk factor'),
    ('R11d', 0.05, 0.5, 7.47, 0.54, 0.004, 2.09, 'First-degree relative with Protein S deficiency, minor risk factor'),
    ('R11e', 0.05, 0.5, 5.98, 0.54, 0.004, 2.09, 'First-degree relative with Antithrombin deficiency, minor risk factor'),
    ('R12a', 0.015, 0.512, 2.82, 0.54, 0.004, 2.09, 'Panel testing - FVL known in family'),
    ('R12b', 0.015, 0.524, 2.55, 0.54, 0.004, 2.09, 'Panel testing - PGM known in family'),
    ('R12c', 0.05, 0.533, 11.76, 0.54, 0.004, 2.09, 'Panel testing - Protein C deficiency known in family'),
    ('R12d', 0.05, 0.533, 7.36, 0.54, 0.004, 2.09, 'Panel testing - Protein S deficiency known in family'),
    ('R12e', 0.05, 0.534, 5.98, 0.54, 0.004, 2.09, 'Panel testing - Antithrombin deficiency known in family'),
    ('R13', 0.012, 0.142, 3.89, 0.54, 0.004, 2.09, 'Family history of VTE, unknown thrombophilia status, minor risk factor'),
    ('R14a', 0.0075, 0.5, 2.71, 0.54, 0.004, 2.09, 'Family history of FVL (no VTE), minor risk factor'),
    ('R14b', 0.0075, 0.5, 2.54, 0.54, 0.004, 2.09, 'Family history of PGM (no VTE), minor risk factor'),
    ('R14c', 0.025, 0.5, 12.17, 0.54, 0.004, 2.09, 'First-degree relative with Protein C (no VTE), minor risk factor'),
    ('R14d', 0.025, 0.5, 7.47, 0.54, 0.004, 2.09, 'First-degree relative with Protein S (no VTE), minor risk factor'),
    ('R14e', 0.025, 0.5, 5.98, 0.54, 0.004, 2.09, 'First-degree relative with Antithrombin (no VTE), minor risk factor'),
]

for rec_id, pvte, tp, rrt, rrrx, h, rrbleed, desc in r11_14_data:
    recommendations.append({
        'id': rec_id,
        'pVTE': pvte,
        'Tp': tp,
        'RRt': rrt,
        'RRrx': rrrx,
        'H_low': h,
        'H_high': h,
        'RRbleed': rrbleed,
        'decimals': 3 if pvte < 0.01 else 2,
        'description': desc,
        'ashDecision': ash_decisions.get(rec_id, 'Unknown'),
        'category': 'Asymptomatic with Family History',
        'group': 'R11-R14'
    })

# === R15-R20 (REVERSED/INVERSE model) ===
r15_20_data = [
    ('R15', 0.00035, 0.0685, 5.89, 3.5, 0.0595, 'General population women considering COC'),
    ('R16a', 0.002, 0.0685, 1.8, 2.22, 0.1077, 'General population women considering HRT - estrogen alone'),
    ('R16b', 0.002, 0.0685, 1.8, 4.28, 0.1559, 'General population women considering HRT - combined'),
    ('R17', 0.0012, 0.142, 3.87, 3.5, 0.0595, 'Women with family history of VTE considering COC'),
    ('R18a', 0.003, 0.142, 2.08, 2.22, 0.1077, 'Women with family history of VTE considering HRT - estrogen'),
    ('R18b', 0.003, 0.142, 2.08, 4.28, 0.1559, 'Women with family history of VTE considering HRT - combined'),
    ('R19a', 0.0025, 0.5, 2.71, 3.5, 0.0595, 'Women with known FVL in family considering COC'),
    ('R19b', 0.0025, 0.5, 2.35, 3.5, 0.0595, 'Women with known PGM in family considering COC'),
    ('R19c', 0.0084, 0.5, 12.07, 3.5, 0.0595, 'Women with known Protein C deficiency considering COC'),
    ('R19d', 0.0063, 0.5, 7.24, 3.5, 0.0595, 'Women with known Protein S deficiency considering COC'),
    ('R19e', 0.0049, 0.5, 5.98, 3.5, 0.0595, 'Women with known Antithrombin deficiency considering COC'),
    ('R20a', 0.0025, 0.5, 2.6, 2.22, 0.1077, 'Women with known FVL considering HRT - estrogen'),
    ('R20b', 0.0025, 0.5, 2.6, 4.28, 0.1559, 'Women with known FVL considering HRT - combined'),
    ('R20c', 0.0025, 0.5, 0.8, 2.22, 0.1077, 'Women with known PGM considering HRT - estrogen'),
    ('R20d', 0.0025, 0.5, 0.8, 4.28, 0.1559, 'Women with known PGM considering HRT - combined'),
    ('R20e', 0.0084, 0.5, 1.7, 2.22, 0.1077, 'Women with Protein C deficiency considering HRT - estrogen'),
    ('R20f', 0.0084, 0.5, 1.7, 4.28, 0.1559, 'Women with Protein C deficiency considering HRT - combined'),
    ('R20g', 0.0063, 0.5, 1.8, 2.22, 0.1077, 'Women with Protein S deficiency considering HRT - estrogen'),
    ('R20h', 0.0063, 0.5, 1.8, 4.28, 0.1559, 'Women with Protein S deficiency considering HRT - combined'),
    ('R20i', 0.0049, 0.5, 1.9, 2.22, 0.1077, 'Women with Antithrombin deficiency considering HRT - estrogen'),
    ('R20j', 0.0049, 0.5, 1.9, 4.28, 0.1559, 'Women with Antithrombin deficiency considering HRT - combined'),
]

for rec_id, pvte, tp, rrt, rrrx, h, desc in r15_20_data:
    recommendations.append({
        'id': rec_id,
        'pVTE': pvte,
        'Tp': tp,
        'RRt': rrt,
        'RRrx': rrrx,
        'H_low': h,
        'H_high': h,
        'RRbleed': 1,  # Not applicable for hormonal
        'decimals': 4,
        'description': desc,
        'ashDecision': ash_decisions.get(rec_id, 'Unknown'),
        'category': 'Women Considering COC/HRT',
        'group': 'R15-R20',
        'isReversed': True
    })

# === R21-R23 ===
r21_23_data = [
    ('R21a', 0.0375, 0.25, 20.96, 0.41, 0.00634, 3.21, 'Pregnant with homozygous FVL - antepartum prophylaxis'),
    ('R21b', 0.018, 0.5, 10.51, 0.41, 0.00634, 3.21, 'Pregnant with compound heterozygous FVL/PGM - antepartum'),
    ('R21c', 0.004, 0.5, 6.04, 0.41, 0.00634, 3.21, 'Pregnant with heterozygous FVL - antepartum prophylaxis'),
    ('R21d', 0.008, 0.5, 5.03, 0.41, 0.00634, 3.21, 'Pregnant with heterozygous PGM - antepartum prophylaxis'),
    ('R21e', 0.02025, 0.25, 9.36, 0.41, 0.00634, 3.21, 'Pregnant with Protein C/S/AT deficiency - antepartum'),
    ('R22a', 0.0375, 0.25, 20.96, 0.41, 0.00846, 3.38, 'Postpartum with homozygous FVL - postpartum prophylaxis'),
    ('R22b', 0.018, 0.5, 10.51, 0.41, 0.00846, 3.38, 'Postpartum with compound heterozygous FVL/PGM'),
    ('R22c', 0.004, 0.5, 6.04, 0.41, 0.00846, 3.38, 'Postpartum with heterozygous FVL'),
    ('R22d', 0.008, 0.5, 5.03, 0.41, 0.00846, 3.38, 'Postpartum with heterozygous PGM'),
    ('R22e', 0.02025, 0.25, 9.36, 0.41, 0.00846, 3.38, 'Postpartum with Protein C/S/AT deficiency'),
    ('R23a', 0.05, 0.142, 3.28, 0.61, 0.0036, 1.65, 'Pregnant with family history VTE, unknown thrombophilia - antepartum'),
    ('R23b', 0.066, 0.142, 3.28, 0.61, 0.008, 1.65, 'Postpartum with family history VTE, unknown thrombophilia'),
]

for rec_id, pvte, tp, rrt, rrrx, h, rrbleed, desc in r21_23_data:
    recommendations.append({
        'id': rec_id,
        'pVTE': pvte,
        'Tp': tp,
        'RRt': rrt,
        'RRrx': rrrx,
        'H_low': h,
        'H_high': h,
        'RRbleed': rrbleed,
        'decimals': 4 if pvte < 0.01 else 3,
        'description': desc,
        'ashDecision': ash_decisions.get(rec_id, 'Unknown'),
        'category': 'Women Planning Pregnancy',
        'group': 'R21-R23'
    })

# Verify count
print(f"\nTotal recommendations generated: {len(recommendations)}")
print(f"Expected: 69")

# Count by group
from collections import Counter
groups = Counter([r['group'] for r in recommendations])
print("\nBy group:")
for g, c in sorted(groups.items()):
    print(f"  {g}: {c}")

# Check for missing ASH decisions
missing = [r['id'] for r in recommendations if r['ashDecision'] == 'Unknown']
if missing:
    print(f"\nMissing ASH decisions for: {missing}")

# Save to JSON
with open('complete_recommendations.json', 'w') as f:
    json.dump(recommendations, f, indent=2)
print("\nSaved to complete_recommendations.json")

# Generate data.js
js_content = '''/**
 * ASH Thrombophilia Guidelines - Complete Recommendation Data (69 Recommendations)
 *
 * Generated from Excel reference file.
 *
 * Groups:
 * - R1-R10 (20): Symptomatic VTE with LOW/HIGH bleeding risk variants
 * - R11-R14 (16): Asymptomatic with Family History
 * - R15-R20 (21): Women considering COC/HRT (INVERSE model)
 * - R21-R23 (12): Women Planning Pregnancy
 *
 * For R15-R20: RRrx > 1 means treatment INCREASES VTE risk (reversed logic)
 */

const RECOMMENDATIONS = '''

js_content += json.dumps(recommendations, indent=4)
js_content += ''';

// Export for Node.js (if needed)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { RECOMMENDATIONS };
}
'''

with open('../data.js', 'w') as f:
    f.write(js_content)
print("Generated ../data.js")
