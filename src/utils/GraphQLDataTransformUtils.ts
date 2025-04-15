/**
 * GraphQLDataTransformUtils - Utilities for transforming data between GraphQL API responses
 * and the format expected by NeoDash components.
 */

/**
 * Transform GraphQL API query results to the format expected by NeoDash components.
 * This converts the GraphQL API response format to match the Neo4j driver's result format.
 * 
 * @param graphQLResult - The result from the GraphQL API's executeQuery operation.
 * @returns The transformed result in Neo4j driver format.
 */
export const transformGraphQLResultToNeo4jResult = (graphQLResult: any): any => {
  if (!graphQLResult || !('records' in graphQLResult)) {
    return { records: [], summary: { resultAvailableAfter: 0, resultConsumedAfter: 0 } };
  }

  // Transform records to match Neo4j driver format
  const records = graphQLResult.records.map((record: any) => {
    // Process field values to ensure proper types for visualization
    const processedRecord: Record<string, any> = {};
    
    Object.entries(record).forEach(([key, value]) => {
      // Handle Neo4j integer objects with low and high properties
      if (value && typeof value === 'object' && 'low' in value && 'high' in value) {
        // Convert Neo4j integer to JavaScript number
        const lowValue = typeof value.low === 'number' ? value.low : parseInt(value.low, 10);
        const highValue = typeof value.high === 'number' ? value.high : parseInt(value.high, 10);
        
        if (highValue === 0) {
          // If high is 0, we can safely use the low value as a regular number
          processedRecord[key] = lowValue;
        } else {
          // For large integers that don't fit in JavaScript number, create a custom representation
          // This preserves the original data structure while making it usable for visualization
          processedRecord[key] = {
            value: lowValue,
            isNeo4jInteger: true,
            low: lowValue,
            high: highValue,
            toString: () => lowValue.toString()
          };
        }
      }
      // Handle floating point numbers (like division results)
      else if (value && typeof value === 'object' && 'formatted' in value && typeof (value as any).formatted === 'string') {
        // Some GraphQL APIs return floating point numbers as objects with a formatted property
        processedRecord[key] = parseFloat((value as any).formatted);
      }
      // Handle numeric values directly
      else if (typeof value === 'number') {
        processedRecord[key] = value;
      }
      // Handle datetime objects (common in Neo4j queries)
      else if (typeof value === 'string' && (
          value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || // ISO date format
          value.match(/^datetime\({.*}\)$/) // Neo4j datetime literal
        )) {
        try {
          // For ISO date strings, convert to Date object
          if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
            processedRecord[key] = new Date(value);
          } 
          // For Neo4j datetime literals, extract the date parts and create a Date
          else if (value.match(/^datetime\({.*}\)$/)) {
            const datePartsMatch = value.match(/year:(\d+),\s*month:(\d+),\s*day:(\d+),\s*hour:(\d+)/);
            if (datePartsMatch) {
              const [_, year, month, day, hour] = datePartsMatch.map(Number);
              processedRecord[key] = new Date(year, month-1, day, hour); // month is 0-indexed in JS Date
            } else {
              processedRecord[key] = value;
            }
          } else {
            processedRecord[key] = value;
          }
        } catch {
          // If parsing fails, keep as string
          processedRecord[key] = value;
        }
      }
      // Handle numeric values as strings
      else if (typeof value === 'string' && !isNaN(Number(value))) {
        // Check if it's a floating point number
        if (value.includes('.')) {
          processedRecord[key] = parseFloat(value);
        } else {
          // Convert numeric strings to actual numbers for visualization
          processedRecord[key] = Number(value);
        }
      } 
      // Handle array values
      else if (typeof value === 'string' && value.startsWith('[') && value.endsWith(']')) {
        try {
          // Try to parse JSON arrays
          const parsedArray = JSON.parse(value);
          if (Array.isArray(parsedArray)) {
            processedRecord[key] = parsedArray;
          } else {
            processedRecord[key] = value;
          }
        } catch {
          // If parsing fails, keep as string
          processedRecord[key] = value;
        }
      }
      // Handle node/relationship objects
      else if (typeof value === 'object' && value !== null) {
        if ('labels' in value || 'type' in value) {
          // This looks like a node or relationship object
          processedRecord[key] = value;
        } else {
          // For other objects, keep as is
          processedRecord[key] = value;
        }
      }
      // Default case - keep value as is
      else {
        processedRecord[key] = value;
      }
    });
    
    // Create a Neo4j-like record object with get() method
    return {
      keys: Object.keys(processedRecord),
      _fields: Object.values(processedRecord),
      get: (key: string) => processedRecord[key],
      toObject: () => ({ ...processedRecord }),
    };
  });

  // Transform summary to match Neo4j driver format
  const summary = {
    resultAvailableAfter: ('summary' in graphQLResult) ? graphQLResult.summary.resultAvailableAfter || 0 : 0,
    resultConsumedAfter: ('summary' in graphQLResult) ? graphQLResult.summary.resultConsumedAfter || 0 : 0,
  };

  return { records, summary };
};

/**
 * Transform Neo4j-style query parameters to GraphQL API parameters.
 * This ensures parameters are properly formatted for the GraphQL API.
 * 
 * @param parameters - The Neo4j-style query parameters.
 * @returns The transformed parameters for the GraphQL API.
 */
export const transformNeo4jParamsToGraphQLParams = (parameters: Record<string, any>): Record<string, any> => {
  // Create a new parameters object to avoid modifying the original
  const transformedParams: Record<string, any> = { ...parameters };
  
  // Extract any global parameters (those starting with 'neodash_')
  // These are typically used in dashboard queries with the $ prefix
  Object.keys(parameters).forEach(key => {
    // Check if this is a global parameter (starts with 'neodash_')
    if (key.startsWith('neodash_')) {
      // Create a parameter without the $ prefix for GraphQL
      const paramName = key;
      transformedParams[paramName] = parameters[key];
    }
  });
  
  // Ensure all parameters have non-undefined values
  // GraphQL APIs typically don't handle undefined values well
  Object.keys(transformedParams).forEach(key => {
    if (transformedParams[key] === undefined) {
      transformedParams[key] = null;
    }
  });
  
  return transformedParams;
};

/**
 * Transform GraphQL API metadata to the format expected by NeoDash components.
 * This converts the GraphQL API metadata format to match the Neo4j driver's metadata format.
 * 
 * @param graphQLMetadata - The metadata from the GraphQL API.
 * @returns The transformed metadata in Neo4j driver format.
 */
export const transformGraphQLMetadataToNeo4jMetadata = (graphQLMetadata: any): any => {
  if (!graphQLMetadata) {
    return { nodes: [], relationships: [], propertyKeys: [], functions: [], procedures: [] };
  }

  // For most cases, metadata can be used as-is if the GraphQL API returns it in the expected format
  // This function exists to handle any transformations needed
  return {
    nodes: ('nodes' in graphQLMetadata) ? graphQLMetadata.nodes : [],
    relationships: ('relationships' in graphQLMetadata) ? graphQLMetadata.relationships : [],
    propertyKeys: ('propertyKeys' in graphQLMetadata) ? graphQLMetadata.propertyKeys : [],
    functions: ('functions' in graphQLMetadata) ? graphQLMetadata.functions : [],
    procedures: ('procedures' in graphQLMetadata) ? graphQLMetadata.procedures : [],
  };
};

/**
 * Create a Neo4j-like record object from a plain object.
 * This is useful for testing or when creating mock data.
 * 
 * @param obj - The plain object to convert to a Neo4j-like record.
 * @returns A Neo4j-like record object.
 */
export const createNeo4jRecord = (obj: Record<string, any>): any => {
  return {
    keys: Object.keys(obj),
    _fields: Object.values(obj),
    get: (key: string) => obj[key],
    toObject: () => ({ ...obj }),
  };
};

/**
 * Transform error responses from the GraphQL API to a format that can be displayed in NeoDash.
 * 
 * @param error - The error from the GraphQL API.
 * @returns A formatted error object.
 */
export const transformGraphQLErrorToDisplayError = (error: any): any => {
  // Handle different types of GraphQL errors
  if (error.response?.errors && Array.isArray(error.response.errors)) {
    // GraphQL-specific errors
    const graphQLErrors = error.response.errors;
    return {
      message: graphQLErrors.map((e: any) => e.message).join(', '),
      code: graphQLErrors[0]?.extensions?.code || 'GRAPHQL_ERROR',
      details: graphQLErrors,
    };
  } else if (error.response?.status) {
    // HTTP errors
    return {
      message: `HTTP Error: ${error.response.status} ${error.response.statusText}`,
      code: `HTTP_${error.response.status}`,
      details: error.response,
    };
  } else {
    // Network or other errors
    return {
      message: error.message || 'Unknown error',
      code: error.code || 'UNKNOWN_ERROR',
      details: error,
    };
  }
};
