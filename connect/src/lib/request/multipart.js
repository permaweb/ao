/**
 * Parses multipart/form-data content into a structured map using the name value as the key
 * @param {string} content - The multipart/form-data content to parse
 * @param {string} contentType - The Content-Type header containing the boundary
 * @returns {Map} A map with keys derived from form-data names and their associated values
 */
export function parseMultipartContent(content, contentType) {
  // Extract boundary from Content-Type
  const boundaryMatch = contentType.match(/boundary="?([^";]+)"?/);
  if (!boundaryMatch) {
    throw new Error("No boundary found in Content-Type");
  }
  
  const boundary = boundaryMatch[1];
  const boundaryRegex = new RegExp(`--${boundary}(?:--)?(\\r\\n|\\n)`);
  
  // Split content by boundary
  const parts = content.split(boundaryRegex).filter(p => p !== '\r\n');
  // Initialize result map
  const resultMap = new Map();
  
  // Process each part
  for (let i = 0; i < parts.length; i += 2) {
    if (!parts[i] || parts[i].trim() === "") continue;
    
    const partContent = parts[i];
    const lines = partContent.split(/\r\n|\n/);
    
    // Extract headers and content
    const headers = {};
    let j = 0;
    
    // Parse headers until we hit an empty line
    while (j < lines.length && lines[j].trim() !== "") {
      const line = lines[j];
      const colonIndex = line.indexOf(":");
      
      if (colonIndex !== -1) {
        const headerName = line.substring(0, colonIndex).trim().toLowerCase();
        const headerValue = line.substring(colonIndex + 1).trim();
        headers[headerName] = headerValue;
      }
      j++;
    }
    
    // Skip the empty line
    j++;
    
    // The rest is content
    const bodyContent = lines.slice(j).join("\n").trim();
    
    // Extract name from content-disposition
    const contentDisposition = headers["content-disposition"] || "";
    const nameMatch = contentDisposition.match(/name="([^"]+)"/);
    
    if (nameMatch) {
      const name = nameMatch[1];
      
      // Create entry in map
      const entry = Object.assign({}, headers, { body: bodyContent })
      
      // Process fields into a structured format
      const fields = {};
      lines.slice(j).forEach(line => {
        if (line.trim() === "") return;
        
        const colonIndex = line.indexOf(":");
        if (colonIndex !== -1) {
          const fieldName = line.substring(0, colonIndex).trim();
          const fieldValue = line.substring(colonIndex + 1).trim();
          fields[fieldName] = fieldValue;
        }
      });
      
      // Add structured fields to entry if any were found
      if (Object.keys(fields).length > 0) {
        entry.fields = fields;
      }
      
      resultMap.set(name, entry);
    }
  }
  
  return resultMap;
}

/**
 * Example usage:
 * 
 * const contentType = 'multipart/form-data; boundary="C15c5J1-T6osyGz6UCj55OvcUPjVmnG3BJ2755HzycE"';
 * const content = `--C15c5J1-T6osyGz6UCj55OvcUPjVmnG3BJ2755HzycE
 * content-disposition: form-data;name="example"
 * 
 * value
 * --C15c5J1-T6osyGz6UCj55OvcUPjVmnG3BJ2755HzycE--`;
 * 
 * const result = parseMultipartContent(content, contentType);
 * console.log(result);
 */

// Enhanced version that builds a nested object structure from hierarchical names
export function parseMultipartContentNested(content, contentType) {
  const flatMap = parseMultipartContent(content, contentType);
  const nestedResult = new Map();
  
  for (const [key, value] of flatMap.entries()) {
    // Split the key by "/" to determine nesting
    const keyParts = key.split('/');
    
    // Start at the root of our nested structure
    let currentLevel = nestedResult;
    let currentKey = '';
    
    // Navigate or create the nested structure
    for (let i = 0; i < keyParts.length; i++) {
      const part = keyParts[i];
      
      // Update the current path
      currentKey = currentKey ? `${currentKey}/${part}` : part;
      
      // If this is the last part, set the value
      if (i === keyParts.length - 1) {
        currentLevel.set(part, {
          fullPath: currentKey,
          ...value
        });
      } 
      // Otherwise, ensure the nested map exists
      else {
        if (!currentLevel.has(part)) {
          currentLevel.set(part, new Map());
        }
        currentLevel = currentLevel.get(part);
      }
    }
  }
  
  return nestedResult;
}


