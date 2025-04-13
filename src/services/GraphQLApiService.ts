import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';

/**
 * GraphQLApiService - A service for interacting with the GraphQL API.
 * This service provides methods for executing queries, retrieving metadata,
 * and verifying connections to the GraphQL API.
 */
export class GraphQLApiService {
  private client: GraphQLClient;
  private apiEndpoint: string;
  private headers: Record<string, string>;
  private database: string;

  /**
   * Create a new GraphQLApiService instance.
   * @param apiEndpoint - The URL of the GraphQL API endpoint.
   * @param apiKey - Optional API key for authentication.
   * @param authToken - Optional authentication token.
   * @param database - Optional database name.
   */
  constructor(apiEndpoint: string, apiKey?: string, authToken?: string, database?: string) {
    this.apiEndpoint = apiEndpoint;
    this.headers = {};
    this.database = database || 'neo4j';

    if (apiKey) {
      this.headers['x-api-key'] = apiKey;
    }

    if (authToken) {
      this.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (database) {
      this.headers['x-database'] = database;
    }

    this.client = new GraphQLClient(apiEndpoint, { headers: this.headers });
  }

  /**
   * Verify connection to the GraphQL API.
   * @returns A promise that resolves to true if the connection is successful, or rejects with an error.
   */
  async verifyConnection(): Promise<boolean> {
    try {
      const query = gql`
        query {
          __schema {
            queryType {
              name
            }
          }
        }
      `;

      await this.client.request(query);
      return true;
    } catch (error) {
      console.error('Error verifying GraphQL API connection:', error);
      throw error;
    }
  }

  /**
   * Execute a Cypher query via the GraphQL API.
   * @param cypherQuery - The Cypher query to execute.
   * @param parameters - Optional parameters for the Cypher query.
   * @returns A promise that resolves to the query results.
   */
  async executeQuery(cypherQuery: string, parameters: Record<string, any> = {}): Promise<any> {
    try {
      const query = gql`
        query ExecuteQuery($query: String!, $parameters: JSON, $database: String) {
          executeQuery(query: $query, parameters: $parameters, database: $database) {
            records
            summary {
              resultAvailableAfter
              resultConsumedAfter
            }
          }
        }
      `;

      const variables = {
        query: cypherQuery,
        parameters,
        database: this.database,
      };

      const response = await this.client.request(query, variables);
      return response.executeQuery;
    } catch (error) {
      console.error('Error executing query:', error);
      throw error;
    }
  }

  /**
   * Get metadata about the database from the GraphQL API.
   * @returns A promise that resolves to the database metadata.
   */
  async getMetadata(): Promise<any> {
    try {
      const query = gql`
        query GetMetadata($database: String) {
          metadata(database: $database) {
            nodes {
              name
              labels
              properties {
                name
                type
              }
            }
            relationships {
              name
              type
              properties {
                name
                type
              }
              startNodeLabels
              endNodeLabels
            }
            propertyKeys
            functions
            procedures
          }
        }
      `;

      const variables = {
        database: this.database,
      };

      const response = await this.client.request(query, variables);
      return response.metadata;
    } catch (error) {
      console.error('Error getting metadata:', error);
      throw error;
    }
  }

  /**
   * Update the client configuration.
   * @param apiEndpoint - The URL of the GraphQL API endpoint.
   * @param apiKey - Optional API key for authentication.
   * @param authToken - Optional authentication token.
   * @param database - Optional database name.
   */
  updateConfig(apiEndpoint?: string, apiKey?: string, authToken?: string, database?: string): void {
    if (apiEndpoint) {
      this.apiEndpoint = apiEndpoint;
    }

    // Reset headers
    this.headers = {};

    if (apiKey) {
      this.headers['x-api-key'] = apiKey;
    }

    if (authToken) {
      this.headers['Authorization'] = `Bearer ${authToken}`;
    }

    if (database) {
      this.database = database;
      this.headers['x-database'] = database;
    }

    // Recreate client with new configuration
    this.client = new GraphQLClient(this.apiEndpoint, { headers: this.headers });
  }
}

// Create a singleton instance of the GraphQLApiService
let graphQLApiServiceInstance: GraphQLApiService | null = null;

/**
 * Get the GraphQLApiService instance.
 * If no instance exists, a new one will be created with the provided parameters.
 * @param apiEndpoint - The URL of the GraphQL API endpoint.
 * @param apiKey - Optional API key for authentication.
 * @param authToken - Optional authentication token.
 * @param database - Optional database name.
 * @returns The GraphQLApiService instance.
 */
export const getGraphQLApiService = (
  apiEndpoint?: string,
  apiKey?: string,
  authToken?: string,
  database?: string
): GraphQLApiService => {
  if (!graphQLApiServiceInstance && apiEndpoint) {
    graphQLApiServiceInstance = new GraphQLApiService(apiEndpoint, apiKey, authToken, database);
  } else if (graphQLApiServiceInstance && apiEndpoint) {
    graphQLApiServiceInstance.updateConfig(apiEndpoint, apiKey, authToken, database);
  }

  if (!graphQLApiServiceInstance) {
    throw new Error('GraphQLApiService not initialized. Please provide an API endpoint.');
  }

  return graphQLApiServiceInstance;
};

/**
 * Reset the GraphQLApiService instance.
 * This is useful for testing or when you need to completely reset the service.
 */
export const resetGraphQLApiService = (): void => {
  graphQLApiServiceInstance = null;
};
