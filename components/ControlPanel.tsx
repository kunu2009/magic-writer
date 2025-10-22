import React, { useState } from 'react';
import { AttachedFile, AiMode } from '../types';
import { SparklesIcon, DocumentTextIcon, PaperClipIcon, XMarkIcon, LightbulbIcon, SunIcon, MoonIcon } from './icons';

interface ControlPanelProps {
  onGenerate: (prompt: string, files: AttachedFile[]) => void;
  onSuggest: () => void;
  isLoading: boolean;
  activeAiMode: AiMode | null;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
}

const ControlPanel: React.FC<ControlPanelProps> = ({ onGenerate, onSuggest, isLoading, activeAiMode, theme, onToggleTheme }) => {
  const [prompt, setPrompt] = useState('');
  const [files, setFiles] = useState<AttachedFile[]>([]);

  // FIX: Refactored to use a for...of loop to handle file uploads.
  // This resolves a type inference issue where `file` was being treated as `unknown` inside the `forEach` callback.
  // This new implementation is more robust and ensures correct typing.
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      for (const file of event.target.files) {
        const reader = new FileReader();
        reader.onload = () => {
          if (typeof reader.result === 'string') {
            const base64 = reader.result.split(',')[1];
            setFiles(prev => [...prev, { name: file.name, type: file.type, base64 }]);
          }
        };
        reader.readAsDataURL(file);
      }
    }
  };

  const removeFile = (fileName: string) => {
    setFiles(files.filter(f => f.name !== fileName));
  };

  const isGenerateLoading = isLoading && activeAiMode === 'generate';
  const isSuggestLoading = isLoading && activeAiMode === 'suggest';

  return (
    <div className="w-full md:w-1/3 lg:w-1/4 h-screen bg-slate-100 dark:bg-slate-800 p-6 flex flex-col border-r border-slate-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <DocumentTextIcon className="w-8 h-8 text-indigo-500" />
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Magic Writer</h1>
        </div>
        <button
          onClick={onToggleTheme}
          className="p-2 rounded-full text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-offset-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'light' ? <MoonIcon className="w-5 h-5" /> : <SunIcon className="w-5 h-5" />}
        </button>
      </div>

      <div className="flex-grow overflow-y-auto pr-2">
        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Start Writing</h2>
        <div className="space-y-4">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Tell me what to write about..."
            className="w-full h-40 p-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none transition text-slate-700 dark:text-slate-200"
            disabled={isLoading}
          />

          <div>
            <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border border-slate-300 dark:border-slate-600 text-sm font-medium rounded-md text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 transition">
              <PaperClipIcon className="w-4 h-4" />
              Attach Files
            </label>
            <input id="file-upload" name="file-upload" type="file" className="sr-only" multiple onChange={handleFileChange} disabled={isLoading} />
          </div>

          {files.length > 0 && (
            <div className="space-y-2">
              {files.map(file => (
                <div key={file.name} className="flex items-center justify-between bg-slate-200 dark:bg-slate-700 p-2 rounded-md text-sm">
                  <span className="truncate text-slate-600 dark:text-slate-300">{file.name}</span>
                  <button onClick={() => removeFile(file.name)} className="text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" disabled={isLoading}>
                    <XMarkIcon className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          <button
            onClick={() => onGenerate(prompt, files)}
            disabled={!prompt || isGenerateLoading}
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 border border-transparent text-sm font-semibold rounded-lg text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 disabled:cursor-not-allowed transition"
          >
            {isGenerateLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Writing...
              </>
            ) : (
              <>
                <SparklesIcon className="w-5 h-5" />
                Write for me
              </>
            )}
          </button>
        </div>
        
        <div className="my-8 border-t border-slate-200 dark:border-slate-700"></div>

        <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-4">Enhance</h2>
         <button
            onClick={onSuggest}
            disabled={isSuggestLoading}
            className="w-full inline-flex justify-center items-center gap-2 px-4 py-3 border border-slate-300 dark:border-slate-600 text-sm font-semibold rounded-lg text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition"
          >
             {isSuggestLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-slate-500"></div>
                Analyzing...
              </>
            ) : (
              <>
                <LightbulbIcon className="w-5 h-5" />
                Get Suggestions
              </>
            )}
          </button>

      </div>
    </div>
  );
};

export default ControlPanel;