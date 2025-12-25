
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface DesignComponent {
  id: string;
  name: string;
  category: string;
  description: string;
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
  variations: ComponentVariation[];
}

export interface UserStyle {
  id: string;
  name: string;
  prompt: string;
  designLanguage: string;
  variations: ComponentVariation[];
  timestamp: number;
}

export interface Artifact {
  id: string;
  styleName: string;
  html: string;
  status: 'pending' | 'streaming' | 'complete' | 'error';
}

export interface Session {
    id: string;
    prompt: string;
    timestamp: number;
    artifacts: Artifact[];
}
