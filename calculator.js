/**
 * ASH Thrombophilia Calculator - Main Application Logic
 *
 * Search-First Design: Users search for a clinical scenario and get ONE recommendation.
 *
 * === MATHEMATICAL FORMULAS ===
 *
 * STANDARD RECOMMENDATIONS (R1-R14, R21-R23): VTE vs. BLEEDING
 *   Pt = RV × (RRbleed - 1) × H / (1 - RRrx)
 *   Ptt = [(RRt × Tp + (1 - Tp)) / RRt] × Pt
 *
 * HORMONAL RECOMMENDATIONS (R15-R20): VTE vs. UNWANTED PREGNANCY
 *   Treatment = Using COC/HRT (INCREASES VTE risk!)
 *   REVERSED logic: Low VTE risk → Use COC/HRT; High VTE risk → Avoid
 */

// ============================================================================
// GLOBALS
// ============================================================================

let currentRecommendation = null;
let eutChart = null;
let outcomesChart = null;

// ============================================================================
// NLP SEARCH ENGINE
// ============================================================================

const CLINICAL_SYNONYMS = {
    'clot': ['vte', 'thrombosis', 'thromboembolism', 'dvt', 'pe'],
    'blood clot': ['vte', 'thrombosis', 'thromboembolism'],
    'dvt': ['vte', 'thrombosis', 'deep vein'],
    'pe': ['vte', 'pulmonary embolism'],
    'birth control': ['coc', 'contraceptive', 'oral contraceptive', 'pills'],
    'the pill': ['coc', 'contraceptive', 'oral contraceptive'],
    'pill': ['coc', 'contraceptive', 'oral contraceptive'],
    'ocp': ['coc', 'contraceptive'],
    'hormone therapy': ['hrt', 'hormone replacement', 'estrogen'],
    'menopause treatment': ['hrt', 'hormone replacement', 'menopause'],
    'runs in family': ['family history', 'hereditary', 'genetic'],
    'inherited': ['hereditary', 'family history', 'genetic'],
    'genetic': ['hereditary', 'family history'],
    'mother': ['family history', 'first-degree'],
    'father': ['family history', 'first-degree'],
    'sibling': ['family history', 'first-degree'],
    'parent': ['family history', 'first-degree'],
    'factor v': ['fvl', 'factor v leiden'],
    'leiden': ['fvl', 'factor v leiden'],
    'prothrombin': ['pgm', 'prothrombin mutation'],
    'protein c': ['protein c deficiency'],
    'protein s': ['protein s deficiency'],
    'antithrombin': ['antithrombin deficiency'],
    'pregnant': ['pregnancy', 'antepartum'],
    'after delivery': ['postpartum', 'after birth'],
    'after birth': ['postpartum', 'after delivery'],
    'operation': ['surgery', 'surgical', 'post-operative'],
    'post-op': ['surgery', 'post-operative'],
    'after surgery': ['surgery', 'post-operative'],
    'should i test': ['test', 'testing', 'thrombophilia testing'],
    'blood thinner': ['anticoagulant', 'anticoagulation', 'treatment'],
    'warfarin': ['anticoagulant', 'anticoagulation'],
    'unprovoked': ['unprovoked', 'idiopathic', 'spontaneous']
};

const QUESTION_PATTERNS = [
    { pattern: /should\s+i\s+test/i, intent: 'testing', boost: ['test', 'thrombophilia'] },
    { pattern: /do\s+i\s+need\s+to\s+test/i, intent: 'testing', boost: ['test', 'thrombophilia'] },
    { pattern: /when\s+to\s+test/i, intent: 'testing', boost: ['test', 'thrombophilia'] },
    { pattern: /should\s+i\s+treat/i, intent: 'treatment', boost: ['treatment', 'anticoagulation'] },
    { pattern: /can\s+(she|patient|woman)\s+(take|use|start)/i, intent: 'safety', boost: ['coc', 'hrt'] },
    { pattern: /is\s+it\s+safe/i, intent: 'safety', boost: ['risk', 'safe'] },
    { pattern: /after\s+(surgery|operation)/i, intent: 'post-surgical', boost: ['surgery', 'provoked'] },
    { pattern: /after\s+(pregnancy|delivery|birth)/i, intent: 'postpartum', boost: ['postpartum'] },
    { pattern: /before\s+(pregnancy|conceiving)/i, intent: 'antepartum', boost: ['pregnancy', 'antepartum'] },
    { pattern: /family\s+history/i, intent: 'family', boost: ['family', 'hereditary'] },
    { pattern: /unprovoked/i, intent: 'unprovoked', boost: ['unprovoked', 'idiopathic'] }
];

const SEARCH_KEYWORDS = {
    'R1': ['unprovoked', 'vte', 'completed treatment', 'indefinite', 'idiopathic', 'first vte'],
    'R2': ['surgery', 'provoked', 'vte', 'surgical', 'operation', 'post-operative'],
    'R3': ['non-surgical', 'transient', 'risk factor', 'provoked', 'illness', 'immobility'],
    'R4': ['pregnancy', 'postpartum', 'pregnant', 'women', 'after delivery', 'maternal'],
    'R5': ['contraceptive', 'pills', 'oral contraceptive', 'COC', 'birth control', 'vte after pills'],
    'R6': ['unspecified', 'unknown', 'type', 'unclear'],
    'R7': ['cerebral', 'CVT', 'brain', 'venous sinus', 'discontinue'],
    'R8': ['cerebral', 'CVT', 'brain', 'venous sinus', 'continue', 'indefinite'],
    'R9': ['splanchnic', 'abdominal', 'portal', 'mesenteric', 'hepatic', 'discontinue'],
    'R10': ['splanchnic', 'abdominal', 'portal', 'mesenteric', 'continue', 'indefinite'],
    'R11a': ['family history', 'FVL', 'factor V leiden', 'first-degree', 'prophylaxis'],
    'R11b': ['family history', 'PGM', 'prothrombin', 'mutation', 'first-degree'],
    'R11c': ['family history', 'protein C', 'deficiency', 'first-degree', 'high risk'],
    'R11d': ['family history', 'protein S', 'deficiency', 'first-degree'],
    'R11e': ['family history', 'antithrombin', 'deficiency', 'first-degree'],
    'R12a': ['panel', 'FVL', 'hereditary', 'testing panel'],
    'R12b': ['panel', 'PGM', 'hereditary', 'testing panel'],
    'R12c': ['panel', 'protein C', 'hereditary'],
    'R12d': ['panel', 'protein S', 'hereditary'],
    'R12e': ['panel', 'antithrombin', 'hereditary'],
    'R13': ['family history', 'VTE', 'unknown', 'thrombophilia status'],
    'R14a': ['family history', 'FVL', 'no VTE', 'thrombophilia only'],
    'R14b': ['family history', 'PGM', 'no VTE'],
    'R14c': ['family history', 'protein C', 'no VTE', 'first-degree'],
    'R14d': ['family history', 'protein S', 'no VTE', 'first-degree'],
    'R14e': ['family history', 'antithrombin', 'no VTE', 'first-degree'],
    'R14f': ['family history', 'protein C', 'no VTE', 'second-degree'],
    'R14g': ['family history', 'protein S', 'no VTE', 'second-degree'],
    'R14h': ['family history', 'antithrombin', 'no VTE', 'second-degree'],
    'R15': ['COC', 'contraceptive', 'pills', 'general population', 'women', 'birth control', 'before pills'],
    'R16a': ['HRT', 'hormone', 'menopause', 'estrogen alone', 'general population'],
    'R16b': ['HRT', 'hormone', 'menopause', 'estrogen progestin', 'combined'],
    'R17': ['COC', 'contraceptive', 'family history', 'VTE', 'unknown thrombophilia'],
    'R18a': ['HRT', 'hormone', 'family history', 'VTE', 'estrogen'],
    'R18b': ['HRT', 'hormone', 'family history', 'VTE', 'combined'],
    'R19a': ['COC', 'FVL', 'known thrombophilia', 'family'],
    'R19b': ['COC', 'PGM', 'known thrombophilia', 'prothrombin'],
    'R19c': ['COC', 'protein C', 'known thrombophilia', 'avoid'],
    'R19d': ['COC', 'protein S', 'known thrombophilia'],
    'R19e': ['COC', 'antithrombin', 'known thrombophilia'],
    'R20a': ['HRT', 'FVL', 'known thrombophilia', 'estrogen'],
    'R20b': ['HRT', 'FVL', 'known thrombophilia', 'combined'],
    'R20c': ['HRT', 'PGM', 'known thrombophilia', 'estrogen'],
    'R20d': ['HRT', 'PGM', 'known thrombophilia', 'combined'],
    'R20e': ['HRT', 'protein C', 'known thrombophilia'],
    'R20f': ['HRT', 'protein C', 'combined'],
    'R20g': ['HRT', 'protein S', 'known thrombophilia'],
    'R20h': ['HRT', 'protein S', 'combined'],
    'R20i': ['HRT', 'antithrombin', 'known thrombophilia'],
    'R20j': ['HRT', 'antithrombin', 'combined'],
    'R21a': ['pregnancy', 'planning', 'homozygous FVL', 'antepartum'],
    'R21b': ['pregnancy', 'planning', 'FVL PGM', 'combination', 'antepartum'],
    'R21c': ['pregnancy', 'planning', 'antithrombin', 'antepartum'],
    'R21d': ['pregnancy', 'planning', 'protein C', 'antepartum'],
    'R21e': ['pregnancy', 'planning', 'protein S', 'antepartum'],
    'R22a': ['pregnancy', 'postpartum', 'homozygous FVL', 'after delivery'],
    'R22b': ['pregnancy', 'postpartum', 'FVL PGM', 'after delivery'],
    'R22c': ['pregnancy', 'postpartum', 'antithrombin', 'after delivery'],
    'R22d': ['pregnancy', 'postpartum', 'protein C', 'after delivery'],
    'R22e': ['pregnancy', 'postpartum', 'protein S', 'after delivery'],
    'R23a': ['pregnancy', 'planning', 'unknown thrombophilia', 'antepartum', 'family history'],
    'R23b': ['pregnancy', 'postpartum', 'unknown thrombophilia', 'family history']
};

function expandQuery(query) {
    let expandedTerms = new Set();
    const lowerQuery = query.toLowerCase();

    const words = lowerQuery.split(/\s+/).filter(w => w.length > 2);
    words.forEach(word => expandedTerms.add(word));

    const sortedSynonyms = Object.keys(CLINICAL_SYNONYMS).sort((a, b) => b.length - a.length);
    for (const phrase of sortedSynonyms) {
        if (lowerQuery.includes(phrase)) {
            CLINICAL_SYNONYMS[phrase].forEach(syn => expandedTerms.add(syn.toLowerCase()));
        }
    }

    for (const qp of QUESTION_PATTERNS) {
        if (qp.pattern.test(query)) {
            qp.boost.forEach(term => expandedTerms.add(term.toLowerCase()));
        }
    }

    return Array.from(expandedTerms);
}

function extractClinicalConcepts(query) {
    const concepts = {
        patientType: null,
        condition: null,
        context: null,
        intervention: null,
        intent: null
    };

    if (/woman|female|she/i.test(query)) concepts.patientType = 'woman';
    if (/pregnan/i.test(query)) concepts.context = 'pregnancy';
    if (/postpartum|after\s+(delivery|birth)/i.test(query)) concepts.context = 'postpartum';
    if (/surg/i.test(query)) concepts.context = 'surgery';
    if (/coc|contraceptive|birth\s+control|pill/i.test(query)) concepts.intervention = 'coc';
    if (/hrt|hormone|menopause/i.test(query)) concepts.intervention = 'hrt';
    if (/anticoag|blood\s+thinner/i.test(query)) concepts.intervention = 'anticoagulation';
    if (/vte|clot|thromb|dvt|pe/i.test(query)) concepts.condition = 'vte';
    if (/protein\s+c/i.test(query)) concepts.condition = 'protein_c';
    if (/protein\s+s/i.test(query)) concepts.condition = 'protein_s';
    if (/antithrombin/i.test(query)) concepts.condition = 'antithrombin';
    if (/factor\s+v|fvl|leiden/i.test(query)) concepts.condition = 'fvl';
    if (/prothrombin|pgm/i.test(query)) concepts.condition = 'pgm';

    for (const qp of QUESTION_PATTERNS) {
        if (qp.pattern.test(query)) {
            concepts.intent = qp.intent;
            break;
        }
    }

    return concepts;
}

function searchRecommendations(query) {
    const expandedTerms = expandQuery(query);
    const concepts = extractClinicalConcepts(query);
    const results = [];

    RECOMMENDATIONS.forEach(rec => {
        let score = 0;
        const searchText = (rec.description + ' ' + rec.ashRec + ' ' + (rec.category || '')).toLowerCase();
        const keywords = SEARCH_KEYWORDS[rec.id] || [];
        const allKeywords = [...keywords, rec.id.toLowerCase()];

        expandedTerms.forEach(term => {
            if (searchText.includes(term)) score += 2;
            allKeywords.forEach(kw => {
                if (kw.toLowerCase().includes(term) || term.includes(kw.toLowerCase())) score += 3;
            });
            if (rec.id.toLowerCase().includes(term)) score += 5;
        });

        // Concept-based boosting
        if (concepts.intervention === 'coc' && rec.group === 'R15-R20' && /coc|contraceptive/i.test(rec.description)) score += 10;
        if (concepts.intervention === 'hrt' && rec.group === 'R15-R20' && /hrt|hormone/i.test(rec.description)) score += 10;
        if (concepts.context === 'pregnancy' && /pregnan|antepartum|postpartum/i.test(rec.description)) score += 8;
        if (concepts.context === 'surgery' && /surgery|surgical/i.test(rec.description)) score += 8;
        if (concepts.condition === 'protein_c' && /protein\s*c/i.test(rec.description)) score += 10;
        if (concepts.condition === 'protein_s' && /protein\s*s/i.test(rec.description)) score += 10;
        if (concepts.condition === 'fvl' && /fvl|factor\s*v\s*leiden|leiden/i.test(rec.description)) score += 10;
        if (concepts.condition === 'antithrombin' && /antithrombin/i.test(rec.description)) score += 10;
        if (/family/i.test(query) && /family/i.test(rec.description)) score += 5;

        if (score > 0) {
            results.push({ rec, score });
        }
    });

    return results.sort((a, b) => b.score - a.score).slice(0, 8);
}

// ============================================================================
// CALCULATIONS
// ============================================================================

function getInputValues() {
    const bleedingBtns = document.querySelectorAll('#bleeding-risk-section .toggle-btn');
    let bleedingRisk = 'low';
    bleedingBtns.forEach(btn => {
        if (btn.classList.contains('active')) bleedingRisk = btn.dataset.value;
    });

    const isHormonal = currentRecommendation.group === 'R15-R20';

    // For hormonal scenarios (R15-R20):
    // - H_low = side effect cost of using COC/HRT (for threshold calculations)
    // - H_benefit = cost of NOT using COC/HRT (unwanted pregnancies, for outcome calculations)
    const H = bleedingRisk === 'low' ? currentRecommendation.H_low :
           (currentRecommendation.H_high || currentRecommendation.H_low);

    return {
        pVTE: parseFloat(document.getElementById('param-pvte').value) / 100,
        RV: parseFloat(document.getElementById('param-rv').value),
        bleedingRisk: bleedingRisk,
        Tp: currentRecommendation.Tp,
        RRt: currentRecommendation.RRt,
        RRrx: currentRecommendation.RRrx,
        RRbleed: currentRecommendation.RRbleed,
        H: H,
        H_benefit: currentRecommendation.H_benefit || H,
        isHormonal: isHormonal
    };
}

function calculateThresholds(params) {
    const { RV, RRbleed, H, RRrx, Tp, RRt, isHormonal } = params;

    if (isHormonal) {
        const Pt = RV * H / (RRrx - 1);
        const Ptt = Pt * (RRt * Tp + (1 - Tp));
        return { Ptt, Prx: Pt, Pt };
    } else {
        const Pt = RV * (RRbleed - 1) * H / (1 - RRrx);
        const Ptt = ((RRt * Tp + (1 - Tp)) / RRt) * Pt;
        const Prx = (RRt * Tp + (1 - Tp)) * Pt;
        return { Ptt, Prx, Pt: Prx };
    }
}

function calculateOutcomes(params, N = 1000) {
    const { pVTE, Tp, RRt, RRrx, H, H_benefit, RRbleed, isHormonal } = params;

    const N_pos = Tp * N;
    const N_neg = (1 - Tp) * N;
    const pVTE_neg = pVTE / (RRt * Tp + (1 - Tp));
    const pVTE_pos = pVTE_neg * RRt;

    if (isHormonal) {
        // For hormonal: "harm" = unwanted pregnancies/symptoms (inverse logic)
        // Use H_benefit (cost of NOT using treatment) for outcome calculations
        // NoRx (Avoid COC): baseline VTE, but ALL have unwanted pregnancy risk
        // Rx (Use COC): increased VTE, but NO unwanted pregnancies (protected)
        // Test: positives avoid (have pregnancy risk), negatives use (protected)
        const pregnancyCost = H_benefit;
        return {
            NoRx: { vte: pVTE * N, harm: pregnancyCost * N },
            Test: { vte: pVTE_pos * N_pos + pVTE_neg * RRrx * N_neg, harm: pregnancyCost * N_pos },
            Rx: { vte: pVTE * RRrx * N, harm: 0 }
        };
    } else {
        return {
            NoRx: { vte: pVTE * N, harm: H * N },
            Test: { vte: pVTE_pos * RRrx * N_pos + pVTE_neg * N_neg, harm: H * N_neg + H * RRbleed * N_pos },
            Rx: { vte: pVTE * RRrx * N, harm: H * RRbleed * N }
        };
    }
}

function determineDecision(pVTE, thresholds, isHormonal) {
    const { Ptt, Pt } = thresholds;

    if (isHormonal) {
        if (pVTE < Pt) return 'Rx';
        else if (pVTE > Ptt) return 'NoRx';
        else return 'Test';
    } else {
        if (pVTE < Ptt) return 'NoRx';
        else if (pVTE > Pt) return 'Rx';
        else return 'Test';
    }
}

function formatDecision(decision, isHormonal) {
    if (isHormonal) {
        return { 'NoRx': 'Avoid COC/HRT', 'Test': 'Test First', 'Rx': 'Use COC/HRT' }[decision] || decision;
    } else {
        return { 'NoRx': 'Do Not Treat', 'Test': 'Test for Thrombophilia', 'Rx': 'Treat All' }[decision] || decision;
    }
}

function getDecisionDetail(decision, params, thresholds) {
    const pctVTE = (params.pVTE * 100).toFixed(2);
    const isHormonal = params.isHormonal;

    if (isHormonal) {
        if (decision === 'Rx') return `VTE risk (${pctVTE}%) is acceptably low for COC/HRT use.`;
        if (decision === 'NoRx') return `VTE risk (${pctVTE}%) is too high. Avoid COC/HRT.`;
        return `VTE risk (${pctVTE}%) warrants testing. Avoid COC/HRT if positive.`;
    } else {
        if (decision === 'NoRx') return `VTE risk (${pctVTE}%) is too low to justify testing or treatment.`;
        if (decision === 'Rx') return `VTE risk (${pctVTE}%) is high enough to treat all without testing.`;
        return `VTE risk (${pctVTE}%) warrants testing. Treat if thrombophilia positive.`;
    }
}

// ============================================================================
// UI UPDATES
// ============================================================================

function displayRecommendation(rec) {
    currentRecommendation = rec;
    const isHormonal = rec.group === 'R15-R20';

    // Update card header
    document.getElementById('card-badge').textContent = rec.id;
    document.getElementById('card-category').textContent = isHormonal ? 'COC/HRT Decision' : 'Anticoagulation Decision';

    // Update scenario
    document.getElementById('scenario-title').textContent = rec.category || 'Clinical Scenario';
    document.getElementById('scenario-desc').textContent = rec.description;

    // Set parameter defaults
    const decimals = rec.decimals || 2;
    document.getElementById('param-pvte').value = (rec.pVTE * 100).toFixed(decimals);
    document.getElementById('param-rv').value = '1';
    document.getElementById('reset-pvte').onclick = () => {
        document.getElementById('param-pvte').value = (rec.pVTE * 100).toFixed(decimals);
        updateCalculations();
    };

    // Show/hide bleeding risk
    const bleedingSection = document.getElementById('bleeding-risk-section');
    if (rec.hasBleedingRiskOption && !isHormonal) {
        bleedingSection.style.display = 'block';
    } else {
        bleedingSection.style.display = 'none';
    }

    // Update harm header for hormonal scenarios
    const harmHeader = document.getElementById('harm-header');
    harmHeader.textContent = isHormonal ? '# of Pregnancies' : 'Major Bleeds';

    // Update row labels
    document.getElementById('label-norx').textContent = isHormonal ? 'Avoid COC/HRT' : "Don't Treat";
    document.getElementById('label-rx').textContent = isHormonal ? 'Use COC/HRT' : 'Treat All';

    // Run initial calculation
    updateCalculations();

    // Show main content
    document.getElementById('main-content').classList.add('visible');

    // Scroll to results
    document.getElementById('recommendation-card').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function updateCalculations() {
    if (!currentRecommendation) return;

    const params = getInputValues();
    const thresholds = calculateThresholds(params);
    const outcomes = calculateOutcomes(params);
    const modelDecision = determineDecision(params.pVTE, thresholds, params.isHormonal);
    const ashDecision = currentRecommendation.ashDecision;
    const agreement = modelDecision === ashDecision;

    // Update answer box
    const answerBox = document.getElementById('answer-box');
    document.getElementById('answer-value').textContent = formatDecision(modelDecision, params.isHormonal);
    document.getElementById('answer-detail').textContent = getDecisionDetail(modelDecision, params, thresholds);
    answerBox.className = 'answer-box ' + modelDecision.toLowerCase();

    // Update comparison
    document.getElementById('model-decision').textContent = formatDecision(modelDecision, params.isHormonal).split(' ')[0];
    document.getElementById('ash-decision').textContent = formatDecision(ashDecision, params.isHormonal).split(' ')[0];

    // Update full ASH recommendation text
    document.getElementById('ash-rec-text').textContent = currentRecommendation.ashRec;

    const indicator = document.getElementById('agreement-indicator');
    const icon = indicator.querySelector('.agree-icon');
    if (agreement) {
        indicator.className = 'comparison-divider agree';
        icon.textContent = '=';
    } else {
        indicator.className = 'comparison-divider disagree';
        icon.textContent = '≠';
    }

    // Update thresholds display
    const decimals = Math.max(2, currentRecommendation.decimals || 2);
    document.getElementById('current-risk').textContent = (params.pVTE * 100).toFixed(decimals) + '%';
    document.getElementById('test-threshold').textContent = (thresholds.Ptt * 100).toFixed(decimals) + '%';
    document.getElementById('treat-threshold').textContent = (thresholds.Pt * 100).toFixed(decimals) + '%';

    // Update outcomes table
    const dec = currentRecommendation.decimals || 1;
    document.getElementById('vte-norx').textContent = outcomes.NoRx.vte.toFixed(dec);
    document.getElementById('harm-norx').textContent = outcomes.NoRx.harm.toFixed(dec);
    document.getElementById('vte-test').textContent = outcomes.Test.vte.toFixed(dec);
    document.getElementById('harm-test').textContent = outcomes.Test.harm.toFixed(dec);
    document.getElementById('vte-rx').textContent = outcomes.Rx.vte.toFixed(dec);
    document.getElementById('harm-rx').textContent = outcomes.Rx.harm.toFixed(dec);

    // Highlight optimal row
    document.getElementById('row-norx').classList.remove('highlight-row');
    document.getElementById('row-test').classList.remove('highlight-row');
    document.getElementById('row-rx').classList.remove('highlight-row');
    if (modelDecision === 'NoRx') document.getElementById('row-norx').classList.add('highlight-row');
    else if (modelDecision === 'Test') document.getElementById('row-test').classList.add('highlight-row');
    else document.getElementById('row-rx').classList.add('highlight-row');

    // Update charts
    updateEUTChart(params, thresholds);
    updateOutcomesChart(outcomes, params.isHormonal, modelDecision);
}

function updateOutcomesChart(outcomes, isHormonal, modelDecision) {
    const ctx = document.getElementById('outcomes-chart').getContext('2d');

    if (outcomesChart) outcomesChart.destroy();

    const labels = isHormonal
        ? ['Avoid COC/HRT', 'Test First', 'Use COC/HRT']
        : ['No Treatment', 'Test & Treat', 'Treat All'];

    const harmLabel = isHormonal ? '# of Pregnancies' : 'Major Bleeds';

    // Determine which bar to highlight based on decision
    const highlightIndex = modelDecision === 'NoRx' ? 0 : (modelDecision === 'Test' ? 1 : 2);
    const vteColors = labels.map((_, i) => i === highlightIndex ? 'rgba(37, 99, 235, 1)' : 'rgba(37, 99, 235, 0.5)');
    const harmColors = labels.map((_, i) => i === highlightIndex ? 'rgba(220, 38, 38, 1)' : 'rgba(220, 38, 38, 0.5)');

    // Determine decimal places based on data magnitude
    const allValues = [outcomes.NoRx.vte, outcomes.Test.vte, outcomes.Rx.vte, outcomes.NoRx.harm, outcomes.Test.harm, outcomes.Rx.harm];
    const maxVal = Math.max(...allValues);
    const decimals = maxVal < 1 ? 2 : (maxVal < 10 ? 1 : 0);

    outcomesChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'VTE Recurrence',
                    data: [outcomes.NoRx.vte, outcomes.Test.vte, outcomes.Rx.vte],
                    backgroundColor: vteColors,
                    borderColor: 'rgba(37, 99, 235, 1)',
                    borderWidth: 1
                },
                {
                    label: harmLabel,
                    data: [outcomes.NoRx.harm, outcomes.Test.harm, outcomes.Rx.harm],
                    backgroundColor: harmColors,
                    borderColor: 'rgba(220, 38, 38, 1)',
                    borderWidth: 1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    position: 'top'
                },
                title: {
                    display: false
                },
                datalabels: {
                    anchor: 'end',
                    align: 'top',
                    color: '#333',
                    font: {
                        size: 10,
                        weight: 'bold'
                    },
                    formatter: function(value) {
                        return value.toFixed(decimals);
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Events per 1,000 Patients'
                    }
                }
            }
        },
        plugins: [ChartDataLabels]
    });
}

function updateEUTChart(params, thresholds) {
    const ctx = document.getElementById('eut-chart').getContext('2d');

    if (eutChart) eutChart.destroy();

    const { RV, Tp, RRt, RRrx, H, H_benefit, RRbleed, isHormonal, pVTE } = params;

    const pVTERange = [];
    const maxP = Math.max(0.05, pVTE * 2, thresholds.Ptt * 1.5);
    for (let p = 0; p <= maxP; p += maxP / 100) {
        pVTERange.push(p);
    }

    const euNoRx = [], euTest = [], euRx = [];

    pVTERange.forEach(p => {
        if (isHormonal) {
            // Weighted average (VTE + pregnancy): positive values, INVERSE logic
            // Lower = better outcome
            // Use H_benefit (cost of not using treatment) for outcome display
            const pregnancyCost = H_benefit;
            // NoRx = avoid COC: baseline VTE + cost of foregone benefit (pregnancyCost)
            euNoRx.push(p * RV + pregnancyCost);
            // Rx = use COC: increased VTE risk, but get the benefit (no pregnancy cost)
            euRx.push(p * RRrx * RV);
            const p_neg = p / (RRt * Tp + (1 - Tp));
            const p_pos = p_neg * RRt;
            // Test: positives avoid COC (baseline VTE + cost), negatives use COC (increased VTE, no cost)
            const testVTE = p_pos * Tp + p_neg * RRrx * (1 - Tp);
            euTest.push(testVTE * RV + pregnancyCost * Tp);
        } else {
            // Weighted average (VTE + major bleeding): positive values
            euNoRx.push(p + RV * H);
            euRx.push(p * RRrx + RV * H * RRbleed);
            const p_neg = p / (RRt * Tp + (1 - Tp));
            const p_pos = p_neg * RRt;
            const testVTE = p_pos * RRrx * Tp + p_neg * (1 - Tp);
            const testBleed = H * (1 - Tp) + H * RRbleed * Tp;
            euTest.push(testVTE + RV * testBleed);
        }
    });

    const labels = isHormonal
        ? ['Avoid COC/HRT', 'Test First', 'Use COC/HRT']
        : ['No Treatment', 'Test & Treat', 'Treat All'];

    eutChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: pVTERange.map(p => (p * 100).toFixed(4)),
            datasets: [
                { label: labels[0], data: euNoRx, borderColor: 'rgba(5, 150, 105, 1)', borderWidth: 2, fill: false, pointRadius: 0 },
                { label: labels[1], data: euTest, borderColor: 'rgba(217, 119, 6, 1)', borderWidth: 2, fill: false, pointRadius: 0 },
                { label: labels[2], data: euRx, borderColor: 'rgba(220, 38, 38, 1)', borderWidth: 2, fill: false, pointRadius: 0 }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            interaction: { intersect: false, mode: 'index' },
            plugins: { legend: { position: 'top' } },
            scales: {
                x: { title: { display: true, text: 'Probability of VTE Recurrence (%)' }, ticks: { callback: function(v, i) { return i % 20 === 0 ? this.getLabelForValue(v) : ''; } } },
                y: { beginAtZero: true, title: { display: true, text: isHormonal ? 'Weighted Average (VTE+pregnancy)' : 'Weighted Average (VTE+major bleeding)' } }
            }
        },
        plugins: [{
            afterDraw: function(chart) {
                const ctx = chart.ctx;
                const xAxis = chart.scales.x;
                const yAxis = chart.scales.y;

                // Draw threshold lines
                [
                    { value: thresholds.Ptt * 100, color: 'rgba(37, 99, 235, 0.8)', label: 'Test' },
                    { value: thresholds.Pt * 100, color: 'rgba(220, 38, 38, 0.8)', label: 'Treat' }
                ].forEach(line => {
                    const x = xAxis.getPixelForValue(line.value.toFixed(4));
                    if (x >= xAxis.left && x <= xAxis.right) {
                        ctx.save();
                        ctx.beginPath();
                        ctx.strokeStyle = line.color;
                        ctx.lineWidth = 2;
                        ctx.setLineDash([5, 5]);
                        ctx.moveTo(x, yAxis.top);
                        ctx.lineTo(x, yAxis.bottom);
                        ctx.stroke();
                        ctx.restore();
                    }
                });

                // Draw current pVTE line
                const currentX = xAxis.getPixelForValue((pVTE * 100).toFixed(4));
                if (currentX >= xAxis.left && currentX <= xAxis.right) {
                    ctx.save();
                    ctx.beginPath();
                    ctx.strokeStyle = 'rgba(139, 92, 246, 1)';
                    ctx.lineWidth = 3;
                    ctx.moveTo(currentX, yAxis.top);
                    ctx.lineTo(currentX, yAxis.bottom);
                    ctx.stroke();
                    ctx.restore();
                }
            }
        }]
    });
}

// ============================================================================
// SEARCH UI
// ============================================================================

function showSearchOverlay(results) {
    const overlay = document.getElementById('search-overlay');
    const list = document.getElementById('results-list');

    list.innerHTML = results.map(({ rec, score }) => {
        const isHormonal = rec.group === 'R15-R20';
        const category = isHormonal ? 'COC/HRT' : 'Anticoagulation';
        return `
            <div class="result-item" data-id="${rec.id}">
                <div class="result-header">
                    <span class="result-badge">${rec.id}</span>
                    <span class="result-category ${isHormonal ? 'hormonal' : ''}">${category}</span>
                </div>
                <div class="result-desc">${rec.description}</div>
                <div class="result-ash">ASH: ${rec.ashRec}</div>
            </div>
        `;
    }).join('');

    list.querySelectorAll('.result-item').forEach(item => {
        item.addEventListener('click', () => {
            const id = item.dataset.id;
            const rec = RECOMMENDATIONS.find(r => r.id === id);
            if (rec) {
                hideSearchOverlay();
                displayRecommendation(rec);
            }
        });
    });

    overlay.classList.add('visible');
}

function hideSearchOverlay() {
    document.getElementById('search-overlay').classList.remove('visible');
}

function performSearch() {
    const query = document.getElementById('main-search').value.trim();
    if (query.length < 2) return;

    const results = searchRecommendations(query);

    if (results.length === 0) {
        alert('No matching scenarios found. Try different keywords like: VTE, pregnancy, contraceptive, protein C');
        return;
    }

    if (results.length === 1 || results[0].score >= results[1].score * 1.5) {
        // Clear match - go directly to result
        displayRecommendation(results[0].rec);
    } else {
        // Multiple good matches - show overlay
        showSearchOverlay(results);
    }
}

// ============================================================================
// INITIALIZATION
// ============================================================================

document.addEventListener('DOMContentLoaded', () => {
    // Search button
    document.getElementById('search-btn').addEventListener('click', performSearch);

    // Enter key in search
    document.getElementById('main-search').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });

    // Hint buttons
    document.querySelectorAll('.hint-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('main-search').value = btn.dataset.query;
            performSearch();
        });
    });

    // Dropdown selector
    document.getElementById('rec-dropdown').addEventListener('change', (e) => {
        const recId = e.target.value;
        if (recId) {
            const rec = RECOMMENDATIONS.find(r => r.id === recId);
            if (rec) {
                displayRecommendation(rec);
            }
        }
    });

    // Close overlay
    document.getElementById('close-overlay').addEventListener('click', hideSearchOverlay);
    document.getElementById('search-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'search-overlay') hideSearchOverlay();
    });

    // Search again button
    document.getElementById('search-again').addEventListener('click', () => {
        document.getElementById('main-content').classList.remove('visible');
        document.getElementById('main-search').value = '';
        document.getElementById('main-search').focus();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    // Parameter inputs
    document.getElementById('param-pvte').addEventListener('change', updateCalculations);
    document.getElementById('param-rv').addEventListener('change', updateCalculations);

    // Bleeding risk toggle
    document.querySelectorAll('#bleeding-risk-section .toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('#bleeding-risk-section .toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            updateCalculations();
        });
    });

    // About overlay
    document.getElementById('about-link').addEventListener('click', (e) => {
        e.preventDefault();
        document.getElementById('about-overlay').classList.add('visible');
    });

    document.getElementById('close-about').addEventListener('click', () => {
        document.getElementById('about-overlay').classList.remove('visible');
    });

    document.getElementById('about-overlay').addEventListener('click', (e) => {
        if (e.target.id === 'about-overlay') {
            document.getElementById('about-overlay').classList.remove('visible');
        }
    });
});
