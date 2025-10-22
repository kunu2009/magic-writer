
import React, { useState, useEffect, useRef } from 'react';
import { SparklesIcon } from './icons';

interface InlineToolbarProps {
  position: { top: number; left: number };
  onRewrite: (instruction: string) => void;
  onClose: () => void;
}

const InlineToolbar: React.FC<InlineToolbarProps> = ({ position, onRewrite, onClose }) => {
  const [instruction, setInstruction] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isExpanded) {
      inputRef.current?.focus();
    }
  }, [isExpanded]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleRewrite = (e: React.FormEvent) => {
    e.preventDefault();
    if (instruction.trim()) {
      onRewrite(instruction);
    }
  };

  return (
    <div
      ref={toolbarRef}
      className="absolute z-10 bg-slate-800 text-white rounded-lg shadow-2xl p-2 flex items-center gap-2 transition-all duration-200 ease-in-out"
      style={{ top: position.top, left: position.left, transform: 'translate(-50%, -120%)' }}
    >
      {!isExpanded ? (
        <button
          onClick={() => setIsExpanded(true)}
          className="flex items-center gap-2 px-3 py-1 hover:bg-slate-700 rounded-md transition"
        >
          <SparklesIcon className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-medium">Rewrite with AI</span>
        </button>
      ) : (
        <form onSubmit={handleRewrite} className="flex items-center">
          <input
            ref={inputRef}
            type="text"
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            placeholder="Make it more formal..."
            className="bg-slate-700 text-white placeholder-slate-400 text-sm rounded-l-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
          />
          <button
            type="submit"
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-3 py-1 rounded-r-md transition"
          >
            Go
          </button>
        </form>
      )}
    </div>
  );
};

export default InlineToolbar;
