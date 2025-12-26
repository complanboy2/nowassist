/**
 * JSON Utility Functions
 * Shared utilities for JSON transformation, sorting, flattening, etc.
 */

/**
 * Sort JSON keys recursively
 * @param {any} obj - Object to sort
 * @param {string} order - 'asc' | 'desc'
 * @returns {any} Sorted object
 */
export const sortKeys = (obj, order = 'asc') => {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => sortKeys(item, order));
  }

  const sorted = {};
  const keys = Object.keys(obj).sort((a, b) => {
    if (order === 'desc') {
      return b.localeCompare(a);
    }
    return a.localeCompare(b);
  });

  keys.forEach(key => {
    const value = obj[key];
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      sorted[key] = sortKeys(value, order);
    } else if (Array.isArray(value)) {
      sorted[key] = value.map(item => sortKeys(item, order));
    } else {
      sorted[key] = value;
    }
  });

  return sorted;
};

/**
 * Flatten nested JSON object
 * @param {object} obj - Object to flatten
 * @param {string} prefix - Prefix for keys
 * @param {string} separator - Separator between keys
 * @returns {object} Flattened object
 */
export const flattenJson = (obj, prefix = '', separator = '.') => {
  const flattened = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const newKey = prefix ? `${prefix}${separator}${key}` : key;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        Object.assign(flattened, flattenJson(value, newKey, separator));
      } else if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item === 'object' && item !== null) {
            Object.assign(flattened, flattenJson(item, `${newKey}[${index}]`, separator));
          } else {
            flattened[`${newKey}[${index}]`] = item;
          }
        });
      } else {
        flattened[newKey] = value;
      }
    }
  }

  return flattened;
};

/**
 * Unflatten JSON object
 * @param {object} obj - Flattened object
 * @param {string} separator - Separator used in keys
 * @returns {object} Nested object
 */
export const unflattenJson = (obj, separator = '.') => {
  const result = {};

  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const keys = key.split(separator);
      let current = result;

      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        // Handle array indices
        const arrayMatch = k.match(/^(.+)\[(\d+)\]$/);
        if (arrayMatch) {
          const arrayKey = arrayMatch[1];
          const arrayIndex = parseInt(arrayMatch[2]);
          
          if (!current[arrayKey]) {
            current[arrayKey] = [];
          }
          if (!current[arrayKey][arrayIndex]) {
            current[arrayKey][arrayIndex] = {};
          }
          current = current[arrayKey][arrayIndex];
        } else {
          if (!current[k]) {
            current[k] = {};
          }
          current = current[k];
        }
      }

      const lastKey = keys[keys.length - 1];
      const arrayMatch = lastKey.match(/^(.+)\[(\d+)\]$/);
      if (arrayMatch) {
        const arrayKey = arrayMatch[1];
        const arrayIndex = parseInt(arrayMatch[2]);
        if (!current[arrayKey]) {
          current[arrayKey] = [];
        }
        current[arrayKey][arrayIndex] = obj[key];
      } else {
        current[lastKey] = obj[key];
      }
    }
  }

  return result;
};

/**
 * Convert JSON array to CSV
 * @param {array} jsonArray - Array of objects
 * @returns {string} CSV string
 */
export const jsonToCsv = (jsonArray) => {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) {
    throw new Error('Input must be a non-empty array of objects');
  }

  // Get all unique keys from all objects
  const allKeys = new Set();
  jsonArray.forEach(obj => {
    if (typeof obj === 'object' && obj !== null) {
      Object.keys(obj).forEach(key => allKeys.add(key));
    }
  });

  const headers = Array.from(allKeys);

  // Escape CSV values
  const escapeCsv = (value) => {
    if (value === null || value === undefined) return '';
    const str = String(value);
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  // Build CSV rows
  const rows = [
    headers.map(escapeCsv).join(','), // Header row
    ...jsonArray.map(obj => {
      return headers.map(header => {
        const value = obj[header];
        if (typeof value === 'object' && value !== null) {
          return escapeCsv(JSON.stringify(value));
        }
        return escapeCsv(value);
      }).join(',');
    }),
  ];

  return rows.join('\n');
};

/**
 * Convert CSV to JSON array
 * @param {string} csv - CSV string
 * @returns {array} Array of objects
 */
export const csvToJson = (csv) => {
  const lines = csv.split('\n').filter(line => line.trim());
  if (lines.length === 0) {
    throw new Error('CSV is empty');
  }

  // Parse CSV line (handles quoted values)
  const parseCsvLine = (line) => {
    const values = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      const nextChar = line[i + 1];

      if (char === '"') {
        if (inQuotes && nextChar === '"') {
          current += '"';
          i++; // Skip next quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    values.push(current); // Add last value

    return values;
  };

  const headers = parseCsvLine(lines[0]);
  const rows = lines.slice(1).map(line => {
    const values = parseCsvLine(line);
    const obj = {};
    headers.forEach((header, index) => {
      let value = values[index] || '';
      // Try to parse as JSON if it looks like JSON
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          value = JSON.parse(value);
        } catch {
          // Keep as string
        }
      }
      obj[header] = value;
    });
    return obj;
  });

  return rows;
};

/**
 * Deep diff two JSON objects
 * @param {any} obj1 - First object
 * @param {any} obj2 - Second object
 * @param {string} path - Current path (for recursion)
 * @returns {object} Diff result
 */
export const diffJson = (obj1, obj2, path = '$') => {
  const diffs = {
    added: [],
    removed: [],
    changed: [],
    unchanged: [],
  };

  const compare = (val1, val2, currentPath) => {
    // Both are primitives
    if (typeof val1 !== 'object' || val1 === null || typeof val2 !== 'object' || val2 === null) {
      if (val1 !== val2) {
        diffs.changed.push({
          path: currentPath,
          oldValue: val1,
          newValue: val2,
        });
      } else {
        diffs.unchanged.push({
          path: currentPath,
          value: val1,
        });
      }
      return;
    }

    // Both are arrays
    if (Array.isArray(val1) && Array.isArray(val2)) {
      const maxLen = Math.max(val1.length, val2.length);
      for (let i = 0; i < maxLen; i++) {
        const itemPath = `${currentPath}[${i}]`;
        if (i >= val1.length) {
          diffs.added.push({
            path: itemPath,
            value: val2[i],
          });
        } else if (i >= val2.length) {
          diffs.removed.push({
            path: itemPath,
            value: val1[i],
          });
        } else {
          compare(val1[i], val2[i], itemPath);
        }
      }
      return;
    }

    // Both are objects
    const allKeys = new Set([...Object.keys(val1), ...Object.keys(val2)]);

    allKeys.forEach(key => {
      const itemPath = currentPath === '$' ? `$.${key}` : `${currentPath}.${key}`;
      
      if (!(key in val1)) {
        diffs.added.push({
          path: itemPath,
          value: val2[key],
        });
      } else if (!(key in val2)) {
        diffs.removed.push({
          path: itemPath,
          value: val1[key],
        });
      } else {
        compare(val1[key], val2[key], itemPath);
      }
    });
  };

  compare(obj1, obj2, path);

  return diffs;
};

