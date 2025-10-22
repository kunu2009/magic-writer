
import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import ControlPanel from './components/ControlPanel';
import InlineToolbar from './components/InlineToolbar';
import { generateInitialText, rewriteSelection, getSuggestions } from './services/geminiService';
import { Suggestion, AttachedFile, AiMode } from './types';

const App: React.FC = () => {
  const [editorContent, setEditorContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeAiMode, setActiveAiMode] = useState<AiMode | null>(null);

  const [selection, setSelection] = useState<{ text: string; range: Range } | null>(null);
  const [toolbarPosition, setToolbarPosition] = useState<{ top: number; left: number } | null>(null);

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const editorRef = useRef<HTMLDivElement>(null);

  const handleGenerate = useCallback(async (prompt: string, files: AttachedFile[]) => {
    setIsLoading(true);
    setActiveAiMode('generate');
    setEditorContent('Generating your draft...');
    const result = await generateInitialText(prompt, files);
    setEditorContent(result);
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

    // Update main state
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
    setEditorContent(e.currentTarget.innerHTML);
    // When user types, we should clear suggestions as they may become invalid
    if(suggestions.length > 0) {
        setSuggestions([]);
    }
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

  const editorHtmlWithSuggestions = useMemo(() => {
    if (suggestions.length === 0) return editorContent;

    let contentWithHighlights = editorRef.current?.innerText || '';
    suggestions.forEach(suggestion => {
        // Use a regex to avoid replacing already highlighted text
        const regex = new RegExp(`(?<!>)${suggestion.originalText.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&')}(?!<)`, 'g');
        contentWithHighlights = contentWithHighlights.replace(regex, 
            `<span class="suggestion-underline" id="suggestion-${suggestion.id}" title="Suggested change: ${suggestion.suggestedText.replace(/"/g, '&quot;')}">${suggestion.originalText}</span>`
        );
    });
    return contentWithHighlights;
  }, [suggestions, editorContent]);

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
        }
    };
    
    editorNode.addEventListener('click', handleClick);

    return () => {
        editorNode.removeEventListener('click', handleClick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestions]);

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
            dangerouslySetInnerHTML={{ __html: editorHtmlWithSuggestions }}
          />
        </div>
        {isLoading && activeAiMode === 'rewrite' && (
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
