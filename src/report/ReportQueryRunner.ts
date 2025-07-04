import { extractNodePropertiesFromRecords, extractNodeAndRelPropertiesFromRecords } from './ReportRecordProcessing';
import isEqual from 'lodash.isequal';
// import { getGraphQLApiService } from '../services/GraphQLApiService'; // Will be replaced by Neo4jGraphQLDataSourceService
import { GraphQLApiError } from '../services/GraphQLApiError'; // Still useful for error type checking if Neo4j service throws it
// import {
//   transformGraphQLResultToNeo4jResult, // This logic should now be within or superseded by Neo4jGraphQLDataSourceService
//   transformNeo4jParamsToGraphQLParams, // This logic should now be within Neo4jGraphQLDataSourceService
//   transformGraphQLErrorToDisplayError
// } from '../utils/GraphQLDataTransformUtils';
import { DataSourceType, Neo4jQueryConfig, QueryResult } from '../core/datasources/types';
import { Neo4jGraphQLDataSourceService } from '../core/datasources/Neo4jGraphQLDataSourceService';

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

    // Indicate that the query is running
    setStatus(QueryStatus.RUNNING);

    // For usability reasons, we can set a hard cap on the query result size
    // This is handled differently in GraphQL, but we'll maintain the interface for compatibility
    // This modification of the query string should ideally be part of the QueryConfig or handled by the service.
    // For now, keeping it here to minimize behavioral changes.
    let modifiedQuery = query;
    if (useHardRowLimit) {
      if (!modifiedQuery.toLowerCase().includes('limit ')) {
        modifiedQuery = `${modifiedQuery} LIMIT ${rowLimit + 1}`;
      }
    }

    // TODO: The long-term plan is to pass dataSourceType and queryConfig directly to this function.
    // For now, we assume this function is only called for Neo4j/Cypher queries
    // and construct the Neo4jQueryConfig internally.
    const neo4jConfig: Neo4jQueryConfig = {
      dataSourceType: DataSourceType.NEO4J_CYPHER,
      cypherQuery: modifiedQuery,
      parameters: parameters, // Neo4jGraphQLDataSourceService will handle parameter transformation
    };

    // Instantiate the Neo4j GraphQL Data Source Service
    // This service now encapsulates the logic of talking to the GraphQL backend for Cypher queries.
    const neo4jService = new Neo4jGraphQLDataSourceService();

    // Execute the query using the new data source service
    const result: QueryResult = await neo4jService.executeQuery(neo4jConfig);

    if (result.error) {
      // Error handling based on the new QueryResult structure
      let errorMessage = typeof result.error === 'string' ? result.error : 'An unknown error occurred.';
      if (typeof result.error === 'object' && (result.error as any).message) {
        errorMessage = (result.error as any).message;
      }

      // Specific error type checks if needed (e.g., from GraphQLApiError if re-thrown by service)
      if (errorMessage.toLowerCase().includes('timeout')) {
        setStatus(QueryStatus.TIMED_OUT);
        setRecords([{ error: 'Query execution timed out. Please try a simpler query or increase the timeout limit.' }]);
      } else {
        setStatus(QueryStatus.ERROR);
        setRecords([{ error: errorMessage }]);
      }
      console.error('Error executing query via Neo4jGraphQLDataSourceService:', result.error);
      return errorMessage;
    }

    const records = result.records;

    if (!records || records.length === 0) {
      setStatus(QueryStatus.NO_DATA);
      setRecords([]);
      return;
    }

    if (useReturnValuesAsFields) {
      // Use columns from QueryResult if available, otherwise derive from first record.
      const newFields = result.columns || (records && records[0] && records[0].keys ? records[0].keys.slice() : []);
      if (!isEqual(newFields, fields)) {
        setFields(newFields);
      }
    } else if (useNodePropsAsFields) {
      const nodePropsAsFields = extractNodePropertiesFromRecords(records);
      const fieldArray: string[] = Array.isArray(nodePropsAsFields) ? nodePropsAsFields.map(field => String(field)) : [];
      setFields(fieldArray);
    }

    // TODO: Review schema extraction. Neo4jGraphQLDataSourceService could potentially provide richer schema info in QueryResult.metadata
    setSchema(extractNodeAndRelPropertiesFromRecords(records));

    if (records.length > rowLimit) {
      setStatus(QueryStatus.COMPLETE_TRUNCATED);
      setRecords(records.slice(0, rowLimit));
      return;
    }

    setStatus(QueryStatus.COMPLETE);
    setRecords(records);
  } catch (error: any) {
    // This catch block is now more of a fallback for unexpected errors during the refactoring
    // or if Neo4jGraphQLDataSourceService itself throws an unhandled exception.
    // Ideally, Neo4jGraphQLDataSourceService catches its own errors and returns them in QueryResult.error.
    console.error('Unexpected error in runCypherQuery:', error);
    setStatus(QueryStatus.ERROR);
    const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred.';
    setRecords([{ error: errorMessage }]);
    return errorMessage;
  }
}
