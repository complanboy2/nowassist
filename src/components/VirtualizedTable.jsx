import React, { memo, useMemo } from 'react';
import { FixedSizeList as List, areEqual } from 'react-window';

/**
 * Virtualized Table Component for Large HAR Files
 * 
 * Handles rendering of thousands of rows without performance issues.
 * Supports dynamic row heights for expandable rows.
 */
const VirtualizedTable = ({
  items,
  height = 600,
  rowHeight = 50,
  renderRow,
  expandedRows = new Set(),
  expandedRowHeight = 300,
  getRowKey = (index) => index,
}) => {
  // Calculate dynamic row heights
  const getItemSize = (index) => {
    const isExpanded = expandedRows.has(getRowKey(index));
    return isExpanded ? rowHeight + expandedRowHeight : rowHeight;
  };

  // Memoize row renderer
  const Row = memo(({ index, style }) => {
    const item = items[index];
    return (
      <div style={style}>
        {renderRow({ item, index, isExpanded: expandedRows.has(getRowKey(index)) })}
      </div>
    );
  }, areEqual);

  // Estimate total height (can be improved with dynamic calculation)
  const estimatedTotalHeight = items.length * rowHeight;

  return (
    <List
      height={Math.min(height, estimatedTotalHeight)}
      itemCount={items.length}
      itemSize={getItemSize}
      width="100%"
      overscanCount={5} // Render 5 extra items outside visible area for smooth scrolling
    >
      {Row}
    </List>
  );
};

export default VirtualizedTable;

