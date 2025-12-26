import React, { useMemo, useRef, useEffect, useState, useCallback } from 'react';
import { List, useDynamicRowHeight } from 'react-window';
import clsx from 'clsx';
import { ChevronUp, ChevronDown } from 'lucide-react';

/**
 * Virtualized HAR Table Component
 * Uses react-window v2 API for efficient rendering of large lists
 */

const ROW_HEIGHT = 48;
const GROUP_HEADER_HEIGHT = 48;

const VirtualizedHarTable = ({
  filteredEntries,
  groupedEntries,
  groupBy,
  expandedGroups,
  toggleGroup,
  selectedEntryIndex,
  setSelectedEntryIndex,
  getStatusColor,
  formatBytes,
  formatTime,
  searchQuery,
  highlightText,
  handleSort,
  sortBy,
  sortOrder,
  entries, // For empty state
}) => {
  const listRef = useRef(null);
  const containerRef = useRef(null);
  const [containerHeight, setContainerHeight] = useState(600);
  const rowHeightsRef = useRef({});

  // Dynamic row height hook for variable sizes
  const dynamicRowHeight = useDynamicRowHeight({ defaultRowHeight: ROW_HEIGHT });

  // Flatten entries for virtual list
  const flatList = useMemo(() => {
    if (filteredEntries.length === 0) return [];

    if (groupBy === 'none') {
      return filteredEntries.map((entry, index) => ({
        type: 'entry',
        entry,
        index,
      }));
    }

    const flat = [];
    Object.entries(groupedEntries).forEach(([groupKey, groupEntries]) => {
      const isExpanded = expandedGroups.has(groupKey);
      
      flat.push({
        type: 'group-header',
        groupKey,
        groupEntries,
        isExpanded,
      });

      if (isExpanded) {
        groupEntries.forEach((entry) => {
          const entryIndex = filteredEntries.indexOf(entry);
          if (entryIndex >= 0) {
            flat.push({
              type: 'entry',
              entry,
              index: entryIndex,
            });
          }
        });
      }
    });

    return flat;
  }, [filteredEntries, groupedEntries, groupBy, expandedGroups]);

  // Get row height function
  const getRowHeight = useCallback((index) => {
    const item = flatList[index];
    if (item?.type === 'group-header') {
      return GROUP_HEADER_HEIGHT;
    }
    // Check cached height
    if (rowHeightsRef.current[index] !== undefined) {
      return rowHeightsRef.current[index];
    }
    return ROW_HEIGHT;
  }, [flatList]);

  // Update container height
  useEffect(() => {
    const updateHeight = () => {
      if (containerRef.current) {
        const height = containerRef.current.clientHeight;
        if (height > 0) {
          setContainerHeight(height);
        }
      }
    };
    updateHeight();
    const resizeObserver = new ResizeObserver(updateHeight);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }
    return () => resizeObserver.disconnect();
  }, []);

  // Reset heights when data changes
  useEffect(() => {
    rowHeightsRef.current = {};
  }, [flatList.length, expandedGroups]);

  // Sortable Header Component
  const SortableHeader = ({ column, children, className = '' }) => (
    <div
      onClick={() => handleSort(column)}
      className={clsx(
        'px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider cursor-pointer hover:bg-slate-100 transition select-none',
        className
      )}
    >
      <div className="flex items-center gap-2">
        <span>{children}</span>
        {sortBy === column && (
          sortOrder === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
        )}
      </div>
    </div>
  );

  // Row component for react-window v2 API
  const RowComponent = useCallback(({ index, style, ariaAttributes }) => {
    const item = flatList[index];
    if (!item) return null;

    // Group header
    if (item.type === 'group-header') {
      return (
        <div style={style} {...ariaAttributes}>
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
            <button
              onClick={() => {
                toggleGroup(item.groupKey);
                setTimeout(() => {
                  if (listRef.current) {
                    listRef.current.resetAfterIndex(index);
                  }
                }, 100);
              }}
              className="w-full flex items-center justify-between"
            >
              <span className="font-semibold text-slate-900">
                {item.groupKey} ({item.groupEntries.length})
              </span>
              {item.isExpanded ? (
                <ChevronUp className="h-4 w-4 text-slate-600" />
              ) : (
                <ChevronDown className="h-4 w-4 text-slate-600" />
              )}
            </button>
          </div>
        </div>
      );
    }

    // Entry row
    const { entry, index: entryIndex } = item;
    const status = entry.response?.status || 0;
    const method = entry.request?.method || 'GET';
    const url = entry.request?.url || '';
    const contentType = entry.response?.content?.mimeType || '';
    const size = entry.response?.content?.size || 0;
    const time = entry.time || 0;
    const isSelected = selectedEntryIndex === entryIndex;

    return (
      <div
        style={style}
        {...ariaAttributes}
        className={clsx(
          'border-b border-slate-100 transition cursor-pointer',
          isSelected ? 'bg-blue-50 border-l-4 border-l-blue-500' : 'hover:bg-slate-50'
        )}
        onClick={() => setSelectedEntryIndex(entryIndex)}
      >
        <div className="flex items-center h-full">
          <div className="w-[100px] px-4 py-2 flex-shrink-0">
            <span className="text-xs font-mono font-semibold text-slate-700">{method}</span>
          </div>
          <div className="w-[100px] px-4 py-2 flex-shrink-0">
            {status ? (
              <span className={clsx('inline-block px-2 py-0.5 rounded text-xs font-semibold text-white', getStatusColor(status))}>
                {status}
              </span>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
          <div className="flex-1 px-4 py-2 min-w-0">
            <div className="text-xs text-slate-600 truncate" title={url}>
              {highlightText(url, searchQuery)}
            </div>
          </div>
          <div className="w-[150px] px-4 py-2 flex-shrink-0">
            <div className="text-xs text-slate-600 truncate" title={contentType}>
              {highlightText(contentType.split(';')[0] || '—', searchQuery)}
            </div>
          </div>
          <div className="w-[120px] px-4 py-2 flex-shrink-0">
            <span className="text-xs font-mono text-slate-600">{formatBytes(size)}</span>
          </div>
          <div className="w-[120px] px-4 py-2 flex-shrink-0">
            <span className="text-xs font-mono text-slate-600">{formatTime(time)}</span>
          </div>
        </div>
      </div>
    );
  }, [flatList, selectedEntryIndex, searchQuery, getStatusColor, formatBytes, formatTime, highlightText, toggleGroup, setSelectedEntryIndex]);

  // Empty state
  if (filteredEntries.length === 0 && entries.length > 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12">
        <div className="text-center">
          <div className="text-slate-400 mb-4">No requests match your filters</div>
        </div>
      </div>
    );
  }

  if (flatList.length === 0) {
    return (
      <div className="w-full h-full flex items-center justify-center p-12">
        <div className="text-center">
          <div className="text-slate-400 mb-4">No requests to display</div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full h-full flex flex-col">
      {/* Sortable Header */}
      <div className="border-b-2 border-slate-300 bg-slate-50 sticky top-0 z-10 flex-shrink-0">
        <div className="flex items-center">
          <SortableHeader column="method" className="w-[100px]">Method</SortableHeader>
          <SortableHeader column="status" className="w-[100px]">Status</SortableHeader>
          <SortableHeader column="url" className="flex-1">URL</SortableHeader>
          <div className="w-[150px] px-4 py-3 text-left text-xs font-semibold text-slate-700 uppercase tracking-wider">Type</div>
          <SortableHeader column="size" className="w-[120px]">Size</SortableHeader>
          <SortableHeader column="time" className="w-[120px]">Time</SortableHeader>
        </div>
      </div>

      {/* Virtualized List */}
      <div className="flex-1 min-h-0">
        <List
          listRef={listRef}
          rowCount={flatList.length}
          rowComponent={RowComponent}
          rowHeight={getRowHeight}
          rowProps={{}}
          style={{ height: containerHeight - 48 }}
          overscanCount={5}
        />
      </div>
    </div>
  );
};

export default VirtualizedHarTable;
