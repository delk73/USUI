
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface DesignComponent {
  id: string;
  name: string;
  category?: string;
  description: string;
  affordances: string[]; // New: Specific interaction/visual requirements
  baseHtml?: string;
}

export interface ComponentVariation {
  id: string;
  componentId: string;
  styleName: string;
  html: string;
  prompt: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
  notes?: string;
}

export interface DesignSession {
  id: string;
  styleTheme: string;
  designLanguage: string;
  timestamp: number;
  architecture: DesignComponent[];
  variations: ComponentVariation[];
}
