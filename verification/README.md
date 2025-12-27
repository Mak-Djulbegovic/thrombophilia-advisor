# ASH Thrombophilia Calculator - Verification System

This directory contains tools to verify the accuracy of the web calculator against the original Excel file.

## Purpose

The verification system ensures that:
1. All 69 recommendations are correctly implemented
2. ASH decision values match the Excel reference
3. pVTE values are correctly extracted
4. Threshold calculations produce expected results

## Files

| File | Description |
|------|-------------|
| `verify_calculations.py` | Main verification script |
| `verification_report.html` | Generated HTML report with detailed comparison |
| `accuracy_chart.png` | Generated bar chart showing match rates by group |

## How to Run

```bash
cd verification
pip3 install pandas openpyxl matplotlib  # Install dependencies
python3 verify_calculations.py
```

## Output

The script produces:

1. **Console Output**: Summary of matches/mismatches
2. **verification_report.html**: Detailed HTML table comparing each recommendation
3. **accuracy_chart.png**: Visual bar chart of accuracy by recommendation group

## Understanding the Results

### Recommendation Groups

| Group | Count | Description |
|-------|-------|-------------|
| R1-R10 | 20 | Patients with symptomatic VTE (with low/high bleeding risk) |
| R11-R14 | 16 | Asymptomatic individuals with family history |
| R15-R20 | 21 | Women considering COC/HRT (INVERSE model) |
| R21-R23 | 12 | Women planning pregnancy |
| **Total** | **69** | |

### Decision Values

| Value | Standard (R1-R14, R21-R23) | Hormonal (R15-R20) |
|-------|---------------------------|-------------------|
| NoRx | Don't treat | Avoid COC/HRT |
| Test | Test first, treat positives | Test first, avoid if positive |
| Rx | Treat all | Use COC/HRT |

### Key Formulas

**Standard Treatment Threshold:**
```
Pt = RV × (RRbleed - 1) × H / (1 - RRrx)
```

**Hormonal Treatment Threshold (INVERSE):**
```
Pt = RV × Benefit / (RRrx - 1)
```

**Testing Threshold:**
```
Ptt = [(RRt × Tp + (1 - Tp)) / RRt] × Pt  (standard)
Ptt = Pt × (RRt × Tp + (1 - Tp))          (hormonal)
```

## Troubleshooting

### Common Issues

1. **Excel file not found**: Ensure the Excel file is in `../files/`
2. **Import errors**: Run `pip3 install pandas openpyxl matplotlib`
3. **Mismatches**: Check if the Excel parameters were updated after data.js was created

### Verifying Specific Recommendations

To verify a single recommendation:

```python
# In Python
from verify_calculations import calculate_thresholds, determine_decision

params = {
    'RV': 1,
    'RRbleed': 2.17,
    'H': 0.005,
    'RRrx': 0.15,
    'Tp': 0.38,
    'RRt': 1.65
}

thresholds = calculate_thresholds(params, is_reversed=False)
print(f"Testing threshold: {thresholds['Ptt']*100:.4f}%")
print(f"Treatment threshold: {thresholds['Pt']*100:.4f}%")

pVTE = 0.10  # 10%
decision = determine_decision(pVTE, thresholds, is_reversed=False)
print(f"Decision: {decision}")
```

## Reference

Based on: Djulbegovic B, Hozo I, Guyatt G. Decision-theoretical foundations of the ASH thrombophilia guidelines. Blood Advances. 2024.
