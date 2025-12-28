# ASH Thrombophilia Testing Advisor - Development Guide

## Overview
This is a web-based clinical decision support tool for thrombophilia testing based on the ASH 2023 Guidelines. It implements Expected Utility Theory (EUT) to calculate testing and treatment thresholds.

## Architecture
- **index.html** - Main HTML structure with search UI, results display, and About overlay
- **calculator.js** - Core application logic (search, calculations, chart rendering)
- **data.js** - All recommendation definitions with parameters (64 total after R14f-h removal)
- **styles.css** - Complete styling

## Key Mathematical Models

### Standard Recommendations (R1-R14, R21-R23): VTE vs Bleeding
```
Pt = RV × (RRbleed - 1) × H / (1 - RRrx)
Ptt = [(RRt × Tp + (1 - Tp)) / RRt] × Pt
```
Decision logic:
- pVTE < Ptt → NoRx (Don't treat)
- pVTE > Pt → Rx (Treat all)
- Between → Test

### Hormonal Recommendations (R15-R20): VTE vs COC/HRT Benefits - INVERSE LOGIC
```
Pt = RV × H / (RRrx - 1)
Ptt = Pt × (RRt × Tp + (1 - Tp))
```
Where:
- H_low = side effect cost of using COC/HRT (for threshold calculations)
- H_benefit = cost of NOT using COC/HRT (unwanted pregnancies/symptoms, for outcome calculations)

Decision logic (REVERSED):
- pVTE < Pt → Rx (Use COC/HRT - risk is acceptably low)
- pVTE > Ptt → NoRx (Avoid COC/HRT - risk too high)
- Between → Test

## Key Decision Rules

### For Standard Recommendations (R1-R14, R21-R23):
- **No testing/no treatment**: VTE risk < Testing threshold
- **Thrombophilia testing**: Testing threshold < VTE risk < Treatment threshold
- **Treatment with anticoagulants**: VTE risk > Treatment threshold

### For Hormonal Recommendations (R15-R20) - REVERSE LOGIC:
- **Treatment (contraceptives/HRT)**: VTE risk < Treatment threshold → Use COC/HRT
- **Thrombophilia testing**: Treatment threshold < VTE risk < Testing threshold → Test first
- **No testing/no treatment**: VTE risk > Testing threshold → Avoid COC/HRT

## Changes Completed (December 2024)

### About Section Updates
- Added key decision rules explaining threshold logic for standard and inverse (R15-R20) scenarios
- Added statement about quality/certainty of evidence (CoE):
  - Very low CoE for all recommendations except R15 and R16
  - Low CoE for R15 and R16
  - Conditional recommendations for all except R15 (strong recommendation)

### Chart Enhancements
- Added numeric values above bar chart bars using ChartDataLabels plugin
- EUT graph already has vertical threshold lines (Test and Treatment thresholds)

### ASH Recommendation Display
- Added full ASH recommendation text below the model vs guideline comparison

### Data Corrections

#### R14 (Family Thrombophilia, No VTE)
- R14a: pVTE changed from 0.015 to 0.0075
- R14b: pVTE changed from 0.015 to 0.0075, RRt changed from 2.35 to 2.54
- R14c, R14d, R14e: pVTE changed from 0.05 to 0.025
- R14f, R14g, R14h: REMOVED (not in Excel source)

#### R15-R20 (Women Considering COC/HRT)
- Added H_benefit field for pregnancy/symptom cost calculations
- Updated H_low values to match Excel "Rx" column (side effect costs):
  - COC scenarios (R15, R17, R19a-e): H_low = 0.0595, H_benefit = 0.85
  - HRT estrogen (R16a, R18a, R20a/c/e/g/i): H_low = 0.1077, H_benefit = 0.3659
  - HRT combined (R16b, R18b, R20b/d/f/h/j): H_low = 0.1559, H_benefit = 0.3167
- Set RRbleed to null for hormonal scenarios (not applicable)

#### R21a-R21e (Antepartum Prophylaxis)
- R21a: pVTE=0.0375, Tp=0.25, RRt=20.96, RRrx=0.41, H=0.00634, RRbleed=3.21
- R21b: pVTE=0.018, Tp=0.5, RRt=10.51, RRrx=0.41 (Antithrombin def, not FVL+PGM)
- R21c: pVTE=0.004, Tp=0.5, RRt=6.04, RRrx=0.41 (Protein C def)
- R21d: pVTE=0.008, Tp=0.5, RRt=5.03, RRrx=0.41 (Protein S def)
- R21e: pVTE=0.02025, Tp=0.25, RRt=9.36, RRrx=0.41 (FVL+PGM compound)

#### R22a-R22e (Postpartum Prophylaxis)
- R22a: pVTE=0.0375, Tp=0.25, RRt=20.96, RRrx=0.41, H=0.00846, RRbleed=3.38
- R22b: pVTE=0.018, Tp=0.5, RRt=10.51 (Antithrombin def)
- R22c: pVTE=0.004, Tp=0.5, RRt=6.04 (Protein C def)
- R22d: pVTE=0.008, Tp=0.5, RRt=5.03 (Protein S def)
- R22e: pVTE=0.02025, Tp=0.25, RRt=9.36 (FVL+PGM compound)

#### R23a and R23b (CANCER, not Pregnancy)
- Changed from pregnancy scenarios to AMBULATORY PATIENTS WITH CANCER
- R23a: pVTE=0.05, Tp=0.142, RRt=3.28, RRrx=0.61, H=0.0036, RRbleed=1.65 (Low VTE risk)
- R23b: pVTE=0.066, Tp=0.142, RRt=3.28, RRrx=0.61, H=0.008, RRbleed=1.65 (Intermediate VTE risk)

### Dropdown Updates
- Removed R14f, R14g, R14h from dropdown
- Fixed R21-R22 labels to match actual thrombophilia types
- Added separate "Ambulatory Patients with Cancer (R23)" optgroup

## Source Data
Excel file: `files/4.ASH-Threshold-thrombophilia-calculator-Final-withArg_pVTE-.xlsx`
Key sheets: R1-R10, R11-R14,R21-R23, R15-R20, Agreement

## Recommendation Groups
- R1-R10: Patients with symptomatic VTE
- R11-R14: Asymptomatic with family history (R14a-e only)
- R15-R20: Women considering COC/HRT (inverse model)
- R21-R22: Women planning pregnancy
- R23: Ambulatory patients with cancer

## Testing Checklist
After making changes, verify:
1. Each recommendation displays correct thresholds
2. Decision logic matches expected outcomes
3. EUT graph shows correct curves and threshold lines
4. Bar chart values match table values with numbers displayed above bars
5. ASH recommendation text is displayed for each scenario
6. Model decisions align with Excel Agreement tab for baseline parameters
