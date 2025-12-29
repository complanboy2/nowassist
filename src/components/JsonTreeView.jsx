import React, { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, Copy, Search, Edit2, Check, X } from 'lucide-react';
import clsx from 'clsx';

/**
 * JSON Tree View Component
 * Displays JSON as an expandable tree structure
 * Supports path navigation, copy functionality, and inline editing
 */

const JsonTreeView = ({ jsonData, onPathSelect, onUpdate, editable = false }) => {
  const [expandedPaths, setExpandedPaths] = useState(new Set(['$']));
  const [selectedPath, setSelectedPath] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingPath, setEditingPath] = useState(null);
  const [editingValue, setEditingValue] = useState('');
  const [localJsonData, setLocalJsonData] = useState(jsonData);
  const clickTimeoutRef = React.useRef(null);

  // Update local data when jsonData prop changes
  React.useEffect(() => {
    setLocalJsonData(jsonData);
  }, [jsonData]);

  // Build tree structure
  const treeNodes = useMemo(() => {
    if (!localJsonData) return [];

    const buildNodes = (obj, path = '$', depth = 0) => {
      const nodes = [];

      if (obj === null) {
        nodes.push({
          path,
          key: path.split(/[.\[\]]+/).filter(Boolean).pop() || 'root',
          value: null,
          type: 'null',
          depth,
          isLeaf: true,
        });
        return nodes;
      }

      if (typeof obj !== 'object') {
        nodes.push({
          path,
          key: path.split(/[.\[\]]+/).filter(Boolean).pop() || 'root',
          value: obj,
          type: typeof obj,
          depth,
          isLeaf: true,
        });
        return nodes;
      }

      if (Array.isArray(obj)) {
        obj.forEach((item, index) => {
          const itemPath = `${path}[${index}]`;
          if (typeof item === 'object' && item !== null) {
            nodes.push({
              path: itemPath,
              key: `[${index}]`,
              value: item,
              type: Array.isArray(item) ? 'array' : 'object',
              depth,
              isLeaf: false,
            });
            nodes.push(...buildNodes(item, itemPath, depth + 1));
          } else {
            nodes.push({
              path: itemPath,
              key: `[${index}]`,
              value: item,
              type: typeof item,
              depth,
              isLeaf: true,
            });
          }
        });
      } else {
        Object.keys(obj).forEach(key => {
          const value = obj[key];
          const keyPath = path === '$' ? `$.${key}` : `${path}.${key}`;
          
          if (typeof value === 'object' && value !== null) {
            nodes.push({
              path: keyPath,
              key,
              value,
              type: Array.isArray(value) ? 'array' : 'object',
              depth,
              isLeaf: false,
            });
            nodes.push(...buildNodes(value, keyPath, depth + 1));
          } else {
            nodes.push({
              path: keyPath,
              key,
              value,
              type: typeof value === 'string' ? 'string' : typeof value,
              depth,
              isLeaf: true,
            });
          }
        });
      }

      return nodes;
    };

    return buildNodes(localJsonData);
  }, [localJsonData]);

  // Filter nodes based on search
  const filteredNodes = useMemo(() => {
    if (!searchQuery) return treeNodes;

    const query = searchQuery.toLowerCase();
    return treeNodes.filter(node => {
      const keyMatch = node.key.toLowerCase().includes(query);
      const pathMatch = node.path.toLowerCase().includes(query);
      const valueMatch = node.isLeaf && String(node.value).toLowerCase().includes(query);
      return keyMatch || pathMatch || valueMatch;
    });
  }, [treeNodes, searchQuery]);

  // Check if a node should be visible (parent expanded)
  const isNodeVisible = (node) => {
    if (!node.path || node.path === '$') return true;
    
    // Build parent paths progressively to check if all are expanded
    // Handle paths like $.example, $.example.items, $.example.items[0], etc.
    const pathParts = node.path.slice(2); // Remove '$.' prefix
    if (!pathParts) return true;
    
    // Split by '.' and '[' to handle both object and array paths
    const segments = [];
    let currentSegment = '';
    let inBracket = false;
    
    for (let i = 0; i < pathParts.length; i++) {
      const char = pathParts[i];
      if (char === '[') {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = '';
        }
        inBracket = true;
      } else if (char === ']') {
        if (inBracket && currentSegment) {
          segments.push(`[${currentSegment}]`);
          currentSegment = '';
          inBracket = false;
        }
      } else if (char === '.' && !inBracket) {
        if (currentSegment) {
          segments.push(currentSegment);
          currentSegment = '';
        }
      } else {
        currentSegment += char;
      }
    }
    if (currentSegment) {
      segments.push(currentSegment);
    }
    
    // Build and check each parent path
    for (let i = 1; i < segments.length; i++) {
      const parentSegments = segments.slice(0, i);
      let parentPath = '$';
      
      for (const seg of parentSegments) {
        if (seg.startsWith('[')) {
          parentPath += seg;
        } else {
          parentPath += parentPath === '$' ? `.${seg}` : `.${seg}`;
        }
      }
      
      if (!expandedPaths.has(parentPath)) {
        return false;
      }
    }
    
    return true;
  };

  const toggleExpand = (path) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleNodeClick = (node, e) => {
    if (editingPath) return; // Don't select while editing
    // Don't handle clicks that are part of a double-click
    if (e && e.detail === 2) return;
    
    setSelectedPath(node.path);
    if (onPathSelect) {
      onPathSelect(node.path, node.value);
    }
  };

  const startEditing = (node, e) => {
    if (!editable || !node.isLeaf) return;
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    // Clear selection to prevent onPathSelect from being called
    setSelectedPath(null);
    setEditingPath(node.path);
    setEditingValue(String(node.value === null ? 'null' : node.value));
  };

  const cancelEditing = () => {
    setEditingPath(null);
    setEditingValue('');
  };

  const saveEditing = () => {
    if (!editingPath) return;

    try {
      const updatedData = updateValueAtPath(localJsonData, editingPath, editingValue);
      setLocalJsonData(updatedData);
      
      if (onUpdate) {
        onUpdate(updatedData);
      }
      
      setEditingPath(null);
      setEditingValue('');
    } catch (err) {
      console.error('Failed to update value:', err);
      alert('Failed to update value: ' + err.message);
    }
  };

  // Update value at a given path in the JSON structure
  const updateValueAtPath = (data, path, newValueStr) => {
    const cloned = JSON.parse(JSON.stringify(data));
    const cleanPath = path.startsWith('$.') ? path.substring(2) : path;
    
    // Parse the new value based on type
    let newValue;
    const trimmed = newValueStr.trim();
    
    if (trimmed === 'null') {
      newValue = null;
    } else if (trimmed === 'true') {
      newValue = true;
    } else if (trimmed === 'false') {
      newValue = false;
    } else if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
      // Remove quotes from string
      newValue = trimmed.slice(1, -1);
    } else if (!isNaN(trimmed) && trimmed !== '') {
      // Number
      newValue = Number(trimmed);
    } else {
      // Default to string
      newValue = trimmed;
    }

    // Navigate to the path and update
    const parts = cleanPath.split('.');
    let current = cloned;
    
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const arrayMatch = part.match(/^(.+)\[(\d+)\]$/);
      
      if (arrayMatch) {
        const key = arrayMatch[1];
        const index = parseInt(arrayMatch[2]);
        current = current[key][index];
      } else {
        current = current[part];
      }
    }
    
    const lastPart = parts[parts.length - 1];
    const arrayMatch = lastPart.match(/^(.+)\[(\d+)\]$/);
    
    if (arrayMatch) {
      const key = arrayMatch[1];
      const index = parseInt(arrayMatch[2]);
      current[key][index] = newValue;
    } else {
      current[lastPart] = newValue;
    }
    
    return cloned;
  };

  const copyPath = async (path) => {
    await navigator.clipboard.writeText(path);
  };

  const copyValue = async (value) => {
    if (typeof value === 'object') {
      await navigator.clipboard.writeText(JSON.stringify(value, null, 2));
    } else {
      await navigator.clipboard.writeText(String(value));
    }
  };

  const formatValue = (value, type) => {
    if (value === null) return 'null';
    if (type === 'string') return `"${value}"`;
    if (type === 'undefined') return 'undefined';
    return String(value);
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'string': return 'text-green-600 dark:text-green-400';
      case 'number': return 'text-blue-600 dark:text-blue-400';
      case 'boolean': return 'text-purple-600 dark:text-purple-400';
      case 'null': return 'text-slate-400 dark:text-gray-500';
      case 'object': return 'text-orange-600 dark:text-orange-400';
      case 'array': return 'text-pink-600 dark:text-pink-400';
      default: return 'text-slate-600 dark:text-gray-400';
    }
  };

  if (!localJsonData) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-gray-400">
        No JSON data to display. Please load or paste JSON.
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search Bar */}
      <div className="border-b border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search keys, paths, or values..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-9 pr-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-gray-500 focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-y-auto p-4 bg-white dark:bg-gray-800">
        {filteredNodes.length === 0 ? (
          <div className="text-center text-slate-500 dark:text-gray-400 py-8">
            No matching nodes found
          </div>
        ) : (
          <div className="space-y-1">
            {filteredNodes.map((node, index) => {
              if (!isNodeVisible(node)) return null;

              const isExpanded = expandedPaths.has(node.path);
              const isSelected = selectedPath === node.path;
              const isEditing = editingPath === node.path;
              const indent = node.depth * 20;

              return (
                <div
                  key={`${node.path}-${index}`}
                  className={clsx(
                    'flex items-center gap-2 py-1 px-2 rounded hover:bg-slate-50 dark:hover:bg-gray-700 transition',
                    isSelected && !isEditing && 'bg-blue-50 dark:bg-blue-900/30 border-l-2 border-blue-500 dark:border-blue-400 cursor-pointer',
                    isEditing && 'bg-yellow-50 dark:bg-yellow-900/30 border-l-2 border-yellow-500 dark:border-yellow-400'
                  )}
                  style={{ marginLeft: `${indent}px` }}
                  onClick={(e) => {
                    if (isEditing) return;
                    
                    // Clear any existing timeout
                    if (clickTimeoutRef.current) {
                      clearTimeout(clickTimeoutRef.current);
                    }
                    
                    // Set a timeout for single click - will be cancelled if double-click occurs
                    clickTimeoutRef.current = setTimeout(() => {
                      if (!editingPath && e.detail === 1) {
                        handleNodeClick(node, e);
                      }
                    }, 300);
                  }}
                  onDoubleClick={(e) => {
                    if (editable && node.isLeaf && !isEditing) {
                      e.stopPropagation();
                      e.preventDefault();
                      
                      // Cancel the single-click timeout
                      if (clickTimeoutRef.current) {
                        clearTimeout(clickTimeoutRef.current);
                        clickTimeoutRef.current = null;
                      }
                      
                      // Clear selection and start editing
                      setSelectedPath(null);
                      startEditing(node, e);
                    }
                  }}
                >
                  {!node.isLeaf && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleExpand(node.path);
                      }}
                      className="p-0.5 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition"
                    >
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-slate-600 dark:text-gray-400" />
                      )}
                    </button>
                  )}
                  {node.isLeaf && !isEditing && <div className="w-5" />}

                  <span className="font-mono text-sm font-semibold text-slate-700 dark:text-white">
                    {node.key}:
                  </span>

                  {node.isLeaf ? (
                    isEditing ? (
                      <>
                        <input
                          type="text"
                          value={editingValue}
                          onChange={(e) => setEditingValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              saveEditing();
                            } else if (e.key === 'Escape') {
                              e.preventDefault();
                              cancelEditing();
                            }
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 border border-blue-400 dark:border-blue-500 rounded bg-white dark:bg-gray-700 text-sm font-mono text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onClick={(e) => e.stopPropagation()}
                        />
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            saveEditing();
                          }}
                          className="p-1 hover:bg-green-200 dark:hover:bg-green-900/50 rounded transition text-green-600 dark:text-green-400"
                          title="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            cancelEditing();
                          }}
                          className="p-1 hover:bg-red-200 dark:hover:bg-red-900/50 rounded transition text-red-600 dark:text-red-400"
                          title="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span 
                          className={clsx('font-mono text-sm select-none', getTypeColor(node.type))}
                          onDoubleClick={editable ? (e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            startEditing(node, e);
                          } : undefined}
                          style={{ cursor: editable ? 'pointer' : 'default' }}
                          title={editable ? 'Double-click to edit' : ''}
                        >
                          {formatValue(node.value, node.type)}
                        </span>
                        <div className="flex-1" />
                        {editable && (
                          <button
                            onClick={(e) => startEditing(node, e)}
                            className="p-1 hover:bg-blue-200 dark:hover:bg-blue-900/50 rounded transition opacity-70 hover:opacity-100"
                            title="Edit value"
                          >
                            <Edit2 className="h-3 w-3 text-blue-500 dark:text-blue-400" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            copyValue(node.value);
                          }}
                          className="p-1 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition opacity-70 hover:opacity-100"
                          title="Copy value"
                        >
                          <Copy className="h-3 w-3 text-slate-500 dark:text-gray-400" />
                        </button>
                      </>
                    )
                  ) : (
                    <>
                      <span className="text-xs text-slate-500 dark:text-gray-400">
                        {Array.isArray(node.value) 
                          ? `Array(${node.value.length})`
                          : `Object(${Object.keys(node.value).length})`}
                      </span>
                      <div className="flex-1" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyPath(node.path);
                        }}
                        className="p-1 hover:bg-slate-200 dark:hover:bg-gray-600 rounded transition opacity-70 hover:opacity-100"
                        title="Copy path"
                      >
                        <Copy className="h-3 w-3 text-slate-500 dark:text-gray-400" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Selected Path Info */}
      {selectedPath && !editingPath && (
        <div className="border-t border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700 p-3">
          <div className="text-xs text-slate-600 dark:text-gray-400 mb-1">Selected Path:</div>
          <div className="font-mono text-sm text-slate-900 dark:text-white mb-2">{selectedPath}</div>
          <div className="flex gap-2">
            <button
              onClick={() => copyPath(selectedPath)}
              className="text-xs px-2 py-1 bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-600 rounded hover:bg-slate-50 dark:hover:bg-gray-600 transition flex items-center gap-1 text-slate-700 dark:text-white"
            >
              <Copy className="h-3 w-3" />
              Copy Path
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default JsonTreeView;
