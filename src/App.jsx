import { useState, useEffect, useMemo, useRef } from 'react';
import { IMSAFE_DATA, PAVE_DATA, DECIDE_DATA } from './data';
import { PlaneTakeoff, ShieldAlert, Navigation, CheckCircle, AlertTriangle, XCircle, RefreshCcw, Info, ClipboardList, Plus, Trash2, Printer, Sun, Moon, BarChart2, Activity, Plane, CloudLightning, Bot, Sparkles } from 'lucide-react';

const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.error("Local storage error:", error);
      return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      setStoredValue((prevStoredValue) => {
        const valueToStore = value instanceof Function ? value(prevStoredValue) : value;
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        return valueToStore;
      });
    } catch (error) {
      console.error("Local storage error:", error);
    }
  };

  return [storedValue, setValue];
};

function App() {
  const [activeTab, setActiveTab] = useState('imsafe');
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isDarkMode, setIsDarkMode] = useLocalStorage('aviation-theme-dark', true);
  const [showGRMMatrix, setShowGRMMatrix] = useState(false);
  const [showHazardsList, setShowHazardsList] = useState(false);
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResponse, setAiResponse] = useState('');
  const [selectedLanguage, setSelectedLanguage] = useLocalStorage('aviation-advisor-lang', 'English');
  const sessionTimestamp = useRef(new Date().toISOString());

  // Apply theme to body
  useEffect(() => {
    document.body.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  // Form state for My Flight Checklist
  const [newCustomText, setNewCustomText] = useState('');
  const [newCustomCategory, setNewCustomCategory] = useState('Pre-Flight');
  const [newCustomType, setNewCustomType] = useState('flight');

  // Unified state for checklist progress
  const [db, setDb] = useLocalStorage('aviation-checklist-db', {
    imsafe: {},
    pave: {},
    decide: {},
    custom: {},
    notes: {}, // stores all custom note inputs -> keys: tabId-itemId
    customItemsList: [],
    riskItems: []
  });

  const handleUpdate = (tabId, itemId, value) => {
    setDb((prev) => ({
      ...prev,
      [tabId]: { ...prev[tabId], [itemId]: value }
    }));
  };

  const handleNoteUpdate = (tabId, itemId, text) => {
    setDb((prev) => ({
      ...prev,
      notes: { ...prev.notes, [`${tabId}-${itemId}`]: text }
    }));
  };

  const handleAddRiskItem = () => {
    setDb(prev => ({
      ...prev,
      riskItems: [...(prev.riskItems || []), { id: Date.now().toString(), hazard: '', severity: '', likelihood: '' }]
    }));
  };

  const handleUpdateRiskItem = (id, field, value) => {
    setDb(prev => ({
      ...prev,
      riskItems: (prev.riskItems || []).map(item => item.id === id ? { ...item, [field]: value } : item)
    }));
  };

  const handleRemoveRiskItem = (id) => {
    setDb(prev => ({
      ...prev,
      riskItems: (prev.riskItems || []).filter(item => item.id !== id)
    }));
  };

  const handleReset = () => {
    setShowResetConfirm(true);
  };

  const confirmReset = () => {
    const remainingCustomItems = (db.customItemsList || []).filter(item => item.type === 'permanent');
    
    const resetState = {
      imsafe: {},
      pave: {},
      decide: {},
      custom: {},
      notes: {},
      customItemsList: remainingCustomItems,
      riskItems: []
    };
    
    setDb(resetState);
    setShowResetConfirm(false);
    setActiveTab('imsafe');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handlePrint = () => {
    // 1. Completion Check
    if (evaluatedCount < totalItems) {
      alert(`Safety Compliance Error:\n\nYou have only completed ${evaluatedCount} of ${totalItems} evaluations. All items must be evaluated before a legal flight log can be generated.`);
      return;
    }

    // 2. Mitigation Check (ensure Caution/No-Go items have notes)
    const missingNotes = activeHazards.filter(h => !h.note || h.note.trim() === '');
    if (missingNotes.length > 0) {
      alert(`Mitigation Required:\n\n${missingNotes.length} items marked as Caution or No-Go are missing required mitigation notes. Please explain how you've addressed these risks before printing.`);
      return;
    }

    window.print();
  };

  const handleAIAdvisor = async () => {
    setAiLoading(true);
    setAiResponse('');
    setShowAIModal(true);
    
    // 1. Data Gathering
    let assessmentData = [];
    const collectData = (tab, data) => {
      data.forEach(item => {
        const val = db[tab]?.[item.id];
        if (val && val !== 'pass') {
          const note = db.notes?.[`${tab}-${item.id}`] || "No note provided";
          assessmentData.push(`- ${item.title}: ${val.toUpperCase()} (Mitigation: ${note})`);
        }
      });
    };

    collectData('imsafe', IMSAFE_DATA);
    collectData('pave', PAVE_DATA);
    collectData('decide', DECIDE_DATA);
    
    (db.customItemsList || []).forEach(item => {
      const val = db.custom?.[item.id];
      if (val && val !== 'pass') {
        const note = db.notes?.[`custom-${item.id}`] || "No note provided";
        assessmentData.push(`- ${item.text}: ${val.toUpperCase()} (Mitigation: ${note})`);
      }
    });

    const summaryContext = assessmentData.length > 0 
      ? assessmentData.join('\n') 
      : "No specific hazards or CAUTION/NO-GO items flagged. All systems/categories passed.";

    // 2. The Prompt
    const fullPrompt = `You are a Senior FAA Safety Advisor. Analyze this pilot's Risk Assessment. Provide high-density, clinical, and technically deep feedback. 

**IMPORTANT: YOU MUST WRITE THE ENTIRE RESPONSE IN ${selectedLanguage.toUpperCase()}.**

[DATA]
- Score: ${numericScore} (${riskLevel.label})
- Flags: ${summaryContext}

### 0. EXECUTIVE SUMMARY
Provide a 1-2 sentence high-level overview of the primary risk landscape.

### 1. SAFETY ANALYSIS (THE WHY)
Explain compounding risks. Use technical sub-headlines in **BOLD**. 
Crucially: Add a newline after the sub-headline, then start the detailed explanation with ": " on its own line or following a bullet.

### 2. STRATEGIC MITIGATION (THE HOW)
Provide tactical steps. Use technical sub-headlines in **BOLD**.
Crucially: Add a newline after the sub-headline, then start the detailed explanation with ": " on its own line or following a bullet.

### 3. FINAL GO/NO-GO VERDICT
The current numeric score is ${numericScore} (Threshold: 300+ for automatic No-Go). 

**CRITICAL INSTRUCTION:** Use your professional judgment. If your analysis detects any critical safety violation (e.g., alcohol intoxication, severe fatigue, or extreme emotional trauma) that makes flight fundamentally unsafe, you MUST issue a "NO-GO" verdict even if the numeric score is below 300. 

Your verdict should be one of the following:
- "GO" (Only if risk is truly low)
- "GO WITH ADDITIONAL MITIGATION" (For moderate, manageable risks)
- "NO-GO" (For any unacceptable or critical safety risk)

Structure Example:
### 3. FINAL GO/NO-GO VERDICT
**VERDICT**: [Your Verdict]
- : Brief reasoning for this specific verdict.

Limit: 350 words.`;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("API Key (VITE_GEMINI_API_KEY) not found in environment.");

      let data;
      if (window.electronAPI) {
        // Use Electron Main process to bypass CORS in bundled app
        data = await window.electronAPI.getAIAdvice(fullPrompt, apiKey);
      } else {
        // Fallback for local web development
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: fullPrompt }] }] })
        });
        data = await response.json();
      }

      const aiText = data.candidates?.[0]?.content?.parts?.[0]?.text || "Unable to retrieve AI assessment.";
      setAiResponse(aiText);
    } catch (error) {
      console.error("AI Advisor Error:", error);
      setAiResponse(`ERROR: ${error.message}\n\nPlease ensure your Gemini API key is configured correctly.`);
    } finally {
      setAiLoading(false);
    }
  };

  const handleTranslate = async (targetLang) => {
    if (!aiResponse || aiLoading) return;
    
    setAiLoading(true);
    const translationPrompt = `[STRICT TRANSLATION TASK]
You are a translation engine. Your ONLY task is to translate the text below into ${targetLang.toUpperCase()}. 

CONSTRAINTS:
1. Do NOT generate new advice.
2. Do NOT change the technical meaning.
3. Keep all labels (GO, NO-GO, CAUTION) as they appear in the original.
4. Preserve all visual formatting (### and **).
5. Output ONLY the translated text.

TEXT TO TRANSLATE:
${aiResponse}`;

    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      
      let data;
      if (window.electronAPI) {
        data = await window.electronAPI.getAIAdvice(translationPrompt, apiKey);
      } else {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: translationPrompt }] }] })
        });
        data = await response.json();
      }

      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || aiResponse;
      setAiResponse(translatedText);
      setSelectedLanguage(targetLang);
    } catch (error) {
      console.error("Translation Error:", error);
      alert("Failed to translate the response. Please check your connection.");
    } finally {
      setAiLoading(false);
    }
  };

  const handleAddCustom = (e) => {
    e.preventDefault();
    const cleanText = newCustomText.trim();
    
    if(!cleanText || cleanText.length < 5) {
      alert("Please enter a valid, descriptive checklist item (minimum 5 characters).");
      return;
    }

    const newItem = {
      id: 'custom-' + Date.now(),
      text: cleanText,
      category: newCustomCategory,
      type: newCustomType
    };

    setDb(prev => ({
      ...prev,
      customItemsList: [...(prev.customItemsList || []), newItem]
    }));
    
    setNewCustomText(''); // clear input
  };

  const handleDeleteCustomItem = (id) => {
    setDb(prev => {
      const newCustom = { ...prev.custom };
      delete newCustom[id];
      const newNotes = { ...prev.notes };
      delete newNotes[`custom-${id}`];
      
      return {
        ...prev,
        customItemsList: (prev.customItemsList || []).filter(item => item.id !== id),
        custom: newCustom,
        notes: newNotes
      };
    });
  };

  // DOM manipulation removed in favor of React keys on the tab panels for clean rerenders.

  // Derived global risk score and progress metrics
  const { score, evaluatedCount, totalItems, tabProgress, activeHazards, numericScore, riskLevel } = useMemo(() => {
    const customItemsCount = (db.customItemsList || []).length;
    
    // Total physical checkboxes that genuinely exist
    const customItemsKeys = (db.customItemsList || []).map(item => item.id);
    const total = IMSAFE_DATA.length + PAVE_DATA.length + DECIDE_DATA.length + customItemsKeys.length;

    let count = 0;
    const validatedStates = [];
    const activeHazards = [];
    
    const checkState = (tab, id, title) => {
      const val = db[tab] && db[tab][id];
      if (!val) return;
      
      count++;
      validatedStates.push(val);
      
      if (val === 'caution' || val === 'nogo') {
        const note = db.notes && db.notes[`${tab}-${id}`];
        activeHazards.push({ tab, id, val, title, note });
      }
    };

    IMSAFE_DATA.forEach(item => checkState('imsafe', item.id, item.title));
    PAVE_DATA.forEach(item => checkState('pave', item.id, item.title));
    DECIDE_DATA.forEach(item => checkState('decide', item.id, item.title));
    customItemsKeys.forEach(id => {
       const customTitle = (db.customItemsList || []).find(c => c.id === id)?.text || 'Custom Item';
       checkState('custom', id, customTitle);
    });

    // ── Stress-Table style: each item has a fixed point value ──
    // Points reflect aviation criticality (like the Holmes-Rahe stress scale).
    // Pass = 0 pts (no risk added), Caution = item's points, No-Go = item's points × 2
    const ITEM_POINTS = {
      // IMSAFE — pilot self
      illness:     53,  // personal injury/illness level
      medication:  40,  // change in health habit
      stress:      44,  // personal stress accumulation
      alcohol:     53,  // direct impairment risk
      fatigue:     47,  // loss of function equivalent
      emotions:    38,  // emotional change impact
      // PAVE — environment & machine
      pilot:       50,  // overall pilot readiness
      aircraft:    65,  // mechanical risk (divorce-level critical)
      environment: 47,  // external hazard
      external:    29,  // pressure / son/daughter leaving home equivalent
      // DECIDE — decision loop
      detect:      40,  // failure to detect = immediate hazard
      evaluate:    29,  // poor evaluation impact
      consider:    25,  // inadequate options
      integrate:   20,  // poor synthesis
      decide:      38,  // wrong decision impact
      execute:     39,  // poor execution impact
    };

    // Calculate score: Pass=0, Caution=points, No-Go=points×2
    const calcItemScore = (id, val) => {
      const pts = ITEM_POINTS[id] ?? 25; // custom items default to 25
      if (val === 'nogo')    return pts * 2;
      if (val === 'caution') return pts;
      return 0;
    };

    let numericScore = 0;
    IMSAFE_DATA.forEach(item => {
      const val = db['imsafe']?.[item.id];
      if (val) numericScore += calcItemScore(item.id, val);
    });
    PAVE_DATA.forEach(item => {
      const val = db['pave']?.[item.id];
      if (val) numericScore += calcItemScore(item.id, val);
    });
    DECIDE_DATA.forEach(item => {
      const val = db['decide']?.[item.id];
      if (val) numericScore += calcItemScore(item.id, val);
    });
    (db.customItemsList || []).forEach(item => {
      const val = db.custom?.[item.id];
      if (val) numericScore += calcItemScore(item.id, val);
    });

    // ── Thresholds (mirror the stress-scale bands from the image) ──
    // LOW  < 150  → Cleared for flight
    // MED  150–299 → Caution: address issues before flying
    // HIGH 300+   → No-Go: resolve critical factors first
    let riskLevel;
    if (numericScore >= 300) {
      riskLevel = {
        label:  'HIGH RISK — NO-GO',
        action: 'Do NOT fly. Resolve all critical factors before next flight.',
        class:  'risk-high',
        color:  'var(--danger-color)',
      };
    } else if (numericScore >= 150 || validatedStates.includes('nogo')) {
      riskLevel = {
        label:  'MODERATE RISK — CAUTION',
        action: 'Proceed with caution. Address flagged issues or apply mitigations before departure.',
        class:  'risk-moderate',
        color:  'var(--warning-color)',
      };
    } else if (count > 0) {
      riskLevel = {
        label:  'LOW RISK — CLEARED',
        action: 'Flight conditions acceptable. Standard pre-flight procedures apply.',
        class:  'risk-low',
        color:  'var(--success-color)',
      };
    } else {
      riskLevel = {
        label:  'PENDING',
        action: 'Complete all checklist items to generate your risk assessment.',
        class:  'risk-pending',
        color:  'var(--text-secondary)',
      };
    }

    let evaluatedScore;
    if (numericScore >= 300) {
      evaluatedScore = { label: 'NO-GO: Unacceptable Risk', class: 'score-nogo', icon: XCircle };
    } else if (numericScore >= 150 || validatedStates.includes('nogo')) {
      evaluatedScore = { label: 'CAUTION: Mitigate Risks', class: 'score-caution', icon: AlertTriangle };
    } else if (count > 0) {
      evaluatedScore = { label: 'GO: Cleared', class: 'score-go', icon: CheckCircle };
    } else {
      evaluatedScore = { label: `Pending Assessment (${count}/${total})`, class: 'score-incomplete', icon: Info };
    }
    
    // Per-tab progress
    const calcTabProgress = (dataArray, tabKey) => {
      const tabTotal = dataArray.length;
      let passCount = 0, cautionCount = 0, nogoCount = 0;
      const sequence = [];
      dataArray.forEach(item => {
        const val = db[tabKey] && db[tabKey][item.id];
        if (!val) {
          sequence.push({ status: 'pending', id: item.id, name: item.title });
          return;
        }
        if (val === 'pass') { passCount++; sequence.push({ status: 'pass', id: item.id, name: item.title }); }
        else if (val === 'caution') { cautionCount++; sequence.push({ status: 'caution', id: item.id, name: item.title }); }
        else if (val === 'nogo') { nogoCount++; sequence.push({ status: 'nogo', id: item.id, name: item.title }); }
      });
      const done = passCount + cautionCount + nogoCount;
      return { done, total: tabTotal, sequence };
    };

    const customItemsKeys2 = (db.customItemsList || []).map(item => item.id);
    const customTotal = customItemsKeys2.length;
    let customPassCount = 0, customCautionCount = 0, customNogoCount = 0;
    const customSequence = [];
    customItemsKeys2.forEach(id => {
      const val = db.custom && db.custom[id];
      const customName = (db.customItemsList || []).find(c => c.id === id)?.text || 'Custom Item';
      if (!val) {
        customSequence.push({ status: 'pending', id, name: customName });
        return;
      }
      if (val === 'pass') { customPassCount++; customSequence.push({ status: 'pass', id, name: customName }); }
      else if (val === 'caution') { customCautionCount++; customSequence.push({ status: 'caution', id, name: customName }); }
      else if (val === 'nogo') { customNogoCount++; customSequence.push({ status: 'nogo', id, name: customName }); }
    });
    
    const customDone = customPassCount + customCautionCount + customNogoCount;
    const customProgress = {
        done: customDone, total: customTotal, sequence: customSequence
    };

    const tabProgress = {
      imsafe: calcTabProgress(IMSAFE_DATA, 'imsafe'),
      pave: calcTabProgress(PAVE_DATA, 'pave'),
      decide: calcTabProgress(DECIDE_DATA, 'decide'),
      custom: customProgress,
    };

    return { score: evaluatedScore, evaluatedCount: count, totalItems: total, tabProgress, activeHazards, numericScore, riskLevel };
  }, [db]);

  const renderProgressBar = (tabKey) => {
    const p = tabProgress[tabKey];
    if (!p) return null;
    return (
      <div className="tab-progress-bar-wrapper" aria-label={`${p.done} of ${p.total} completed`}>
        <div className="tab-progress-bar-track" style={{ display: 'flex', background: 'transparent', gap: '2px' }}>
          {p.sequence && p.sequence.map((item, i) => {
            const status = item.status;
            let bgColor = '#ffffff'; // Solid white default
            if (status === 'pass') bgColor = 'var(--success-color)';
            if (status === 'caution') bgColor = 'var(--warning-color)';
            if (status === 'nogo') bgColor = 'var(--danger-color)';
            
            return (
              <button 
                key={i} 
                onClick={() => {
                  // Important: Switch to the correct tab first!
                  setActiveTab(tabKey);
                  
                  // Wait for React to render the panel (remove display: none)
                  setTimeout(() => {
                    const el = document.getElementById(`heading-${item.id}`);
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      // Briefly flash the element background to show it was jumped to
                      el.closest('article').classList.add('pulse-highlight');
                      setTimeout(() => el.closest('article').classList.remove('pulse-highlight'), 1000);
                    }
                  }, 150);
                }}
                className="progress-bar-segment"
                aria-label={`Jump to ${item.name}`}
                title={`${item.name} (${status.toUpperCase()}) — Click to jump`}
                style={{ 
                  flex: 1, 
                  background: bgColor, 
                  opacity: status === 'pending' ? 0.7 : 1,
                  height: '100%',
                  minHeight: '8px',
                  borderRadius: '2px',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'background 0.3s ease, opacity 0.3s ease, transform 0.1s ease'
                }} 
                onMouseOver={(e) => e.target.style.transform = 'scaleY(1.5)'}
                onMouseOut={(e) => e.target.style.transform = 'scaleY(1)'}
              />
            );
          })}
        </div>
        <span className="tab-progress-label">{p.done}/{p.total}</span>
      </div>
    );
  };

  const GRM_CELLS = [
    // [severity, likelihood, label, colorClass]
    ['Catastrophic', 'Probable',   'CRITICAL',    'grm-critical'],
    ['Catastrophic', 'Occasional', 'CRITICAL',    'grm-critical'],
    ['Catastrophic', 'Remote',     'HIGH',        'grm-high'],
    ['Catastrophic', 'Improbable', 'HIGH',        'grm-high'],
    ['Hazardous',    'Probable',   'CRITICAL',    'grm-critical'],
    ['Hazardous',    'Occasional', 'HIGH',        'grm-high'],
    ['Hazardous',    'Remote',     'MEDIUM',      'grm-medium'],
    ['Hazardous',    'Improbable', 'LOW',         'grm-low'],
    ['Major',        'Probable',   'HIGH',        'grm-high'],
    ['Major',        'Occasional', 'MEDIUM',      'grm-medium'],
    ['Major',        'Remote',     'LOW',         'grm-low'],
    ['Major',        'Improbable', 'LOW',         'grm-low'],
    ['Minor',        'Probable',   'MEDIUM',      'grm-medium'],
    ['Minor',        'Occasional', 'LOW',         'grm-low'],
    ['Minor',        'Remote',     'LOW',         'grm-low'],
    ['Minor',        'Improbable', 'NEGLIGIBLE',  'grm-negligible'],
    ['Negligible',   'Probable',   'LOW',         'grm-low'],
    ['Negligible',   'Occasional', 'NEGLIGIBLE',  'grm-negligible'],
    ['Negligible',   'Remote',     'NEGLIGIBLE',  'grm-negligible'],
    ['Negligible',   'Improbable', 'NEGLIGIBLE',  'grm-negligible'],
  ];

  const GRM_SEVERITIES = ['Catastrophic', 'Hazardous', 'Major', 'Minor', 'Negligible'];
  const GRM_LIKELIHOODS = ['Probable', 'Occasional', 'Remote', 'Improbable'];

  const getGRMCell = (sev, lik) => GRM_CELLS.find(c => c[0] === sev && c[1] === lik);

  const renderGRMMatrix = () => (
    <div className="modal-overlay exclude-from-print" onClick={() => setShowGRMMatrix(false)}>
      <div className="modal-content grm-modal glass-panel animate-fade-in-up" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="check-item-title" style={{fontSize: '1.4rem'}}>GRM Risk Matrix</h2>
          <button className="action-btn action-btn-delete" onClick={() => setShowGRMMatrix(false)} aria-label="Close GRM Matrix" style={{minHeight: 'unset', padding: '0.5rem'}}>✕</button>
        </div>
        <p style={{fontSize: '0.9rem', marginBottom: '1rem'}}>Severity × Likelihood → Risk Level. Use during preflight and in-flight DECIDE evaluation.</p>
        <div className="grm-table-wrapper">
          <table className="grm-table">
            <thead>
              <tr>
                <th>Severity ↓ / Likelihood →</th>
                {GRM_LIKELIHOODS.map(l => <th key={l}>{l}</th>)}
              </tr>
            </thead>
            <tbody>
              {GRM_SEVERITIES.map(sev => (
                <tr key={sev}>
                  <td className="grm-row-header">{sev}</td>
                  {GRM_LIKELIHOODS.map(lik => {
                    const cell = getGRMCell(sev, lik);
                    return (
                      <td key={lik} className={`grm-cell ${cell ? cell[3] : ''}`}>
                        {cell ? cell[2] : '—'}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grm-legend">
          <span className="grm-legend-item grm-critical">CRITICAL</span>
          <span className="grm-legend-item grm-high">HIGH</span>
          <span className="grm-legend-item grm-medium">MEDIUM</span>
          <span className="grm-legend-item grm-low">LOW</span>
          <span className="grm-legend-item grm-negligible">NEGLIGIBLE</span>
        </div>

        {/* Score Scale — integrated with live numericScore */}
        <div className="grm-score-scale">
          <div className="grm-score-scale-title">CUMULATIVE RISK SCORE SCALE</div>
          <div className="grm-score-track">
            {/* LOW band */}
            <div className={`grm-score-band grm-band-low ${numericScore < 150 ? 'grm-band-active' : ''}`}>
              <div className="grm-band-label">LOW RISK</div>
              <div className="grm-band-range">&lt; 150</div>
              <div className="grm-band-action">GO — Cleared for flight</div>
            </div>
            {/* MODERATE band */}
            <div className={`grm-score-band grm-band-moderate ${numericScore >= 150 && numericScore < 300 ? 'grm-band-active' : ''}`}>
              <div className="grm-band-label">MODERATE</div>
              <div className="grm-band-range">150 – 299</div>
              <div className="grm-band-action">CAUTION — Mitigate before departure</div>
            </div>
            {/* HIGH band */}
            <div className={`grm-score-band grm-band-high ${numericScore >= 300 ? 'grm-band-active' : ''}`}>
              <div className="grm-band-label">HIGH RISK</div>
              <div className="grm-band-range">300+</div>
              <div className="grm-band-action">NO-GO — Resolve all critical factors</div>
            </div>
          </div>
          {/* Live score indicator */}
          <div className="grm-score-current">
            <span className="grm-score-dot" style={{
              background: numericScore >= 300 ? 'var(--danger-color)' : numericScore >= 150 ? 'var(--warning-color)' : 'var(--success-color)'
            }}></span>
            <span>Your current score: <strong style={{
              color: numericScore >= 300 ? 'var(--danger-color)' : numericScore >= 150 ? 'var(--warning-color)' : 'var(--success-color)'
            }}>{numericScore}</strong> — {riskLevel.label}</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderData = (dataArray, tabKey) => {
    return dataArray.map((item, idx) => {
      const isCautionOrNoGo = db[tabKey] && (db[tabKey][item.id] === 'caution' || db[tabKey][item.id] === 'nogo');
      
      
      return (
        <article key={`${activeTab}-${item.id}`} className="check-item glass-panel animate-fade-in-up" aria-labelledby={`heading-${item.id}`} style={{ animationDelay: `${idx * 50}ms` }}>
          <header className="check-item-header">
            <div className="check-item-icon" aria-hidden="true">
              <item.icon size={28} />
            </div>
            <h3 id={`heading-${item.id}`} className="check-item-title">{item.title}</h3>
            {db[tabKey] && db[tabKey][item.id] && (
              <button 
                className="action-btn" 
                style={{ marginLeft: 'auto', background: 'transparent', padding: '0.4rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', minHeight: 'unset', width: 'auto' }}
                onClick={() => {
                  if(window.confirm(`Are you sure you want to reset the assessment for "${item.title}"?`)) {
                    handleUpdate(tabKey, item.id, null);
                    handleNoteUpdate(tabKey, item.id, '');
                  }
                }}
                title="Reset this item"
              >
                <RefreshCcw size={16} />
              </button>
            )}
          </header>

          {item.desc && <p className="check-item-desc">{item.desc}</p>}
          
          {/* Default Bullet Points */}
          {item.points && (
             <ul className="check-list" aria-label="Points of consideration">
               {item.points.map((pt, i) => (
                 <li key={i}>
                   <div className="check-list-icon" aria-hidden="true">✦</div>
                   <span>{pt}</span>
                 </li>
               ))}
             </ul>
          )}

          {/* DECIDE Explicit Formatting */}
          {item.whatItIs && (
            <>
              <h4 className="sub-section-title">What it is:</h4>
              <ul className="check-list">
                {item.whatItIs.map((pt, i) => {
                  const isNumbered = /^\d+\./.test(pt);
                  return (
                    <li key={`what-${i}`} className={isNumbered ? '' : ''}>
                      {!isNumbered && <div className="check-list-icon" aria-hidden="true">✦</div>}
                      <span style={isNumbered ? { paddingLeft: '1.5rem' } : {}}>{pt}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {item.hasRiskCalculator && (
            <div className="risk-calculator-container mb-4 exclude-from-print" style={{border: '1px solid var(--border-color)', borderRadius: '8px', padding: '1rem', background: 'var(--bg-secondary)'}}>
              <h4 className="sub-section-title mb-2">Live Hazard Evaluator</h4>
              <p style={{fontSize: '0.85rem', marginBottom: '1rem', color: 'var(--text-secondary)'}}>Use this tool to calculate the GRM matrix score for specific hazards.</p>
              
              <div className="flex flex-col gap-2">
                {(db.riskItems || []).map((riskItem) => {
                  const cell = getGRMCell(riskItem.severity, riskItem.likelihood);
                  return (
                    <div key={riskItem.id} className="flex gap-2 items-center flex-wrap" style={{background: 'var(--bg-primary)', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)'}}>
                      <input 
                        className="custom-input glass-panel" 
                        style={{flex: 2, minWidth: '150px', padding: '0.4rem', fontSize: '0.85rem', margin: 0, minHeight: '36px'}} 
                        placeholder="Hazard (e.g. Moderate Chop)"
                        value={riskItem.hazard}
                        onChange={(e) => handleUpdateRiskItem(riskItem.id, 'hazard', e.target.value)}
                        aria-label="Hazard description"
                      />
                      <select 
                        className="custom-select glass-panel" 
                        style={{flex: 1, minWidth: '120px', padding: '0.4rem', fontSize: '0.85rem', margin: 0, minHeight: '36px'}}
                        value={riskItem.severity}
                        onChange={(e) => handleUpdateRiskItem(riskItem.id, 'severity', e.target.value)}
                        aria-label="Select severity"
                      >
                        <option value="">Severity...</option>
                        {GRM_SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                      </select>
                      <select 
                        className="custom-select glass-panel" 
                        style={{flex: 1, minWidth: '120px', padding: '0.4rem', fontSize: '0.85rem', margin: 0, minHeight: '36px'}}
                        value={riskItem.likelihood}
                        onChange={(e) => handleUpdateRiskItem(riskItem.id, 'likelihood', e.target.value)}
                        aria-label="Select likelihood"
                      >
                        <option value="">Likelihood...</option>
                        {GRM_LIKELIHOODS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                      <div style={{flex: 1, minWidth: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                        {cell ? (
                          <span className={`badge ${cell[3]}`} style={{width: '100%', textAlign: 'center', padding: '0.4rem'}}>{cell[2]}</span>
                        ) : (
                          <span className="badge" style={{width: '100%', textAlign: 'center', background: 'var(--border-color)', color: 'white', padding: '0.4rem'}}>--</span>
                        )}
                      </div>
                      <button 
                        className="action-btn action-btn-delete shadow-none" 
                        style={{margin: 0, padding: '0 0.5rem', minHeight: '36px'}}
                        onClick={() => handleRemoveRiskItem(riskItem.id)}
                        aria-label="Remove hazard evaluator row"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
                <button 
                  className="action-btn"
                  style={{marginTop: '0.5rem', background: 'transparent', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)'}}
                  onClick={handleAddRiskItem}
                >
                  <Plus size={16} style={{display: 'inline', marginRight: '4px'}}/> Add Hazard to Evaluate
                </button>
              </div>
            </div>
          )}

          {item.inFlight && (
            <>
              <h4 className="sub-section-title">In-Flight Application:</h4>
              <ul className="check-list mb-4">
                {item.inFlight.map((pt, i) => {
                  const isNumbered = /^\d+\./.test(pt);
                  return (
                    <li key={`flight-${i}`} className={isNumbered ? '' : ''}>
                      {!isNumbered && <div className="check-list-icon" aria-hidden="true">✦</div>}
                      <span style={isNumbered ? { paddingLeft: '1.5rem' } : {}}>{pt}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          )}

          {/* IMSAFE Tie-In Box */}
          {item.tieIn && (
            <div className="tie-in-box">
              <div className="tie-in-title">
                <ShieldAlert size={16} /> Strategy Tie-in
              </div>
              <p style={{fontSize: 'inherit', color: 'inherit'}}>{item.tieIn}</p>
            </div>
          )}

          {item.hasAdvancedFatigue && (
            <div className="fatigue-calculator glass-panel mt-4 exclude-from-print" style={{padding: '1rem'}}>
              <label style={{display: 'flex', flexDirection: 'column', gap: '0.5rem', fontWeight: 'bold'}}>
                Sleep in last 24h:
                <select 
                  className="custom-select" 
                  style={{width: '100%'}}
                  value={db.customData && db.customData.fatigueHours || ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), fatigueHours: val } }));
                    if (val === '8+') handleUpdate(tabKey, item.id, 'pass');
                    else if (val === '5-7') handleUpdate(tabKey, item.id, 'caution');
                    else if (val === '<5') handleUpdate(tabKey, item.id, 'nogo');
                  }}
                >
                  <option value="" disabled>Select hours slept...</option>
                  <option value="8+">8 or more hours (Rested -{'>'} Pass)</option>
                  <option value="5-7">5 to 7 hours (Caution -{'>'} Mitigate)</option>
                  <option value="<5">Less than 5 hours (Fatigued -{'>'} No-Go)</option>
                </select>
              </label>
            </div>
          )}

          {item.hasAircraftTable && (
            <div className="advanced-calculator glass-panel mt-4 exclude-from-print" style={{padding: '1.5rem', background: 'rgba(0,0,0,0.2)'}}>
              <h4 className="sub-section-title mb-4" style={{marginTop: 0}}><Plane size={16}/> Weight, Balance & Performance</h4>
              <div style={{overflowX: 'auto'}}>
                <table className="grm-table" style={{width: '100%', marginBottom: '1rem'}}>
                  <thead>
                    <tr>
                      <th style={{textAlign: 'left'}}>Parameter</th>
                      <th>Actual</th>
                      <th>Limit / Req.</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="grm-row-header">Takeoff Weight (lbs)</td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="lbs" value={db.customData?.acTow || ''} onChange={e => {
                          const val = e.target.value;
                          setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), acTow: val } }));
                          if (val && db.customData?.acMaxGross && Number(val) > Number(db.customData.acMaxGross)) handleUpdate(tabKey, item.id, 'nogo');
                        }}/></td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="lbs" value={db.customData?.acMaxGross || ''} onChange={e => setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), acMaxGross: e.target.value } }))}/></td>
                      <td style={{fontWeight: 'bold', color: db.customData?.acTow && db.customData?.acMaxGross ? (Number(db.customData.acTow) > Number(db.customData.acMaxGross) ? 'var(--danger-color)' : 'var(--success-color)') : 'inherit'}}>
                          {db.customData?.acTow && db.customData?.acMaxGross ? (Number(db.customData.acTow) > Number(db.customData.acMaxGross) ? 'OVER' : 'OK') : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="grm-row-header">Fuel on Board (gal)</td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="gal" value={db.customData?.acFuelBoard || ''} onChange={e => {
                          const val = e.target.value;
                          setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), acFuelBoard: val } }));
                          if (val && db.customData?.acFuelReq && Number(val) < Number(db.customData.acFuelReq)) handleUpdate(tabKey, item.id, 'nogo');
                        }}/></td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="gal" value={db.customData?.acFuelReq || ''} onChange={e => setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), acFuelReq: e.target.value } }))}/></td>
                      <td style={{fontWeight: 'bold', color: db.customData?.acFuelBoard && db.customData?.acFuelReq ? (Number(db.customData.acFuelBoard) < Number(db.customData.acFuelReq) ? 'var(--danger-color)' : 'var(--success-color)') : 'inherit'}}>
                          {db.customData?.acFuelBoard && db.customData?.acFuelReq ? (Number(db.customData.acFuelBoard) < Number(db.customData.acFuelReq) ? 'DEFICIT' : 'OK') : '--'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {item.hasWeatherTable && (
            <div className="advanced-calculator glass-panel mt-4 exclude-from-print" style={{padding: '1.5rem', background: 'rgba(0,0,0,0.2)'}}>
              <h4 className="sub-section-title mb-4" style={{marginTop: 0}}><CloudLightning size={16}/> Weather Minimums Matrix</h4>
              <div style={{overflowX: 'auto'}}>
                <table className="grm-table" style={{width: '100%', marginBottom: '1rem'}}>
                  <thead>
                    <tr>
                      <th style={{textAlign: 'left'}}>Condition</th>
                      <th>Forecast</th>
                      <th>Required Limit</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="grm-row-header">Ceiling (ft ahl)</td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="ft" value={db.customData?.wxCeiling || ''} onChange={e => {
                          const val = e.target.value;
                          setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), wxCeiling: val } }));
                          if (val && db.customData?.wxMinCeil && Number(val) < Number(db.customData.wxMinCeil)) handleUpdate(tabKey, item.id, 'nogo');
                        }}/></td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="ft" value={db.customData?.wxMinCeil || ''} onChange={e => setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), wxMinCeil: e.target.value } }))}/></td>
                      <td style={{fontWeight: 'bold', color: db.customData?.wxCeiling && db.customData?.wxMinCeil ? (Number(db.customData.wxCeiling) < Number(db.customData.wxMinCeil) ? 'var(--danger-color)' : 'var(--success-color)') : 'inherit'}}>
                          {db.customData?.wxCeiling && db.customData?.wxMinCeil ? (Number(db.customData.wxCeiling) < Number(db.customData.wxMinCeil) ? 'BELOW MINS' : 'OK') : '--'}
                      </td>
                    </tr>
                    <tr>
                      <td className="grm-row-header">Max Crosswind (kts)</td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="kts" value={db.customData?.wxXwind || ''} onChange={e => {
                          const val = e.target.value;
                          setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), wxXwind: val } }));
                          if (val && db.customData?.wxMinXwind && Number(val) > Number(db.customData.wxMinXwind)) handleUpdate(tabKey, item.id, 'caution');
                        }}/></td>
                      <td><input type="number" className="custom-input glass-panel" style={{padding: '0.4rem', margin: 0, minHeight: '36px', width: '100%'}} placeholder="kts" value={db.customData?.wxMinXwind || ''} onChange={e => setDb(prev => ({ ...prev, customData: { ...(prev.customData || {}), wxMinXwind: e.target.value } }))}/></td>
                      <td style={{fontWeight: 'bold', color: db.customData?.wxXwind && db.customData?.wxMinXwind ? (Number(db.customData.wxXwind) > Number(db.customData.wxMinXwind) ? 'var(--warning-color)' : 'var(--success-color)') : 'inherit'}}>
                          {db.customData?.wxXwind && db.customData?.wxMinXwind ? (Number(db.customData.wxXwind) > Number(db.customData.wxMinXwind) ? 'EXCEEDS' : 'OK') : '--'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div className="item-interactions">
            {/* Notes Field specifically for Caution / No-Go */}
            {isCautionOrNoGo && (
              <div className={`note-container ${(!db.notes || !db.notes[`${tabKey}-${item.id}`] || db.notes[`${tabKey}-${item.id}`].trim() === '') ? 'print-hide' : ''}`}>
                <textarea 
                  className={`note-textarea ${(!db.notes || !db.notes[`${tabKey}-${item.id}`] || db.notes[`${tabKey}-${item.id}`].trim() === '') ? 'note-required' : ''}`}
                  placeholder={item.exampleMitigation || "Reason or mitigation notes required..."}
                  value={db.notes && db.notes[`${tabKey}-${item.id}`] || ''}
                  onChange={(e) => handleNoteUpdate(tabKey, item.id, e.target.value)}
                  aria-label={`Mitigation notes for ${item.title}`}
                />
              </div>
            )}

            <div className="item-actions" role="group" aria-label={`Evaluate ${item.title}`}>
              <button 
                className={`action-btn action-btn-pass ${db[tabKey] && db[tabKey][item.id] === 'pass' ? 'active' : ''}`}
                onClick={() => handleUpdate(tabKey, item.id, 'pass')}
                aria-pressed={db[tabKey] && db[tabKey][item.id] === 'pass'}
              >
                <CheckCircle size={18} aria-hidden="true"/> 
                <span>Pass</span>
              </button>
              
              <button 
                className={`action-btn action-btn-caution ${db[tabKey] && db[tabKey][item.id] === 'caution' ? 'active' : ''}`}
                onClick={() => handleUpdate(tabKey, item.id, 'caution')}
                aria-pressed={db[tabKey] && db[tabKey][item.id] === 'caution'}
              >
                <AlertTriangle size={18} aria-hidden="true"/> 
                <span>Caution</span>
              </button>

              <button 
                className={`action-btn action-btn-nogo ${db[tabKey] && db[tabKey][item.id] === 'nogo' ? 'active' : ''}`}
                onClick={() => handleUpdate(tabKey, item.id, 'nogo')}
                aria-pressed={db[tabKey] && db[tabKey][item.id] === 'nogo'}
              >
                <XCircle size={18} aria-hidden="true"/> 
                <span>No-Go</span>
              </button>
            </div>
          </div>
        </article>
      );
    });
  };

  return (
    <>
      <div className="container">
        <header className="app-header text-center mb-4 mt-8">
          <div className="flex justify-center items-center gap-4 mb-4" aria-hidden="true">
            <PlaneTakeoff size={48} color="var(--accent-color)" />
          </div>
          <div className="header-top-actions exclude-from-print">
            <button
              className="theme-toggle-btn"
              onClick={() => setIsDarkMode(prev => !prev)}
              aria-label={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              <span>{isDarkMode ? 'Light' : 'Dark'}</span>
            </button>
            <button
              className="theme-toggle-btn grm-btn"
              onClick={() => setShowGRMMatrix(true)}
              aria-label="Open GRM Risk Matrix"
            >
              <BarChart2 size={18} />
              <span>GRM Matrix</span>
            </button>
          </div>
          <h1 tabIndex="0">Aviation Safety Hub</h1>
          <p tabIndex="0">A systematic self-assessment and risk-management tool for pilots. Complete the checks below to determine flight readiness.</p>
          <p className="print-timestamp print-only-block" style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.5rem'}}>
            Session: {new Date(sessionTimestamp.current).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}
          </p>

          {/* Risk Score Summary — print only */}
          <div className="print-only-block" style={{marginTop: '1.5rem', padding: '1.25rem 1.5rem', border: '3px solid', borderColor: riskLevel.color, borderRadius: '8px', background: `${riskLevel.color}11`}}>
            <div style={{display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1.25rem'}}>

              {/* Score */}
              <div>
                <div style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Cumulative Risk Score</div>
                <div style={{fontSize: '3rem', fontWeight: 900, color: riskLevel.color, lineHeight: 1}}>{numericScore}</div>
              </div>

              {/* Risk Level + Action */}
              <div style={{flex: 1, minWidth: '200px'}}>
                <div style={{fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.25rem', textTransform: 'uppercase', letterSpacing: '0.1em'}}>Risk Assessment</div>
                <div style={{fontSize: '1.4rem', fontWeight: 800, color: riskLevel.color, marginBottom: '0.5rem'}}>{riskLevel.label}</div>
                <div style={{fontSize: '0.9rem', color: 'var(--text-primary)', background: `${riskLevel.color}22`, border: `1px solid ${riskLevel.color}55`, borderRadius: '6px', padding: '0.5rem 0.75rem', fontWeight: 500}}>
                  ✈ {riskLevel.action}
                </div>
              </div>

              {/* Scale reference */}
              <div style={{fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 2, textAlign: 'right', borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem'}}>
                <div style={{fontWeight: 700, marginBottom: '0.25rem', color: 'var(--text-primary)'}}>Score Scale</div>
                <div>🟢 <strong>&lt; 150</strong> — LOW RISK: Cleared</div>
                <div>🟡 <strong>150 – 299</strong> — MODERATE: Caution</div>
                <div>🔴 <strong>300+</strong> — HIGH RISK: No-Go</div>
                <div style={{marginTop: '0.5rem', fontSize: '0.7rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.4rem'}}>
                  Pass = 0 pts · Caution = item value · No-Go = item value × 2
                </div>
              </div>

            </div>
          </div>
        </header>

        <nav aria-label="Checklist Navigation" className="flex justify-center animate-fade-in-up">
          <div className="tabs-container" role="tablist">
            <div className="tab-with-progress">
              <button 
                role="tab"
                aria-selected={activeTab === 'imsafe'}
                aria-controls="panel-imsafe"
                id="tab-imsafe"
                className={`tab flex items-center gap-2 ${activeTab === 'imsafe' ? 'active' : ''}`}
                onClick={() => setActiveTab('imsafe')}
              >
                <ShieldAlert size={20} aria-hidden="true"/> IMSAFE
              </button>
              {renderProgressBar('imsafe')}
            </div>
            <div className="tab-with-progress">
              <button 
                role="tab"
                aria-selected={activeTab === 'pave'}
                aria-controls="panel-pave"
                id="tab-pave"
                className={`tab flex items-center gap-2 ${activeTab === 'pave' ? 'active' : ''}`}
                onClick={() => setActiveTab('pave')}
              >
                <PlaneTakeoff size={20} aria-hidden="true"/> PAVE
              </button>
              {renderProgressBar('pave')}
            </div>
            <div className="tab-with-progress">
              <button 
                role="tab"
                aria-selected={activeTab === 'decide'}
                aria-controls="panel-decide"
                id="tab-decide"
                className={`tab flex items-center gap-2 ${activeTab === 'decide' ? 'active' : ''}`}
                onClick={() => setActiveTab('decide')}
              >
                <Navigation size={20} aria-hidden="true"/> DECIDE
              </button>
              {renderProgressBar('decide')}
            </div>
            <div className="tab-with-progress">
              <button 
                role="tab"
                aria-selected={activeTab === 'custom'}
                aria-controls="panel-custom"
                id="tab-custom"
                className={`tab flex items-center gap-2 ${activeTab === 'custom' ? 'active' : ''}`}
                onClick={() => setActiveTab('custom')}
              >
                <ClipboardList size={20} aria-hidden="true"/> My Flight
              </button>
              {renderProgressBar('custom')}
            </div>
          </div>
        </nav>

        <main className="grid mt-4" style={{ paddingBottom: '2rem' }}>
          
          <div key={`imsafe-panel-${activeTab}`} role="tabpanel" id="panel-imsafe" aria-labelledby="tab-imsafe" className={`grid grid-2 exclude-from-print`} style={activeTab === 'imsafe' ? {display: 'contents'} : {display: 'none'}}>
            {renderData(IMSAFE_DATA, 'imsafe')}
          </div>
          
          <div key={`pave-panel-${activeTab}`} role="tabpanel" id="panel-pave" aria-labelledby="tab-pave" className={`grid grid-2 exclude-from-print`} style={activeTab === 'pave' ? {display: 'contents'} : {display: 'none'}}>
            {renderData(PAVE_DATA, 'pave')}
            <div className="glass-panel text-center animate-fade-in-up exclude-from-print" style={{gridColumn: '1 / -1', animationDelay: '500ms'}}>
              <h3 className="check-item-title mb-2">The PAVE Framework Strategy</h3>
              <p>By systematically walking through Pilot, Aircraft, enVironment, and External Pressures before and during flight, pilots build a robust risk-management habit. This structured approach not only highlights potential hazards, but also empowers you to make informed, safe go/no-go and in-flight decisions.</p>
            </div>
          </div>
          
          <div key={`decide-panel-${activeTab}`} role="tabpanel" id="panel-decide" aria-labelledby="tab-decide" className={`grid grid-2 exclude-from-print`} style={activeTab === 'decide' ? {display: 'contents'} : {display: 'none'}}>
            {renderData(DECIDE_DATA, 'decide')}
            <div className="glass-panel text-center animate-fade-in-up exclude-from-print" style={{gridColumn: '1 / -1', animationDelay: '500ms'}}>
              <h3 className="check-item-title mb-2">The DECIDE Model Strategy</h3>
              <p>By working each element—Detect, Evaluate, Consider, Integrate, Decide, Execute & Reassess—you’ll build a dynamic, self-correcting decision cycle that keeps you well ahead of emerging hazards. Use this model in your cockpit to turn complexity into clarity and elevate safety on every flight.</p>
            </div>
          </div>

          <div key={`custom-panel-${activeTab}`} role="tabpanel" id="panel-custom" aria-labelledby="tab-custom" className={`flex flex-col gap-4 exclude-from-print`} style={activeTab === 'custom' ? {} : {display: 'none'}}>
            
            <form onSubmit={handleAddCustom} className="check-item glass-panel animate-fade-in-up mb-4 exclude-from-print" style={{animationDelay: '0ms'}}>
              <h3 className="check-item-title mb-4">Add Custom Check</h3>
              <div className="flex flex-col gap-4">
                <input 
                  className="custom-input"
                  placeholder="e.g., Check right brake sensitivity..."
                  value={newCustomText}
                  onChange={(e) => setNewCustomText(e.target.value)}
                  minLength={5}
                  required
                />
                <div className="flex flex-wrap items-center gap-2">
                  <select 
                    className="custom-select" 
                    style={{width: 'auto', flexGrow: 1}}
                    value={newCustomCategory}
                    onChange={(e) => setNewCustomCategory(e.target.value)}
                    aria-label="Select Category"
                  >
                    <option value="Pre-Flight">Pre-Flight</option>
                    <option value="Weather">Weather</option>
                    <option value="Personal Minimums">Personal Minimums</option>
                    <option value="Aircraft Specific">Aircraft Specific</option>
                    <option value="Mission Specific">Mission Specific</option>
                  </select>
                  
                  <select 
                    className="custom-select" 
                    style={{width: 'auto', flexGrow: 1}}
                    value={newCustomType}
                    onChange={(e) => setNewCustomType(e.target.value)}
                    aria-label="Select Duration Mode"
                  >
                    <option value="flight">This Flight Only</option>
                    <option value="permanent">Permanent</option>
                  </select>

                  <button type="submit" className="action-btn action-btn-pass flex items-center justify-center gap-2 m-0" style={{flexGrow: 1, height: '48px'}}>
                    <Plus size={18} aria-hidden="true"/> 
                    <span>Add Item</span>
                  </button>
                </div>
              </div>
            </form>

            <div className="grid grid-2">
              {(db.customItemsList || []).map((item, idx) => {
                 const isCustomCautionOrNoGo = db.custom && (db.custom[item.id] === 'caution' || db.custom[item.id] === 'nogo');

                 return (
                  <article key={item.id} className="check-item glass-panel animate-fade-in-up flex flex-col justify-between" style={{animationDelay: `${(idx + 1) * 50}ms`}}>
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="badge badge-blue">{item.category}</span>
                        <span className={`badge ${item.type === 'permanent' ? 'badge-yellow' : 'badge-green'}`} style={{fontSize: '0.75rem'}}>
                          {item.type === 'permanent' ? 'Permanent' : 'Flight Only'}
                        </span>
                      </div>
                      <div className="flex justify-between items-start align-center gap-4">
                        <h4 id={`heading-${item.id}`} className="check-item-title mb-4" style={{fontSize: '1.25rem', margin: 0}}>{item.text}</h4>
                        {db.custom && db.custom[item.id] && (
                          <button 
                            className="action-btn" 
                            style={{ background: 'transparent', padding: '0.4rem', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', minHeight: 'unset', width: 'auto', flexShrink: 0 }}
                            onClick={() => {
                              if(window.confirm(`Are you sure you want to reset the assessment for "${item.text}"?`)) {
                                handleUpdate('custom', item.id, null);
                                handleNoteUpdate('custom', item.id, '');
                              }
                            }}
                            title="Reset this custom item"
                          >
                            <RefreshCcw size={16} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="item-interactions">
                      {isCustomCautionOrNoGo && (
                        <div className={`note-container ${(!db.notes || !db.notes[`custom-${item.id}`] || db.notes[`custom-${item.id}`].trim() === '') ? 'print-hide' : ''}`}>
                          <textarea 
                            className={`note-textarea ${(!db.notes || !db.notes[`custom-${item.id}`] || db.notes[`custom-${item.id}`].trim() === '') ? 'note-required' : ''}`}
                            placeholder="Reason or mitigation notes required..."
                            value={db.notes && db.notes[`custom-${item.id}`] || ''}
                            onChange={(e) => handleNoteUpdate('custom', item.id, e.target.value)}
                            aria-label={`Mitigation notes for ${item.text}`}
                          />
                        </div>
                      )}

                      <div className="item-actions mt-4" role="group" aria-label={`Evaluate Custom Item: ${item.text}`}>
                        <button 
                          className={`action-btn action-btn-pass ${db.custom && db.custom[item.id] === 'pass' ? 'active' : ''}`}
                          onClick={() => handleUpdate('custom', item.id, 'pass')}
                          aria-pressed={db.custom && db.custom[item.id] === 'pass'}
                        >
                          <CheckCircle size={18} aria-hidden="true"/> 
                          <span>Pass</span>
                        </button>
                        
                        <button 
                          className={`action-btn action-btn-caution ${db.custom && db.custom[item.id] === 'caution' ? 'active' : ''}`}
                          onClick={() => handleUpdate('custom', item.id, 'caution')}
                          aria-pressed={db.custom && db.custom[item.id] === 'caution'}
                        >
                          <AlertTriangle size={18} aria-hidden="true"/> 
                          <span>Caution</span>
                        </button>

                        <button 
                          className={`action-btn action-btn-nogo ${db.custom && db.custom[item.id] === 'nogo' ? 'active' : ''}`}
                          onClick={() => handleUpdate('custom', item.id, 'nogo')}
                          aria-pressed={db.custom && db.custom[item.id] === 'nogo'}
                        >
                          <XCircle size={18} aria-hidden="true"/> 
                          <span>No-Go</span>
                        </button>

                        <button 
                          className="action-btn action-btn-delete shadow-none"
                          onClick={() => handleDeleteCustomItem(item.id)}
                          aria-label="Remove item"
                        >
                          <Trash2 size={18} aria-hidden="true"/> 
                          <span className="sr-only">Delete</span>
                        </button>
                      </div>
                    </div>
                  </article>
                 )
              })}
              
              {(!db.customItemsList || db.customItemsList.length === 0) && (
                <div className="glass-panel text-center flex flex-col items-center justify-center gap-4 exclude-from-print" style={{minHeight: '200px', gridColumn: '1 / -1'}}>
                  <ClipboardList size={48} color="var(--text-secondary)" opacity={0.5} />
                  <div>
                    <h3 className="check-item-title mb-2">No custom items configured.</h3>
                    <p>Use the form above to add specific checks, personal minimums, or aircraft quirks to your permanent or per-flight profile.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
          
        </main>
      </div>

      {showResetConfirm && (
        <div className="modal-overlay exclude-from-print">
          <div className="modal-content glass-panel animate-fade-in-up text-center">
            <div className="flex justify-center mb-4">
              <AlertTriangle size={64} color="var(--danger-color)" />
            </div>
            <h2 className="check-item-title mb-4" style={{fontSize: '1.75rem'}}>Warning: Reset Progress?</h2>
            <p className="mb-8" style={{fontSize: '1.1rem', color: 'var(--text-secondary)'}}>
              Are you absolutely sure you want to logically reset all your evaluations? <br/><br/>
              Your <strong style={{color: 'var(--warning-color)'}}>permanent</strong> items will be preserved, but all flight-specific checklist progress and mitigations will be permanently lost.
            </p>
            <div className="flex gap-4">
              <button 
                onClick={() => setShowResetConfirm(false)} 
                className="action-btn action-btn-pass"
                style={{flex: 1, margin: 0, padding: '1rem'}}
              >
                No, Keep Progress
              </button>
              <button 
                onClick={confirmReset} 
                className="action-btn action-btn-nogo"
                style={{flex: 1, margin: 0, padding: '1rem'}}
              >
                Yes, Start Over
              </button>
            </div>
          </div>
        </div>
      )}

      {showGRMMatrix && renderGRMMatrix()}

      {showHazardsList && (
        <div className="modal-overlay exclude-from-print" onClick={() => setShowHazardsList(false)}>
          <div className="modal-content glass-panel animate-fade-in-up" onClick={e => e.stopPropagation()} style={{maxWidth: '500px'}}>
            <div className="flex justify-between items-center mb-4">
              <h2 className="check-item-title flex items-center gap-2" style={{fontSize: '1.4rem'}}><AlertTriangle size={24} color="var(--warning-color)"/> Active Hazards</h2>
              <button className="action-btn action-btn-delete" onClick={() => setShowHazardsList(false)} aria-label="Close" style={{minHeight: 'unset', padding: '0.5rem'}}>✕</button>
            </div>
            {activeHazards && activeHazards.length > 0 ? (
              <ul className="check-list" style={{maxHeight: '50vh', overflowY: 'auto'}}>
                {activeHazards.map((hazard, idx) => (
                  <li 
                    key={idx} 
                    className="flex flex-col mb-2 mt-2 hazard-link" 
                    title="Click to jump to this item"
                    onClick={() => {
                      setShowHazardsList(false);
                      setActiveTab(hazard.tab);
                      setTimeout(() => {
                        const el = document.getElementById(`heading-${hazard.id}`);
                        if (el) {
                          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }, 150);
                    }}
                    style={{background: 'rgba(0,0,0,0.1)', padding: '0.75rem', borderRadius: '4px', borderLeft: hazard.val === 'nogo' ? '4px solid var(--danger-color)' : '4px solid var(--warning-color)'}}
                  >
                    <span style={{fontWeight: 700, fontSize: '1.05rem'}}>{hazard.title} <span className="badge badge-yellow" style={{fontSize: '0.7rem', padding: '2px 6px', opacity: 0.8}}>{hazard.tab.toUpperCase()}</span></span>
                    <span style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.2rem'}}>{hazard.val === 'nogo' ? 'NO-GO (Unacceptable Risk)' : 'CAUTION (Needs Mitigation)'}</span>
                    {hazard.note && hazard.note.trim().length > 0 && (
                      <div style={{marginTop: '0.5rem', padding: '0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', fontStyle: 'italic', fontSize: '0.9rem', color: 'var(--text-primary)', borderLeft: '2px solid rgba(255,255,255,0.2)'}}>
                        "{hazard.note}"
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No active hazards found.</p>
            )}
            <button className="action-btn action-btn-pass mt-4" style={{width: '100%', margin: 0}} onClick={() => setShowHazardsList(false)}>Acknowledge</button>
          </div>
        </div>
      )}

      <aside className="status-panel-wrapper" aria-label="Overall Flight Status">
        <div className="container" style={{ padding: '0 1.5rem' }}>
          <div className="status-content">
            
            {/* Left Box: Progress Indicator */}
            <div className="flex items-center gap-3">
              <span className="progress-counter">
                 {evaluatedCount} / {totalItems} Evaluated
              </span>
            </div>

            {/* Center-Left: Numeric Risk Score */}
            <div className="flex items-center gap-2" style={{borderLeft: '1px solid var(--border-color)', paddingLeft: '1rem'}}>
              <span className="text-secondary" style={{fontWeight: 600, fontSize: '0.85rem'}}>Risk Score:</span>
              <span style={{
                fontWeight: 800,
                fontSize: '1.1rem',
                color: riskLevel.color,
                fontVariantNumeric: 'tabular-nums',
                minWidth: '2ch',
                textAlign: 'center'
              }}>
                {evaluatedCount > 0 ? numericScore : '—'}
              </span>
              {evaluatedCount > 0 && (
                <span style={{
                  fontSize: '0.7rem',
                  fontWeight: 700,
                  color: riskLevel.color,
                  background: `${riskLevel.color}22`,
                  border: `1px solid ${riskLevel.color}55`,
                  borderRadius: '4px',
                  padding: '2px 6px',
                  letterSpacing: '0.05em'
                }}>
                  {riskLevel.class === 'risk-high' ? 'HIGH RISK' : riskLevel.class === 'risk-moderate' ? 'MODERATE' : riskLevel.class === 'risk-low' ? 'LOW RISK' : riskLevel.label}
                </span>
              )}
            </div>

            {/* Center Box: Status */}
            <div className="flex items-center gap-4">
              <span className="text-secondary" style={{fontWeight: 600}}>Status:</span>
              <div 
                className={`score-badge ${score.class}`} 
                role="status" 
                aria-live="polite"
                style={{ cursor: activeHazards && activeHazards.length > 0 ? 'pointer' : 'default' }}
                onClick={() => { if(activeHazards && activeHazards.length > 0) setShowHazardsList(true); }}
                title={activeHazards && activeHazards.length > 0 ? "Click to view active hazards" : ""}
              >
                <score.icon size={20} aria-hidden="true" />
                {score.label}
              </div>
            </div>
            
            {/* Right Box: Actions */}
            <div className="flex items-center gap-2">
              <button 
                className="action-btn action-btn-ai"
                onClick={handleAIAdvisor}
                aria-label="Get AI Pilot Advisor Analysis"
              >
                <Bot size={16} aria-hidden="true"/> Advisor
              </button>

              <button 
                className="action-btn action-btn-print"
                onClick={handlePrint}
                aria-label="Export Flight Log PDF"
              >
                <Printer size={16} aria-hidden="true"/> Log
              </button>

              <button 
                className="reset-btn flex items-center gap-2"
                onClick={handleReset}
                aria-label="Wait, start over! Reset all checklist data"
              >
                <RefreshCcw size={16} aria-hidden="true"/> Start Over
              </button>
            </div>

          </div>
        </div>
      </aside>
      {showAIModal && (
        <div className="modal-overlay exclude-from-print" onClick={() => !aiLoading && setShowAIModal(false)}>
          <div className="modal-content ai-modal glass-panel animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <h2 className="check-item-title flex items-center gap-2" style={{fontSize: '1.6rem', color: 'var(--ai-purple)'}}>
                <Sparkles size={28} /> AI Pilot Advisor
              </h2>
              <button 
                className="action-btn action-btn-delete" 
                onClick={() => setShowAIModal(false)}
                disabled={aiLoading}
                style={{minHeight: 'unset', padding: '0.4rem'}}
              >✕</button>
            </div>

            {aiLoading ? (
              <div className="ai-loading-pulse">
                <div className="pulse-circle">
                  <Bot size={40} />
                </div>
                <p style={{color: 'var(--ai-purple)', fontWeight: 600}}>Analyzing flight data & mitigation strategies...</p>
              </div>
            ) : (
              <div className="ai-text-fade">
                <div className="ai-response-container mb-6" style={{ background: 'transparent', border: 'none', padding: 0 }}>
                  {(() => {
                    const sections = [];
                    let currentSection = null;

                    aiResponse.split('\n').forEach((line) => {
                      if (line.trim().startsWith('###')) {
                        if (currentSection) sections.push(currentSection);
                        currentSection = { 
                          header: line.replace('###', '').trim(), 
                          body: [], 
                          isVerdict: line.toLowerCase().includes('verdict') 
                        };
                      } else if (currentSection && line.trim() !== '') {
                        currentSection.body.push(line);
                      }
                    });
                    if (currentSection) sections.push(currentSection);

                    if (sections.length === 0) return <p className="p-4 glass-panel">{aiResponse}</p>;

                    return sections.map((section, si) => (
                      <div key={si} className="ai-result-section animate-fade-in-up" style={{
                        background: section.isVerdict ? `${riskLevel.color}11` : 'rgba(168, 85, 247, 0.08)',
                        borderLeft: `5px solid ${section.isVerdict ? riskLevel.color : 'var(--ai-purple)'}`,
                        borderRadius: '0 12px 12px 0',
                        padding: '1.75rem',
                        marginBottom: '1.25rem',
                        animationDelay: `${si * 100}ms`,
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
                      }}>
                        <h3 style={{ 
                          color: section.isVerdict ? riskLevel.color : 'var(--ai-purple)', 
                          fontSize: '1rem', 
                          marginBottom: '1rem',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.1em',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.65rem'
                        }}>
                          {si === 0 ? <ClipboardList size={18}/> : si === 1 ? <Info size={18}/> : si === 2 ? <Activity size={18}/> : <ShieldAlert size={18}/>}
                          {section.header}
                        </h3>
                        {section.body.map((line, li) => {
                          const parts = line.split(/(\*\*.*?\*\*)/g);
                          const formattedLine = parts.map((part, pi) => {
                            if (part.startsWith('**') && part.endsWith('**')) {
                              return <strong key={pi} style={{ color: 'var(--text-primary)' }}>{part.slice(2, -2)}</strong>;
                            }
                            return part;
                          });

                          const isFullBold = line.trim().startsWith('**') && line.trim().endsWith('**') && line.trim().split(' ').length < 6;
                          const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || line.trim().match(/^\d+\./);
                          
                          if (isFullBold && !isBullet) {
                             return (
                               <h4 key={li} style={{
                                 fontSize: '0.9rem',
                                 fontWeight: 800,
                                 marginTop: '1.25rem',
                                 marginBottom: '0.5rem',
                                 color: 'var(--text-primary)',
                                 textTransform: 'uppercase',
                                 borderBottom: '1px solid rgba(0,0,0,0.05)',
                                 paddingBottom: '0.2rem',
                                 display: 'inline-block'
                               }}>
                                 {line.replace(/\*\*/g, '')}
                               </h4>
                             );
                          }

                          return (
                            <p key={li} style={{
                              marginBottom: '0.65rem',
                              fontSize: '1rem',
                              lineHeight: '1.7',
                              color: 'var(--text-secondary)',
                              paddingLeft: isBullet ? '1.5rem' : '0',
                              position: 'relative'
                            }}>
                              {isBullet && <span style={{ position: 'absolute', left: '0.25rem', color: section.isVerdict ? riskLevel.color : 'var(--ai-purple)', fontWeight: 800 }}>•</span>}
                              {formattedLine}
                            </p>
                          );
                        })}
                      </div>
                    ));
                  })()}
                </div>
                <div className="flex items-center gap-3 mb-6 p-4 rounded-lg bg-[rgba(168,85,247,0.1)] border border-[rgba(168,85,247,0.2)]">
                  <div className="flex items-center gap-2" style={{ color: 'var(--ai-purple)', fontWeight: 600, fontSize: '0.9rem' }}>
                    <Activity size={16} /> Translate Analysis:
                  </div>
                  <select 
                    className="custom-select" 
                    style={{ flex: 1, minHeight: '36px', fontSize: '0.85rem', padding: '0 0.5rem', background: 'transparent', border: '1px solid rgba(168,85,247,0.3)' }}
                    value={selectedLanguage}
                    onChange={(e) => handleTranslate(e.target.value)}
                    disabled={aiLoading}
                  >
                    <option value="English">English</option>
                    <option value="Arabic">العربية (Arabic)</option>
                    <option value="Spanish">Español (Spanish)</option>
                    <option value="French">Français (French)</option>
                    <option value="German">Deutsch (German)</option>
                    <option value="Chinese">中文 (Chinese)</option>
                    <option value="Russian">Русский (Russian)</option>
                    <option value="Japanese">日本語 (Japanese)</option>
                  </select>
                </div>

                <button 
                  className="action-btn action-btn-ai" 
                  style={{width: '100%', margin: 0, padding: '1rem'}}
                  onClick={() => setShowAIModal(false)}
                >
                  Confirm & Close Advisor
                </button>
              </div>
            )}
            <p style={{fontSize: '0.75rem', marginTop: '1rem', textAlign: 'center', opacity: 0.6}}>
              Powered by Gemini 2.5 Flash Engine. AI advice is for situational awareness only. The PIC remains the final authority for the safety of flight.
            </p>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════
           PRINT-ONLY REPORT — Aviation Safety Hub
          ═══════════════════════════════════════════════════════ */}
      <div className="print-only rpt-root">

        {/* ── HEADER BAR ── */}
        <div className="rpt-header">
          <div className="rpt-header-left">
            <PlaneTakeoff size={36} className="rpt-logo-icon" />
            <div>
              <div className="rpt-org">Aviation Safety Hub</div>
              <div className="rpt-subtitle">Systematic Pilot Risk Assessment &amp; Mitigation Log</div>
            </div>
          </div>
          <div className="rpt-header-right">
            <div className="rpt-meta-line"><span className="rpt-meta-label">GENERATED</span><span>{new Date().toLocaleString()}</span></div>
            <div className="rpt-meta-line"><span className="rpt-meta-label">DOC TYPE</span><span>Pre-Flight Risk Certificate</span></div>
            <div className="rpt-meta-line"><span className="rpt-meta-label">REF</span><span>FAR 91.3 / IMSAFE / PAVE / DECIDE</span></div>
          </div>
        </div>

        {/* ── RISK DASHBOARD ── */}
        <div className="rpt-dashboard">

          {/* Score pill */}
          <div className="rpt-score-block" style={{borderColor: riskLevel.class === 'risk-high' ? '#da3633' : riskLevel.class === 'risk-moderate' ? '#d29922' : '#2ea043'}}>
            <div className="rpt-score-label">CUMULATIVE RISK SCORE</div>
            <div className="rpt-score-num" style={{color: riskLevel.class === 'risk-high' ? '#da3633' : riskLevel.class === 'risk-moderate' ? '#c9820a' : '#2ea043'}}>{numericScore}</div>
            <div className="rpt-score-sub">{riskLevel.label}</div>
          </div>

          {/* Score scale — 3 bands, active highlighted */}
          <div className="rpt-scale-block">
            <div className="rpt-scale-title">RISK SCORE SCALE</div>
            <div className="rpt-scale-bands">
              <div className={`rpt-band rpt-band-low${numericScore < 150 ? ' rpt-band-active' : ''}`}>
                <div className="rpt-band-name">LOW RISK</div>
                <div className="rpt-band-range">&lt; 150</div>
                <div className="rpt-band-verdict">GO</div>
              </div>
              <div className={`rpt-band rpt-band-mod${numericScore >= 150 && numericScore < 300 ? ' rpt-band-active' : ''}`}>
                <div className="rpt-band-name">MODERATE</div>
                <div className="rpt-band-range">150 – 299</div>
                <div className="rpt-band-verdict">CAUTION</div>
              </div>
              <div className={`rpt-band rpt-band-high${numericScore >= 300 ? ' rpt-band-active' : ''}`}>
                <div className="rpt-band-name">HIGH RISK</div>
                <div className="rpt-band-range">300+</div>
                <div className="rpt-band-verdict">NO-GO</div>
              </div>
            </div>
          </div>

          {/* Verdict box */}
          <div className="rpt-verdict-block" style={{
            borderColor: riskLevel.class === 'risk-high' ? '#da3633' : riskLevel.class === 'risk-moderate' ? '#d29922' : '#2ea043',
            background: riskLevel.class === 'risk-high' ? '#fff5f5' : riskLevel.class === 'risk-moderate' ? '#fffbeb' : '#f0fdf4',
          }}>
            <div className="rpt-verdict-label">FINAL VERDICT</div>
            <div className="rpt-verdict-value" style={{color: riskLevel.class === 'risk-high' ? '#da3633' : riskLevel.class === 'risk-moderate' ? '#c9820a' : '#2ea043'}}>
              {riskLevel.class === 'risk-high' ? 'DO NOT FLY' : riskLevel.class === 'risk-moderate' ? 'MITIGATION REQUIRED' : 'CLEARED FOR FLIGHT'}
            </div>
            <div className="rpt-verdict-action">{riskLevel.action}</div>
          </div>

        </div>

        {/* ── AI ADVISOR SECTION ── */}
        {aiResponse && (() => {
          // Parse sections
          const sections = [];
          let cur = null;
          aiResponse.split('\n').forEach(line => {
            if (line.trim().startsWith('###')) {
              if (cur) sections.push(cur);
              cur = { header: line.replace(/^###\s*/, '').trim(), body: [], isVerdict: line.toLowerCase().includes('verdict') };
            } else if (cur && line.trim() !== '') {
              cur.body.push(line);
            }
          });
          if (cur) sections.push(cur);

          return (
            <section className="rpt-ai-section">
              {/* AI section header */}
              <div className="rpt-ai-header">
                <div className="rpt-ai-header-left">
                  <span className="rpt-ai-badge">AI</span>
                  <span className="rpt-ai-title">AI SAFETY ADVISOR — FULL ANALYSIS</span>
                </div>
                <div className="rpt-ai-header-right">Powered by Gemini · {new Date().toLocaleDateString()}</div>
              </div>

              {/* Verdict call-out — always first, prominent */}
              {sections.filter(s => s.isVerdict).map((section, si) => (
                <div key={`v${si}`} className="rpt-ai-verdict-callout" style={{
                  borderColor: riskLevel.class === 'risk-high' ? '#da3633' : riskLevel.class === 'risk-moderate' ? '#d29922' : '#2ea043',
                  background: riskLevel.class === 'risk-high' ? '#fff5f5' : riskLevel.class === 'risk-moderate' ? '#fffbeb' : '#f0fdf4',
                }}>
                  <div className="rpt-ai-verdict-tag" style={{color: riskLevel.class === 'risk-high' ? '#da3633' : riskLevel.class === 'risk-moderate' ? '#c9820a' : '#2ea043'}}>
                    ⚠ {section.header}
                  </div>
                  {section.body.map((line, li) => (
                    <div key={li} className="rpt-ai-verdict-line">
                      {line.replace(/\*\*/g, '').replace(/^[-*]\s*|^:\s*/, '').trim()}
                    </div>
                  ))}
                </div>
              ))}

              {/* Non-verdict sections — 2 col grid */}
              <div className="rpt-ai-grid">
                {sections.filter(s => !s.isVerdict).map((section, si) => (
                  <div key={`s${si}`} className="rpt-ai-card">
                    <div className="rpt-ai-card-header">{section.header}</div>
                    <div className="rpt-ai-card-body">
                      {section.body.map((line, li) => {
                        const isBold = line.trim().startsWith('**') && line.trim().endsWith('**');
                        const isBullet = line.trim().startsWith('-') || line.trim().startsWith('*') || /^\d+\./.test(line.trim());
                        const cleaned = line.replace(/\*\*/g, '').replace(/^[-*]\s*|^:\s*/, '').trim();
                        if (!cleaned) return null;
                        if (isBold) return <div key={li} className="rpt-ai-subhead">{cleaned}</div>;
                        return (
                          <div key={li} className={`rpt-ai-line${isBullet ? ' rpt-ai-bullet' : ''}`}>
                            {isBullet && <span className="rpt-ai-dot">▸</span>}
                            {cleaned}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* ── FOOTER ── */}
        <div className="rpt-footer">
          <div className="rpt-footer-left">
            <PlaneTakeoff size={14} style={{display:'inline', marginRight: '0.4rem'}} />
            Aviation Safety Hub
          </div>
          <div className="rpt-footer-center">
            DISCLAIMER: Automated safety analysis only. The PIC bears full responsibility for all GO/NO-GO decisions per FAR 91.3.
          </div>
          <div className="rpt-footer-right">Page 1</div>
        </div>

      </div>
    </>
  );
}

export default App;
