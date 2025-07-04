import {
  DataSourceService,
  DataSourceType,
  Neo4jQueryConfig,
  QueryResult,
} from './types';
import { getGraphQLApiService, GraphQLApiService } from '../../services/GraphQLApiService';
import { GraphQLApiError } from '../../services/GraphQLApiError';

export class Neo4jGraphQLDataSourceService implements DataSourceService<Neo4jQueryConfig, QueryResult> {
  private graphQLApiService: GraphQLApiService;

  constructor() {
    // Obtain an instance of the existing GraphQLApiService.
    // Assuming getGraphQLApiService() can be called without parameters to get the initialized instance.
    // This might need adjustment based on how GraphQLApiService is typically instantiated or accessed globally.
    this.graphQLApiService = getGraphQLApiService();
  }

  getType(): DataSourceType {
    return DataSourceType.NEO4J_CYPHER;
  }

  async validateQueryConfig(config: Neo4jQueryConfig): Promise<{ isValid: boolean; errors?: string[] }> {
    const errors: string[] = [];
    if (!config.cypherQuery || typeof config.cypherQuery !== 'string' || config.cypherQuery.trim() === '') {
      errors.push('Cypher query cannot be empty.');
    }
    // Parameters are optional, but if provided, should be an object.
    if (config.parameters && typeof config.parameters !== 'object') {
      errors.push('Parameters should be an object.');
    }

    return {
      isValid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }

  async executeQuery(config: Neo4jQueryConfig): Promise<QueryResult> {
    const validation = await this.validateQueryConfig(config);
    if (!validation.isValid) {
      return {
        records: [],
        error: `Invalid query configuration: ${validation.errors?.join(', ')}`,
      };
    }

    try {
      // Use the existing GraphQLApiService to execute the Cypher query.
      // The executeQuery method in GraphQLApiService takes cypherQuery and parameters.
      const result = await this.graphQLApiService.executeQuery(config.cypherQuery, config.parameters);

      // The result from graphQLApiService.executeQuery is expected to be an object like:
      // { records: any[], summary: any }
      // We need to adapt this to the QueryResult interface.
      // Assuming 'records' are in the correct format.
      // 'columns' might need to be derived from the first record if not directly available.
      let columns: string[] | undefined = undefined;
      if (result.records && result.records.length > 0 && typeof result.records[0] === 'object' && result.records[0] !== null) {
        // Attempt to get keys from the first record.
        // Neo4j driver records have a 'keys' property.
        // If records are plain objects, Object.keys() can be used.
        if (Array.isArray(result.records[0].keys)) {
            columns = result.records[0].keys;
        } else {
            columns = Object.keys(result.records[0]);
        }
      }

      return {
        records: result.records || [],
        columns: columns,
        metadata: { summary: result.summary }, // Include Neo4j summary if available
      };
    } catch (error: any) {
      let errorMessage = 'Failed to execute Cypher query.';
      if (error instanceof GraphQLApiError) {
        errorMessage = error.message; // Use the specific error message from GraphQLApiError
      } else if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
      return {
        records: [],
        error: errorMessage,
        metadata: { originalError: error },
      };
    }
  }

  // Optional: getMetadata (can be implemented later if needed for schema browsing for Cypher)
  // async getMetadata(config?: Neo4jQueryConfig): Promise<any> {
  //   // This could potentially call graphQLApiService.getMetadata()
  //   // or provide other schema information relevant to Cypher queries.
  //   return this.graphQLApiService.getMetadata();
  // }
}

// Optional: Export a singleton instance if preferred,
// or allow instantiation wherever needed.
// export const neo4jGraphQLDataSourceServiceInstance = new Neo4jGraphQLDataSourceService();
