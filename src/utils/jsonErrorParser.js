/**
 * Enhanced JSON Error Parser
 * Extracts clear, actionable error information from JSON parsing errors
 */

/**
 * Parse JSON error and extract detailed information
 * @param {Error} error - The JSON parsing error
 * @param {string} jsonText - The JSON text that caused the error
 * @returns {Object} - Parsed error information
 */
export function parseJsonError(error, jsonText) {
  if (!error || !error.message) {
    return {
      message: 'Unknown JSON error',
      line: null,
      column: null,
      position: null,
      suggestion: 'Please check your JSON syntax.',
      context: null,
    };
  }

  const errorMessage = error.message;
  const lines = jsonText ? jsonText.split('\n') : [];

  // Extract line number from error message (e.g., "Unexpected token in JSON at position 123")
  let line = null;
  let column = null;
  let position = null;

  // Pattern 1: "at position X" or "at line X column Y"
  const positionMatch = errorMessage.match(/position\s+(\d+)/i);
  if (positionMatch) {
    position = parseInt(positionMatch[1], 10);
    if (jsonText && position >= 0 && position < jsonText.length) {
      // Calculate line and column from position
      const beforePosition = jsonText.substring(0, position);
      const linesBefore = beforePosition.split('\n');
      line = linesBefore.length;
      column = linesBefore[linesBefore.length - 1].length + 1;
    }
  }

  // Pattern 2: "at line X column Y"
  const lineColumnMatch = errorMessage.match(/line\s+(\d+).*column\s+(\d+)/i);
  if (lineColumnMatch) {
    line = parseInt(lineColumnMatch[1], 10);
    column = parseInt(lineColumnMatch[2], 10);
  }

  // Pattern 3: Just "line X"
  const lineMatch = errorMessage.match(/line\s+(\d+)/i);
  if (lineMatch && !line) {
    line = parseInt(lineMatch[1], 10);
  }

  // Extract the problematic token or section
  let context = null;
  if (line && lines[line - 1]) {
    const problemLine = lines[line - 1];
    // Show context around the error (20 chars before and after)
    const start = Math.max(0, (column || problemLine.length) - 20);
    const end = Math.min(problemLine.length, (column || problemLine.length) + 20);
    context = problemLine.substring(start, end).trim();
    
    // Highlight the problematic character
    if (column) {
      const relativePos = column - start - 1;
      if (relativePos >= 0 && relativePos < context.length) {
        const char = context[relativePos];
        context = context.substring(0, relativePos) + 
                  `[${char}]` + 
                  context.substring(relativePos + 1);
      }
    }
  }

  // Generate clear, actionable error message
  let clearMessage = errorMessage;
  let suggestion = '';

  // Common JSON errors with specific suggestions
  if (errorMessage.includes('Unexpected token')) {
    const tokenMatch = errorMessage.match(/Unexpected token\s+(\S+)/i);
    const token = tokenMatch ? tokenMatch[1] : 'token';
    
    clearMessage = `Unexpected ${token} found`;
    
    if (token.includes('}') || token.includes(']')) {
      suggestion = 'Check for extra closing braces or brackets. You may have an extra } or ].';
    } else if (token.includes('{') || token.includes('[')) {
      suggestion = 'Check for missing commas between properties or values.';
    } else if (token.includes("'") || token.includes('"')) {
      suggestion = 'Check for unclosed strings or mismatched quotes. All strings must use double quotes in JSON.';
    } else {
      suggestion = `Unexpected ${token} character. Check the syntax around line ${line || 'the error'}.`;
    }
  } else if (errorMessage.includes('Unexpected end')) {
    clearMessage = 'JSON ends unexpectedly';
    suggestion = 'Check for missing closing braces }, brackets ], or quotes. The JSON structure is incomplete.';
  } else if (errorMessage.includes('Expected')) {
    const expectedMatch = errorMessage.match(/Expected\s+(.+?)(?:\s+but|$)/i);
    const expected = expectedMatch ? expectedMatch[1].trim() : 'valid JSON';
    
    clearMessage = `Expected ${expected}`;
    
    if (expected.includes('property name') || expected.includes('key')) {
      suggestion = 'Check for missing property names or colons. Each property needs a name in quotes followed by a colon.';
    } else if (expected.includes('comma') || expected.includes(',')) {
      suggestion = 'Check for missing commas between properties or array elements.';
    } else if (expected.includes('colon') || expected.includes(':')) {
      suggestion = 'Check for missing colons between property names and values.';
    } else {
      suggestion = `Expected ${expected}. Check the JSON structure around line ${line || 'the error'}.`;
    }
  } else if (errorMessage.includes('Bad escaped character')) {
    clearMessage = 'Invalid escape sequence';
    suggestion = 'Check escape sequences in strings. Use \\n for newline, \\t for tab, \\" for quote, etc.';
  } else if (errorMessage.includes('Unterminated string')) {
    clearMessage = 'Unclosed string';
    suggestion = 'Check for missing closing quotes. All string values must start and end with double quotes.';
  } else if (errorMessage.includes('Duplicate key')) {
    clearMessage = 'Duplicate property name';
    suggestion = 'Check for duplicate property names in the same object. Each property name must be unique.';
  } else {
    // Generic suggestion
    suggestion = `Check the JSON syntax around line ${line || 'the error'}. Make sure all brackets, braces, and quotes are properly closed.`;
  }

  // Get context lines for better understanding
  let contextLines = null;
  if (line && lines.length > 0) {
    const startLine = Math.max(0, line - 2);
    const endLine = Math.min(lines.length, line + 1);
    contextLines = lines.slice(startLine, endLine).map((text, idx) => ({
      lineNumber: startLine + idx + 1,
      text: text,
      isErrorLine: startLine + idx + 1 === line,
    }));
  }

  return {
    message: clearMessage,
    originalMessage: errorMessage,
    line: line,
    column: column,
    position: position,
    suggestion: suggestion,
    context: context,
    contextLines: contextLines,
    problematicChar: column && lines[line - 1] ? lines[line - 1][column - 1] : null,
  };
}

/**
 * Extract line number from error message
 * @param {string} errorMessage - The error message
 * @returns {number|null} - Line number or null
 */
export function extractLineNumber(errorMessage) {
  if (!errorMessage) return null;

  // Try position-based extraction first
  const positionMatch = errorMessage.match(/position\s+(\d+)/i);
  if (positionMatch) {
    // Would need JSON text to convert position to line - return null for now
    // Will be handled by parseJsonError
    return null;
  }

  // Try explicit line number
  const lineMatch = errorMessage.match(/line\s+(\d+)/i);
  if (lineMatch) {
    return parseInt(lineMatch[1], 10);
  }

  // Try line:column format
  const lineColMatch = errorMessage.match(/(\d+):(\d+)/);
  if (lineColMatch) {
    return parseInt(lineColMatch[1], 10);
  }

  return null;
}

