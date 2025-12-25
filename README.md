# ASH Thrombophilia Guidelines Calculator

A web-based interactive calculator for the American Society of Hematology (ASH) Thrombophilia Guidelines, based on decision-theoretical foundations.

**Reference:** Djulbegovic B, Hozo I, Guyatt G. Decision Theoretical Foundations of Clinical Practice Guidelines. Blood Advances 2024. [https://doi.org/10.1182/bloodadvances.2024012931](https://doi.org/10.1182/bloodadvances.2024012931)

---

## Quick Start

### How to Run the Application

Simply **double-click `index.html`** or open it in any modern web browser.

```
On Mac: Open Finder → Navigate to this folder → Double-click index.html
On Windows: Double-click index.html
```

No installation, no server, no dependencies required.

---

## How to Use the Application

### 1. Search for Your Clinical Scenario

Type keywords in the search box to find relevant recommendations:
- "VTE after contraceptive pills"
- "pregnancy family history thrombophilia"
- "protein C deficiency"
- "should I test before COC"

### 2. Or Use the Tab Navigation

The calculator has two tabs:

| Tab | Recommendations | Trade-off |
|-----|-----------------|-----------|
| **Anticoagulation** | R1-R14, R21-R23 | VTE vs. Bleeding |
| **COC/HRT** | R15-R20 | VTE vs. Unwanted Pregnancy |

### 3. Adjust Parameters

- **RV (Relative Value):** Patient preference weight
- **pVTE:** VTE probability without treatment
- **RRR:** Relative risk reduction (for anticoagulation)
- **RRbleed:** Bleeding risk multiplier (for anticoagulation)

### 4. View Results

- Decision thresholds
- Model recommendation vs ASH guideline
- Expected outcomes per 1000 patients
- Interactive EUT graph

---

## Understanding the Mathematics

### Two Different Types of Trade-offs

The calculator handles **two fundamentally different clinical scenarios**:

---

### Standard Recommendations (R1-R14, R21-R23): VTE vs. Bleeding

**Trade-off:** Treatment (anticoagulation) REDUCES VTE but INCREASES bleeding.

**Threshold Formula:**
```
Treatment Threshold (Pt) = RV × (RRbleed - 1) × H / (1 - RRrx)
Testing Threshold (Ptt) = [(RRt × Tp + (1 - Tp)) / RRt] × Pt
```

**Decision Logic:**
- pVTE < Testing Threshold → Don't test, don't treat
- pVTE > Treatment Threshold → Don't test, treat all
- Between thresholds → Test and treat positives only

---

### COC/HRT Recommendations (R15-R20): VTE vs. Unwanted Pregnancy

**This is a MIRROR IMAGE of the standard recommendations.**

**Key Difference:** For women considering COC (combined oral contraceptives) or HRT (hormone replacement therapy):

- **"Treatment"** = Using COC/HRT (which **INCREASES** VTE risk!)
- **"Harm of not treating"** = Unwanted pregnancy (for COC) or menopausal symptoms (for HRT)
- **NOT bleeding** - these are hormonal treatments, not anticoagulants

**Modified Threshold Formula:**
```
Treatment Threshold (Pt) = RV × Benefit / (RRrx - 1)
Testing Threshold (Ptt) = Pt × (RRt × Tp + (1 - Tp))
```

Where RRrx is now the VTE INCREASE factor (e.g., 3.5 = 3.5x higher VTE risk with COC).

**REVERSED Decision Logic:**
- pVTE < Treatment Threshold → **Use COC/HRT** (VTE risk acceptably low)
- pVTE > Testing Threshold → **Avoid COC/HRT** (VTE risk too high)
- Between thresholds → **Test first**, avoid COC/HRT if positive

**Why Reversed?**
| Scenario | Treatment Effect | Decision at LOW pVTE | Decision at HIGH pVTE |
|----------|------------------|---------------------|----------------------|
| Anticoagulation | Reduces VTE, increases bleeding | Don't treat | Treat |
| COC/HRT | Increases VTE, provides benefit | Use COC/HRT | Avoid COC/HRT |

---

## Outcome Calculations

### Standard (Anticoagulation) per 1000 patients:

| Strategy | VTE Events | Bleeding Events |
|----------|------------|-----------------|
| NoRx | pVTE × N | H × N |
| Test | pVTE(+)×N(+)×RRrx + pVTE(-)×N(-) | H×N(-) + H×RRbleed×N(+) |
| Rx | pVTE × RRrx × N | H × RRbleed × N |

### COC/HRT per 1000 patients:

| Strategy | VTE Events | Benefits Obtained |
|----------|------------|-------------------|
| Avoid COC/HRT | pVTE × N | 0 (no pregnancy prevention) |
| Test | pVTE(+)×N(+) + pVTE(-)×RRrx×N(-) | N(-) get benefit |
| Use COC/HRT | pVTE × RRrx × N | N (all get benefit) |

---

## File Structure

```
excel_app/
├── index.html      ← Open this to run the app
├── styles.css      ← Styling
├── data.js         ← All 69 recommendation parameters
├── calculator.js   ← Calculation logic (documented)
├── README.md       ← This file
└── files/          ← Original Excel and documentation
```

---

## Verification

Standard recommendations (e.g., R1) match Excel exactly:
- Testing threshold: 0.52%
- Treatment threshold: 0.86%
- VTE outcomes: 100/57.3/15
- Bleeding outcomes: 5/7.2/10.8

---

## Browser Compatibility

Works in all modern browsers: Chrome, Firefox, Safari, Edge.

---

## Key Changes from Original Excel

1. **Separate handling of R15-R20:** These now correctly model the VTE vs. unwanted pregnancy trade-off (not VTE vs. bleeding)

2. **Reversed decision logic for COC/HRT:** Use COC/HRT when VTE risk is LOW, avoid when HIGH

3. **Searchable interface:** Find recommendations using natural language queries

4. **Visual separation:** Two tabs clearly distinguish between the two types of clinical decisions
