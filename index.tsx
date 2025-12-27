
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
  const [blocks, setBlocks] = useState<number[]>(new Array(4096).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setBlocks(prev => prev.map(() => {
        const rand = Math.random();
        if (rand > 0.96) return 1; // High (White)
        if (rand > 0.92) return 2; // Mid (Gray)
        if (rand > 0.88) return 3; // Low (Dark Gray)
        return 0; // Empty
      }));
    }, 120);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="defrag-container">
      <div className="defrag-grid">
        {blocks.map((type, i) => (
          <div key={i} className={`defrag-block type-${type}`} />
        ))}
      </div>
      <div className="defrag-label">{label || 'REALLOCATING_VISUAL_CLUSTERS...'}</div>
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
        const baseStyle = `
            <style>
                :root { color-scheme: dark; }
                body { 
                    margin: 0; 
                    padding: 0; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    min-height: 100vh; 
                    background: transparent; 
                    font-family: 'Inter', system-ui, sans-serif;
                }
                * { box-sizing: border-box; max-width: 100%; overflow-wrap: break-word; }
            </style>
        `;
        return `${baseStyle}${variation.html}`;
    }, [variation.html]);

    return (
        <div className="focus-stage-overlay">
            <div className="focus-stage-header">
                <button className="focus-back-btn" onClick={onClose}>
                    <ArrowLeftIcon /> BACK TO GRID
                </button>
                <div className="focus-meta">
                    <span className="focus-comp-id">MOD_${component.id.split('-')[1]?.toUpperCase()}</span>
                    <span className="focus-comp-name">{component.name}</span>
                </div>
                <button className="focus-code-btn" onClick={onViewSource}>
                    <CodeIcon /> VIEW SOURCE
                </button>
            </div>
            <div className="focus-canvas">
                <iframe 
                    srcDoc={normalizedHtml} 
                    title={`focus-${variation.id}`}
                    sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin"
                    className="focus-iframe"
                />
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
                <div className="remix-modal-header">
                    <div className="context-label">SYNTHESIS CONFIGURATION // {componentName}</div>
                </div>
                
                <div className="remix-modal-section">
                    <div className="context-label" style={{ marginBottom: '8px' }}>REFINEMENT NOTES</div>
                    <textarea 
                        ref={inputRef}
                        className="remix-textarea"
                        placeholder="Describe changes (e.g. 'More dramatic shadows', 'Smaller typography')..."
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                    />
                </div>

                <div className="remix-modal-section" style={{ marginTop: '24px' }}>
                    <div className="context-label" style={{ marginBottom: '12px' }}>INTERACTION CONTRACT (AFFORDANCES)</div>
                    <div className="affordance-row-editable">
                        {affordances.map((aff, idx) => (
                            <span key={idx} className="affordance-chip-edit active" onClick={() => toggleAffordance(aff)}>
                                {aff} <XIcon />
                            </span>
                        ))}
                        <button className="add-aff-btn" onClick={() => {
                            const fresh = prompt("New affordance (e.g. 'Hover glow', 'Scroll snap'):");
                            if (fresh && !affordances.includes(fresh)) setAffordances([...affordances, fresh]);
                        }}>+ ADD AFFORDANCE</button>
                    </div>
                </div>

                <div className="remix-modal-footer">
                    <button className="remix-cancel" onClick={onClose}>CANCEL</button>
                    <button className="remix-submit" onClick={() => onConfirm(notes, affordances)}>
                        SYNTHESIZE REVISION
                    </button>
                </div>
            </div>
        </div>
    );
};

const ComponentCard = React.memo(({ 
    variation, 
    component,
    onCodeClick,
    onPreviewClick,
    onDownload,
    onImport,
    onReroll,
    isLoading,
}: { 
    variation: ComponentVariation, 
    component: DesignComponent, 
    onCodeClick: () => void,
    onPreviewClick: () => void,
    onDownload: () => void,
    onImport: (html: string) => void,
    onReroll: () => void,
    isLoading: boolean,
}) => {
    const isStreaming = variation.status === 'streaming';
    const isError = variation.status === 'error';
    const isPending = variation.status === 'pending';
    const fileInputRef = useRef<HTMLInputElement>(null);
    
    const normalizedHtml = useMemo(() => {
        if (!variation.html) return '';
        const baseStyle = `
            <style>
                :root { color-scheme: dark; }
                body { 
                    margin: 0; 
                    padding: 2rem; 
                    display: flex; 
                    align-items: center; 
                    justify-content: center; 
                    min-height: calc(100vh - 4rem); 
                    background: transparent; 
                    font-family: 'Inter', system-ui, sans-serif;
                    overflow: hidden;
                }
                * { box-sizing: border-box; max-width: 100%; overflow-wrap: break-word; }
            </style>
        `;
        return `${baseStyle}${variation.html}`;
    }, [variation.html]);

    return (
        <div className={`artifact-card ${isStreaming ? 'generating materializing' : ''} ${isPending ? 'pending' : ''} ${isError ? 'error-state' : ''}`}>
            <div className="artifact-header">
                <div className="card-title">
                    <div className="comp-id">MOD_${component.id.split('-')[1]?.toUpperCase() || 'SYS'} // USUI_v1.3</div>
                    <div className="comp-name">{component.name}</div>
                </div>
                {isStreaming && <div className="status-badge pulse">MATERIALIZING_DNA</div>}
                <div className="card-actions">
                  <button className="action-btn" onClick={(e) => { e.stopPropagation(); onCodeClick(); }} title="View Source Code"><CodeIcon /></button>
                  <button className="action-btn" onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }} title="Replace with Local HTML"><ArrowUpIcon /></button>
                  <input type="file" ref={fileInputRef} hidden accept=".html" onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const r = new FileReader();
                      r.onload = (ev) => {
                          const c = ev.target?.result as string;
                          const m = c.match(/<body>([\s\S]*?)<\/body>/i);
                          onImport(m ? m[1].trim() : c);
                      };
                      r.readAsText(file);
                  }} />
                  <button className="action-btn reroll-btn" onClick={(e) => { e.stopPropagation(); onReroll(); }} disabled={isLoading || isStreaming} title="Refine with Notes"><RefreshIcon /></button>
                </div>
            </div>
            <div className="artifact-card-inner">
                {/* Click capture overlay to restore interaction mode trigger */}
                {!isPending && !isStreaming && !isError && (
                    <div className="card-click-capture" onClick={onPreviewClick} />
                )}
                
                {isPending && (
                    <div className="pending-overlay">
                        <div className="pending-content">
                            <p className="comp-desc">{component.description}</p>
                            <div className="pending-affordances">
                                {component.affordances.map((a, i) => (
                                    <span key={i} className="affordance-tag-sm">{a}</span>
                                ))}
                            </div>
                            <button className="synth-trigger-btn" onClick={onReroll} disabled={isLoading}>
                                {isLoading ? <ThinkingIcon /> : <SparklesIcon />}
                                MATERIALIZE MODULE
                            </button>
                        </div>
                    </div>
                )}
                {isStreaming && (
                    <div className="generating-overlay">
                        <div className="materialize-visual-stack">
                           <RetroDefragLoader label={variation.notes === '__RETRYING__' ? 'WAITING_FOR_QUOTA...' : 'MATERIALIZING_BITSTREAM...'} />
                           {variation.html && <pre className="code-stream-preview-overlay">{variation.html}</pre>}
                        </div>
                    </div>
                )}
                {isError && (
                    <div className="error-overlay">
                        <div className="error-content"><span className="error-icon">!</span><span className="error-text">FAILURE</span><button className="retry-inline" onClick={(e) => { e.stopPropagation(); onReroll(); }}>RETRY</button></div>
                    </div>
                )}
                {!isError && !isPending && <iframe srcDoc={normalizedHtml} title={variation.id} sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin" className="artifact-iframe" />}
            </div>
            {!isPending && (
                <div className="artifact-footer">
                    <button onClick={(e) => { e.stopPropagation(); onPreviewClick(); }} className="inspector-btn"><GridIcon /> OPEN INTERACTION MODE</button>
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
          const prompt = `
Generate a single-file high-fidelity HTML/CSS component for: "${comp.name}"
PURPOSE: ${comp.description}
THEME: "${session.styleTheme}"
STRATEGY: ${session.designLanguage}

INTERACTION CONTRACT (MUST IMPLEMENT ALL):
${comp.affordances.map(a => `- ${a}`).join('\n')}

${notes && notes !== '__RETRYING__' ? `REFINEMENT: "${notes}"` : ''}
${currentHtml ? `UPDATE EXISTING: \`\`\`html\n${currentHtml}\n\`\`\`` : ''}

RULES:
- ONLY output the code inside \`\`\`html blocks.
- Must be responsive and centered.
- Use 'overflow-wrap: break-word' to prevent bleed.
- Default to 'Inter' for sans-serif typography.
- STRICT NO DEAD LINKS POLICY: Never use 'href="#"'. Use buttons or styled spans.
- For interactive elements, provide polished custom CSS styles.
          `.trim();

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
          if (retryCount < 5 && e.message?.includes('429')) {
              await sleep(Math.pow(2, retryCount) * 10000);
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
                contents: { parts: [{inlineData: {data: selectedImage.split(',')[1], mimeType: 'image/png'}}, { text: "Derive Design Strategy (15 words) and Theme Title." }] }
            });
            const text = vision.text || "";
            theme = text.split('\n')[0].replace('Theme:', '').trim() || theme;
            strategy = text.split('\n')[1]?.replace('Strategy:', '').trim() || strategy;
        } else {
            const stratRes = await ai.models.generateContent({
                model: 'gemini-flash-lite-latest',
                contents: `Create a one-sentence technical strategy for a design system themed: "${theme}".`
            });
            strategy = stratRes.text || strategy;
        }

        const archRes = await ai.models.generateContent({
            model: 'gemini-flash-lite-latest',
            contents: `The design system "${theme}" already includes these 6 Core Primitives:
${CORE_COMPONENT_LIBRARY.map(c => `- ${c.name}: ${c.description}`).join('\n')}

Generate 4 ADDITIONAL "Domain-Specific Modules" for this theme.
FOR EVERY MODULE (core and new), you must define 3-5 specific 'affordances' (e.g. 'Draggable', 'Haptic focus', 'Glass transparency').

Output ONLY valid JSON as an array of 4 objects: [{"id": "mod-id", "name": "Name", "description": "Purpose", "affordances": ["Affordance 1", "Affordance 2"]}].`,
            config: { responseMimeType: "application/json" }
        });
        
        const nicheArchitecture = JSON.parse(archRes.text || "[]");
        
        // Combine Core + Niche
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

  const handleMaterializeSystem = useCallback(async () => {
      if (isSystemSynthesizing || !currentSession) return;
      setIsSystemSynthesizing(true);
      
      for (const variation of currentSession.variations) {
          const arch = currentSession.architecture.find(a => a.id === variation.componentId);
          if (!arch || variation.status === 'complete') continue;
          
          setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? {
            ...s, variations: s.variations.map(v => v.id === variation.id ? { ...v, status: 'streaming', html: '' } : v)
          } : s));

          await generateVariation(variation.id, arch, currentSession.id);
          await sleep(300);
      }
      setIsSystemSynthesizing(false);
  }, [currentSession, isSystemSynthesizing]);

  const handleAddModule = () => {
    if (!currentSession) return;
    const newId = `mod-${generateId()}`;
    const newArch = { id: newId, name: 'Untitled Module', description: 'Describe module purpose...', affordances: [] };
    const newVar = { id: generateId(), componentId: newId, styleName: currentSession.styleTheme, html: '', prompt: '', status: 'pending' as const };
    
    setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? {
        ...s,
        architecture: [...s.architecture, newArch],
        variations: [...s.variations, newVar]
    } : s));
  };

  const handleUpdateArch = (id: string, field: 'name' | 'description' | 'affordances', val: any) => {
    setDesignSessions(prev => prev.map(s => s.id === currentSession!.id ? {
        ...s, architecture: s.architecture.map(a => a.id === id ? { ...a, [field]: val } : a)
    } : s));
  };

  const handleToggleAffordance = (compId: string, affordance: string) => {
      const comp = currentSession?.architecture.find(a => a.id === compId);
      if (!comp) return;
      const newAffordances = comp.affordances.includes(affordance) 
        ? comp.affordances.filter(a => a !== affordance)
        : [...comp.affordances, affordance];
      handleUpdateArch(compId, 'affordances', newAffordances);
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
      
      // commit affordances back to architecture before synthesis
      handleUpdateArch(compId, 'affordances', updatedAffordances);
      
      // Trigger synthesis
      const arch = currentSession.architecture.find(a => a.id === compId)!;
      // We need the updated architecture object for the prompt
      const updatedArch = { ...arch, affordances: updatedAffordances };
      
      setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? {
          ...s, variations: s.variations.map(x => x.id === activeRemixVariation.id ? { ...x, status: 'streaming', html: '' } : x)
      } : s));
      
      generateVariation(activeRemixVariation.id, updatedArch, currentSession.id, notes, activeRemixVariation.currentHtml);
      setActiveRemixVariation(null);
  };

  const handleExport = () => {
      const session = currentSession;
      if (!session) return;
      
      const componentItems = session.variations.filter(v => v.status === 'complete').map(v => {
          const arch = session.architecture.find(a => a.id === v.componentId);
          const anchorId = `comp-${v.id}`;
          const normalizedHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                <style>
                    :root { color-scheme: dark; }
                    body { 
                        margin: 0; padding: 2rem; display: flex; align-items: center; justify-content: center; 
                        min-height: calc(100vh - 4rem); background: transparent; font-family: 'Inter', sans-serif;
                        color: #fff;
                    }
                    * { box-sizing: border-box; max-width: 100%; overflow-wrap: break-word; }
                </style>
            </head>
            <body>
                ${v.html}
            </body>
            </html>
          `;

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
    <title>USUI PORTABLE SPEC // ${session.styleTheme.toUpperCase()}</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=JetBrains+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root { 
            --bg: #000; --text: #fff; --border: #222; --accent: #fff;
            --font-sans: 'Inter', sans-serif;
            --font-mono: 'JetBrains Mono', monospace;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        html, body { background: var(--bg); color: var(--text); font-family: var(--font-sans); height: 100%; scroll-behavior: smooth; }
        
        .layout { display: flex; min-height: 100vh; }
        .sidebar { width: 300px; position: fixed; height: 100vh; border-right: 1px solid var(--border); background: #050505; padding: 40px; overflow-y: auto; z-index: 100; }
        .main { flex: 1; margin-left: 300px; background: var(--bg); position: relative; }
        
        .label { font-size: 0.65rem; color: #555; letter-spacing: 0.4em; text-transform: uppercase; margin-bottom: 8px; font-family: var(--font-mono); font-weight: 700; }
        .sidebar-header h1 { font-size: 1.5rem; font-weight: 900; text-transform: uppercase; margin: 0 0 40px 0; border-bottom: 4px solid #fff; padding-bottom: 10px; }
        
        .nav-list { list-style: none; }
        .nav-list li { margin-bottom: 20px; }
        .nav-list a { color: #888; text-decoration: none; font-size: 0.85rem; font-weight: 700; text-transform: uppercase; transition: color 0.2s; display: block; }
        .nav-list a:hover { color: #fff; }

        .section-cover { min-height: 100vh; padding: 120px 80px; display: flex; flex-direction: column; justify-content: center; border-bottom: 1px solid var(--border); }
        .cover-title { font-size: 8vw; font-weight: 900; line-height: 0.8; margin-bottom: 60px; letter-spacing: -0.05em; text-transform: uppercase; }
        .cover-info { display: grid; grid-template-columns: 1fr 1fr; gap: 80px; max-width: 1000px; }
        .strategy { font-size: 2rem; font-weight: 300; line-height: 1.2; color: #aaa; margin-top: 40px; }

        .component-section { padding: 120px 80px; border-bottom: 1px solid var(--border); }
        .comp-header { margin-bottom: 60px; }
        .comp-header h2 { font-size: 3.5rem; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; }
        
        .affordance-list { display: flex; gap: 10px; flex-wrap: wrap; margin: 20px 0; }
        .aff-chip { background: #111; color: #fff; font-size: 0.7rem; padding: 6px 14px; border-radius: 20px; text-transform: uppercase; font-weight: 700; border: 1px solid #333; }

        .comp-preview { border: 1px solid var(--border); background: #080808; margin-bottom: 60px; position: relative; }
        .preview-iframe { width: 100%; height: 600px; border: none; display: block; }
        
        .code-block { border: 1px solid var(--border); background: #050505; }
        .code-header { padding: 15px 30px; border-bottom: 1px solid var(--border); background: #0a0a0a; color: #555; font-size: 0.7rem; font-weight: 900; font-family: var(--font-mono); }
        pre { padding: 40px; color: #4ade80; font-family: var(--font-mono); font-size: 0.85rem; overflow-x: auto; white-space: pre-wrap; word-break: break-all; }

        @media (max-width: 900px) {
            .sidebar { width: 100%; height: auto; position: relative; border-right: none; }
            .main { margin-left: 0; }
        }
    </style>
</head>
<body>
    <div class="layout">
        <aside class="sidebar">
            <div class="sidebar-header"><div class="label">ENGINEERING SPEC</div><h1>USUI STUDIO</h1></div>
            <nav style="margin-top: 60px"><div class="label">NAVIGATION</div><ul class="nav-list"><li><a href="#cover">00 // OVERVIEW</a></li>${componentItems.map((c, i) => `<li><a href="#${c.id}">${String(i+1).padStart(2, '0')} // ${c.name}</a></li>`).join('')}</ul></nav>
        </aside>
        <main class="main">
            <section id="cover" class="section-cover"><div class="label">IDENTITY // DNA_v1.3</div><h1 class="cover-title">${session.styleTheme}</h1><div class="cover-info"><div><div class="label">SYSTEM_GUIDE</div><div class="strategy">${session.designLanguage}</div></div><div><div class="label">METADATA</div><div style="margin-top: 20px"><span class="label" style="display:block; color:#333">DATE</span><span style="font-weight:900">${new Date(session.timestamp).toLocaleDateString()}</span></div></div></div></section>
            ${componentItems.map(c => `
            <section id="${c.id}" class="component-section">
                <div class="comp-header"><div class="label">MODULE_ID: ${c.id.toUpperCase()}</div><h2>${c.name}</h2><p>${c.description}</p>
                <div class="affordance-list">${c.affordances.map(a => `<span class="aff-chip">${a}</span>`).join('')}</div></div>
                <div class="comp-preview"><iframe class="preview-iframe" srcdoc="${c.srcDoc.replace(/"/g, '&quot;')}" sandbox="allow-scripts allow-same-origin"></iframe></div>
                <div class="code-block"><div class="code-header">SOURCE_CODE_DNA</div><pre><code>${c.html.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</code></pre></div>
            </section>`).join('')}
        </main>
    </div>
    <script id="usui-session-data" type="application/json">${JSON.stringify(session)}</script>
</body>
</html>`;

      const b = new Blob([doc], { type: 'text/html' });
      const u = URL.createObjectURL(b);
      const a = document.createElement('a');
      a.href = u; a.download = `usui-spec-${session.styleTheme.toLowerCase().replace(/\s+/g, '-')}.html`;
      a.click();
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      if (!f) return;
      const r = new FileReader();
      r.onload = (ev) => {
          const c = ev.target?.result as string;
          const m = c.match(/<script id="usui-session-data" type="application\/json">([\s\S]*?)<\/script>/i);
          if (m) {
              const s = JSON.parse(m[1]);
              setDesignSessions(prev => [...prev, s]);
              setCurrentSessionIndex(designSessions.length);
          }
      };
      r.readAsText(f);
  };

  return (
    <>
        <div className="top-nav"><div className="brand" onClick={() => window.location.reload()}>USUI STUDIO</div></div>
        <SideDrawer isOpen={drawerState.isOpen} onClose={() => setDrawerState(s => ({...s, isOpen: false}))} title={drawerState.title}><pre className="code-block"><code>{drawerState.data}</code></pre></SideDrawer>
        <RemixModal 
            isOpen={!!activeRemixVariation} 
            onClose={() => setActiveRemixVariation(null)} 
            componentName={activeRemixVariation?.componentName || ''} 
            initialAffordances={activeRemixVariation?.initialAffordances || []}
            onConfirm={handleConfirmRemix} 
        />
        
        <input type="file" ref={globalImportRef} hidden accept=".html" onChange={handleImport} />
        <input type="file" ref={imageInputRef} hidden accept="image/*" onChange={(e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const r = new FileReader();
            r.onload = ev => setSelectedImage(ev.target?.result as string);
            r.readAsDataURL(f);
        }} />

        {focusedVariationId && currentSession && (
            <FocusStage variation={currentSession.variations.find(v => v.id === focusedVariationId)!} component={currentSession.architecture.find(a => a.id === currentSession.variations.find(v => v.id === focusedVariationId)!.componentId)!} onClose={() => setFocusedVariationId(null)} onViewSource={() => setDrawerState({isOpen: true, mode: 'code', title: 'SOURCE', data: currentSession.variations.find(v => v.id === focusedVariationId)!.html})} />
        )}

        <div className="immersive-app">
            <DottedGlowBackground color="rgba(255, 255, 255, 0.02)" glowColor="rgba(255, 255, 255, 0.1)" />
            <div className="stage-container">
                {!currentSession ? (
                    <div className="empty-state">
                        <div className="empty-content">
                            <h1 className="hero-text"><span className="hero-main">USUI</span><span className="hero-sub">Design Studio</span></h1>
                            <div className="landing-actions">
                               <button className="main-btn" onClick={() => handleApplyStyle(INITIAL_PLACEHOLDERS[placeholderIndex])}>RANDOM SPICE</button>
                               <button className="main-btn ghost" onClick={() => globalImportRef.current?.click()}>IMPORT STYLE GUIDE</button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="session-group">
                        <div className="session-context-header">
                            <div className="manifesto-header">
                                <div className="manifesto-col">
                                    <div className="context-label">SYSTEM_DNA</div>
                                    <div className="token-actions-row">
                                        <input className="context-theme-input" value={currentSession.styleTheme} onChange={(e) => setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, styleTheme: e.target.value } : s))} />
                                        <button className="synth-system-btn" onClick={handleMaterializeSystem} disabled={isSystemSynthesizing}>{isSystemSynthesizing ? <ThinkingIcon /> : <SparklesIcon />} MATERIALIZE ALL</button>
                                    </div>
                                    <div className="context-label" style={{ marginTop: '20px' }}>DESIGN_STRATEGY</div>
                                    <textarea className="context-strategy-textarea" value={currentSession.designLanguage} onChange={(e) => setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, designLanguage: e.target.value } : s))} />
                                </div>
                                
                                <div className="arch-col">
                                    <div className="context-label">SYSTEM_ARCHITECTURE // <span style={{ cursor: 'pointer', color: '#fff' }} onClick={handleAddModule}>+ ADD_MODULE</span></div>
                                    <div className="arch-list">
                                        {currentSession.architecture.map(a => (
                                            <div key={a.id} className="arch-item">
                                                <div className="arch-item-main">
                                                    <input className="arch-name-input" value={a.name} onChange={e => handleUpdateArch(a.id, 'name', e.target.value)} />
                                                    <button className="arch-delete-btn" onClick={() => handleDeleteModule(a.id)}><TrashIcon /></button>
                                                </div>
                                                <input className="arch-desc-input" value={a.description} onChange={e => handleUpdateArch(a.id, 'description', e.target.value)} />
                                                <div className="affordance-row-editable">
                                                    {a.affordances.map((aff, idx) => (
                                                        <span key={idx} className="affordance-chip-edit" onClick={() => handleToggleAffordance(a.id, aff)}>
                                                            {aff} <XIcon />
                                                        </span>
                                                    ))}
                                                    <button className="add-aff-btn" onClick={() => {
                                                        const fresh = prompt("New affordance (e.g. 'Hover glow', 'Scroll snap'):");
                                                        if (fresh) handleUpdateArch(a.id, 'affordances', [...a.affordances, fresh]);
                                                    }}>+ AFFORDANCE</button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="artifact-grid">
                            {currentSession.variations.map(v => {
                                const arch = currentSession.architecture.find(a => a.id === v.componentId)!;
                                return <ComponentCard key={v.id} variation={v} component={arch} isLoading={isLoading || isSystemSynthesizing} onCodeClick={() => setDrawerState({isOpen: true, mode: 'code', title: arch.name, data: v.html})} onPreviewClick={() => setFocusedVariationId(v.id)} onDownload={() => {}} onImport={html => setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, variations: s.variations.map(x => x.id === v.id ? { ...x, html, status: 'complete' } : x) } : s))} onReroll={() => {
                                    if (v.status === 'pending') {
                                        setDesignSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, variations: s.variations.map(x => x.id === v.id ? { ...x, status: 'streaming', html: '' } : x) } : s));
                                        generateVariation(v.id, arch, currentSession.id);
                                    } else {
                                        setActiveRemixVariation({ id: v.id, componentName: arch.name, currentHtml: v.html, initialAffordances: arch.affordances });
                                    }
                                }} />;
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
                    {!inputValue && !isLoading && !selectedImage && <div className="animated-placeholder">INITIATE_SYSTEM: {INITIAL_PLACEHOLDERS[placeholderIndex]}</div>}
                    {selectedImage && <div className="img-chip"><img src={selectedImage} alt="seed" /><button onClick={() => setSelectedImage(null)}><XIcon /></button></div>}
                    {!isLoading ? (
                        <div style={{ display: 'flex', flex: 1, alignItems: 'center' }}>
                          <input ref={inputRef} value={inputValue} onChange={e => setInputValue(e.target.value)} onPaste={e => {
                              const item = e.clipboardData?.items[0];
                              if (item?.type.includes('image')) {
                                  const r = new FileReader();
                                  r.onload = ev => setSelectedImage(ev.target?.result as string);
                                  r.readAsDataURL(item.getAsFile()!);
                              }
                          }} onKeyDown={e => {
                              if (e.key === 'Enter') handleApplyStyle();
                              if (e.key === 'Tab' && !inputValue) { e.preventDefault(); setInputValue(INITIAL_PLACEHOLDERS[placeholderIndex]); }
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
