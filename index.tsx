
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
const RetroDefragLoader = ({ label }: { label?: string }) => {
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
      <div className="defrag-label">{label || 'SYNTHESIZING_CLUSTER_ALLOCATION...'}</div>
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
                          <RetroDefragLoader label={variation.notes === '__RETRYING__' ? 'WAITING_FOR_QUOTA_RESET...' : undefined} />
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
  const [isSystemSynthesizing, setIsSystemSynthesizing] = useState<boolean>(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [placeholders] = useState<string[]>(INITIAL_PLACEHOLDERS);

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
  ): Promise<void> => {
      const MAX_RETRIES = 6;
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

${notes && notes !== '__RETRYING__' ? `**REFINEMENT REQUEST:**\n"${notes}"` : ''}
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
              model: 'gemini-3-flash-preview',
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
                      v.id === variationId ? { ...v, html: finalHtml, status: 'complete', notes: notes === '__RETRYING__' ? '' : notes } : v
                  )
              } : sess
          ));
      } catch (e: any) {
          console.error("Design failure on component:", comp.name, e);
          const errorText = e.message || '';
          const isRateLimit = errorText.includes('429') || errorText.includes('RESOURCE_EXHAUSTED') || errorText.includes('quota') || e.status === 429;
          
          if (isRateLimit && retryCount < MAX_RETRIES) {
              const waitTime = Math.pow(2, retryCount) * 10000;
              console.warn(`Quota hit for ${comp.name}. Cooling down for ${waitTime}ms...`);
              
              setDesignSessions(prev => prev.map(sess => 
                sess.id === sessionId ? {
                    ...sess,
                    variations: sess.variations.map(v => v.id === variationId ? { ...v, status: 'streaming', html: '', notes: '__RETRYING__' } : v)
                } : sess
              ));

              await sleep(waitTime);
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

  const handleDownloadComponent = useCallback((variation: ComponentVariation) => {
    const component = CORE_COMPONENT_LIBRARY.find(c => c.id === variation.componentId);
    const fileName = `usui-${component?.name.toLowerCase().replace(/ /g, '-') || 'component'}.html`;
    const baseStyle = `
        <style>
            :root { color-scheme: dark; }
            body { 
                margin: 0; 
                padding: 2rem; 
                display: flex; 
                align-items: center; 
                justify-content: center; 
                min-height: 100vh; 
                background: #000; 
                color: #fff;
                font-family: 'Inter', system-ui, sans-serif;
            }
            * { box-sizing: border-box; }
        </style>
    `;
    const fullHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${component?.name || 'Component'}</title>${baseStyle}</head><body>${variation.html}</body></html>`;
    const blob = new Blob([fullHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
  }, []);

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

        if (imageToUse) {
            const visionPrompt = `Analyze visual aesthetic. Provide TOKENS: [words] and STRATEGY: [manifesto] (20 words max).`;
            const visionResult = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: { parts: [{inlineData: {data: imageToUse.split(',')[1], mimeType: 'image/png'}}, { text: visionPrompt }] }
            });
            const text = visionResult.text || "";
            const tokenMatch = text.match(/TOKENS:\s*(.*)/i);
            const specMatch = text.match(/STRATEGY:\s*([\s\S]*)/i);
            if (tokenMatch) finalTheme = tokenMatch[1].trim();
            if (specMatch) designLanguage = specMatch[1].trim();
        }

        if (!designLanguage) {
            const specResponse = await ai.models.generateContent({
                model: 'gemini-3-flash-preview',
                contents: `Provide a one-sentence Technical Design Manifesto for: "${finalTheme}". No preamble.`
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

        setDesignSessions(prev => [...prev, newSession]);
        setCurrentSessionIndex(designSessions.length);
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  }, [inputValue, selectedImage, isLoading, designSessions.length]);

  const startReroll = useCallback(async (variationId: string, notes: string = '', currentHtml: string = '') => {
    setActiveRemixVariation(null);
    const session = designSessions[currentSessionIndex];
    if (!session) return;
    const variation = session.variations.find(v => v.id === variationId);
    if (!variation) return;
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

  const handleSynthesizeSystem = useCallback(async () => {
      if (isSystemSynthesizing) return;
      const session = designSessions[currentSessionIndex];
      if (!session) return;

      setIsSystemSynthesizing(true);
      const pendingVariations = session.variations.filter(v => v.status === 'pending' || v.status === 'error');
      
      for (const variation of pendingVariations) {
          const component = CORE_COMPONENT_LIBRARY.find(c => c.id === variation.componentId);
          if (!component) continue;

          setDesignSessions(prev => prev.map(sess => 
              sess.id === session.id ? {
                  ...sess,
                  variations: sess.variations.map(v => v.id === variation.id ? { ...v, status: 'streaming', html: '' } : v)
              } : sess
          ));

          await generateVariation(variation.id, component, session.styleTheme, session.designLanguage, session.id);
          await sleep(3000); // 3s delay to respect RPM limits
      }
      setIsSystemSynthesizing(false);
  }, [designSessions, currentSessionIndex, isSystemSynthesizing]);

  const handleExportStyleGuide = useCallback(() => {
      const session = designSessions[currentSessionIndex];
      if (!session) return;
      const themeName = session.styleTheme || "Style Guide";
      const timestamp = new Date().toLocaleDateString();
      const allHtml = session.variations.map(v => v.html).join(' ');
      
      const hexMatches = allHtml.match(/#[0-9a-fA-F]{3,6}/g) || [];
      const rgbMatches = allHtml.match(/rgb\(\s*\d+\s*,\s*\d+\s*,\s*\d+\s*\)/g) || [];
      const uniqueColors = Array.from(new Set([...hexMatches, ...rgbMatches])).slice(0, 15);

      const styleGuideHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>USUI — ${themeName.toUpperCase()} — SYSTEM SPEC</title>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;700;900&family=Roboto+Mono:wght@400;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --bg: #000000;
            --text: #ffffff;
            --muted: #666;
            --border: #1a1a1a;
            --accent: #fff;
        }

        * { box-sizing: border-box; }

        body {
            margin: 0; padding: 0;
            background: var(--bg);
            color: var(--text);
            font-family: 'Inter', sans-serif;
            line-height: 1.5;
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
        }

        .container { max-width: 1200px; margin: 0 auto; padding: 0 40px; }

        /* Cover */
        header.cover {
            height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            border-bottom: 2px solid var(--border);
            padding-bottom: 80px;
        }
        .cover-meta { font-family: 'Roboto Mono', monospace; font-size: 0.7rem; letter-spacing: 0.35em; text-transform: uppercase; color: var(--muted); margin-bottom: 15px; }
        .cover-title { font-size: clamp(3rem, 18vw, 15rem); font-weight: 900; margin: 0; letter-spacing: -0.07em; line-height: 0.8; text-transform: uppercase; }
        .cover-footer { margin-top: 80px; display: flex; justify-content: space-between; align-items: flex-end; }
        .theme-name { font-size: 2.5rem; font-weight: 700; text-transform: uppercase; letter-spacing: -0.02em; }

        /* Main Sectioning */
        section { padding: 160px 0; border-bottom: 1px solid var(--border); }
        .section-label { font-family: 'Roboto Mono', monospace; font-size: 0.65rem; text-transform: uppercase; letter-spacing: 0.4em; color: var(--muted); margin-bottom: 60px; display: block; }
        
        .manifesto-block { max-width: 1000px; font-size: 3.5rem; font-weight: 300; line-height: 1.05; letter-spacing: -0.03em; color: #eee; }

        /* Foundations */
        .token-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 24px; }
        .token-card { border: 1px solid var(--border); background: #050505; }
        .swatch { height: 180px; width: 100%; border-bottom: 1px solid var(--border); }
        .token-info { padding: 24px; font-family: 'Roboto Mono'; font-size: 0.75rem; text-transform: uppercase; color: var(--muted); }

        /* Catalog */
        .catalog-item { margin-bottom: 200px; }
        .item-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 40px; border-top: 1px solid var(--border); padding-top: 40px; }
        .item-title { font-size: clamp(2rem, 8vw, 6rem); font-weight: 900; text-transform: uppercase; margin: 0; line-height: 0.9; letter-spacing: -0.04em; }
        .item-desc { color: var(--muted); font-size: 1.1rem; max-width: 500px; margin-top: 20px; font-weight: 400; line-height: 1.4; }
        
        .item-canvas {
            background: #000;
            border: 1px solid var(--border);
            min-height: 600px;
            display: flex;
            position: relative;
            background-image: radial-gradient(circle, #ffffff06 1px, transparent 1px);
            background-size: 40px 40px;
        }

        .canvas-iframe { width: 100%; height: 100%; min-height: 600px; border: none; display: block; }

        .code-reveal {
            margin-top: 40px;
            background: #080808;
            padding: 40px;
            border: 1px solid #111;
            position: relative;
        }
        .copy-button {
            position: absolute;
            top: 30px;
            right: 30px;
            background: #fff;
            color: #000;
            border: none;
            padding: 10px 20px;
            font-family: 'Roboto Mono';
            font-weight: 700;
            font-size: 0.65rem;
            text-transform: uppercase;
            cursor: pointer;
            z-index: 10;
        }

        pre { margin: 0; font-family: 'Roboto Mono', monospace; font-size: 0.85rem; color: #444; line-height: 1.6; white-space: pre-wrap; word-break: break-all; }

        footer { padding: 120px 0; text-align: center; font-family: 'Roboto Mono'; font-size: 0.7rem; color: #222; letter-spacing: 0.3em; border-top: 1px solid var(--border); }

        @media (max-width: 1024px) {
            .cover-title { font-size: 6rem; }
            .manifesto-block { font-size: 2.2rem; }
            .item-title { font-size: 3rem; }
        }
    </style>
</head>
<body>

    <header class="cover">
        <div class="container">
            <div class="cover-meta">USUI DESIGN SYSTEM // MASTER_SPEC_V1.1</div>
            <h1 class="cover-title">STYLE<br>GUIDE</h1>
            <div class="cover-footer">
                <div class="theme-name">${themeName}</div>
                <div class="cover-meta">EXTRACTED: ${timestamp}</div>
            </div>
        </div>
    </header>

    <section id="01">
        <div class="container">
            <span class="section-label">SECTION 01 // STRATEGY</span>
            <div class="manifesto-block">${session.designLanguage}</div>
        </div>
    </section>

    <section id="02">
        <div class="container">
            <span class="section-label">SECTION 02 // FOUNDATIONS</span>
            <div class="token-grid">
                ${uniqueColors.map(c => `
                    <div class="token-card">
                        <div class="swatch" style="background: ${c};"></div>
                        <div class="token-info">${c}</div>
                    </div>
                `).join('')}
            </div>
            
            <div style="margin-top: 120px; border-top: 1px solid var(--border); padding-top: 80px;">
                <span class="section-label">TYPOGRAPHY_CORE</span>
                <div style="font-size: clamp(2rem, 10vw, 8rem); font-weight: 900; line-height: 0.9;">PRIMARY FACE: INTER (900/400)</div>
                <div style="font-family: 'Roboto Mono'; font-size: 2rem; color: var(--muted); margin-top: 30px;">UTILITY: ROBOTO MONO</div>
            </div>
        </div>
    </section>

    <section id="03">
        <div class="container">
            <span class="section-label">SECTION 03 // CATALOG</span>
            
            ${session.variations.filter(v => v.status === 'complete').map(v => {
                const comp = CORE_COMPONENT_LIBRARY.find(c => c.id === v.componentId);
                const encapsulatedHtml = `
                    <!DOCTYPE html>
                    <html>
                        <head>
                            <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
                            <style>
                                :root { color-scheme: dark; }
                                html, body { 
                                    margin: 0; padding: 0; 
                                    height: 100%; width: 100%;
                                    display: flex; align-items: center; justify-content: center; 
                                    background: transparent; color: #fff; 
                                    font-family: 'Inter', sans-serif;
                                    overflow: hidden;
                                }
                                * { box-sizing: border-box; }
                            </style>
                        </head>
                        <body>
                            <div id="wrapper" style="padding: 60px; width: 100%; display: flex; align-items: center; justify-content: center;">
                                ${v.html}
                            </div>
                            <script>
                                function sync() {
                                    const h = document.getElementById('wrapper').scrollHeight;
                                    window.parent.postMessage({ type: 'SYNC_H', h, id: '${v.id}' }, '*');
                                }
                                window.onload = () => { sync(); setTimeout(sync, 500); };
                            </script>
                        </body>
                    </html>
                `.trim();

                return `
                <div class="catalog-item" id="item-${v.id}">
                    <div class="item-header">
                        <div>
                            <h2 class="item-title">${comp?.name}</h2>
                            <p class="item-desc">${comp?.description}</p>
                        </div>
                        <div class="cover-meta">${comp?.id.toUpperCase()}</div>
                    </div>
                    <div class="item-canvas">
                        <iframe 
                            id="iframe-${v.id}"
                            class="canvas-iframe" 
                            srcdoc="${encapsulatedHtml.replace(/"/g, '&quot;')}"
                            scrolling="no"
                        ></iframe>
                    </div>
                    <div class="code-reveal">
                        <button class="copy-button" onclick="copyCode(this, \`item-code-${v.id}\`)">COPY_MODULE</button>
                        <pre id="item-code-${v.id}"><code>${v.html.replace(/</g, '&lt;')}</code></pre>
                    </div>
                </div>
                `;
            }).join('')}
        </div>
    </section>

    <footer>
        <div class="container">
            <p>END OF DOCUMENT // GENERATED BY USUI_ENGINE_V1.1 // SYSTEM_ID: ${session.id.toUpperCase()}</p>
        </div>
    </footer>

    <script>
        // Copy functionality
        function copyCode(btn, id) {
            const code = document.getElementById(id).innerText;
            navigator.clipboard.writeText(code).then(() => {
                const prev = btn.innerText;
                btn.innerText = 'COPIED!';
                setTimeout(() => btn.innerText = prev, 2000);
            });
        }

        // Handle iframe height sync without infinite loops
        window.addEventListener('message', (e) => {
            if (e.data.type === 'SYNC_H') {
                const frame = document.getElementById('iframe-' + e.data.id);
                if (frame) {
                    const finalH = Math.max(600, e.data.h);
                    frame.style.height = finalH + 'px';
                    frame.parentElement.style.minHeight = finalH + 'px';
                }
            }
        });
    </script>
</body>
</html>
      `.trim();
      
      const blob = new Blob([styleGuideHtml], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `usui-guide-${themeName.toLowerCase().replace(/ /g,'-')}.html`;
      a.click();
      URL.revokeObjectURL(url);
  }, [designSessions, currentSessionIndex]);

  const currentSession = designSessions[currentSessionIndex];
  const hasStarted = designSessions.length > 0 || isLoading;

  return (
    <>
        <div className="top-nav"><div className="brand" onClick={() => window.location.reload()}>USUI STUDIO</div></div>
        <SideDrawer isOpen={drawerState.isOpen} onClose={() => setDrawerState(s => ({...s, isOpen: false}))} title={drawerState.title}><pre className="code-block"><code>{drawerState.data}</code></pre></SideDrawer>
        <RemixModal isOpen={!!activeRemixVariation} onClose={() => setActiveRemixVariation(null)} componentName={activeRemixVariation?.componentName || ''} onConfirm={(notes) => activeRemixVariation && startReroll(activeRemixVariation.id, notes, activeRemixVariation.currentHtml)} />
        <div className="immersive-app">
            <DottedGlowBackground color="rgba(255, 255, 255, 0.02)" glowColor="rgba(255, 255, 255, 0.1)" />
            <div className="stage-container">
                {!hasStarted ? (
                     <div className="empty-state">
                         <div className="empty-content">
                             <h1 className="hero-text"><span className="hero-main">USUI</span><span className="hero-sub">Design Studio</span></h1>
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
                                                 setDesignSessions(prev => [...prev, { id: generateId(), styleTheme: style.name, designLanguage: style.designLanguage, timestamp: Date.now(), variations: style.variations }]);
                                                 setCurrentSessionIndex(designSessions.length);
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
                                        <div className="token-actions-row">
                                            <input className="context-theme-input" value={currentSession.styleTheme} onChange={(e) => setDesignSessions(prev => prev.map((s, idx) => idx === currentSessionIndex ? { ...s, styleTheme: e.target.value } : s))} />
                                            <button className="synth-system-btn" onClick={handleSynthesizeSystem} disabled={isSystemSynthesizing}>{isSystemSynthesizing ? <ThinkingIcon /> : <SparklesIcon />} SYNTHESIZE SYSTEM</button>
                                        </div>
                                        <div className="context-details"><span className="mono">ID: {currentSession.id.toUpperCase()}</span><span className="mono">V1.1</span></div>
                                    </div>
                                    <div className="manifesto-col-strategy">
                                        <div className="context-label">DESIGN_STRATEGY</div>
                                        <textarea className="context-strategy-textarea" value={currentSession.designLanguage} onChange={(e) => setDesignSessions(prev => prev.map((s, idx) => idx === currentSessionIndex ? { ...s, designLanguage: e.target.value } : s))} />
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
                                        isLoading={isLoading || isSystemSynthesizing}
                                        onCodeClick={() => setDrawerState({isOpen: true, mode: 'code', title: component.name, data: variation.html})}
                                        onDownload={() => handleDownloadComponent(variation)}
                                        onImport={(html) => setDesignSessions(prev => prev.map((sess, idx) => idx === currentSessionIndex ? { ...sess, variations: sess.variations.map(v => v.id === variation.id ? { ...v, html, status: 'complete' } : v) } : sess))}
                                        onReroll={() => {
                                            if (variation.status === 'pending') startReroll(variation.id);
                                            else setActiveRemixVariation({ id: variation.id, componentName: component.name, currentHtml: variation.html });
                                        }}
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
                        setUserStyles(prev => [{ id: generateId(), name: session.styleTheme, prompt: session.styleTheme, designLanguage: session.designLanguage, variations: JSON.parse(JSON.stringify(session.variations)), timestamp: Date.now() }, ...prev]);
                    }}><SparklesIcon /> PERSIST SESSION</button>
                    <button onClick={() => {
                        const session = designSessions[currentSessionIndex];
                        if (!session) return;
                        const blob = new Blob([JSON.stringify(session, null, 2)], { type: 'application/json' });
                        const a = document.createElement('a');
                        a.href = URL.createObjectURL(blob);
                        a.download = `usui-system-${session.styleTheme.toLowerCase().replace(/ /g, '-')}.json`;
                        a.click();
                    }}><DownloadIcon /> EXPORT SYSTEM (.JSON)</button>
                    <button onClick={handleExportStyleGuide} className="export-btn"><DownloadIcon /> EXPORT STYLE GUIDE</button>
                 </div>
            </div>
            <div className="floating-input-container">
                <div className={`input-wrapper ${isLoading ? 'loading' : ''}`}>
                    {!inputValue && !isLoading && !selectedImage && <div className="animated-placeholder"><span className="placeholder-text">INITIATE NEW SYSTEM: {placeholders[placeholderIndex]}</span><span className="tab-hint">TAB</span></div>}
                    {selectedImage && <div className="img-chip"><img src={selectedImage} /><button onClick={() => setSelectedImage(null)}><XIcon /></button></div>}
                    {!isLoading ? (
                        <input ref={inputRef} value={inputValue} onChange={(e) => setInputValue(e.target.value)} onKeyDown={(e) => {
                            if (e.key === 'Enter') handleApplyStyle();
                            if (e.key === 'Tab' && !inputValue) { e.preventDefault(); setInputValue(placeholders[placeholderIndex]); }
                        }} />
                    ) : <div className="loading-state">SYNTHESIZING DESIGN SYSTEM... <ThinkingIcon /></div>}
                    <button className="go-btn" onClick={() => handleApplyStyle()} disabled={isLoading || !inputValue.trim() && !selectedImage}><ArrowUpIcon /></button>
                </div>
            </div>
        </div>
    </>
  );
}

const rootElement = document.getElementById('root');
if (rootElement) ReactDOM.createRoot(rootElement).render(<React.StrictMode><App /></React.StrictMode>);
