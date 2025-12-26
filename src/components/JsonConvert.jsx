import React, { useState } from 'react';
import { Copy, Download as DownloadIcon, FileJson, FileSpreadsheet, ArrowRight, AlertCircle } from 'lucide-react';
import clsx from 'clsx';
import { jsonToCsv, csvToJson } from '../utils/jsonUtils';

const JsonConvert = ({ inputJson, isValidJson, onOutputUpdate }) => {
  const [convertType, setConvertType] = useState('csv'); // 'csv' | 'ts' | 'zod' | 'yup'
  const [convertError, setConvertError] = useState(null);
  const [outputText, setOutputText] = useState('');

  const handleJsonToCsv = () => {
    setConvertError(null);
    if (!isValidJson || !inputJson) {
      setConvertError('Please provide valid JSON first');
      return;
    }

    try {
      const parsed = JSON.parse(inputJson);
      
      if (!Array.isArray(parsed)) {
        setConvertError('JSON must be an array of objects for CSV conversion');
        return;
      }

      if (parsed.length === 0) {
        setConvertError('Array must not be empty');
        return;
      }

      const csv = jsonToCsv(parsed);
      setOutputText(csv);
      if (onOutputUpdate) {
        onOutputUpdate(csv);
      }
    } catch (err) {
      setConvertError(err.message);
    }
  };

  const handleCsvToJson = () => {
    setConvertError(null);
    if (!inputJson || !inputJson.trim()) {
      setConvertError('Please provide CSV data first');
      return;
    }

    try {
      const jsonArray = csvToJson(inputJson);
      const formatted = JSON.stringify(jsonArray, null, 2);
      setOutputText(formatted);
      if (onOutputUpdate) {
        onOutputUpdate(formatted);
      }
    } catch (err) {
      setConvertError(err.message);
    }
  };

  const copyOutput = async () => {
    if (outputText) {
      await navigator.clipboard.writeText(outputText);
    }
  };

  const downloadOutput = () => {
    if (!outputText) return;

    const extension = convertType === 'csv' ? 'csv' : 'txt';
    const mimeType = convertType === 'csv' ? 'text/csv' : 'text/plain';
    
    const blob = new Blob([outputText], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `output.${extension}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Convert Options */}
      <div className="border-b border-slate-200 bg-white p-4">
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-slate-700">Convert:</span>
          <button
            onClick={() => {
              setConvertType('csv');
              setOutputText('');
              setConvertError(null);
            }}
            className={clsx(
              'px-4 py-2 rounded-lg text-sm font-medium transition',
              convertType === 'csv'
                ? 'bg-primary text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            )}
          >
            JSON ↔ CSV
          </button>
          <span className="text-xs text-slate-500">More formats coming soon...</span>
        </div>
      </div>

      {/* Convert Actions */}
      {convertType === 'csv' && (
        <div className="border-b border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleJsonToCsv}
              disabled={!isValidJson}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                isValidJson
                  ? 'bg-primary text-white hover:bg-primary/90'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              <FileJson className="h-4 w-4" />
              JSON to CSV
              <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={handleCsvToJson}
              disabled={!inputJson || !inputJson.trim()}
              className={clsx(
                'px-4 py-2 rounded-lg text-sm font-medium transition flex items-center gap-2',
                inputJson && inputJson.trim()
                  ? 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              )}
            >
              <FileSpreadsheet className="h-4 w-4" />
              CSV to JSON
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
          {convertError && (
            <div className="mt-3 flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="h-4 w-4" />
              <span>{convertError}</span>
            </div>
          )}
        </div>
      )}

      {/* Output */}
      <div className="flex-1 flex flex-col bg-white overflow-hidden">
        <div className="border-b border-slate-200 px-4 py-2 bg-slate-50 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Output</h3>
          <div className="flex items-center gap-2">
            {outputText && (
              <>
                <button
                  onClick={copyOutput}
                  className="p-1.5 rounded text-slate-500 hover:bg-slate-200 transition"
                  title="Copy"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <button
                  onClick={downloadOutput}
                  className="p-1.5 rounded text-slate-500 hover:bg-slate-200 transition"
                  title="Download"
                >
                  <DownloadIcon className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {outputText ? (
            <pre className="font-mono text-sm text-slate-900 whitespace-pre-wrap break-words">
              {outputText}
            </pre>
          ) : (
            <div className="flex items-center justify-center h-full text-slate-400">
              <div className="text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>Select a conversion type and click convert</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JsonConvert;

