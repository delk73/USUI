
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI, Type } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

import { DesignComponent, ComponentVariation, DesignSession } from './types';
import { INITIAL_PLACEHOLDERS, CORE_COMPONENT_LIBRARY } from './constants';
import { generateId, sleep } from './utils';

import DottedGlowBackground from './components/DottedGlowBackground';
import SideDrawer from './components/SideDrawer';
import { 
    ThinkingIcon, 
    SparklesIcon, 
    DownloadIcon,
    ImageIcon,
    XIcon,
    ArrowUpIcon,
    RefreshIcon,
    CodeIcon,
    ArrowLeftIcon,
    TrashIcon,
    GridIcon
} from './components/Icons';

// Retro Defragmenter Animation
const RetroDefragLoader = ({ label }: { label?: string }) => {
  const [blocks, setBlocks] = useState<number[]>(new Array(1024).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setBlocks(prev => prev.map(() => {
        const rand = Math.random();
        if (rand > 0.96) return 1; 
        if (rand > 0.92) return 2; 
        if (rand > 0.88) return 3; 
        return 0; 
      }));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="defrag-container">
      <div className="defrag-grid-compact">
        {blocks.map((type, i) => (
          <div key={i} className={`defrag-block-sm type-${type}`} />
        ))}
      </div>
      <div className="defrag-label-sm">{label || 'REALLOCATING_VISUAL_CLUSTERS...'}</div>
    </div>
  );
};

const FocusStage = ({ 
    variation, 
    component, 
    onClose,
    onViewSource
}: { 
    variation: ComponentVariation, 
    component: DesignComponent, 
    onClose: () => void,
    onViewSource: () => void
}) => {
    const normalizedHtml = useMemo(() => {
        if (!variation.html) return '';
        const baseStyle = `<style>:root{color-scheme:dark;--font-sans:'Inter',system-ui,sans-serif;}body{margin:0;padding:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#050505;font-family:var(--font-sans);color:#fff;}*{box-sizing:border-box;max-width:100%;overflow-wrap:break-word;}</style>`;
        return `${baseStyle}${variation.html}`;
    }, [variation.html]);

    return (
        <div className="focus-stage-overlay">
            <div className="focus-stage-header">
                <button className="focus-back-btn" onClick={onClose}><ArrowLeftIcon /> RETURN TO SYSTEM GRID</button>
                <div className="focus-meta">
                    <span className="focus-comp-id">MODULE // ${component.id.toUpperCase()}</span>
                    <span className="focus-comp-name">{component.name}</span>
                </div>
                <button className="focus-code-btn" onClick={onViewSource}><CodeIcon /> VIEW DNA SOURCE</button>
            </div>
            <div className="focus-canvas">
                <iframe srcDoc={normalizedHtml} title={`focus-${variation.id}`} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin" className="focus-iframe" />
            </div>
        </div>
    );
};

const RemixModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    componentName,
    initialAffordances
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onConfirm: (notes: string, affordances: string[]) => void,
    componentName: string,
    initialAffordances: string[]
}) => {
    const [notes, setNotes] = useState('');
    const [affordances, setAffordances] = useState<string[]>([]);
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setNotes('');
            setAffordances([...initialAffordances]);
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen, initialAffordances]);

    if (!isOpen) return null;

    const toggleAffordance = (aff: string) => {
        setAffordances(prev => prev.includes(aff) ? prev.filter(a => a !== aff) : [...prev, aff]);
    };

    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div className="remix-modal" onClick={e => e.stopPropagation()}>
                <div className="remix-modal-header"><div className="context-label">SYNTHESIS CONFIGURATION // {componentName}</div></div>
                <div className="remix-modal-section">
                    <div className="context-label" style={{ marginBottom: '8px' }}>REFINEMENT NOTES</div>
                    <textarea ref={inputRef} className="remix-textarea" placeholder="Describe behavior adjustments..." value={notes} onChange={e => setNotes(e.target.value)} />
                </div>
                <div className="remix-modal-section" style={{ marginTop: '24px' }}>
                    <div className="context-label" style={{ marginBottom: '12px' }}>INTERACTION CONTRACT (AFFORDANCES)</div>
                    <div className="affordance-row-editable">
                        {affordances.map((aff, idx) => (
                            <span key={idx} className="affordance-chip-edit active" onClick={() => toggleAffordance(aff)}>{aff} <XIcon /></span>
                        ))}
                        <button className="add-aff-btn" onClick={() => {
                            const fresh = prompt("New affordance tag:");
                            if (fresh && !affordances.includes(fresh)) setAffordances([...affordances, fresh]);
                        }}>+ ADD TAG</button>
                    </div>
                </div>
                <div className="remix-modal-footer">
                    <button className="remix-cancel" onClick={onClose}>CANCEL</button>
                    <button className="remix-submit" onClick={() => onConfirm(notes, affordances)}>SYNTHESIZE REVISION</button>
                </div>
            </div>
        </div>
    );
};

const ComponentCard = React.memo(({ 
    variation, 
    component,
    onPreviewClick,
    onReroll,
    onUpdateAffordances,
    onDelete,
    isLoading,
}: { 
    variation: ComponentVariation, 
    component: DesignComponent, 
    onPreviewClick: () => void,
    onReroll: () => void,
    onUpdateAffordances: (affs: string[]) => void,
    onDelete: () => void,
    isLoading: boolean,
}) => {
    const isStreaming = variation.status === 'streaming';
    const isError = variation.status === 'error';
    const isPending = variation.status === 'pending';
    
    const normalizedHtml = useMemo(() => {
        if (!variation.html) return '';
        const baseStyle = `<style>:root{color-scheme:dark;}body{margin:0;padding:2rem;display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 4rem);background:transparent;font-family:'Inter',system-ui,sans-serif;overflow:hidden;}*{box-sizing:border-box;max-width:100%;overflow-wrap:break-word;}</style>`;
        return `${baseStyle}${variation.html}`;
    }, [variation.html]);

    const handleToggleAffordance = (aff: string) => {
        if (!isPending) return;
        const newAffs = component.affordances.includes(aff) 
            ? component.affordances.filter(a => a !== aff) 
            : [...component.affordances, aff];
        onUpdateAffordances(newAffs);
    };

    return (
        <div className={`artifact-card ${isStreaming ? 'generating materializing' : ''} ${isPending ? 'pending' : ''} ${isError ? 'error-state' : ''}`}>
            <div className="artifact-header">
                <div className="card-title">
                    <div className="comp-id">MOD_${component.id.split('-')[1]?.toUpperCase() || 'SYS'}</div>
                    <div className="comp-name">{component.name}</div>
                </div>
                <div className="card-actions">
                  <button className="action-btn" onClick={(e) => { e.stopPropagation(); onDelete(); }} title="Remove"><TrashIcon /></button>
                  <button className="action-btn reroll-btn" onClick={(e) => { e.stopPropagation(); onReroll(); }} disabled={isLoading || isStreaming} title="Synthesize"><RefreshIcon /></button>
                </div>
            </div>
            <div className="artifact-card-inner">
                {!isPending && !isStreaming && !isError && <div className="card-click-capture" onClick={onPreviewClick} />}
                
                {isPending && (
                    <div className="pending-overlay">
                        <div className="pending-content">
                            <p className="comp-desc">{component.description}</p>
                            <div className="affordance-row-editable">
                                {component.affordances.map((aff, idx) => (
                                    <span key={idx} className="affordance-chip-edit active" onClick={() => handleToggleAffordance(aff)}>{aff} <XIcon /></span>
                                ))}
                                <button className="add-aff-btn" onClick={() => {
                                    const fresh = prompt("New affordance:");
                                    if (fresh) onUpdateAffordances([...component.affordances, fresh]);
                                }}>+ TAG</button>
                            </div>
                            <button className="btn-materialize" onClick={onReroll} disabled={isLoading}>
                                {isLoading ? <ThinkingIcon /> : <SparklesIcon />} INITIALIZE
                            </button>
                        </div>
                    </div>
                )}
                {isStreaming && (
                    <div className="generating-overlay">
                        <div className="materialize-visual-stack">
                           <RetroDefragLoader label="MATERIALIZING_DNA..." />
                           {variation.html && <pre className="code-stream-preview-overlay">{variation.html}</pre>}
                        </div>
                    </div>
                )}
                {isError && (
                    <div className="error-overlay">
                        <div className="error-content">! FAILURE <button className="retry-inline" onClick={(e) => { e.stopPropagation(); onReroll(); }}>RETRY</button></div>
                    </div>
                )}
                {!isError && !isPending && <iframe srcDoc={normalizedHtml} title={variation.id} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin" className="artifact-iframe" />}
            </div>
            {!isPending && (
                <div className="artifact-footer">
                    <div className="card-affordances-footer">
                        {component.affordances.map((a, i) => <span key={i} className="affordance-tag-sm">{a}</span>)}
                    </div>
                    <button onClick={(e) => { e.stopPropagation(); onPreviewClick(); }} className="inspector-btn"><GridIcon /> COMPONENT FOCUS MODE</button>
                </div>
            )}
        </div>
    );
});

function App() {
  const [designSessions, setDesignSessions] = useState<DesignSession[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSystemSynthesizing, setIsSystemSynthesizing] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [activeRemixVariation, setActiveRemixVariation] = useState<{ id: string, componentName: string, currentHtml: string, initialAffordances: string[] } | null>(null);
  const [focusedVariationId, setFocusedVariationId] = useState<string | null>(null);
  const [drawerState, setDrawerState] = useState<{isOpen: boolean; mode: 'code' | null; title: string; data: any; }>({ isOpen: false, mode: null, title: '', data: null });

  const inputRef = useRef<HTMLInputElement>(null);
  const globalImportRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);
  useEffect(() => {
    const interval = setInterval(() => setPlaceholderIndex(p => (p + 1) % INITIAL_PLACEHOLDERS.length), 4000);
    return () => clearInterval(interval);
  }, []);

  const currentSession = designSessions[currentSessionIndex];

  // Sequential Chain Effect
  useEffect(() => {
    if (!currentSession || isSystemSynthesizing) return;
    const firstPending = currentSession.variations.find(v => v.status === 'pending');
    if (firstPending) {
        handleMaterializeSpecific(firstPending.id);
    }
  }, [currentSession?.variations, isSystemSynthesizing]);

  const extractCode = (raw: string): string => {
      const match = raw.match(/```html\n?([\s\S]*?)\n?```/) || raw.match(/```\n?([\s\S]*?)\n?```/);
      return match ? match[1].trim() : raw.replace(/^(Here is|This is|Okay|Sure|Certainly)[\s\S]*?\n\n/i, '').trim();
  };

  const generateVariation = async (
    variationId: string, 
    comp: DesignComponent, 
    sessionId: string,
    notes: string = '',
    currentHtml: string = '',
    retryCount = 0
  ): Promise<void> => {
      const session = designSessions.find(s => s.id === sessionId);
      if (!session) return;
      
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `Generate a high-fidelity HTML/CSS component for: "${comp.name}"
PURPOSE: ${comp.description}
THEME: "${session.styleTheme}"
STRATEGY: ${session.designLanguage}
AFFORDANCES: ${comp.affordances.join(', ')}
${notes ? `REFINEMENT: "${notes}"` : ''}
${currentHtml ? `UPDATE EXISTING: \`\`\`html\n${currentHtml}\n\`\`\`` : ''}
RULES: ONLY output code inside \`\`\`html blocks. Responsive, polished CSS. No dead links.`;

          const responseStream = await ai.models.generateContentStream({
              model: 'gemini-flash-lite-latest',
              contents: [{ parts: [{ text: prompt }], role: "user" }],
          });

          let acc = '';
          for await (const chunk of responseStream) {
              acc += chunk.text || '';
              const processedCode = extractCode(acc);
              setDesignSessions(prev => prev.map(s => s.id === sessionId ? {
                  ...s, variations: s.variations.map(v => v.id === variationId ? { ...v, html: processedCode } : v)
              } : s));
          }

          setDesignSessions(prev => prev.map(s => s.id === sessionId ? {
              ...s, variations: s.variations.map(v => v.id === variationId ? { 
                  ...v, html: extractCode(acc), status: 'complete', notes: (notes === '__RETRYING__' ? '' : notes)
              } : v)
          } : s));
      } catch (e: any) {
          if (retryCount < 3 && e.message?.includes('429')) {
              await sleep(5000);
              return generateVariation(variationId, comp, sessionId, notes, currentHtml, retryCount + 1);
          }
          setDesignSessions(prev => prev.map(s => s.id === sessionId ? { ...s, variations: s.variations.map(v => v.id === variationId ? { ...v, status: 'error' } : v) } : s));
      }
  };

  const handleApplyStyle = useCallback(async (manualPrompt?: string) => {
    const spice = manualPrompt || inputValue;
    if (!spice.trim() && !selectedImage || isLoading) return;

    setIsLoading(true);
    const sessionId = generateId();
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    try {
        let theme = spice || "Visual Synthesis";
        let strategy = "High-fidelity industrial modernism.";
        
        if (selectedImage) {
            const vision = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: { parts: [{inlineData: {data: selectedImage.split(',')[1], mimeType: 'image/png'}}, { text: "Strategy and Theme for this UI vision." }] }
            });
            theme = vision.text?.split('\n')[0] || theme;
            strategy = vision.text?.split('\n')[1] || strategy;
        }

        const archRes = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `Generate 4 niche UI modules for theme "${theme}". Output ONLY valid JSON array: [{"id": "mod-id", "name": "Name", "description": "Purpose", "affordances": ["Tag1", "Tag2"]}].`,
            config: { responseMimeType: "application/json" }
        });
        
        const nicheArchitecture = JSON.parse(archRes.text || "[]");
        const combinedArchitecture = [...CORE_COMPONENT_LIBRARY, ...nicheArchitecture];

        const session: DesignSession = {
            id: sessionId,
            styleTheme: theme,
            designLanguage: strategy,
            timestamp: Date.now(),
            architecture: combinedArchitecture,
            variations: combinedArchitecture.map((comp: any) => ({
                id: generateId(),
                componentId: comp.id,
                styleName: theme,
                html: "",
                prompt: theme,
                status: 'pending'
            }))
        };

        setDesignSessions(prev => [...prev, session]);
        setCurrentSessionIndex(designSessions.length);
        setInputValue('');
        setSelectedImage(null);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, selectedImage, isLoading, designSessions.length]);

  const handleMaterializeSpecific = async (variationId: string) => {
      if (!currentSession || !variationId) return;
      const variation = currentSession.variations.find(v => v.id === variationId);
      if (!variation) return;

      const arch = currentSession.architecture.find(a => a.id === variation.componentId);
      if (!arch) return;

      try {
          setIsSystemSynthesizing(true);
          // Set to streaming immediately to allow visual feedback
          setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? {
            ...s, variations: s.variations.map(v => v.id === variationId ? { ...v, status: 'streaming', html: '' } : v)
          } : s));

          await generateVariation(variationId, arch, currentSession.id);
      } finally {
          setIsSystemSynthesizing(false);
      }
  };

  const handleUpdateAffordances = (compId: string, affs: string[]) => {
      setDesignSessions(prev => prev.map(s => s.id === currentSession!.id ? {
          ...s, architecture: s.architecture.map(a => a.id === compId ? { ...a, affordances: affs } : a)
      } : s));
  };

  const handleDeleteModule = (id: string) => {
      setDesignSessions(prev => prev.map(s => s.id === currentSession!.id ? {
          ...s, 
          architecture: s.architecture.filter(a => a.id !== id),
          variations: s.variations.filter(v => v.componentId !== id)
      } : s));
  };

  const handleConfirmRemix = (notes: string, updatedAffordances: string[]) => {
      if (!activeRemixVariation || !currentSession) return;
      const compId = currentSession.variations.find(v => v.id === activeRemixVariation.id)!.componentId;
      handleUpdateAffordances(compId, updatedAffordances);
      const arch = currentSession.architecture.find(a => a.id === compId)!;
      const updatedArch = { ...arch, affordances: updatedAffordances };
      setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? {
          ...s, variations: s.variations.map(x => x.id === activeRemixVariation.id ? { ...x, status: 'streaming', html: '' } : x)
      } : s));
      generateVariation(activeRemixVariation.id, updatedArch, currentSession.id, notes, activeRemixVariation.currentHtml);
      setActiveRemixVariation(null);
  };

  const handleExport = () => {
    if (!currentSession) return;
    
    const componentItems = currentSession.variations.filter(v => v.status === 'complete').map(v => {
        const arch = currentSession.architecture.find(a => a.id === v.componentId);
        const anchorId = `comp-${v.id}`;
        const normalizedHtml = `<!DOCTYPE html><html><head><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet"><style>:root{color-scheme:dark;}body{margin:0;padding:2rem;display:flex;align-items:center;justify-content:center;min-height:calc(100vh - 4rem);background:transparent;font-family:'Inter',sans-serif;color:#fff;}*{box-sizing:border-box;max-width:100%;overflow-wrap:break-word;}</style></head><body>${v.html}</body></html>`;

        return {
            id: anchorId,
            name: arch?.name || 'Untitled',
            description: arch?.description || '',
            affordances: arch?.affordances || [],
            html: v.html,
            srcDoc: normalizedHtml
        };
    });

    const doc = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>USUI SPEC // ${currentSession.styleTheme.toUpperCase()}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root { --bg: #000; --text: #fff; --border: #111; --accent: #fff; --font-sans: 'Inter', sans-serif; --font-mono: 'JetBrains Mono', monospace; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: var(--bg); color: var(--text); font-family: var(--font-sans); height: 100%; scroll-behavior: smooth; }
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 300px; position: fixed; height: 100vh; border-right: 1px solid var(--border); background: #050505; padding: 40px; overflow-y: auto; z-index: 100; }
        .main { flex: 1; margin-left: 300px; background: var(--bg); position: relative; }
        .label { font-size: 0.6rem; color: #444; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 8px; font-family: var(--font-mono); font-weight: 700; }
        .sidebar-header h1 { font-size: 1.2rem; font-weight: 900; text-transform: uppercase; margin: 0 0 40px 0; border-bottom: 3px solid #fff; padding-bottom: 8px; }
        .nav-list { list-style: none; }
        .nav-list li { margin-bottom: 18px; }
        .nav-list a { color: #555; text-decoration: none; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; transition: 0.2s; display: block; }
        .nav-list a:hover { color: #fff; }
        .section-cover { min-height: 100vh; padding: 80px; display: flex; flex-direction: column; justify-content: center; border-bottom: 1px solid var(--border); }
        .cover-title { font-size: 8vw; font-weight: 900; line-height: 0.8; margin-bottom: 40px; letter-spacing: -0.05em; text-transform: uppercase; }
        .strategy { font-size: 1.8rem; font-weight: 300; line-height: 1.2; color: #888; margin-top: 20px; max-width: 800px; }
        .component-section { padding: 100px 80px; border-bottom: 1px solid var(--border); }
        .comp-header { margin-bottom: 40px; }
        .comp-header h2 { font-size: 3rem; font-weight: 900; text-transform: uppercase; margin-bottom: 12px; }
        .aff-chip { background: #0a0a0a; color: #666; font-size: 0.6rem; padding: 4px 12px; border-radius: 20px; text-transform: uppercase; font-weight: 700; border: 1px solid #222; margin-right: 8px; }
        .comp-preview { border: 1px solid var(--border); background: #020202; margin-bottom: 40px; }
        .preview-iframe { width: 100%; height: 500px; border: none; display: block; }
        
        /* Collapsible Source Code Styles */
        details.code-details { border: 1px solid var(--border); background: #050505; transition: border-color 0.2s; }
        details.code-details[open] { border-color: #333; }
        summary.code-summary { padding: 16px 24px; background: #0a0a0a; color: #333; font-size: 0.6rem; font-weight: 900; font-family: var(--font-mono); cursor: pointer; list-style: none; outline: none; user-select: none; border-bottom: 1px solid transparent; }
        details.code-details[open] summary.code-summary { border-bottom-color: var(--border); color: #888; }
        summary.code-summary::-webkit-details-marker { display: none; }
        summary.code-summary:hover { color: #fff; }
        pre { padding: 30px; color: #fff; font-family: var(--font-mono); font-size: 0.8rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; opacity: 0.8; }

        @media (max-width: 900px) { .sidebar { display: none; } .main { margin-left: 0; } }
    </style>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="sidebar-header"><div class="label">ENGINEERING SPEC</div><h1>USUI STUDIO</h1></div>
            <nav style="margin-top: 40px"><div class="label">NAVIGATION</div><ul class="nav-list"><li><a href="#cover">00 // OVERVIEW</a></li>${componentItems.map((c, i) => `<li><a href="#${c.id}">${String(i+1).padStart(2, '0')} // ${c.name}</a></li>`).join('')}</ul></nav>
        </aside>
        <main class="main">
            <section id="cover" class="section-cover"><div class="label">IDENTITY // DNA_v1.5</div><h1 class="cover-title">${currentSession.styleTheme}</h1><div class="strategy">${currentSession.designLanguage}</div></section>
            ${componentItems.map(c => `
            <section id="${c.id}" class="component-section">
                <div class="comp-header"><div class="label">MODULE_ID: ${c.id.toUpperCase()}</div><h2>${c.name}</h2><p style="color:#666; margin-bottom:15px">${c.description}</p>
                <div style="margin-top:10px">${c.affordances.map(a => `<span class="aff-chip">${a}</span>`).join('')}</div></div>
                <div class="comp-preview"><iframe class="preview-iframe" srcdoc="${c.srcDoc.replace(/"/g, '&quot;')}" sandbox="allow-scripts allow-same-origin"></iframe></div>
                <details class="code-details">
                    <summary class="code-summary">VIEW SOURCE DNA [+]</summary>
                    <pre><code>${c.html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre>
                </details>
            </section>`).join('')}
        </main>
    </div>
    <script id="usui-session-data" type="application/json">${JSON.stringify(currentSession)}</script>
</body>
</html>`;

    const b = new Blob([doc], { type: 'text/html' });
    const u = URL.createObjectURL(b);
    const a = document.createElement('a');
    a.href = u; a.download = `usui-spec-${currentSession.styleTheme.toLowerCase().replace(/\s+/g, '-')}.html`;
    a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const r = new FileReader();
    r.onload = (ev) => {
        const raw = ev.target?.result as string;
        try {
            const htmlMatch = raw.match(/<script id="usui-session-data" type="application\/json">([\s\S]*?)<\/script>/i);
            const data = htmlMatch ? JSON.parse(htmlMatch[1]) : JSON.parse(raw);
            
            setDesignSessions(prev => [...prev, data]);
            setCurrentSessionIndex(designSessions.length);
        } catch (err) {
            alert("FAILURE // Corrupt DNA fragment detected.");
        }
    };
    r.readAsText(f);
  };

  const handleAddModule = () => {
    if (!currentSession) return;
    const newId = `mod-${generateId()}`;
    const newArch = { id: newId, name: 'Untitled Module', description: 'Custom module definition.', affordances: ['NewTag'] };
    const newVar = { id: generateId(), componentId: newId, styleName: currentSession.styleTheme, html: '', prompt: '', status: 'pending' as const };
    setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, architecture: [...s.architecture, newArch], variations: [...s.variations, newVar] } : s));
  };

  return (
    <>
        <div className="top-nav"><div className="brand" onClick={() => window.location.reload()}>USUI STUDIO</div></div>
        <SideDrawer isOpen={drawerState.isOpen} onClose={() => setDrawerState(s => ({...s, isOpen: false}))} title={drawerState.title}><pre className="code-block"><code>{drawerState.data}</code></pre></SideDrawer>
        <RemixModal isOpen={!!activeRemixVariation} onClose={() => setActiveRemixVariation(null)} componentName={activeRemixVariation?.componentName || ''} initialAffordances={activeRemixVariation?.initialAffordances || []} onConfirm={handleConfirmRemix} />
        
        <input type="file" ref={globalImportRef} hidden accept=".json,.html" onChange={handleImport} />
        <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={e => {
            const f = e.target.files?.[0]; if (!f) return;
            const r = new FileReader(); r.onload = ev => setSelectedImage(ev.target?.result as string); r.readAsDataURL(f);
        }} />

        {focusedVariationId && currentSession && (
            <FocusStage 
                variation={currentSession.variations.find(v => v.id === focusedVariationId)!} 
                component={currentSession.architecture.find(a => a.id === currentSession.variations.find(v => v.id === focusedVariationId)!.componentId)!} 
                onClose={() => setFocusedVariationId(null)} 
                onViewSource={() => setDrawerState({isOpen: true, mode: 'code', title: 'SOURCE', data: currentSession.variations.find(v => v.id === focusedVariationId)!.html})} 
            />
        )}

        <div className="immersive-app">
            <DottedGlowBackground color="rgba(255, 255, 255, 0.02)" glowColor="rgba(255, 255, 255, 0.1)" />
            <div className="stage-container">
                {!currentSession ? (
                    <div className="empty-state">
                        <div className="empty-content">
                            <h1 className="hero-text"><span className="hero-main">USUI</span><span className="hero-sub">STUDIO</span></h1>
                            <div className="landing-actions">
                               <button className="main-btn" onClick={() => handleApplyStyle(INITIAL_PLACEHOLDERS[placeholderIndex])}>RANDOM SPICE</button>
                               <button className="main-btn ghost" onClick={() => globalImportRef.current?.click()}>IMPORT SESSION</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="session-group">
                        <div className="session-context-header">
                            <div className="manifesto-header-tight">
                                <div className="manifesto-col">
                                    <div className="context-label">SYSTEM_DNA</div>
                                    <div className="token-actions-row">
                                        <input className="context-theme-input" value={currentSession.styleTheme} onChange={(e) => setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, styleTheme: e.target.value } : s))} />
                                        <div className="synth-system-btn-group">
                                            {isSystemSynthesizing && <span className="active-loader-tag pulse">SEQUENTIAL_SYNTHESIS_ACTIVE...</span>}
                                            <button className="synth-system-btn" onClick={handleAddModule}>+ ADD MODULE</button>
                                        </div>
                                    </div>
                                    <div className="context-label">STRATEGY</div>
                                    <textarea className="context-strategy-textarea" value={currentSession.designLanguage} onChange={(e) => setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, designLanguage: e.target.value } : s))} />
                                </div>
                            </div>
                        </div>
                        <div className="artifact-grid">
                            {currentSession.variations.map(v => {
                                const arch = currentSession.architecture.find(a => a.id === v.componentId)!;
                                return <ComponentCard 
                                    key={v.id} 
                                    variation={v} 
                                    component={arch} 
                                    onPreviewClick={() => setFocusedVariationId(v.id)} 
                                    onUpdateAffordances={affs => handleUpdateAffordances(arch.id, affs)} 
                                    onDelete={() => handleDeleteModule(arch.id)} 
                                    onReroll={() => {
                                        if (v.status === 'pending') handleMaterializeSpecific(v.id);
                                        else setActiveRemixVariation({ id: v.id, componentName: arch.name, currentHtml: v.html, initialAffordances: arch.affordances });
                                    }} 
                                    isLoading={isLoading}
                                />;
                            })}
                        </div>
                    </div>
                )}
            </div>
            
            <div className={`bottom-controls ${currentSession ? 'visible' : ''}`}>
                 <div className="control-btns">
                    <button onClick={() => globalImportRef.current?.click()}><ArrowUpIcon /> IMPORT</button>
                    <button onClick={handleExport} className="export-btn"><DownloadIcon /> EXPORT STYLE GUIDE</button>
                 </div>
            </div>

            <div className="floating-input-container">
                <div className={`input-wrapper ${isLoading ? 'loading' : ''}`}>
                    {!inputValue && !isLoading && !selectedImage && <div className="animated-placeholder">INITIATE: {INITIAL_PLACEHOLDERS[placeholderIndex]}</div>}
                    {selectedImage && <div className="img-chip"><img src={selectedImage} alt="seed" /><button onClick={() => setSelectedImage(null)}><XIcon /></button></div>}
                    {!isLoading ? (
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                          <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onPaste={e => {
                              const item = e.clipboardData?.items[0];
                              if (item?.type.includes('image')) {
                                  const r = new FileReader(); r.onload = ev => setSelectedImage(ev.target?.result as string); r.readAsDataURL(item.getAsFile()!);
                              }
                          }} onKeyDown={e => {
                              if (e.key === 'Enter') handleApplyStyle();
                          }} />
                          <button className="action-btn" onClick={() => imageInputRef.current?.click()}><ImageIcon /></button>
                        </div>
                    ) : <div className="loading-state">SYNTHESIZING... <ThinkingIcon /></div>}
                    <button className="go-btn" onClick={() => handleApplyStyle()} disabled={isLoading}><ArrowUpIcon /></button>
                </div>
            </div>
        </div>
    </>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(<App />);
