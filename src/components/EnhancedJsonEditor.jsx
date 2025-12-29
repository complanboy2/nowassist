import React, { useMemo, useRef, useEffect, useState } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import { Info } from 'lucide-react';
import { createPortal } from 'react-dom';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';

/**
 * Enhanced JSON Editor with line numbers and error highlighting
 */
const EnhancedJsonEditor = ({ 
  value = '', 
  onChange, 
  readOnly = false, 
  placeholder = 'Enter JSON...',
  errorLine = null, // Can be a number or array of numbers
  errorMessage = null,
  style = {}
}) => {
  const editorRef = useRef(null);
  const lineNumbersRef = useRef(null);
  const [tooltipState, setTooltipState] = useState({ show: false, x: 0, y: 0 });
  const iconRef = useRef(null);

  const lines = value ? value.split('\n') : [''];
  const lineCount = lines.length;
  
  // Normalize errorLine to array
  const errorLines = useMemo(() => {
    if (!errorLine) return [];
    if (Array.isArray(errorLine)) return errorLine;
    return [errorLine];
  }, [errorLine]);

  // Scroll line numbers with content
  useEffect(() => {
    const editor = editorRef.current;
    const lineNumbers = lineNumbersRef.current;
    if (!editor || !lineNumbers) return;

    const handleScroll = () => {
      if (lineNumbers) {
        lineNumbers.scrollTop = editor.scrollTop;
      }
    };

    const textarea = editor.querySelector('textarea');
    if (textarea) {
      textarea.addEventListener('scroll', handleScroll);
      return () => textarea.removeEventListener('scroll', handleScroll);
    }
  }, [value]);

  // Handle tooltip positioning
  const handleMouseEnter = (e) => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setTooltipState({
        show: true,
        x: rect.right + 12, // Position to the right of the icon
        y: rect.top + rect.height / 2 // Center vertically with icon
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltipState({ show: false, x: 0, y: 0 });
  };

  // Enhanced highlighting that marks ALL error lines in the text
  const highlightedCode = useMemo(() => {
    if (!value) return '';
    
    try {
      let highlighted = highlight(value, languages.json, 'json');
      
      // If there are error lines, wrap each line in a span with error styling
      if (errorLines.length > 0) {
        const codeLines = highlighted.split('\n');
        errorLines.forEach(lineNum => {
          if (lineNum > 0 && codeLines[lineNum - 1]) {
            // Wrap the entire error line in a span with error background
            codeLines[lineNum - 1] = `<span class="error-line-text" style="background-color: rgba(239, 68, 68, 0.25); display: inline-block; width: 100%; padding: 2px 0; margin-left: -16px; padding-left: 16px; border-left: 3px solid #ef4444;">${codeLines[lineNum - 1]}</span>`;
          }
        });
        highlighted = codeLines.join('\n');
      }
      
      return highlighted;
    } catch (e) {
      return value;
    }
  }, [value, errorLines]);

  return (
    <>
      <div className="w-full h-full relative flex" style={{ ...style, width: '100%', minWidth: 0, maxWidth: '100%' }}>
        {/* Line Numbers */}
        <div
          ref={lineNumbersRef}
          className="flex-shrink-0 bg-slate-50 dark:bg-gray-800 border-r border-slate-200 dark:border-gray-700 text-right pr-2 py-4"
          style={{ 
            width: '50px',
            fontFamily: '"Fira Code", "Fira Mono", "Consolas", "Monaco", "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.6',
            color: '#64748b',
            overflowY: 'hidden', // Hide scrollbar - scroll is synced with editor
            overflowX: 'visible'
          }}
        >
          {Array.from({ length: lineCount }, (_, i) => {
            const lineNum = i + 1;
            const isErrorLine = errorLines.includes(lineNum);
            return (
              <div
                key={i}
                className={`
                  relative flex items-center justify-end gap-1
                  ${isErrorLine ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 font-semibold' : 'dark:text-gray-400'}
                `}
                style={{ minHeight: '22.4px' }}
              >
                {isErrorLine && errorMessage && i === errorLines[0] - 1 && (
                  <div 
                    ref={iconRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="relative z-50"
                  >
                    <Info className="h-3.5 w-3.5 text-red-600 dark:text-red-400 cursor-help flex-shrink-0" />
                  </div>
                )}
                <span>{lineNum}</span>
              </div>
            );
          })}
        </div>

        {/* Editor */}
        <div ref={editorRef} className="flex-1 relative overflow-hidden bg-white dark:bg-gray-800">
          <Editor
            value={value}
            onValueChange={(code) => {
              if (onChange && !readOnly) {
                onChange(code);
              }
            }}
            highlight={(code) => {
              if (!code) return '';
              
              try {
                let highlighted = highlight(code, languages.json, 'json');
                
                // If there are error lines, wrap each line in a span with error styling
                if (errorLines.length > 0) {
                  const codeLines = highlighted.split('\n');
                  errorLines.forEach(lineNum => {
                    if (lineNum > 0 && codeLines[lineNum - 1]) {
                      // Wrap the entire error line in a span with error background
                      codeLines[lineNum - 1] = `<span class="error-line-text" style="background-color: rgba(239, 68, 68, 0.25); display: inline-block; width: 100%; padding: 2px 0; margin-left: -16px; padding-left: 16px; border-left: 3px solid #ef4444;">${codeLines[lineNum - 1]}</span>`;
                    }
                  });
                  highlighted = codeLines.join('\n');
                }
                
                return highlighted;
              } catch (e) {
                return code;
              }
            }}
            padding={16}
            style={{
              fontFamily: '"Fira Code", "Fira Mono", "Consolas", "Monaco", "Courier New", monospace',
              fontSize: 14,
              lineHeight: 1.6,
              outline: 0,
              backgroundColor: 'transparent',
              minHeight: '100%',
              width: '100%',
              ...style
            }}
            textareaClassName="json-editor-textarea"
            preClassName="json-editor-pre"
            readOnly={readOnly}
            placeholder={placeholder}
          />
          {/* Error line highlight overlays for ALL error lines */}
          {errorLines.map((lineNum) => (
            lineNum > 0 && (
              <div
                key={lineNum}
                className="absolute left-0 right-0 pointer-events-none"
                style={{
                  top: `${(lineNum - 1) * 22.4}px`,
                  height: '22.4px',
                  backgroundColor: 'rgba(239, 68, 68, 0.15)',
                  borderLeft: '3px solid #ef4444',
                }}
              />
            )
          ))}
        </div>

        <style>{`
          .json-editor-textarea,
          .json-editor-pre {
            font-family: "Fira Code", "Fira Mono", "Consolas", "Monaco", "Courier New", monospace !important;
            font-size: 14px;
            line-height: 1.6;
            tab-size: 2;
            -moz-tab-size: 2;
          }
          .json-editor-textarea {
            outline: none;
            resize: none;
            border: none;
            overflow-wrap: normal;
            overflow-x: auto;
            white-space: pre;
            padding-left: 0 !important;
            color: rgb(31, 41, 55);
            background-color: transparent;
          }
          .dark .json-editor-textarea {
            color: rgb(255, 255, 255);
          }
          .json-editor-textarea::placeholder {
            color: rgb(156, 163, 175);
          }
          .dark .json-editor-textarea::placeholder {
            color: rgb(107, 114, 128);
          }
          .json-editor-textarea:focus {
            outline: none;
          }
          .json-editor-pre {
            pointer-events: none;
            padding-left: 0 !important;
          }
          .error-line-text {
            background-color: rgba(239, 68, 68, 0.25) !important;
          }
          .dark .error-line-text {
            background-color: rgba(239, 68, 68, 0.3) !important;
          }
        `}</style>
      </div>

      {/* Tooltip using Portal to render above everything */}
      {tooltipState.show && errorMessage && typeof document !== 'undefined' && createPortal(
        <div 
          className="fixed z-[99999] bg-slate-900 text-white text-xs px-3 py-2 rounded-lg shadow-2xl pointer-events-none"
          style={{ 
            left: `${tooltipState.x}px`,
            top: `${tooltipState.y}px`,
            transform: 'translateY(-50%)',
            maxWidth: '320px',
            minWidth: '200px',
            wordWrap: 'break-word',
            whiteSpace: 'normal'
          }}
        >
          <div className="font-semibold mb-1">Error:</div>
          <div>{errorMessage}</div>
          <div className="absolute right-full top-1/2 -translate-y-1/2 translate-x-0.5">
            <div className="border-4 border-transparent border-r-slate-900"></div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};

export default EnhancedJsonEditor;
