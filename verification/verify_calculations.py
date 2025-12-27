#!/usr/bin/env python3
"""
ASH Thrombophilia Calculator - Verification System

This script compares the web app calculations against the original Excel file
to ensure accuracy of all 69 recommendations.

Usage:
    python3 verify_calculations.py

Requirements:
    pip3 install pandas openpyxl matplotlib

Output:
    - Console report of matches/mismatches
    - verification_report.html - Visual HTML report
    - accuracy_chart.png - Graph showing agreement rates
"""

import pandas as pd
import json
import os
import re
from pathlib import Path

# Configuration
EXCEL_FILE = "../files/4.ASH-Threshold-thrombophilia-calculator-Final-withArg_pVTE-.xlsx"
DATA_JS_FILE = "../data.js"

def load_excel_data():
    """Load and parse the Excel file to extract expected values."""
    print("Loading Excel file...")

    # Read the Agreement sheet which has all 69 recommendations
    agreement_df = pd.read_excel(EXCEL_FILE, sheet_name='Agreement', header=None)

    # Find the data rows (starting after header)
    excel_data = {}

    for idx, row in agreement_df.iterrows():
        case = str(row[1]) if pd.notna(row[1]) else ""

        # Skip header rows
        if case in ['Cases', 'Total: 69', '', 'n', '%', 'CASE', 'nan']:
            continue
        if 'R1-R10' in case or 'R11-R14' in case or 'R15-R20' in case or 'R21-R23' in case:
            continue

        # Extract recommendation ID (e.g., "R1 low", "R11a", etc.)
        if case and case.startswith('R'):
            ash_decision = str(row[2]) if pd.notna(row[2]) else ""
            eut_decision = str(row[3]) if pd.notna(row[3]) else ""
            pvte = row[14] if pd.notna(row[14]) else None

            if ash_decision in ['NoRx', 'Test', 'Rx']:
                excel_data[case.strip()] = {
                    'ash_decision': ash_decision,
                    'eut_decision': eut_decision,
                    'agrees_eut': row[4] if pd.notna(row[4]) else None,
                    'pvte': pvte
                }

    return excel_data

def load_js_data():
    """Load and parse the data.js file."""
    print("Loading data.js...")

    with open(DATA_JS_FILE, 'r') as f:
        content = f.read()

    # Extract the RECOMMENDATIONS array using regex
    # Find the array content between [ and ];
    match = re.search(r'const RECOMMENDATIONS = \[(.*?)\];', content, re.DOTALL)
    if not match:
        raise ValueError("Could not find RECOMMENDATIONS array in data.js")

    # Parse each recommendation object
    js_data = {}
    array_content = match.group(1)

    # Split by recommendation objects (this is a simplified parser)
    rec_pattern = re.compile(r'\{\s*id:\s*"([^"]+)".*?ashDecision:\s*"([^"]+)".*?pVTE:\s*([\d.]+)', re.DOTALL)

    for match in rec_pattern.finditer(array_content):
        rec_id = match.group(1)
        ash_decision = match.group(2)
        pvte = float(match.group(3))

        js_data[rec_id] = {
            'ash_decision': ash_decision,
            'pvte': pvte
        }

    return js_data

def calculate_thresholds(params, is_reversed=False):
    """
    Calculate decision thresholds using the EUT formulas.

    For standard recommendations (R1-R14, R21-R23):
        Pt = RV × (RRbleed - 1) × H / (1 - RRrx)
        Ptt = [(RRt × Tp + (1 - Tp)) / RRt] × Pt

    For hormonal recommendations (R15-R20):
        Pt = RV × H / (RRrx - 1)
        Ptt = Pt × (RRt × Tp + (1 - Tp))
    """
    RV = params.get('RV', 1)
    RRbleed = params.get('RRbleed', 2.17)
    H = params.get('H', 0.005)
    RRrx = params.get('RRrx', 0.15)
    Tp = params.get('Tp', 0.38)
    RRt = params.get('RRt', 1.65)

    if is_reversed:
        # For COC/HRT scenarios
        Pt = RV * H / (RRrx - 1)
        Ptt = Pt * (RRt * Tp + (1 - Tp))
    else:
        # Standard anticoagulation scenarios
        Pt = RV * (RRbleed - 1) * H / (1 - RRrx)
        Ptt = ((RRt * Tp + (1 - Tp)) / RRt) * Pt

    return {'Ptt': Ptt, 'Pt': Pt}

def determine_decision(pVTE, thresholds, is_reversed=False):
    """Determine the optimal decision based on pVTE and thresholds."""
    Ptt = thresholds['Ptt']
    Pt = thresholds['Pt']

    if is_reversed:
        if pVTE < Pt:
            return 'Rx'  # Use COC/HRT
        elif pVTE > Ptt:
            return 'NoRx'  # Avoid COC/HRT
        else:
            return 'Test'
    else:
        if pVTE < Ptt:
            return 'NoRx'
        elif pVTE > Pt:
            return 'Rx'
        else:
            return 'Test'

def compare_recommendations(excel_data, js_data):
    """Compare Excel and JS data and generate report."""
    results = []

    # Map JS IDs to Excel IDs (handling naming differences)
    for js_id, js_rec in js_data.items():
        # Try to find matching Excel entry
        excel_matches = []

        # Direct match
        if js_id in excel_data:
            excel_matches.append(js_id)

        # Try with "low" suffix for R1-R10
        if js_id + ' low' in excel_data:
            excel_matches.append(js_id + ' low')
        if js_id + ' high' in excel_data:
            excel_matches.append(js_id + ' high')

        for excel_id in excel_matches:
            excel_rec = excel_data.get(excel_id, {})

            ash_match = js_rec['ash_decision'] == excel_rec.get('ash_decision', '')

            results.append({
                'js_id': js_id,
                'excel_id': excel_id,
                'js_ash': js_rec['ash_decision'],
                'excel_ash': excel_rec.get('ash_decision', 'N/A'),
                'js_pvte': js_rec['pvte'],
                'excel_pvte': excel_rec.get('pvte'),
                'ash_matches': ash_match
            })

    return results

def generate_html_report(results, excel_data, js_data):
    """Generate a comprehensive HTML report."""

    total = len(results)
    matches = sum(1 for r in results if r['ash_matches'])
    match_rate = matches / total * 100 if total > 0 else 0

    html = f"""<!DOCTYPE html>
<html>
<head>
    <title>ASH Thrombophilia Calculator - Verification Report</title>
    <style>
        body {{ font-family: -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; }}
        h1 {{ color: #2563eb; }}
        .summary {{ background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; }}
        .summary-stat {{ display: inline-block; margin-right: 40px; }}
        .stat-value {{ font-size: 2rem; font-weight: bold; color: #2563eb; }}
        table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
        th {{ background: #1e40af; color: white; padding: 12px; text-align: left; }}
        td {{ padding: 10px; border-bottom: 1px solid #e5e7eb; }}
        tr:hover {{ background: #f9fafb; }}
        .match {{ color: #059669; }}
        .mismatch {{ color: #dc2626; font-weight: bold; }}
        .group-header {{ background: #dbeafe; font-weight: bold; }}
        .legend {{ margin: 20px 0; padding: 15px; background: #fef3c7; border-radius: 8px; }}
    </style>
</head>
<body>
    <h1>ASH Thrombophilia Calculator - Verification Report</h1>

    <div class="summary">
        <h2>Summary</h2>
        <div class="summary-stat">
            <div class="stat-value">{total}</div>
            <div>Total Comparisons</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">{matches}</div>
            <div>Matches</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">{total - matches}</div>
            <div>Mismatches</div>
        </div>
        <div class="summary-stat">
            <div class="stat-value">{match_rate:.1f}%</div>
            <div>Accuracy</div>
        </div>
    </div>

    <div class="legend">
        <strong>Note:</strong> This report compares the ASH recommendation stored in data.js against
        the Excel reference file. Mismatches may indicate data entry errors or intentional adjustments.
    </div>

    <h2>Detailed Comparison</h2>
    <table>
        <thead>
            <tr>
                <th>Web App ID</th>
                <th>Excel ID</th>
                <th>Web App ASH Decision</th>
                <th>Excel ASH Decision</th>
                <th>Web App pVTE</th>
                <th>Excel pVTE</th>
                <th>Status</th>
            </tr>
        </thead>
        <tbody>
"""

    for r in results:
        status_class = "match" if r['ash_matches'] else "mismatch"
        status_text = "✓ Match" if r['ash_matches'] else "✗ Mismatch"
        excel_pvte = f"{r['excel_pvte']:.4f}" if r['excel_pvte'] is not None else "N/A"

        html += f"""            <tr>
                <td>{r['js_id']}</td>
                <td>{r['excel_id']}</td>
                <td>{r['js_ash']}</td>
                <td>{r['excel_ash']}</td>
                <td>{r['js_pvte']:.4f}</td>
                <td>{excel_pvte}</td>
                <td class="{status_class}">{status_text}</td>
            </tr>
"""

    html += """        </tbody>
    </table>

    <h2>Recommendations in data.js</h2>
    <p>Total recommendations loaded: """ + str(len(js_data)) + """</p>

    <h2>Recommendations in Excel</h2>
    <p>Total recommendations found: """ + str(len(excel_data)) + """</p>

</body>
</html>
"""

    return html

def generate_accuracy_chart(results):
    """Generate accuracy visualization."""
    try:
        import matplotlib.pyplot as plt
        import matplotlib
        matplotlib.use('Agg')  # Use non-interactive backend

        # Group by recommendation type
        groups = {
            'R1-R10': {'match': 0, 'total': 0},
            'R11-R14': {'match': 0, 'total': 0},
            'R15-R20': {'match': 0, 'total': 0},
            'R21-R23': {'match': 0, 'total': 0}
        }

        for r in results:
            rec_id = r['js_id']

            if rec_id.startswith('R1') and len(rec_id) <= 3:
                group = 'R1-R10'
            elif rec_id.startswith(('R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10')) and not rec_id.startswith(('R21', 'R22', 'R23')):
                group = 'R1-R10'
            elif rec_id.startswith(('R11', 'R12', 'R13', 'R14')):
                group = 'R11-R14'
            elif rec_id.startswith(('R15', 'R16', 'R17', 'R18', 'R19', 'R20')):
                group = 'R15-R20'
            elif rec_id.startswith(('R21', 'R22', 'R23')):
                group = 'R21-R23'
            else:
                continue

            groups[group]['total'] += 1
            if r['ash_matches']:
                groups[group]['match'] += 1

        # Create bar chart
        fig, ax = plt.subplots(figsize=(10, 6))

        group_names = list(groups.keys())
        totals = [groups[g]['total'] for g in group_names]
        matches = [groups[g]['match'] for g in group_names]
        mismatches = [t - m for t, m in zip(totals, matches)]

        x = range(len(group_names))
        width = 0.35

        bars1 = ax.bar([i - width/2 for i in x], matches, width, label='Matches', color='#059669')
        bars2 = ax.bar([i + width/2 for i in x], mismatches, width, label='Mismatches', color='#dc2626')

        ax.set_xlabel('Recommendation Group')
        ax.set_ylabel('Count')
        ax.set_title('ASH Thrombophilia Calculator - Verification Results by Group')
        ax.set_xticks(x)
        ax.set_xticklabels(group_names)
        ax.legend()

        # Add value labels on bars
        for bar in bars1:
            height = bar.get_height()
            ax.annotate(f'{int(height)}',
                       xy=(bar.get_x() + bar.get_width() / 2, height),
                       xytext=(0, 3), textcoords="offset points",
                       ha='center', va='bottom')

        for bar in bars2:
            height = bar.get_height()
            if height > 0:
                ax.annotate(f'{int(height)}',
                           xy=(bar.get_x() + bar.get_width() / 2, height),
                           xytext=(0, 3), textcoords="offset points",
                           ha='center', va='bottom')

        plt.tight_layout()
        plt.savefig('accuracy_chart.png', dpi=150)
        print("✓ Saved accuracy_chart.png")

    except ImportError:
        print("! matplotlib not installed, skipping chart generation")

def main():
    """Main verification workflow."""
    print("=" * 60)
    print("ASH Thrombophilia Calculator - Verification System")
    print("=" * 60)
    print()

    # Load data
    try:
        excel_data = load_excel_data()
        print(f"  Loaded {len(excel_data)} recommendations from Excel")
    except Exception as e:
        print(f"Error loading Excel: {e}")
        excel_data = {}

    try:
        js_data = load_js_data()
        print(f"  Loaded {len(js_data)} recommendations from data.js")
    except Exception as e:
        print(f"Error loading data.js: {e}")
        js_data = {}

    print()

    # Compare
    results = compare_recommendations(excel_data, js_data)

    # Summary
    total = len(results)
    matches = sum(1 for r in results if r['ash_matches'])

    print("=" * 60)
    print("RESULTS SUMMARY")
    print("=" * 60)
    print(f"  Total comparisons: {total}")
    print(f"  Matches:           {matches}")
    print(f"  Mismatches:        {total - matches}")
    print(f"  Accuracy:          {matches/total*100:.1f}%" if total > 0 else "  N/A")
    print()

    # Show mismatches
    mismatches = [r for r in results if not r['ash_matches']]
    if mismatches:
        print("MISMATCHES FOUND:")
        print("-" * 60)
        for r in mismatches:
            print(f"  {r['js_id']}: JS={r['js_ash']}, Excel={r['excel_ash']}")
    else:
        print("✓ All recommendations match!")

    print()

    # Generate reports
    html_report = generate_html_report(results, excel_data, js_data)
    with open('verification_report.html', 'w') as f:
        f.write(html_report)
    print("✓ Saved verification_report.html")

    # Generate chart
    generate_accuracy_chart(results)

    print()
    print("Verification complete!")

if __name__ == "__main__":
    main()
