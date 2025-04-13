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
  if (!graphQLResult || !graphQLResult.records) {
    return { records: [], summary: { resultAvailableAfter: 0, resultConsumedAfter: 0 } };
  }

  // Transform records to match Neo4j driver format
  const records = graphQLResult.records.map((record: any) => {
    // Create a Neo4j-like record object with get() method
    return {
      keys: Object.keys(record),
      _fields: Object.values(record),
      get: (key: string) => record[key],
      toObject: () => ({ ...record }),
    };
  });

  // Transform summary to match Neo4j driver format
  const summary = {
    resultAvailableAfter: graphQLResult.summary?.resultAvailableAfter || 0,
    resultConsumedAfter: graphQLResult.summary?.resultConsumedAfter || 0,
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
  // For most cases, parameters can be passed as-is
  // This function exists to handle any special cases or transformations needed
  return { ...parameters };
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
    nodes: graphQLMetadata.nodes || [],
    relationships: graphQLMetadata.relationships || [],
    propertyKeys: graphQLMetadata.propertyKeys || [],
    functions: graphQLMetadata.functions || [],
    procedures: graphQLMetadata.procedures || [],
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
