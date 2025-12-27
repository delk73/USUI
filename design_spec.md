
# USUI Design Studio - Core Specification (v1.7)

## 1. Vision
USUI is a high-fidelity design generation engine that transforms conceptual seeds (text or image) into a cohesive, portable UI system. The aesthetic is strictly Brutalist/Swiss-Modern: high contrast, monochrome, and typography-centric.

## 2. Immutable Core Features

### 2.1. System Seeding
- **Multi-modal Input**: Systems can be initiated via text prompts, image file uploads, or clipboard paste (images/text).
- **Aesthetic Analysis**: Image seeds are processed by Gemini Flash Lite to derive "Design Tokens" (color palettes, typography) and a "System Manifesto".

### 2.2. UI Architecture & Affordance Planning
- **Affordance Layer**: Every module is paired with specific "Affordances" (interaction/visual tags) displayed directly on the card.
- **First-Class Context**: Affordances are the primary contract for code generation. They must be clearly defined and editable during the architecture phase.
- **Stage Progression**: Seeding -> Architecture & Affordance Planning -> Sequential Generation.

### 2.3. Generation Protocol
- **Sequential Chain**: Modules generate one after another automatically to maintain focus.
- **Status Visualization**: Monochrome 64x64 grid loader.
- **Contract Adherence**: Code generation is strictly bound by the defined affordances.

### 2.4. Portable Specs (Import/Export)
- **Style Guide Export**: Generates a standalone, immersive HTML document.
- **Collapsed Source**: Source code blocks in the export MUST be collapsed by default (using `<details>`) to prioritize visual review over code inspection.
- **Documentation**: The export includes the full manifesto, interaction rules (affordances), and live interactive previews.

### 2.5. Focused Interaction
- **Focus Mode**: Clicking a component preview in the grid transitions the UI into a dedicated component testing canvas.

## 3. Visual Language & Hierarchy

### 3.1. Layered Interaction Hierarchy (Attention Hierarchy)
- **Composed State**: To maintain a clean visual field, card metadata (IDs, Titles, Tags, Buttons) defaults to a dimmed opacity (~0.2-0.3).
- **Active Focus**: Metadata "lights up" to full opacity only on mouse-hover, reducing global cognitive load.
- **Brutalist Grids**: Grid items are packed tightly with minimal whitespace between the strategy header and the output.

### 3.2. Terminology & Tone
- **Professional Precision**: Use standard engineering/design terminology.
- **Prohibited Jargon**: Do not use hyperbolic terms like "DNA", "Materialize", "Spice", "Synthesis", or sci-fi metaphors.
- **Labels**: Use clear, functional labels (e.g., "GENERATE", "CONFIG", "SOURCE", "VIEW").

## 4. Technical Constraints
- **Model**: Optimized using **gemini-flash-lite-latest** for rapid iteration and quota efficiency.
- **Portability**: Imports are format-aware, capable of scraping session data from either JSON or exported HTML specifications.
