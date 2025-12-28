# ASH Thrombophilia Calculator - Development Guide

## Overview
This is a web-based clinical decision support tool for thrombophilia testing based on the ASH 2023 Guidelines. It implements Expected Utility Theory (EUT) to calculate testing and treatment thresholds.

## Architecture
- **index.html** - Main HTML structure with search UI, results display, About overlay, and Verification overlay
- **calculator.js** - Core application logic (search, calculations, chart rendering, verification table)
- **data.js** - All recommendation definitions with parameters (64 total after R14f-h removal)
- **styles.css** - Complete styling

## Key Mathematical Models

### Standard Recommendations (R1-R14, R21-R23): VTE vs Bleeding
```
Pt = RV × (RRbleed - 1) × H / (1 - RRrx)
Ptt = [(RRt × Tp + (1 - Tp)) / RRt] × Pt
Prx = (RRt × Tp + (1 - Tp)) × Pt
```
For display: Treatment threshold = Prx, Testing threshold = Ptt

Decision logic:
- pVTE < Ptt → NoRx (Don't treat)
- Ptt ≤ pVTE ≤ Prx → Test (between thresholds)
- pVTE > Prx → Rx (Treat all)

### Hormonal Recommendations (R15-R20): VTE vs COC/HRT Benefits - INVERSE LOGIC
```
Pt_base = RV × (Hnorx - Hrx) / (RRrx - 1)
       = RV × (H_benefit - H_low) / (RRrx - 1)

Prx = Pt_base × [(RRt × Tp + (1 - Tp)) / RRt]  → Treatment threshold
Ptt = Pt_base × (RRt × Tp + (1 - Tp))          → Testing threshold
```
Where:
- H_low (Hrx) = pregnancy/symptom rate WITH treatment (e.g., 5.95% for COC)
- H_benefit (Hnorx) = pregnancy/symptom rate WITHOUT treatment (e.g., 85% for COC)

Decision logic (REVERSED - treatment threshold < testing threshold):
- pVTE < Prx → Rx (Use COC/HRT - VTE risk acceptably low)
- Prx ≤ pVTE ≤ Ptt → Test (between thresholds)
- pVTE > Ptt → NoRx (Avoid COC/HRT - VTE risk too high)

### Example: R15 Threshold Calculation
```
Hnorx = 0.85, Hrx = 0.0595, RRrx = 3.5, RRt = 5.89, Tp = 0.0685

Pt_base = (0.85 - 0.0595) / (3.5 - 1) = 0.7905 / 2.5 = 31.6%
multiplier = 5.89 × 0.0685 + 0.9315 = 1.335

Prx = 31.6% × (1.335 / 5.89) = 31.6% × 0.227 = 7.17%  ← Treatment threshold
Ptt = 31.6% × 1.335 = 42.2%                           ← Testing threshold
```

## Key Decision Rules

### For Standard Recommendations (R1-R14, R21-R23):
- **No testing/no treatment**: VTE risk < Testing threshold (Ptt)
- **Thrombophilia testing**: Testing threshold ≤ VTE risk ≤ Treatment threshold
- **Treatment with anticoagulants**: VTE risk > Treatment threshold (Prx)

### For Hormonal Recommendations (R15-R20) - REVERSE LOGIC:
- **Treatment (COC/HRT)**: VTE risk < Treatment threshold (Prx) → Use COC/HRT
- **Thrombophilia testing**: Treatment threshold ≤ VTE risk ≤ Testing threshold
- **No testing/no treatment**: VTE risk > Testing threshold (Ptt) → Avoid COC/HRT

## UI Features

### Decision Threshold Display
The three-panel threshold display dynamically updates labels based on recommendation type:
- **Standard**: "Test if between [Ptt] and treatment threshold"
- **Hormonal**: "Test if between treatment threshold and [Ptt]"

### Model Verification Table
Accessible via "Model Verification" link in footer. Shows:
- All recommendations with pVTE, Ptt, Pt values
- Excel expected EUT decision vs Model calculated decision
- Agreement rate summary

## Changes Completed (December 2024)

### Threshold Formula Fixes (R15-R20)
- Corrected formula to use (Hnorx - Hrx) instead of just H_low
- Now correctly calculates Prx (treatment) and Ptt (testing) thresholds
- R15 thresholds now match Excel: Prx=7.17%, Ptt=42.2%

### Outcome Calculation Fixes (R15-R20)
- Rx now correctly shows pregnancy rate WITH treatment (H_low), not 0
- Test now includes pregnancy costs for both positives (H_benefit) and negatives (H_low)
- NoRx correctly shows H_benefit (85% pregnancy rate without COC)

### Display Improvements
- Dynamic decimal places based on recommendation's decimals setting
- R15-R20 now show 4 decimal places (e.g., 0.0350% instead of 0.0%)
- Threshold labels update dynamically based on recommendation type

### Verification System
- Added Model Verification overlay accessible from footer
- Compares model decisions against Excel Agreement tab
- Shows match/mismatch status with color coding

### About Section Updates
- Added key decision rules explaining threshold logic for standard and inverse scenarios
- Added statement about quality/certainty of evidence (CoE)

### Chart Enhancements
- Added numeric values above bar chart bars using ChartDataLabels plugin
- EUT graph shows vertical threshold lines with Ptt and Pt labels and values

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
- H_low = pregnancy rate ON treatment, H_benefit = pregnancy rate WITHOUT treatment
- COC scenarios: H_low = 0.0595, H_benefit = 0.85
- HRT estrogen: H_low = 0.1077, H_benefit = 0.3659
- HRT combined: H_low = 0.1559, H_benefit = 0.3167

#### R21-R23
- Fixed all parameter values to match Excel
- R23a/R23b changed from pregnancy to AMBULATORY PATIENTS WITH CANCER

## Source Data
Excel file: `files/4.ASH-Threshold-thrombophilia-calculator-Final-withArg_pVTE-.xlsx`
Key sheets: R1-R10, R11-R14,R21-R23, R15-R20, Agreement

Formula documentation: `error_documentation/Thrombophilia-calculator-2024-supp.docx`

## Recommendation Groups
- R1-R10: Patients with symptomatic VTE
- R11-R14: Asymptomatic with family history (R14a-e only)
- R15-R20: Women considering COC/HRT (inverse model)
- R21-R22: Women planning pregnancy
- R23: Ambulatory patients with cancer

## Testing Checklist
After making changes, verify:
1. Each recommendation displays correct thresholds matching Excel
2. Decision logic: Testing occurs ONLY when pVTE is between the two thresholds
3. EUT graph shows correct curves and threshold lines with values
4. Bar chart values match table values with numbers displayed above bars
5. Outcome calculations correct (especially Rx pregnancies for R15-R20)
6. ASH recommendation text is displayed for each scenario
7. Model decisions align with Excel Agreement tab (check via Verification overlay)
