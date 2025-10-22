
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ControlPanel from './components/ControlPanel';
import InlineToolbar from './components/InlineToolbar';
import { generateInitialText, rewriteSelection, getSuggestions, checkGrammarAndSpelling } from './services/geminiService';
import { Suggestion, AttachedFile, AiMode, GrammarError } from './types';

const App: React.FC = () => {
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeAiMode, setActiveAiMode] = useState<AiMode | null>(null);

  const [selection, setSelection] = useState<{ text: string; range: Range } | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [grammarErrors, setGrammarErrors] = useState<GrammarError[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);
  const grammarCheckTimeoutRef = useRef<number | null>(null);

  const handleGenerate = useCallback(async (prompt: string, files: AttachedFile[]) => {
    setIsLoading(true);
    setActiveAiMode('generate');
    setEditorContent('Generating your draft...');
    const result = await generateInitialText(prompt, files);
    setEditorContent(result);
    setSuggestions([]);
    setGrammarErrors([]);
    setIsLoading(false);
    setActiveAiMode(null);
  }, []);

  const handleSuggest = useCallback(async () => {
    setIsLoading(true);
    setActiveAiMode('suggest');
    const newSuggestions = await getSuggestions(editorRef.current?.innerText || '');
    setSuggestions(newSuggestions);
    setIsLoading(false);
    setActiveAiMode(null);
  }, []);

  const handleRewrite = useCallback(async (instruction: string) => {
    if (!selection) return;

    setIsLoading(true);
    setActiveAiMode('rewrite');
    setToolbarPosition(null);

    const rewrittenText = await rewriteSelection(selection.text, instruction);

    const { range } = selection;
    range.deleteContents();
    range.insertNode(document.createTextNode(rewrittenText));

    if (editorRef.current) {
        setEditorContent(editorRef.current.innerHTML);
    }

    setSelection(null);
    setIsLoading(false);
    setActiveAiMode(null);
  }, [selection]);

  const handleMouseUp = () => {
    const currentSelection = window.getSelection();
    if (currentSelection && !currentSelection.isCollapsed) {
      const range = currentSelection.getRangeAt(0);
      const text = currentSelection.toString().trim();

      if (text.length > 0) {
        setSelection({ text, range });
        const rect = range.getBoundingClientRect();
        setToolbarPosition({
          top: rect.top + window.scrollY,
          left: rect.left + window.scrollX + rect.width / 2,
        });
        return;
      }
    }
    setToolbarPosition(null);
    setSelection(null);
  };
  
  const handleContentChange = (e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerHTML;
    const plainText = e.currentTarget.innerText;
    setEditorContent(newContent);
    
    if(suggestions.length > 0) setSuggestions([]);
    if(grammarErrors.length > 0) setGrammarErrors([]);

    if (grammarCheckTimeoutRef.current) {
        clearTimeout(grammarCheckTimeoutRef.current);
    }

    grammarCheckTimeoutRef.current = window.setTimeout(async () => {
        if (plainText.trim().length > 10) {
            setActiveAiMode('grammar');
            const errors = await checkGrammarAndSpelling(plainText);
            setGrammarErrors(errors);
            setActiveAiMode(null);
        }
    }, 1500); // Debounce for 1.5 seconds
  };

  const applySuggestion = (suggestion: Suggestion) => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML.replace(
        `<span class="suggestion-underline" id="suggestion-${suggestion.id}">${suggestion.originalText}</span>`,
        suggestion.suggestedText
      );
      setEditorContent(newContent);
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
    }
  };
  
  const rejectSuggestion = (suggestion: Suggestion) => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML.replace(
        `<span class="suggestion-underline" id="suggestion-${suggestion.id}">${suggestion.originalText}</span>`,
        suggestion.originalText
      );
      setEditorContent(newContent);
      setSuggestions(suggestions.filter(s => s.id !== suggestion.id));
    }
  };

  const applyCorrection = (error: GrammarError) => {
    if (editorRef.current) {
      const newContent = editorRef.current.innerHTML.replace(
        `<span class="grammar-error-underline" id="error-${error.id}">${error.errorText}</span>`,
        error.correction
      );
      setEditorContent(newContent);
      setGrammarErrors(grammarErrors.filter(e => e.id !== error.id));
    }
  };

  const rejectCorrection = (error: GrammarError) => {
     if (editorRef.current) {
      const newContent = editorRef.current.innerHTML.replace(
        `<span class="grammar-error-underline" id="error-${error.id}">${error.errorText}</span>`,
        error.errorText
      );
      setEditorContent(newContent);
      setGrammarErrors(grammarErrors.filter(e => e.id !== error.id));
    }
  };
  
  const escapeRegex = (string: string) => {
    return string.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  };

  const editorHtmlWithHighlights = useMemo(() => {
    if (suggestions.length === 0 && grammarErrors.length === 0) return editorContent;

    let contentWithHighlights = editorRef.current?.innerText || '';
    
    grammarErrors.forEach(error => {
        const regex = new RegExp(`(?<!>)${escapeRegex(error.errorText)}(?!<)`, 'g');
        contentWithHighlights = contentWithHighlights.replace(regex, 
            `<span class="grammar-error-underline" id="error-${error.id}" title="${error.explanation}">${error.errorText}</span>`
        );
    });

    suggestions.forEach(suggestion => {
        const regex = new RegExp(`(?<!>)${escapeRegex(suggestion.originalText)}(?!<)`, 'g');
        contentWithHighlights = contentWithHighlights.replace(regex, 
            `<span class="suggestion-underline" id="suggestion-${suggestion.id}" title="Suggested change: ${suggestion.suggestedText.replace(/"/g, '&quot;')}">${suggestion.originalText}</span>`
        );
    });
    return contentWithHighlights;
  }, [suggestions, grammarErrors, editorContent]);

  useEffect(() => {
    const editorNode = editorRef.current;
    if (!editorNode) return;

    const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;
        if (target.classList.contains('suggestion-underline')) {
            const suggestionId = target.id.replace('suggestion-', '');
            const suggestion = suggestions.find(s => s.id === suggestionId);
            if (suggestion) {
                if(window.confirm(`Accept suggestion?\n\nOriginal: ${suggestion.originalText}\nSuggested: ${suggestion.suggestedText}`)){
                    applySuggestion(suggestion);
                } else {
                    rejectSuggestion(suggestion);
                }
            }
        } else if (target.classList.contains('grammar-error-underline')) {
            const errorId = target.id.replace('error-', '');
            const error = grammarErrors.find(e => e.id === errorId);
            if (error) {
                 if(window.confirm(`Accept correction?\n\nError: ${error.errorText}\nCorrection: ${error.correction}\n\nReason: ${error.explanation}`)){
                    applyCorrection(error);
                } else {
                    rejectCorrection(error);
                }
            }
        }
    };
    
    editorNode.addEventListener('click', handleClick);

    return () => {
        editorNode.removeEventListener('click', handleClick);
    };
  }, [suggestions, grammarErrors]); // Simplified dependencies for clarity

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans">
      <ControlPanel onGenerate={handleGenerate} onSuggest={handleSuggest} isLoading={isLoading} activeAiMode={activeAiMode} />
      <main className="flex-grow h-screen flex flex-col relative" onMouseUp={handleMouseUp}>
        <div className="flex-grow p-8 md:p-16 overflow-y-auto">
          <div
            ref={editorRef}
            contentEditable={!isLoading}
            suppressContentEditableWarning={true}
            onInput={handleContentChange}
            className="prose prose-lg dark:prose-invert max-w-full focus:outline-none leading-relaxed text-slate-800 dark:text-slate-200"
            dangerouslySetInnerHTML={{ __html: editorHtmlWithHighlights }}
          />
        </div>
        {isLoading && activeAiMode !== 'generate' && (
          <div className="absolute inset-0 bg-black bg-opacity-10 dark:bg-opacity-30 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-500"></div>
          </div>
        )}
        {toolbarPosition && (
          <InlineToolbar
            position={toolbarPosition}
            onRewrite={handleRewrite}
            onClose={() => setToolbarPosition(null)}
          />
        )}
      </main>
    </div>
  );
};

export default App;
