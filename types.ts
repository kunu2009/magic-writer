
export interface Suggestion {
  originalText: string;
  suggestedText: string;
  id: string;
}

export interface GrammarError {
  errorText: string;
  correction: string;
  explanation: string;
  id: string;
}

export interface AttachedFile {
  name: string;
  type: string;
  base64: string;
}

export type AiMode = 'generate' | 'rewrite' | 'suggest' | 'grammar';
