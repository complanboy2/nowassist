import React, { useState, useMemo } from 'react';
import { Copy, GitMerge, AlertCircle, CheckCircle2, ArrowRight, X, ArrowLeft, Eye, Download } from 'lucide-react';
import clsx from 'clsx';
import { diffJson } from '../utils/jsonUtils';
import { parseJsonError } from '../utils/jsonErrorParser';
import SimpleJsonEditor from './SimpleJsonEditor';
import EnhancedJsonEditor from './EnhancedJsonEditor';
import { highlight, languages } from 'prismjs';
import 'prismjs/components/prism-json';

const JsonDiff = ({ onOutputUpdate }) => {
  const [jsonA, setJsonA] = useState('');
  const [jsonB, setJsonB] = useState('');
  const [diffResult, setDiffResult] = useState(null);
  const [error, setError] = useState(null);
  const [viewMode, setViewMode] = useState('summary'); // 'summary' | 'side-by-side'
  const [highlightDiff, setHighlightDiff] = useState(false);
  const [originalJsonA, setOriginalJsonA] = useState('');
  const [originalJsonB, setOriginalJsonB] = useState('');
  
  // Validation states
  const [jsonAError, setJsonAError] = useState(null);
  const [jsonBError, setJsonBError] = useState(null);

  // Validate JSON A
  const validateJsonA = (jsonString) => {
    if (!jsonString || !jsonString.trim()) {
      setJsonAError(null);
      return null;
    }
    try {
      JSON.parse(jsonString);
      setJsonAError(null);
      return true;
    } catch (err) {
      const errorInfo = parseJsonError(err, jsonString);
      setJsonAError(errorInfo);
      return false;
    }
  };

  // Validate JSON B
  const validateJsonB = (jsonString) => {
    if (!jsonString || !jsonString.trim()) {
      setJsonBError(null);
      return null;
    }
    try {
      JSON.parse(jsonString);
      setJsonBError(null);
      return true;
    } catch (err) {
      const errorInfo = parseJsonError(err, jsonString);
      setJsonBError(errorInfo);
      return false;
    }
  };

  // Validate on change
  useMemo(() => {
    validateJsonA(jsonA);
  }, [jsonA]);

  useMemo(() => {
    validateJsonB(jsonB);
  }, [jsonB]);

  const handleDiff = () => {
    setError(null);
    
    if (!jsonA || !jsonB) {
      setError('Both JSON inputs are required');
      return;
    }

    // Validate before diffing
    const isValidA = validateJsonA(jsonA);
    const isValidB = validateJsonB(jsonB);

    if (isValidA === false || isValidB === false) {
      setError('Please fix JSON errors before comparing');
      return;
    }

    try {
      const parsedA = JSON.parse(jsonA);
      const parsedB = JSON.parse(jsonB);
      
      // Store originals before diff - format them for consistent display
      try {
        setOriginalJsonA(JSON.stringify(parsedA, null, 2));
        setOriginalJsonB(JSON.stringify(parsedB, null, 2));
      } catch (e) {
        setOriginalJsonA(jsonA);
        setOriginalJsonB(jsonB);
      }
      
      const diff = diffJson(parsedA, parsedB);
      setDiffResult(diff);
    } catch (err) {
      setError(err.message || 'Failed to parse JSON');
    }
  };

  const handleBackToEdit = () => {
    setDiffResult(null);
    // Restore original JSONs
    setJsonA(originalJsonA);
    setJsonB(originalJsonB);
    setError(null);
    setHighlightDiff(false);
    // Re-validate after restoring
    validateJsonA(originalJsonA);
    validateJsonB(originalJsonB);
  };

  const clearDiff = () => {
    setJsonA('');
    setJsonB('');
    setDiffResult(null);
    setError(null);
    setOriginalJsonA('');
    setOriginalJsonB('');
    setHighlightDiff(false);
    setJsonAError(null);
    setJsonBError(null);
  };

  // Improved line detection using value-based search
  const findLinesForDiffItems = (jsonString, diffItems) => {
    const lines = jsonString.split('\n');
    const errorLines = new Set();

    diffItems.forEach(item => {
      const path = item.path;
      const cleanPath = path.startsWith('$.') ? path.substring(2) : path;
      const parts = cleanPath.split('.');
      
      // Get the value to search for
      let searchValue = null;
      if (item.value !== undefined) {
        searchValue = item.value;
      } else if (item.oldValue !== undefined) {
        searchValue = item.oldValue;
      } else if (item.newValue !== undefined) {
        searchValue = item.newValue;
      }

      // Extract the last key from path
      const lastPart = parts[parts.length - 1];
      let targetKey = null;
      let arrayIndex = null;
      
      const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        targetKey = arrayMatch[1];
        arrayIndex = parseInt(arrayMatch[2]);
      } else {
        targetKey = lastPart;
      }

      // Strategy 1: Find by key name with parent context
      const parentKeys = parts.slice(0, -1);
      let foundKeyLine = null;
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        const lineIndent = (line.match(/^(\s*)/)?.[1] || '').length / 2;
        const trimmed = line.trim();
        
        // Match the target key
        const escapedKey = targetKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyPattern = new RegExp(`"${escapedKey}"\\s*:`, 'g');
        
        if (keyPattern.test(line)) {
          // Check if we're in the right parent context by checking indent
          // For nested paths, the indent should match the depth
          const expectedIndent = parentKeys.length;
          if (lineIndent === expectedIndent || parentKeys.length === 0) {
            foundKeyLine = i + 1;
            
            if (arrayIndex === null) {
              // Object property - highlight the key line
              errorLines.add(i + 1);
            } else {
              // Array element - find the array and count to index
              // Look for array opening on next line
              for (let j = i + 1; j < lines.length; j++) {
                const nextTrimmed = lines[j].trim();
                if (nextTrimmed.startsWith('[')) {
                  // Found array, count elements
                  let elementCount = 0;
                  for (let k = j + 1; k < lines.length; k++) {
                    const elemTrimmed = lines[k].trim();
                    if (elemTrimmed === ']') break;
                    // Array element lines don't start with [ or { and aren't object keys
                    if (elemTrimmed && !elemTrimmed.startsWith('[') && !elemTrimmed.match(/^"[^"]+"\s*:/) && !elemTrimmed.startsWith('{')) {
                      if (elementCount === arrayIndex) {
                        errorLines.add(k + 1);
                        break;
                      }
                      elementCount++;
                    }
                  }
                  break;
                }
              }
            }
            break;
          }
        }
      }

      // Strategy 2: If key search failed, try searching for the actual value
      if (errorLines.size === 0 && searchValue !== null && searchValue !== undefined) {
        const valueStr = typeof searchValue === 'string' 
          ? `"${searchValue.replace(/"/g, '\\"')}"`
          : String(searchValue);
        
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes(valueStr)) {
            errorLines.add(i + 1);
            break;
          }
        }
      }

      // Strategy 3: Simple key name fallback (without context checking)
      if (errorLines.size === 0) {
        const escapedKey = targetKey.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const keyPattern = new RegExp(`"${escapedKey}"\\s*:`, 'g');
        for (let i = 0; i < lines.length; i++) {
          if (keyPattern.test(lines[i])) {
            errorLines.add(i + 1);
            break;
          }
        }
      }
    });

    return Array.from(errorLines).sort((a, b) => a - b);
  };

  // Generate highlighted JSON with row highlighting for differences
  const getHighlightedJson = (jsonString, diffType, diffItems) => {
    if (!highlightDiff || !diffItems || diffItems.length === 0) {
      return { json: jsonString, errorLines: [], errorMessage: null, highlightedHtml: jsonString };
    }

    try {
      // Parse and re-stringify to ensure consistent formatting
      const parsed = JSON.parse(jsonString);
      const formattedJson = JSON.stringify(parsed, null, 2);
      
      // Find all error lines
      const errorLinesArray = findLinesForDiffItems(formattedJson, diffItems);
      
      // First, get Prism syntax highlighting
      let highlightedHtml = highlight(formattedJson, languages.json, 'json');
      
      // Color mapping based on diff type
      const getHighlightColor = (type) => {
        if (diffType.includes('added') || diffType.includes('added/changed')) return 'rgba(34, 197, 94, 0.2)'; // green
        if (diffType.includes('removed') || diffType.includes('removed/changed')) return 'rgba(239, 68, 68, 0.2)'; // red
        return 'rgba(251, 191, 36, 0.2)'; // yellow for changed
      };
      
      const getBorderColor = (type) => {
        if (diffType.includes('added') || diffType.includes('added/changed')) return '#22c55e'; // green
        if (diffType.includes('removed') || diffType.includes('removed/changed')) return '#ef4444'; // red
        return '#fbbf24'; // yellow for changed
      };
      
      const highlightColor = getHighlightColor(diffType);
      const borderColor = getBorderColor(diffType);
      
      // Split into lines and highlight entire rows
      const lines = formattedJson.split('\n');
      const highlightedLines = lines.map((line, index) => {
        const lineNum = index + 1;
        if (errorLinesArray.includes(lineNum)) {
          // Wrap entire line in a span with background color
          // First get the highlighted version of this line if it exists in the Prism output
          const highlightedLinesArray = highlightedHtml.split('\n');
          const highlightedLine = highlightedLinesArray[index] || line;
          return `<div style="background-color: ${highlightColor}; border-left: 3px solid ${borderColor}; padding: 2px 8px; margin: 0 -8px;">${highlightedLine}</div>`;
        }
        // Return the Prism highlighted line
        const highlightedLinesArray = highlightedHtml.split('\n');
        return highlightedLinesArray[index] || line;
      });
      
      highlightedHtml = highlightedLines.join('\n');
      
      const diffCount = diffItems.length;
      const message = errorLinesArray.length > 0 
        ? `${diffCount} ${diffType} difference${diffCount > 1 ? 's' : ''} detected (lines: ${errorLinesArray.join(', ')})`
        : `${diffCount} ${diffType} difference${diffCount > 1 ? 's' : ''} detected`;
      
      return { 
        json: formattedJson, 
        errorLines: errorLinesArray,
        errorLine: errorLinesArray.length > 0 ? errorLinesArray : null,
        errorMessage: message,
        highlightedHtml: highlightedHtml
      };
    } catch (e) {
      // Fallback to simple key matching
      const lines = jsonString.split('\n');
      const errorLines = new Set();
      const keyNames = new Set();
      
      diffItems.forEach(item => {
        const cleanPath = item.path.startsWith('$.') ? item.path.substring(2) : item.path;
        const parts = cleanPath.split('.');
        const lastPart = parts[parts.length - 1].replace(/\[\d+\]$/, '');
        keyNames.add(lastPart);
      });

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const keyName of keyNames) {
          const escapedKey = keyName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const keyPattern = new RegExp(`"${escapedKey}"\\s*:`, 'g');
          if (keyPattern.test(line)) {
            errorLines.add(i + 1);
            break;
          }
        }
      }

      const errorLinesArray = Array.from(errorLines).sort((a, b) => a - b);
      
      // Apply row highlighting in fallback mode too
      const getHighlightColor = (type) => {
        if (diffType.includes('added') || diffType.includes('added/changed')) return 'rgba(34, 197, 94, 0.2)';
        if (diffType.includes('removed') || diffType.includes('removed/changed')) return 'rgba(239, 68, 68, 0.2)';
        return 'rgba(251, 191, 36, 0.2)';
      };
      
      const getBorderColor = (type) => {
        if (diffType.includes('added') || diffType.includes('added/changed')) return '#22c55e';
        if (diffType.includes('removed') || diffType.includes('removed/changed')) return '#ef4444';
        return '#fbbf24';
      };
      
      const highlightColor = getHighlightColor(diffType);
      const borderColor = getBorderColor(diffType);
      const highlightedLines = lines.map((line, index) => {
        const lineNum = index + 1;
        if (errorLinesArray.includes(lineNum)) {
          return `<div style="background-color: ${highlightColor}; border-left: 3px solid ${borderColor}; padding: 2px 8px; margin: 0 -8px;">${line}</div>`;
        }
        return line;
      });
      
      return { 
        json: jsonString, 
        errorLines: errorLinesArray,
        errorLine: errorLinesArray.length > 0 ? errorLinesArray : null,
        errorMessage: errorLinesArray.length > 0 
          ? `${diffItems.length} differences detected (lines: ${errorLinesArray.join(', ')})`
          : `${diffItems.length} differences detected`,
        highlightedHtml: highlightedLines.join('\n')
      };
    }
  };

  // Download diff results
  const downloadDiff = () => {
    if (!diffResult) return;

    const report = {
      summary: {
        added: diffResult.added.length,
        removed: diffResult.removed.length,
        changed: diffResult.changed.length,
        unchanged: diffResult.unchanged.length,
        total: diffResult.added.length + diffResult.removed.length + diffResult.changed.length
      },
      timestamp: new Date().toISOString(),
      differences: {
        added: diffResult.added.map(item => ({
          path: item.path,
          value: item.value
        })),
        removed: diffResult.removed.map(item => ({
          path: item.path,
          value: item.value
        })),
        changed: diffResult.changed.map(item => ({
          path: item.path,
          oldValue: item.oldValue,
          newValue: item.newValue
        }))
      }
    };

    // Format as readable text
    let textReport = 'JSON Diff Report\n';
    textReport += '='.repeat(50) + '\n\n';
    textReport += `Generated: ${new Date().toLocaleString()}\n\n`;
    textReport += 'Summary:\n';
    textReport += `  Added: ${report.summary.added}\n`;
    textReport += `  Removed: ${report.summary.removed}\n`;
    textReport += `  Changed: ${report.summary.changed}\n`;
    textReport += `  Unchanged: ${report.summary.unchanged}\n`;
    textReport += `  Total Differences: ${report.summary.total}\n\n`;

    if (diffResult.added.length > 0) {
      textReport += 'ADDED:\n';
      textReport += '-'.repeat(50) + '\n';
      diffResult.added.forEach((item, idx) => {
        textReport += `${idx + 1}. Path: ${item.path}\n`;
        textReport += `   Value: ${typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : item.value}\n\n`;
      });
    }

    if (diffResult.removed.length > 0) {
      textReport += 'REMOVED:\n';
      textReport += '-'.repeat(50) + '\n';
      diffResult.removed.forEach((item, idx) => {
        textReport += `${idx + 1}. Path: ${item.path}\n`;
        textReport += `   Value: ${typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : item.value}\n\n`;
      });
    }

    if (diffResult.changed.length > 0) {
      textReport += 'CHANGED:\n';
      textReport += '-'.repeat(50) + '\n';
      diffResult.changed.forEach((item, idx) => {
        textReport += `${idx + 1}. Path: ${item.path}\n`;
        textReport += `   Old Value: ${typeof item.oldValue === 'object' ? JSON.stringify(item.oldValue, null, 2) : item.oldValue}\n`;
        textReport += `   New Value: ${typeof item.newValue === 'object' ? JSON.stringify(item.newValue, null, 2) : item.newValue}\n\n`;
      });
    }

    // Create and download file
    const blob = new Blob([textReport], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `json-diff-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GitMerge className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">JSON Diff</h3>
          </div>
          <div className="flex items-center gap-2">
            {!diffResult ? (
              <>
                <button
                  onClick={handleDiff}
                  disabled={!jsonA || !jsonB || jsonAError || jsonBError}
                  className={clsx(
                    'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                    jsonA && jsonB && !jsonAError && !jsonBError
                      ? 'bg-primary text-white hover:bg-primary/90'
                      : 'bg-slate-200 dark:bg-gray-700 text-slate-400 dark:text-gray-500 cursor-not-allowed'
                  )}
                >
                  Compare
                </button>
                <button
                  onClick={clearDiff}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-600 transition"
                >
                  Clear
                </button>
              </>
            ) : (
              <>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-gray-700 rounded-lg">
                  <input
                    type="checkbox"
                    id="highlight-diff"
                    checked={highlightDiff}
                    onChange={(e) => setHighlightDiff(e.target.checked)}
                    className="w-4 h-4 text-red-600 dark:text-red-400 border-slate-300 dark:border-gray-600 rounded focus:ring-red-500"
                  />
                  <label htmlFor="highlight-diff" className="text-sm text-slate-700 dark:text-white cursor-pointer flex items-center gap-2">
                    <Eye className="h-4 w-4" />
                    Highlight Differences
                  </label>
                </div>
                <button
                  onClick={handleBackToEdit}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-600 transition flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Edit
                </button>
                <button
                  onClick={clearDiff}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 text-slate-700 dark:text-white hover:bg-slate-50 dark:hover:bg-gray-600 transition"
                >
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
            <AlertCircle className="h-4 w-4" />
            <span>{error}</span>
          </div>
        )}
      </div>

      {!diffResult ? (
        /* Input Mode - Two editors side by side with validation */
        <div className="flex-1 flex overflow-hidden">
          <div className="w-1/2 flex flex-col border-r border-slate-200 dark:border-gray-700">
            <div className="border-b border-slate-200 dark:border-gray-700 px-4 py-2 bg-slate-50 dark:bg-gray-700 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-white">JSON A (Old/Left)</h4>
              {jsonAError && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded text-xs">
                  <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-900 dark:text-red-300">Invalid</span>
                </div>
              )}
              {jsonA && !jsonAError && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-900 dark:text-green-300">Valid</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <EnhancedJsonEditor
                value={jsonA}
                onChange={(value) => setJsonA(value || '')}
                readOnly={false}
                placeholder="Enter JSON A..."
                errorLine={jsonAError?.line || null}
                errorMessage={jsonAError?.message || null}
              />
            </div>
            {jsonAError && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                <div className="font-semibold">{jsonAError.message}</div>
                {jsonAError.line && (
                  <div className="mt-1">Line {jsonAError.line}{jsonAError.column ? `, Column ${jsonAError.column}` : ''}</div>
                )}
              </div>
            )}
          </div>
          <div className="w-1/2 flex flex-col">
            <div className="border-b border-slate-200 dark:border-gray-700 px-4 py-2 bg-slate-50 dark:bg-gray-700 flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-700 dark:text-white">JSON B (New/Right)</h4>
              {jsonBError && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-800 rounded text-xs">
                  <AlertCircle className="h-3 w-3 text-red-600 dark:text-red-400" />
                  <span className="font-semibold text-red-900 dark:text-red-300">Invalid</span>
                </div>
              )}
              {jsonB && !jsonBError && (
                <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-800 rounded text-xs">
                  <CheckCircle2 className="h-3 w-3 text-green-600 dark:text-green-400" />
                  <span className="font-semibold text-green-900 dark:text-green-300">Valid</span>
                </div>
              )}
            </div>
            <div className="flex-1 overflow-hidden">
              <EnhancedJsonEditor
                value={jsonB}
                onChange={(value) => setJsonB(value || '')}
                readOnly={false}
                placeholder="Enter JSON B..."
                errorLine={jsonBError?.line || null}
                errorMessage={jsonBError?.message || null}
              />
            </div>
            {jsonBError && (
              <div className="px-4 py-2 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-400">
                <div className="font-semibold">{jsonBError.message}</div>
                {jsonBError.line && (
                  <div className="mt-1">Line {jsonBError.line}{jsonBError.column ? `, Column ${jsonBError.column}` : ''}</div>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Diff Result View */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Diff Summary */}
          <div className="border-b border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700 p-4">
            <div className="grid grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">{diffResult.added.length}</div>
                <div className="text-xs text-slate-600 dark:text-gray-400">Added</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{diffResult.removed.length}</div>
                <div className="text-xs text-slate-600 dark:text-gray-400">Removed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{diffResult.changed.length}</div>
                <div className="text-xs text-slate-600 dark:text-gray-400">Changed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-slate-600 dark:text-gray-400">{diffResult.unchanged.length}</div>
                <div className="text-xs text-slate-600 dark:text-gray-400">Unchanged</div>
              </div>
            </div>
          </div>

          {/* Diff Details with Highlight Option */}
          <div className="flex-1 overflow-y-auto p-4">
            {highlightDiff ? (
              /* Highlighted View - Show JSONs side by side with error highlighting */
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <div className="border-b border-slate-200 dark:border-gray-700 px-4 py-2 bg-red-50 dark:bg-red-900/30 mb-2">
                    <h4 className="text-sm font-semibold text-red-700 dark:text-red-300">JSON A (with highlights)</h4>
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {diffResult.removed.length + diffResult.changed.length} differences
                    </p>
                  </div>
                  <div className="flex-1 overflow-hidden border border-red-200 dark:border-red-800 rounded-lg">
                    {(() => {
                      const allDiffItems = [
                        ...diffResult.removed.map(r => ({ path: r.path, type: 'removed', value: r.value })),
                        ...diffResult.changed.map(c => ({ path: c.path, type: 'changed', oldValue: c.oldValue }))
                      ];
                      const highlighted = getHighlightedJson(originalJsonA, 'removed/changed', allDiffItems);
                      return (
                        <div className="w-full h-full overflow-auto bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm p-4" style={{ whiteSpace: 'pre' }} dangerouslySetInnerHTML={{ __html: highlighted.highlightedHtml || highlighted.json }} />
                      );
                    })()}
                  </div>
                </div>
                <div className="flex flex-col">
                  <div className="border-b border-slate-200 dark:border-gray-700 px-4 py-2 bg-green-50 dark:bg-green-900/30 mb-2">
                    <h4 className="text-sm font-semibold text-green-700 dark:text-green-300">JSON B (with highlights)</h4>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {diffResult.added.length + diffResult.changed.length} differences
                    </p>
                  </div>
                  <div className="flex-1 overflow-hidden border border-green-200 dark:border-green-800 rounded-lg">
                    {(() => {
                      const allDiffItems = [
                        ...diffResult.added.map(a => ({ path: a.path, type: 'added', value: a.value })),
                        ...diffResult.changed.map(c => ({ path: c.path, type: 'changed', newValue: c.newValue }))
                      ];
                      const highlighted = getHighlightedJson(originalJsonB, 'added/changed', allDiffItems);
                      return (
                        <div className="w-full h-full overflow-auto bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white font-mono text-sm p-4" style={{ whiteSpace: 'pre' }} dangerouslySetInnerHTML={{ __html: highlighted.highlightedHtml || highlighted.json }} />
                      );
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              /* Summary View */
              <div className="space-y-4">
                {/* Added */}
                {diffResult.added.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-green-600 dark:text-green-400 mb-2 flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4" />
                      Added ({diffResult.added.length})
                    </h4>
                    <div className="space-y-1">
                      {diffResult.added.map((item, idx) => (
                        <div key={idx} className="bg-green-50 dark:bg-green-900/30 border-l-4 border-green-500 dark:border-green-400 p-3 rounded">
                          <div className="font-mono text-xs text-green-700 dark:text-green-300 mb-1">{item.path}</div>
                          <div className="text-sm text-slate-700 dark:text-white">
                            {typeof item.value === 'object' 
                              ? JSON.stringify(item.value, null, 2)
                              : String(item.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Removed */}
                {diffResult.removed.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-red-600 dark:text-red-400 mb-2 flex items-center gap-2">
                      <X className="h-4 w-4" />
                      Removed ({diffResult.removed.length})
                    </h4>
                    <div className="space-y-1">
                      {diffResult.removed.map((item, idx) => (
                        <div key={idx} className="bg-red-50 dark:bg-red-900/30 border-l-4 border-red-500 dark:border-red-400 p-3 rounded">
                          <div className="font-mono text-xs text-red-700 dark:text-red-300 mb-1">{item.path}</div>
                          <div className="text-sm text-slate-700 dark:text-white">
                            {typeof item.value === 'object' 
                              ? JSON.stringify(item.value, null, 2)
                              : String(item.value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Changed */}
                {diffResult.changed.length > 0 && (
                  <div>
                    <h4 className="text-sm font-semibold text-yellow-600 dark:text-yellow-400 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Changed ({diffResult.changed.length})
                    </h4>
                    <div className="space-y-1">
                      {diffResult.changed.map((item, idx) => (
                        <div key={idx} className="bg-yellow-50 dark:bg-yellow-900/30 border-l-4 border-yellow-500 dark:border-yellow-400 p-3 rounded">
                          <div className="font-mono text-xs text-yellow-700 dark:text-yellow-300 mb-2">{item.path}</div>
                          <div className="space-y-1 text-sm">
                            <div className="text-red-700 dark:text-red-300">
                              <span className="font-semibold">Old:</span>{' '}
                              {typeof item.oldValue === 'object' 
                                ? JSON.stringify(item.oldValue, null, 2)
                                : String(item.oldValue)}
                            </div>
                            <div className="text-green-700 dark:text-green-300">
                              <span className="font-semibold">New:</span>{' '}
                              {typeof item.newValue === 'object' 
                                ? JSON.stringify(item.newValue, null, 2)
                                : String(item.newValue)}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Unchanged (optional, can be collapsed) */}
                {diffResult.unchanged.length > 0 && diffResult.unchanged.length < 20 && (
                  <div>
                    <h4 className="text-sm font-semibold text-slate-600 dark:text-gray-400 mb-2">
                      Unchanged ({diffResult.unchanged.length})
                    </h4>
                    <div className="space-y-1">
                      {diffResult.unchanged.map((item, idx) => (
                        <div key={idx} className="bg-slate-50 dark:bg-gray-700 border-l-4 border-slate-300 dark:border-gray-600 p-2 rounded text-xs">
                          <span className="font-mono text-slate-600 dark:text-gray-400">{item.path}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonDiff;
