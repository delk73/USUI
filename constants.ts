
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export const INITIAL_PLACEHOLDERS = [
    "Hyper-industrial brutalism",
    "Bioluminescent cyber-organic",
    "Sharp swiss modernism",
    "Tactile paper and risograph",
    "High-contrast glassmorphism",
    "Neon-soaked retro-future",
    "Analog modular synth hardware",
    "Deconstructed blueprint aesthetic"
];

export const PROMOTED_STYLES = [
  { id: 'noir', name: 'Neon Noir', prompt: 'High-contrast neon-soaked cyberpunk, deep blacks, vibrant magenta and cyan accents, grainy film texture.' },
  { id: 'swiss', name: 'Swiss Modern', prompt: 'International Typographic Style, heavy use of Helvetica, grid-based, primary colors only, massive whitespace.' },
  { id: 'bio', name: 'Biolume', prompt: 'Organic fluid shapes, soft glowing edges, translucent materials, deep ocean greens and blues.' },
  { id: 'brut', name: 'Raw Concrete', prompt: 'Brutalist architecture influence, rough textures, monospaced type, exposure of structural elements, shades of grey.' },
  { id: 'riso', name: 'Riso Press', prompt: 'Overprinted ink textures, limited color palette, dithered gradients, tactile paper feel, warm and analog.' },
  { id: 'synth', name: 'Synth Lab', prompt: 'Aluminum hardware aesthetic, knurled knobs, mechanical switches, amber glow displays, industrial control room.' }
];

export const CORE_COMPONENT_LIBRARY = [
  {
    id: "btn-primary",
    name: "Primary Action",
    category: "Buttons",
    description: "The main call-to-action button. Requires robust hover, active, and focus states. Consider weight and prominence."
  },
  {
    id: "card-content",
    name: "Content Container",
    category: "Layout",
    description: "A card for housing media and text. Focus on hierarchy, padding logic, and how shadows or borders define depth."
  },
  {
    id: "input-standard",
    name: "Standard Input",
    category: "Forms",
    description: "A text input field. Needs a label, placeholder styling, and a strong focus ring or border change."
  },
  {
    id: "nav-global",
    name: "Global Header",
    category: "Navigation",
    description: "The top-level navigation bar. Needs logo space, link spacing, and a sticky or fixed behavior suggestion."
  },
  {
    id: "modal-standard",
    name: "System Modal",
    category: "Overlays",
    description: "A centered overlay for critical tasks. Focus on the backdrop (scrim) and the header/action relationship."
  },
  {
    id: "badge-status",
    name: "Status Badge",
    category: "Information",
    description: "Small indicator for status or categories. Needs distinct color logic for success/warning/error/neutral."
  }
];
