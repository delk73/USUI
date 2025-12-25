
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import { GoogleGenAI } from '@google/genai';
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom/client';

import { DesignComponent, ComponentVariation, DesignSession, UserStyle } from './types';
import { CORE_COMPONENT_LIBRARY, INITIAL_PLACEHOLDERS } from './constants';
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
    TrashIcon
} from './components/Icons';

// Retro Defragmenter Animation
const RetroDefragLoader = () => {
  const [blocks, setBlocks] = useState<number[]>(new Array(100).fill(0));

  useEffect(() => {
    const interval = setInterval(() => {
      setBlocks(prev => prev.map(() => {
        const rand = Math.random();
        if (rand > 0.95) return 1; // Processed (Green)
        if (rand > 0.90) return 2; // Reading (White)
        if (rand > 0.85) return 3; // Fragmented (Red)
        return 0; // Empty/Background
      }));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="defrag-container">
      <div className="defrag-grid">
        {blocks.map((type, i) => (
          <div key={i} className={`defrag-block type-${type}`} />
        ))}
      </div>
      <div className="defrag-label">SYNTHESIZING_CLUSTER_ALLOCATION...</div>
    </div>
  );
};

// Simple Modal for Remix Notes
const RemixModal = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    componentName 
}: { 
    isOpen: boolean, 
    onClose: () => void, 
    onConfirm: (notes: string) => void,
    componentName: string
}) => {
    const [notes, setNotes] = useState('');
    const inputRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (isOpen) {
            setNotes('');
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="drawer-overlay" onClick={onClose}>
            <div className="remix-modal" onClick={e => e.stopPropagation()}>
                <div className="remix-modal-header">
                    <div className="context-label">REFINEMENT NOTES</div>
                    <div className="remix-comp-name">{componentName}</div>
                </div>
                <textarea 
                    ref={inputRef}
                    className="remix-textarea"
                    placeholder="Describe changes (e.g. 'More dramatic shadows', 'Smaller typography', 'Invert colors')..."
                    value={notes}
                    onChange={e => setNotes(e.target.value)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                            onConfirm(notes);
                        }
                    }}
                />
                <div className="remix-modal-footer">
                    <button className="remix-cancel" onClick={onClose}>CANCEL</button>
                    <button className="remix-submit" onClick={() => onConfirm(notes)}>
                        SYNTHESIZE REVISION
                    </button>
                </div>
            </div>
        </div>
    );
};

// Component Card with Local Import/Export/Reroll
const ComponentCard = React.memo(({ 
    variation, 
    component,
    onCodeClick,
    onDownload,
    onImport,
    onReroll,
    isLoading,
}: { 
    variation: ComponentVariation, 
    component: DesignComponent, 
    onCodeClick: () => void,
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
                * { box-sizing: border-box; }
            </style>
        `;
        return `${baseStyle}${variation.html}`;
    }, [variation.html]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            const match = content.match(/<body>([\s\S]*?)<\/body>/i);
            const html = match ? match[1].trim() : content;
            onImport(html);
        };
        reader.readAsText(file);
    };

    return (
        <div className={`artifact-card ${isStreaming ? 'generating' : ''} ${isPending ? 'pending' : ''} ${isError ? 'error-state' : ''}`}>
            <div className="artifact-header">
                <div className="card-title">
                    <div className="comp-id">MOD_{component.id.split('-')[1]?.toUpperCase() || 'SYS'}</div>
                    <div className="comp-name">{component.name}</div>
                </div>
                <div className="card-actions">
                  <button 
                    className="action-btn" 
                    onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                    title="Import Prior Export"
                  >
                    <ArrowUpIcon />
                  </button>
                  <input type="file" ref={fileInputRef} hidden accept=".html" onChange={handleFileChange} />
                  <button 
                    className="action-btn reroll-btn" 
                    onClick={(e) => { e.stopPropagation(); onReroll(); }} 
                    disabled={isLoading || isStreaming}
                    title="Refine with Notes"
                  >
                    <RefreshIcon />
                  </button>
                </div>
            </div>
            <div className="artifact-card-inner" onClick={!isPending ? onCodeClick : undefined}>
                {isPending && (
                    <div className="pending-overlay">
                        <div className="pending-content">
                            <p className="comp-desc">{component.description}</p>
                            <button className="synth-trigger-btn" onClick={onReroll} disabled={isLoading}>
                                {isLoading ? <ThinkingIcon /> : <SparklesIcon />}
                                SYNTHESIZE MODULE
                            </button>
                        </div>
                    </div>
                )}
                {isStreaming && (
                    <div className="generating-overlay">
                        {!variation.html ? (
                          <RetroDefragLoader />
                        ) : (
                          <pre className="code-stream-preview">{variation.html}</pre>
                        )}
                    </div>
                )}
                {isError && (
                    <div className="error-overlay">
                        <div className="error-content">
                            <span className="error-icon">!</span>
                            <span className="error-text">SYNTHESIS FAILURE</span>
                            <button className="retry-inline" onClick={(e) => { e.stopPropagation(); onReroll(); }}>RETRY</button>
                        </div>
                    </div>
                )}
                {!isError && !isPending && (
                    <iframe 
                        srcDoc={normalizedHtml} 
                        title={variation.id} 
                        sandbox="allow-scripts allow-forms allow-modals allow-popups allow-presentation allow-same-origin"
                        className="artifact-iframe"
                    />
                )}
            </div>
            {!isPending && (
                <div className="artifact-footer">
                    <button onClick={(e) => { e.stopPropagation(); onDownload(); }} className="inspector-btn">
                        <DownloadIcon /> DOWNLOAD MODULE
                    </button>
                </div>
            )}
        </div>
    );
});

function App() {
  const [designSessions, setDesignSessions] = useState<DesignSession[]>([]);
  const [currentSessionIndex, setCurrentSessionIndex] = useState<number>(-1);
  const [userStyles, setUserStyles] = useState<UserStyle[]>(() => {
    const saved = localStorage.getItem('usui_user_styles');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [inputValue, setInputValue] = useState<string>('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholders] = useState<string[]>(INITIAL_PLACEHOLDERS);

  // Remix Modal state
  const [activeRemixVariation, setActiveRemixVariation] = useState<{ id: string, componentName: string, currentHtml: string } | null>(null);
  
  const [drawerState, setDrawerState] = useState<{
      isOpen: boolean;
      mode: 'code' | 'config' | null;
      title: string;
      data: any; 
  }>({ isOpen: false, mode: null, title: '', data: null });

  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { localStorage.setItem('usui_user_styles', JSON.stringify(userStyles)); }, [userStyles]);
  useEffect(() => { inputRef.current?.focus(); }, []);

  useEffect(() => {
    const interval = setInterval(() => {
        setPlaceholderIndex(prev => (prev + 1) % placeholders.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [placeholders.length]);

  const extractCode = (raw: string): string => {
      const match = raw.match(/```html\n?([\s\S]*?)\n?```/) || raw.match(/```\n?([\s\S]*?)\n?```/);
      if (match) return match[1].trim();
      return raw.replace(/^(Here is|This is|Okay|Sure|Certainly)[\s\S]*?\n\n/i, '').trim();
  };

  const generateVariation = async (
    variationId: string, 
    comp: DesignComponent, 
    styleTheme: string, 
    designLanguage: string,
    sessionId: string,
    notes: string = '',
    currentHtml: string = '',
    imagePart: any = null,
    retryCount = 0
  ) => {
      const MAX_RETRIES = 3;
      try {
          const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
          const prompt = `
You are the USUI Design Studio AI. Create or refine a high-fidelity system component.
COMPONENT: "${comp.name}"
CORE PURPOSE: ${comp.description}

**SYSTEM MANIFESTO:**
THEME: "${styleTheme}"
TECHNICAL SPECIFICATION:
${designLanguage}

${notes ? `**REFINEMENT REQUEST:**\n"${notes}"` : ''}
${currentHtml ? `**CURRENT IMPLEMENTATION TO BE UPDATED:**\n\`\`\`html\n${currentHtml}\n\`\`\`` : ''}

**STRICT GENERATION RULES:**
- Output ONLY the updated HTML/CSS code. 
- NO preamble, NO explanations.
- Wrap code in \`\`\`html blocks.
- Ensure the component is centered and responsive.
- Use sharp, brutalist geometry. No soft corners unless specified in strategy.
- Focus on high contrast and dramatic typographic scaling.
          `.trim();

          const responseStream = await ai.models.generateContentStream({
              model: 'gemini-3-pro-preview',
              contents: imagePart 
                  ? [{ parts: [imagePart, { text: prompt }], role: "user" }] 
                  : [{ parts: [{ text: prompt }], role: "user" }],
          });

          let accumulatedRaw = '';
          for await (const chunk of responseStream) {
              const text = chunk.text;
              if (typeof text === 'string') {
                  accumulatedRaw += text;
                  setDesignSessions(prev => prev.map(sess => 
                      sess.id === sessionId ? {
                          ...sess,
                          variations: sess.variations.map(v => 
                              v.id === variationId ? { ...v, html: extractCode(accumulatedRaw) } : v
                          )
                      } : sess
                  ));
              }
          }

          const finalHtml = extractCode(accumulatedRaw);

          setDesignSessions(prev => prev.map(sess => 
              sess.id === sessionId ? {
                  ...sess,
                  variations: sess.variations.map(v => 
                      v.id === variationId ? { ...v, html: finalHtml, status: 'complete', notes } : v
                  )
              } : sess
          ));
      } catch (e: any) {
          console.error("Design failure on component:", comp.name, e);
          if (e.message?.includes('429') && retryCount < MAX_RETRIES) {
              await sleep(Math.pow(2, retryCount) * 1000);
              return generateVariation(variationId, comp, styleTheme, designLanguage, sessionId, notes, currentHtml, imagePart, retryCount + 1);
          }
          setDesignSessions(prev => prev.map(sess => 
              sess.id === sessionId ? {
                  ...sess,
                  variations: sess.variations.map(v => v.id === variationId ? { ...v, status: 'error' } : v)
              } : sess
          ));
      }
  };

  const handleApplyStyle = useCallback(async (manualPrompt?: string, manualSpec?: string) => {
    const styleSpice = manualPrompt || inputValue;
    const trimmedInput = styleSpice.trim();
    if (!trimmedInput && !selectedImage || isLoading) return;

    const imageToUse = selectedImage;
    if (!manualPrompt) {
        setInputValue('');
        setSelectedImage(null);
    }

    setIsLoading(true);
    const sessionId = generateId();

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        let designLanguage = manualSpec;
        let finalTheme = trimmedInput;

        // Vision-to-Strategy Pass
        if (imageToUse) {
            const visionPrompt = `
                Analyze the visual aesthetic of this image. 
                Distill it into a professional, ultra-concise technical Design Strategy.
                Provide:
                1. TOKENS: 3-5 keywords (e.g. "Industrial Glass Brutalism").
                2. STRATEGY: A one-sentence technical manifesto. Maximum 20 words. No preamble.
                Format the response exactly as:
                TOKENS: [words]
                STRATEGY: [manifesto]
            `.trim();
            const visionResult = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{inlineData: {data: imageToUse.split(',')[1], mimeType: 'image/png'}}, { text: visionPrompt }] }
            });
            const text = visionResult.text || "";
            const tokenMatch = text.match(/TOKENS:\s*(.*)/i);
            const specMatch = text.match(/STRATEGY:\s*([\s\S]*)/i);
            
            if (tokenMatch) {
                finalTheme = tokenMatch[1].trim() + (trimmedInput ? ` // ${trimmedInput}` : "");
            }
            if (specMatch) {
                designLanguage = specMatch[1].trim();
            }
        }

        if (!designLanguage) {
            const specPrompt = `Distill a highly concise one-sentence Technical Manifesto for: "${finalTheme}". No preamble.`;
            const specResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: imageToUse ? { parts: [{inlineData: {data: imageToUse.split(',')[1], mimeType: 'image/png'}}, { text: specPrompt }] } : specPrompt
            });
            designLanguage = specResponse.text || "Standard System Manifesto";
        }

        const placeholderVariations: ComponentVariation[] = CORE_COMPONENT_LIBRARY.map((comp) => ({
            id: generateId(),
            componentId: comp.id,
            styleName: finalTheme,
            html: "",
            prompt: finalTheme,
            status: 'pending',
        }));

        const newSession: DesignSession = {
            id: sessionId,
            styleTheme: finalTheme,
            designLanguage: designLanguage!,
            timestamp: Date.now(),
            variations: placeholderVariations
        };

        const nextIndex = designSessions.length;
        setDesignSessions(prev => [...prev, newSession]);
        setCurrentSessionIndex(nextIndex);

    } catch (e) {
        console.error("Studio System Crash", e);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, selectedImage, isLoading, designSessions]);

  const handleUpdateStrategy = (newTheme: string) => {
      setDesignSessions(prev => prev.map((s, idx) => 
          idx === currentSessionIndex ? { ...s, styleTheme: newTheme } : s
      ));
  };

  const handleUpdateLanguage = (newLanguage: string) => {
      setDesignSessions(prev => prev.map((s, idx) => 
          idx === currentSessionIndex ? { ...s, designLanguage: newLanguage } : s
      ));
  };

  const handleImportComponent = (variationId: string, html: string) => {
      setDesignSessions(prev => prev.map((sess, idx) => 
          idx === currentSessionIndex ? {
              ...sess,
              variations: sess.variations.map(v => 
                  v.id === variationId ? { ...v, html, status: 'complete' } : v
              )
          } : sess
      ));
  };

  const startReroll = useCallback(async (variationId: string, notes: string = '', currentHtml: string = '') => {
    // Close modal immediately
    setActiveRemixVariation(null);

    const session = designSessions[currentSessionIndex];
    if (!session) return;
    const variation = session.variations.find(v => v.id === variationId);
    if (!variation || variation.status === 'streaming') return;
    const component = CORE_COMPONENT_LIBRARY.find(c => c.id === variation.componentId);
    if (!component) return;

    setDesignSessions(prev => prev.map(sess => 
      sess.id === session.id ? {
        ...sess,
        variations: sess.variations.map(v => v.id === variationId ? { ...v, status: 'streaming', html: '' } : v)
      } : sess
    ));
    
    await generateVariation(variationId, component, session.styleTheme, session.designLanguage, session.id, notes, currentHtml);
  }, [designSessions, currentSessionIndex]);

  const handleRerollComponentRequest = useCallback((variationId: string) => {
      const session = designSessions[currentSessionIndex];
      const variation = session?.variations.find(v => v.id === variationId);
      const component = CORE_COMPONENT_LIBRARY.find(c => c.id === variation?.componentId);
      
      if (variation && component) {
          if (variation.status === 'pending') {
              startReroll(variationId);
          } else {
              setActiveRemixVariation({ 
                id: variationId, 
                componentName: component.name,
                currentHtml: variation.html 
              });
          }
      }
  }, [designSessions, currentSessionIndex, startReroll]);

  const handleDownloadComponent = useCallback((variation: ComponentVariation) => {
      const component = CORE_COMPONENT_LIBRARY.find(c => c.id === variation.componentId);
      const fileName = `usui-${variation.styleName}-${component?.name || 'module'}.html`.toLowerCase().replace(/\s+/g, '-');
      
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${component?.name || 'USUI Module'}</title><style>:root { color-scheme: dark; } body { margin: 0; padding: 2rem; display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #000; color: #fff; font-family: 'Inter', system-ui, sans-serif; } * { box-sizing: border-box; }</style></head><body>${variation.html}</body></html>`;
      const blob = new Blob([htmlContent], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);
  }, []);

  const handleExportSystemJSON = useCallback(() => {
      const session = designSessions[currentSessionIndex];
      if (!session) return;

      const systemData = {
          version: "USUI_SYS_PROVENANCE_1.1",
          metadata: {
              theme_name: session.styleTheme,
              theme_prompt: session.styleTheme,
              generated_at: new Date(session.timestamp).toISOString(),
              session_id: session.id
          },
          design_tokens: { specification: session.designLanguage },
          variations: session.variations.map(v => ({ ...v, component_meta: CORE_COMPONENT_LIBRARY.find(c => c.id === v.componentId) }))
      };

      const blob = new Blob([JSON.stringify(systemData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usui-system-${session.styleTheme.toLowerCase().replace(/ /g, '-')}.json`;
      a.click();
      URL.revokeObjectURL(url);
  }, [designSessions, currentSessionIndex]);

  const currentSession = designSessions[currentSessionIndex];
  const hasStarted = designSessions.length > 0 || isLoading;

  return (
    <>
        <div className="top-nav">
            <div className="brand" onClick={() => window.location.reload()}>USUI STUDIO</div>
        </div>

        <SideDrawer isOpen={drawerState.isOpen} onClose={() => setDrawerState(s => ({...s, isOpen: false}))} title={drawerState.title}>
            <pre className="code-block"><code>{drawerState.data}</code></pre>
        </SideDrawer>

        <RemixModal 
            isOpen={!!activeRemixVariation} 
            onClose={() => setActiveRemixVariation(null)}
            componentName={activeRemixVariation?.componentName || ''}
            onConfirm={(notes) => activeRemixVariation && startReroll(activeRemixVariation.id, notes, activeRemixVariation.currentHtml)}
        />

        <div className="immersive-app">
            <DottedGlowBackground color="rgba(255, 255, 255, 0.02)" glowColor="rgba(255, 255, 255, 0.1)" />

            <div className="stage-container">
                {!hasStarted ? (
                     <div className="empty-state">
                         <div className="empty-content">
                             <h1 className="hero-text">
                                <span className="hero-main">USUI</span>
                                <span className="hero-sub">Design Studio</span>
                             </h1>
                             <div className="landing-actions">
                                <button className="main-btn" onClick={() => handleApplyStyle(placeholders[placeholderIndex])}>RANDOM SPICE</button>
                                <button className="main-btn ghost" onClick={() => setDrawerState({isOpen: true, mode: 'config', title: 'SYSTEM CONFIG', data: JSON.stringify(CORE_COMPONENT_LIBRARY, null, 2)})}>CONFIG</button>
                             </div>

                             {userStyles.length > 0 && (
                                 <div className="presets-section">
                                     <div className="section-label">YOUR SYSTEMS</div>
                                     <div className="promoted-styles-grid">
                                         {userStyles.map(style => (
                                             <button key={style.id} className="style-preset-card user-preset" onClick={() => {
                                                 const nextIndex = designSessions.length;
                                                 setDesignSessions(prev => [...prev, {
                                                    id: generateId(),
                                                    styleTheme: style.name,
                                                    designLanguage: style.designLanguage,
                                                    timestamp: Date.now(),
                                                    variations: style.variations
                                                 }]);
                                                 setCurrentSessionIndex(nextIndex);
                                             }}>
                                                 <span className="style-name">{style.name}</span>
                                                 <span className="style-delete" onClick={(e) => { e.stopPropagation(); setUserStyles(v => v.filter(s => s.id !== style.id)); }}><TrashIcon /></span>
                                             </button>
                                         ))}
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>
                ) : (
                    <div className="session-group">
                        {currentSession && (
                            <div className="session-context-header">
                                <div className="manifesto-header">
                                    <div className="manifesto-col-tokens">
                                        <div className="context-label">SYSTEM_TOKENS</div>
                                        <input 
                                            className="context-theme-input" 
                                            value={currentSession.styleTheme} 
                                            onChange={(e) => handleUpdateStrategy(e.target.value)}
                                            placeholder="DNA TOKENS"
                                        />
                                        <div className="context-details">
                                            <span className="mono">ID: {currentSession.id.toUpperCase()}</span>
                                            <span className="mono">V1.0</span>
                                        </div>
                                    </div>
                                    <div className="manifesto-col-strategy">
                                        <div className="context-label">DESIGN_STRATEGY</div>
                                        <textarea 
                                            className="context-strategy-textarea"
                                            value={currentSession.designLanguage}
                                            onChange={(e) => handleUpdateLanguage(e.target.value)}
                                            placeholder="A distilled technical manifesto..."
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                        <div className="artifact-grid">
                            {(currentSession?.variations || []).map((variation) => {
                                const component = CORE_COMPONENT_LIBRARY.find(c => c.id === variation.componentId)!;
                                return (
                                    <ComponentCard 
                                        key={variation.id} 
                                        variation={variation} 
                                        component={component}
                                        isLoading={isLoading}
                                        onCodeClick={() => setDrawerState({isOpen: true, mode: 'code', title: component.name, data: variation.html})}
                                        onDownload={() => handleDownloadComponent(variation)}
                                        onImport={(html) => handleImportComponent(variation.id, html)}
                                        onReroll={() => handleRerollComponentRequest(variation.id)}
                                    />
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>

            <div className={`bottom-controls ${hasStarted ? 'visible' : ''}`}>
                 <div className="control-btns">
                    <button onClick={() => {
                        const session = designSessions[currentSessionIndex];
                        if (!session) return;
                        const newStyle: UserStyle = {
                            id: generateId(),
                            name: session.styleTheme,
                            prompt: session.styleTheme,
                            designLanguage: session.designLanguage,
                            variations: JSON.parse(JSON.stringify(session.variations)), 
                            timestamp: Date.now()
                        };
                        setUserStyles(prev => [newStyle, ...prev]);
                    }} title="Save session to Local Storage"><SparklesIcon /> PERSIST SESSION</button>
                    <button onClick={handleExportSystemJSON} title="Export machine-readable JSON"><DownloadIcon /> EXPORT SYSTEM (.JSON)</button>
                    <button onClick={() => {
                        const themeName = currentSession?.styleTheme || "Style Guide";
                        const fullGuideHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>MASTER BOOK - ${themeName.toUpperCase()}</title><link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet"><style>:root { --bg: #ffffff; --text: #000000; --border: #000000; --accent: #000000; } body { background: var(--bg); color: var(--text); font-family: 'Inter', sans-serif; margin: 0; padding: 0; line-height: 1.5; } .page { min-height: 100vh; padding: 80px; box-sizing: border-box; border-bottom: 2px solid var(--border); page-break-after: always; display: flex; flex-direction: column; } .container { max-width: 1200px; margin: 0 auto; width: 100%; flex: 1; } h1, h2, h3 { font-weight: 900; text-transform: uppercase; margin: 0; letter-spacing: -0.05em; } .mono { font-family: 'Roboto Mono', monospace; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.1em; } .cover { justify-content: space-between; background: #000; color: #fff; } .cover h1 { font-size: 12rem; line-height: 0.8; } .cover-footer { display: flex; justify-content: space-between; align-items: flex-end; } .specs-content { font-family: 'Roboto Mono', monospace; white-space: pre-wrap; font-size: 0.9rem; padding: 40px; border: 2px solid #000; background: #f5f5f5; margin-top: 40px; } .comp-preview { flex: 1; background: #fff; border: 2px solid #000; display: flex; align-items: center; justify-content: center; min-height: 400px; margin: 40px 0; }</style></head><body><section class="page cover"><div class="container"><p class="mono">SYSTEM DESIGN MANIFESTO</p><h1>MASTER BOOK</h1></div><div class="container cover-footer"><div class="sys-id">USUI_${themeName.toUpperCase().replace(/ /g, '_')}</div><div class="mono">${new Date().toLocaleDateString()}</div></div></section><section class="page"><div class="container"><h2>DESIGN LANGUAGE</h2><div class="specs-content">${currentSession?.designLanguage || ''}</div></div></section>${(currentSession?.variations || []).map(v => `<section class="page"><div class="container"><h2>${CORE_COMPONENT_LIBRARY.find(c => c.id === v.componentId)?.name}</h2><div class="comp-preview">${v.html}</div><pre><code>${v.html.replace(/</g, '&lt;')}</code></pre></div></section>`).join('')}</body></html>`;
                        const blob = new Blob([fullGuideHtml], { type: 'text/html' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = `usui-master-${themeName.toLowerCase().replace(/ /g,'-')}.html`;
                        a.click();
                        URL.revokeObjectURL(url);
                    }} className="export-btn" title="Export High-Fidelity Design Book"><DownloadIcon /> EXPORT MASTER BOOK</button>
                 </div>
            </div>

            <div className="floating-input-container">
                <div className={`input-wrapper ${isLoading ? 'loading' : ''}`}>
                    {!inputValue && !isLoading && !selectedImage && (
                        <div className="animated-placeholder">
                            <span className="placeholder-text">INITIATE NEW SYSTEM: {placeholders[placeholderIndex]}</span>
                            <span className="tab-hint">TAB</span>
                        </div>
                    )}
                    {selectedImage && <div className="img-chip"><img src={selectedImage} /><button onClick={() => setSelectedImage(null)}><XIcon /></button></div>}
                    {!isLoading ? (
                        <>
                            <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => {
                                if (e.key === 'Enter') handleApplyStyle();
                                if (e.key === 'Tab' && !inputValue) { e.preventDefault(); setInputValue(placeholders[placeholderIndex]); }
                            }} onPaste={(e) => {
                                const items = e.clipboardData.items;
                                for (let i = 0; i < items.length; i++) {
                                    if (items[i].type.indexOf('image') !== -1) {
                                        const blob = items[i].getAsFile();
                                        if (blob) {
                                            const reader = new FileReader();
                                            reader.onloadend = () => setSelectedImage(reader.result as string);
                                            reader.readAsDataURL(blob);
                                        }
                                    }
                                }
                            }} />
                            <button className="img-btn" onClick={() => fileInputRef.current?.click()} title="Upload Moodboard Image"><ImageIcon /></button>
                            <input ref={fileInputRef} type="file" hidden onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) { const r = new FileReader(); r.onloadend = () => setSelectedImage(r.result as string); r.readAsDataURL(f); }
                            }} />
                        </>
                    ) : (
                        <div className="loading-state">SYNTHESIZING DESIGN SYSTEM... <ThinkingIcon /></div>
                    )}
                    <button className="go-btn" onClick={() => handleApplyStyle()} disabled={isLoading || !inputValue.trim() && !selectedImage}><ArrowUpIcon /></button>
                </div>
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
