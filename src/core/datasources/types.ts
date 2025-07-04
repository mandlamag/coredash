/**
 * Defines the types of data sources supported by the application.
 */
export enum DataSourceType {
  NEO4J_CYPHER = 'NEO4J_CYPHER',
  REST_API = 'REST_API',
  GENERIC_GRAPHQL = 'GENERIC_GRAPHQL',
}

/**
 * Base interface for all query configurations.
 * Each specific query configuration should extend this.
 */
export interface QueryConfigBase {
  dataSourceType: DataSourceType;
  // Potentially add a unique ID for each query instance if needed for caching or state management
  // queryId?: string;
}

/**
 * Configuration for queries targeting the existing Neo4j/Cypher data source.
 */
export interface Neo4jQueryConfig extends QueryConfigBase {
  dataSourceType: DataSourceType.NEO4J_CYPHER;
  cypherQuery: string;
  parameters: Record<string, any>;
}

/**
 * Configuration for data mapping (details to be fleshed out in Phase 4).
 * This will define how raw API responses are transformed into chartable data.
 */
export interface DataMappingConfig {
  // Example: Path to the array of records in the response
  dataPath?: string;
  // Example: Mapping for x-axis, y-axis, series for specific chart types
  xAxisField?: string;
  yAxisFields?: string[];
  // Further fields for different chart types and transformations
}

/**
 * Configuration for queries targeting a REST API.
 */
export interface RestQueryConfig extends QueryConfigBase {
  dataSourceType: DataSourceType.REST_API;
  endpointId: string; // Identifier linking to a defined endpoint in RestApiEndpoints.ts
  parameters: Record<string, any>; // Parameters to be sent with the REST request
  dataMappingConfig?: DataMappingConfig; // Optional: How to map/transform the response
}

/**
 * Configuration for queries targeting a generic GraphQL API.
 */
export interface GenericGraphQLQueryConfig extends QueryConfigBase {
  dataSourceType: DataSourceType.GENERIC_GRAPHQL;
  endpointUrl: string; // The URL of the GraphQL API
  graphqlQuery: string; // The GraphQL query string
  variables?: Record<string, any>; // Variables for the GraphQL query
  headers?: Record<string, string>; // Optional custom headers
  dataMappingConfig?: DataMappingConfig; // Optional: How to map/transform the response
}

/**
 * A union type for any valid query configuration.
 */
export type QueryConfig = Neo4jQueryConfig | RestQueryConfig | GenericGraphQLQueryConfig;

/**
 * Standardized interface for the result of a query from any data source.
 */
export interface QueryResult {
  records: any[]; // The actual data records
  columns?: string[]; // Optional: Column names, if applicable (e.g., for tabular data)
  error?: string | object; // Error message or object if the query failed
  metadata?: Record<string, any>; // Any additional metadata about the result (e.g., execution time, row count)
  // Potentially add rawResponse for debugging or advanced mapping
  // rawResponse?: any;
}

/**
 * Interface for a Data Source Service.
 * Each data source type (Neo4j, REST, etc.) will have an implementation of this service.
 *
 * C: The specific QueryConfig type for this data source (e.g., Neo4jQueryConfig)
 * R: The QueryResult type (can be specialized if needed, but defaults to QueryResult)
 */
export interface DataSourceService<C extends QueryConfigBase = QueryConfig, R extends QueryResult = QueryResult> {
  /**
   * Gets the type of this data source.
   * @returns The DataSourceType enum value.
   */
  getType(): DataSourceType;

  /**
   * Validates the provided query configuration for this data source.
   * @param config - The query configuration to validate.
   * @returns A promise that resolves to an object indicating validity and any error messages.
   */
  validateQueryConfig(config: C): Promise<{ isValid: boolean; errors?: string[] }>;

  /**
   * Executes a query using the provided configuration.
   * @param config - The query configuration.
   * @returns A promise that resolves to the QueryResult.
   */
  executeQuery(config: C): Promise<R>;

  /**
   * Optional: Retrieves metadata or schema information for a given query configuration or data source.
   * This could be used to help with building queries or data mapping.
   * @param config - (Optional) The query configuration, if context-specific metadata is needed.
   * @returns A promise that resolves to metadata.
   */
  // getMetadata?(config?: C): Promise<any>;
}
