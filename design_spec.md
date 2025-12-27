
# USUI Design Studio - Core Specification

## 1. Vision
USUI is a high-fidelity design synthesis engine that transforms conceptual seeds (text or image) into a cohesive, portable UI system. The aesthetic is strictly Brutalist/Swiss-Modern: high contrast, monochrome, and typography-centric.

## 2. Immutable Core Features

### 2.1. System Seeding
- **Multi-modal Input**: Systems can be initiated via text prompts, image file uploads, or clipboard paste (images/text).
- **Aesthetic Analysis**: Image seeds are processed by Gemini Flash Lite to derive "Design Tokens" (color palettes, typography) and a "System Manifesto" (design strategy).

### 2.2. UI Architecture & Affordance Planning
- **Modular Planning**: Before code materialization, the system generates an "Architecture Manifest"—a collection of UI modules.
- **Affordance Layer (New)**: Every module is paired with a specific list of interaction and visual "affordances" (e.g., "Liquid hover", "Sticky scroll", "Tactile feedback").
- **Contract Enforcement**: Users MUST review and edit these affordances prior to materialization. These affordances serve as the definitive contract for code generation.
- **Stage Progression**: Seeding -> Architecture & Affordance Planning -> Materialization.

### 2.3. Materialization Protocol (Synthesis)
- **Component Synthesis**: Transforming planned architecture into functional HTML/CSS code.
- **Synthesis Visualization**: Represented by a 64x64 monochrome defragmenter grid. This visualization MUST persist during the entire materialization phase.
- **Contract Adherence**: Code generation is strictly bound by the defined affordances of the component.

### 2.4. Portable Specs (Import/Export)
- **Style Guide Export**: Generates a standalone, beautiful HTML specification.
- **Interaction Contract Documentation**: The export includes an explicit list of affordances for every component, ensuring the design's "behavioral DNA" is preserved and portable.
- **No Dead Links Policy**: The style guide and its generated components MUST NOT contain `href="#"`. Use interactive buttons or semantic spans.

### 2.5. Focused Interaction
- **Live Preview Stage**: Clicking a component in the grid workspace transitions the UI into a "Focus Mode" for interactable testing.

## 3. Visual Language & Hierarchy

### 3.1. Layered Interaction Hierarchy
- **Idle State**: Metadata and buttons are dimmed (opacity ~0.4).
- **Materializing State**: Card borders pulse, and the "Defragmenter" visual dominates the UI.
- **Completed State**: Content is clearly rendered; card metadata illuminates on hover.

## 4. Technical Constraints
- **Model**: Optimized using **gemini-flash-lite-latest** to maximize iteration speed and address quota constraints while maintaining architectural reasoning.
