import { extractNodePropertiesFromRecords, extractNodeAndRelPropertiesFromRecords } from './ReportRecordProcessing';
import isEqual from 'lodash.isequal';
import { getGraphQLApiService } from '../services/GraphQLApiService';
import { GraphQLApiError } from '../services/GraphQLApiError';
import { 
  transformGraphQLResultToNeo4jResult,
  transformNeo4jParamsToGraphQLParams,
  transformGraphQLErrorToDisplayError 
} from '../utils/GraphQLDataTransformUtils';

export enum QueryStatus {
  NO_QUERY, // No query specified
  NO_DATA, // No data was returned, therefore we can't draw it.
  NO_DRAWABLE_DATA, // There is data returned, but we can't draw it
  WAITING, // The report is waiting for custom logic to be executed.
  RUNNING, // The report query is running.
  TIMED_OUT, // Query has reached the time limit.
  COMPLETE, // There is data returned, and we can visualize it all.
  COMPLETE_TRUNCATED, // There is data returned, but it's too much so we truncate it.
  ERROR, // Something broke, likely the cypher query is invalid.
}

/**
 * Runs a Cypher query using the GraphQL API service.
 * @param driver - Not used in GraphQL implementation, kept for backward compatibility.
 * @param database - optionally, the Neo4j database to run the query against.
 * @param query - the cypher query to run.
 * @param parameters - an optional set of query parameters.
 * @param rowLimit - optionally, the maximum number of rows to retrieve.
 * @param setStatus - callback to retrieve query status.
 * @param setRecords - callback to retrieve query records.
 * @param setFields - callback to set list of returned query fields.
 * @param fields - optional list of fields to use for the query.
 * @param useNodePropsAsFields - whether to use node properties as fields.
 * @param useReturnValuesAsFields - whether to use return values as fields.
 * @param useHardRowLimit - whether to use a hard row limit (not directly used with GraphQL API).
 * @param queryTimeLimit - maximum query time in seconds (not directly used with GraphQL API).
 * @param setSchema - callback to set schema information.
 * @returns
 */
export async function runCypherQuery(
  driver: any,
  database = '',
  query = '',
  parameters = {},
  rowLimit = 1000,
  setStatus = (status: QueryStatus) => {
    // eslint-disable-next-line no-console
    console.log(`Query runner attempted to set status: ${JSON.stringify(status)}`);
  },
  setRecords = (records: any[]) => {
    // eslint-disable-next-line no-console
    console.log(`Query runner attempted to set records: ${JSON.stringify(records)}`);
  },
  setFields = (fields: string[]) => {
    // eslint-disable-next-line no-console
    console.log(`Query runner attempted to set fields: ${JSON.stringify(fields)}`);
  },
  fields: string[] = [],
  useNodePropsAsFields = false,
  useReturnValuesAsFields = false,
  useHardRowLimit = false,
  queryTimeLimit = 20,
  setSchema = (schema: any) => {
    // eslint-disable-next-line no-console
    // console.log(`Query runner attempted to set schema: ${JSON.stringify(schema)}`);
  }
) {
  try {
    // If no query specified, we don't do anything.
    if (query.trim() === '') {
      setFields([]);
      setStatus(QueryStatus.NO_QUERY);
      return;
    }

    // Check if we have a valid GraphQL API service
    const graphQLApiService = getGraphQLApiService();
    
    if (!graphQLApiService) {
      setStatus(QueryStatus.ERROR);
      setRecords([{ error: 'No GraphQL API service found. Are you connected to the GraphQL API?' }]);
      return;
    }

    // Indicate that the query is running
    setStatus(QueryStatus.RUNNING);

    // For usability reasons, we can set a hard cap on the query result size
    // This is handled differently in GraphQL, but we'll maintain the interface for compatibility
    if (useHardRowLimit) {
      // Modify the query to include a LIMIT clause if it doesn't already have one
      // This is a simplified approach compared to the Neo4j driver version
      if (!query.toLowerCase().includes('limit ')) {
        query = `${query} LIMIT ${rowLimit + 1}`;
      }
    }

    // Transform parameters for GraphQL API
    const transformedParams = transformNeo4jParamsToGraphQLParams(parameters);

    // Check for required parameters in the query that might be missing in the parameters
    // This specifically handles the $input parameter issue
    if (query.includes('$input') && (!transformedParams.input || transformedParams.input === undefined)) {
      // Provide a default empty string for the input parameter if it's missing
      transformedParams.input = '';
    }

    // Execute the query using the GraphQL API service
    const result = await graphQLApiService.executeQuery(query, transformedParams);

    // Transform the GraphQL API result to Neo4j driver format
    const { records, summary } = transformGraphQLResultToNeo4jResult(result);

    if (!records || records.length === 0) {
      setStatus(QueryStatus.NO_DATA);
      setRecords([]);
      return;
    }

    if (useReturnValuesAsFields) {
      // Send a deep copy of the returned record keys as the set of fields
      const newFields = records && records[0] && records[0].keys ? records[0].keys.slice() : [];

      if (!isEqual(newFields, fields)) {
        setFields(newFields);
      }
    } else if (useNodePropsAsFields) {
      // If we don't use dynamic field mapping, but we do have a selection, use the discovered node properties as fields
      const nodePropsAsFields = extractNodePropertiesFromRecords(records);
      // Ensure nodePropsAsFields is a string array
      const fieldArray: string[] = Array.isArray(nodePropsAsFields) ? nodePropsAsFields.map(field => String(field)) : [];
      setFields(fieldArray);
    }

    setSchema(extractNodeAndRelPropertiesFromRecords(records));

    if (records === null) {
      setStatus(QueryStatus.NO_DRAWABLE_DATA);
      return;
    } else if (records.length > rowLimit) {
      setStatus(QueryStatus.COMPLETE_TRUNCATED);
      setRecords(records.slice(0, rowLimit));
      return;
    }

    setStatus(QueryStatus.COMPLETE);
    setRecords(records);
  } catch (error: any) {
    // Convert to GraphQLApiError for structured error handling
    const graphqlError = error instanceof GraphQLApiError ? error : GraphQLApiError.fromError(error);
    
    // Log the error with detailed information
    console.error('Error executing Cypher query:', {
      query: query.substring(0, 100) + (query.length > 100 ? '...' : ''),
      error: graphqlError,
      statusCode: graphqlError.statusCode,
      graphQLErrors: graphqlError.graphQLErrors
    });
    
    // Handle timeout errors
    if (graphqlError.message.includes('timeout') || 
        (graphqlError.originalError && graphqlError.originalError.message && 
         graphqlError.originalError.message.includes('timeout'))) {
      setStatus(QueryStatus.TIMED_OUT);
      setRecords([{ error: 'Query execution timed out. Please try a simpler query or increase the timeout limit.' }]);
      return 'Query execution timed out';
    }

    // Handle other errors
    setStatus(QueryStatus.ERROR);
    
    // Get a user-friendly error message
    const userFriendlyMessage = graphqlError.getUserFriendlyMessage();
    
    // Add query-specific context if available
    let errorMessage = userFriendlyMessage;
    if (graphqlError.graphQLErrors && graphqlError.graphQLErrors.length > 0) {
      // If there are GraphQL-specific errors, include them in the message
      const graphqlErrorMessages = graphqlError.graphQLErrors
        .map(e => e.message || 'Unknown GraphQL error')
        .join('; ');
      
      // Check if the error is likely a Cypher syntax error
      if (graphqlErrorMessages.toLowerCase().includes('syntax') || 
          graphqlErrorMessages.toLowerCase().includes('cypher')) {
        errorMessage = `Cypher syntax error: ${graphqlErrorMessages}`;
      } else {
        errorMessage = `GraphQL API error: ${graphqlErrorMessages}`;
      }
    }
    
    if (setRecords) {
      setRecords([{ error: errorMessage }]);
    }
    
    return errorMessage;
  }
}
