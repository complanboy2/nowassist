import React, { useMemo } from 'react';
import Editor from 'react-simple-code-editor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';
import 'prismjs/themes/prism.css';

/**
 * Simple JSON Editor - Lightweight, CSP-friendly
 * Uses react-simple-code-editor with Prism.js for syntax highlighting
 */
const SimpleJsonEditor = ({ 
  value = '', 
  onChange, 
  readOnly = false, 
  placeholder = 'Enter JSON...',
  style = {}
}) => {
  const highlightedCode = useMemo(() => {
    if (!value) return '';
    try {
      return highlight(value, languages.json, 'json');
    } catch (e) {
      return value; // Fallback to plain text if highlighting fails
    }
  }, [value]);

  return (
    <div className="w-full h-full relative" style={style}>
      <Editor
        value={value}
        onValueChange={(code) => {
          if (onChange && !readOnly) {
            onChange(code);
          }
        }}
        highlight={(code) => {
          try {
            return highlight(code, languages.json, 'json');
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
          backgroundColor: '#ffffff',
          minHeight: '100%',
          width: '100%',
          ...style
        }}
        textareaClassName="json-editor-textarea"
        preClassName="json-editor-pre"
        readOnly={readOnly}
        placeholder={placeholder}
      />
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
        }
        .json-editor-textarea:focus {
          outline: none;
        }
        .json-editor-pre {
          pointer-events: none;
        }
      `}</style>
    </div>
  );
};

export default SimpleJsonEditor;

