import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';
import { GraphQLApiError } from './GraphQLApiError';
import { ALLOW_QUERIES_WITHOUT_LOGIN } from '../config/ApplicationConfig';

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
    console.log('=== GRAPHQL API CONNECTION VERIFICATION START ===');
    console.log(`API Endpoint: ${this.apiEndpoint}`);
    console.log(`Headers:`, JSON.stringify(this.headers, null, 2));
    console.log(`Database: ${this.database}`);
    
    try {
      // If ALLOW_QUERIES_WITHOUT_LOGIN is enabled and we have no auth credentials,
      // we can skip the actual verification and return true
      if (ALLOW_QUERIES_WITHOUT_LOGIN && 
          !this.headers['x-api-key'] && 
          !this.headers['Authorization']) {
        console.log('Skipping connection verification due to ALLOW_QUERIES_WITHOUT_LOGIN setting');
        console.log('=== GRAPHQL API CONNECTION VERIFICATION END (SKIPPED) ===');
        return true;
      }

      console.log('Sending introspection query to verify connection...');
      const query = gql`
        query {
          __schema {
            queryType {
              name
            }
          }
        }
      `;

      console.time('Connection Verification Duration');
      const response = await this.client.request(query);
      console.timeEnd('Connection Verification Duration');
      
      console.log('Connection verified successfully');
      console.log(`Response: ${JSON.stringify(response, null, 2)}`);
      console.log('=== GRAPHQL API CONNECTION VERIFICATION END (SUCCESS) ===');
      return true;
    } catch (error: unknown) {
      console.error('=== GRAPHQL API CONNECTION VERIFICATION ERROR ===');
      
      if (error instanceof Error) {
        console.error(`Error type: ${error.constructor.name}`);
        console.error(`Error message: ${error.message}`);
        console.error(`Stack trace: ${error.stack}`);
      } else {
        console.error(`Unknown error type: ${typeof error}`);
        console.error(`Error value: ${String(error)}`);
      }
      
      // Check if error has response property (GraphQL client error)
      if (error && typeof error === 'object' && 'response' in error) {
        const graphqlError = error as { response: { data?: any, status?: number, headers?: any } };
        if (graphqlError.response) {
          console.error('Response data:', JSON.stringify(graphqlError.response.data, null, 2));
          console.error('Response status:', graphqlError.response.status);
          console.error('Response headers:', JSON.stringify(graphqlError.response.headers, null, 2));
        }
      }
      
      // Check if error has request property
      if (error && typeof error === 'object' && 'request' in error) {
        const requestError = error as { request: any };
        console.error('Request:', JSON.stringify(requestError.request, null, 2));
      }
      
      console.error('=== GRAPHQL API CONNECTION VERIFICATION END (ERROR) ===');
      throw GraphQLApiError.fromError(error);
    }
  }

  /**
   * Check if a query is a special administrative query that needs special handling.
   * @param query - The Cypher query to check.
   * @returns True if the query needs special handling, false otherwise.
   */
  private isSpecialQuery(query: string): boolean {
    const normalizedQuery = query.trim().toUpperCase();
    // We now only consider SHOW DATABASES as a special query that needs fallback handling
    // All other queries should be attempted through the real API
    return normalizedQuery.startsWith('SHOW DATABASES');
  }
  
  /**
   * Handle special queries that the GraphQL API might need special handling for.
   * @param query - The special query to handle.
   * @param parameters - The query parameters.
   * @returns A promise that resolves to the query results.
   */
  private async handleSpecialQuery(query: string, parameters: Record<string, any> = {}): Promise<any> {
    const normalizedQuery = query.trim().toUpperCase();
    console.log(`GraphQL API special query handling: ${query.substring(0, 100)}...`);
    
    try {
      // For all queries, attempt to execute them directly through the API
      console.log('Attempting to execute special query directly through the API');
      
      const formattedQuery = JSON.stringify(query);
      console.log(`Formatted query: ${formattedQuery}`);
      
      const graphqlQuery = gql`
        query {
          executeCypherQuery(query: ${formattedQuery}) {
            records
            summary {
              resultAvailableAfter
              resultConsumedAfter
              counters
              notifications
              plan
              profile
              queryType
            }
          }
        }
      `;
      
      console.log(`Full GraphQL query: ${graphqlQuery}`);
      console.time('Special Query Execution Duration');
      
      const response = await this.client.request(graphqlQuery) as { executeCypherQuery: any };
      console.timeEnd('Special Query Execution Duration');
      
      console.log('Special query executed successfully');
      console.log(`Response structure: ${Object.keys(response).join(', ')}`);
      
      if (response && response.executeCypherQuery) {
        // Add default summary values if they don't exist
        if (response.executeCypherQuery.summary && !response.executeCypherQuery.summary.resultAvailableAfter) {
          response.executeCypherQuery.summary = {
            ...response.executeCypherQuery.summary,
            resultAvailableAfter: 0,
            resultConsumedAfter: 0
          };
        }
        
        return response.executeCypherQuery;
      }
      
      // If we get here, something went wrong but didn't throw an error
      console.error('Special query returned empty or invalid response');
      throw new Error('Invalid response from GraphQL API');
    } catch (error: unknown) {
      console.error('Error executing special query:');
      
      if (error instanceof Error) {
        console.error(`Error type: ${error.constructor.name}`);
        console.error(`Error message: ${error.message}`);
        console.error(`Stack trace: ${error.stack}`);
      } else {
        console.error(`Unknown error type: ${typeof error}`);
        console.error(`Error value: ${String(error)}`);
      }
      
      // Check if error has response property (GraphQL client error)
      if (error && typeof error === 'object' && 'response' in error) {
        const graphqlError = error as { response: { data?: any, status?: number, headers?: any } };
        if (graphqlError.response) {
          console.error('Response data:', JSON.stringify(graphqlError.response.data, null, 2));
          console.error('Response status:', graphqlError.response.status);
          console.error('Response headers:', JSON.stringify(graphqlError.response.headers, null, 2));
        }
      }
      
      // For SHOW DATABASES, provide a minimal response with the current database
      // This is the only special case we'll handle as it's critical for database selection
      if (normalizedQuery.startsWith('SHOW DATABASES')) {
        console.log('Providing minimal response for SHOW DATABASES');
        return {
          records: [
            { _fields: [this.database] }
          ],
          summary: {
            resultAvailableAfter: 0,
            resultConsumedAfter: 0
          }
        };
      }
      
      // For all other queries, propagate the error
      throw GraphQLApiError.fromError(error);
    }
  }

  /**
   * Execute a Cypher query via the GraphQL API.
   * @param cypherQuery - The Cypher query to execute.
   * @param parameters - Optional parameters for the Cypher query.
   * @returns A promise that resolves to the query results.
   */
  async executeQuery(cypherQuery: string, parameters: Record<string, any> = {}): Promise<any> {
    // Log the incoming query request with timestamp for performance tracking
    const startTime = Date.now();
    console.log('=== GRAPHQL API REQUEST START ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Cypher Query: ${cypherQuery}`);
    console.log(`Database: ${this.database}`);
    console.log(`Parameters:`, JSON.stringify(parameters, null, 2));
    console.log(`Headers:`, JSON.stringify(this.headers, null, 2));
    console.log(`API Endpoint: ${this.apiEndpoint}`);
    
    // Handle special queries that the GraphQL API might need special handling for
    if (this.isSpecialQuery(cypherQuery)) {
      console.log('Query identified as special query, using special handling');
      try {
        const result = await this.handleSpecialQuery(cypherQuery, parameters);
        console.log(`Request completed in ${Date.now() - startTime}ms`);
        console.log('=== GRAPHQL API REQUEST END (SPECIAL HANDLING) ===');
        return result;
      } catch (error) {
        console.error('Special query handling failed');
        // Let the error propagate - no fallback to standard execution
        throw GraphQLApiError.fromError(error);
      }
    }
    
    try {
      // Format the query for the GraphQL API
      const formattedQuery = JSON.stringify(cypherQuery);
      console.log(`Formatted query: ${formattedQuery}`);
      
      // Construct the GraphQL query
      const query = gql`
        query {
          executeCypherQuery(query: ${formattedQuery}) {
            records
            summary {
              resultAvailableAfter
              resultConsumedAfter
              counters
            }
          }
        }
      `;
      
      console.log(`Full GraphQL query: ${query}`);

      // Set the database header if needed
      if (this.database) {
        console.log(`Setting database header: x-database: ${this.database}`);
        this.client.setHeader('x-database', this.database);
      }

      console.log('Sending request to GraphQL API...');
      console.time('GraphQL API Request Duration');
      
      // Execute the query against the GraphQL API
      const response = await this.client.request(query) as { executeCypherQuery: any };
      
      console.timeEnd('GraphQL API Request Duration');
      console.log('GraphQL API Response received');
      console.log(`Response structure: ${Object.keys(response).join(', ')}`);
      
      // Extract the result from the response
      const result = response.executeCypherQuery;
      
      if (result) {
        console.log(`Records count: ${result.records ? result.records.length : 'no records'}`);
        console.log(`Summary: ${JSON.stringify(result.summary, null, 2)}`);
        
        // Log a sample of the records if available
        if (result.records && result.records.length > 0) {
          console.log('Sample record:');
          console.log(JSON.stringify(result.records[0], null, 2));
        }
        
        // Add default summary values if they don't exist
        if (result.summary && !result.summary.resultAvailableAfter) {
          console.log('Adding default summary values');
          result.summary = {
            ...result.summary,
            resultAvailableAfter: 0,
            resultConsumedAfter: 0
          };
        }
      } else {
        console.log('Warning: Empty result received from GraphQL API');
        throw new Error('Empty result received from GraphQL API');
      }
      
      console.log(`Request completed in ${Date.now() - startTime}ms`);
      console.log('=== GRAPHQL API REQUEST END (SUCCESS) ===');
      return result;
    } catch (error: unknown) {
      console.error('=== GRAPHQL API REQUEST ERROR ===');
      
      if (error instanceof Error) {
        console.error(`Error type: ${error.constructor.name}`);
        console.error(`Error message: ${error.message}`);
        console.error(`Stack trace: ${error.stack}`);
      } else {
        console.error(`Unknown error type: ${typeof error}`);
        console.error(`Error value: ${String(error)}`);
      }
      
      // Create a structured error with detailed information
      const graphqlError = GraphQLApiError.fromError(error);
      
      // Add query-specific context to the error message
      const contextMessage = `Error executing query: ${cypherQuery.substring(0, 100)}${cypherQuery.length > 100 ? '...' : ''}`;
      console.error(contextMessage);
      
      // Log additional details for debugging
      if (graphqlError.graphQLErrors) {
        console.error('GraphQL Errors:', JSON.stringify(graphqlError.graphQLErrors, null, 2));
      }
      
      // Check if error has response property (GraphQL client error)
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response: { data?: any, status?: number, headers?: any } };
        if (responseError.response) {
          console.error('Response data:', JSON.stringify(responseError.response.data, null, 2));
          console.error('Response status:', responseError.response.status);
          console.error('Response headers:', JSON.stringify(responseError.response.headers, null, 2));
        }
      }
      
      // Check if error has request property
      if (error && typeof error === 'object' && 'request' in error) {
        const requestError = error as { request: any };
        console.error('Request:', JSON.stringify(requestError.request, null, 2));
      }
      
      console.log(`Request failed after ${Date.now() - startTime}ms`);
      console.log('=== GRAPHQL API REQUEST END (ERROR) ===');
      
      // No fallback to mock data - propagate the error to the application
      throw graphqlError;
    }
  }
  


  /**
   * Get metadata about the database from the GraphQL API.
   * @returns A promise that resolves to the database metadata.
   */
  async getMetadata(): Promise<any> {
    console.log('=== GRAPHQL API METADATA REQUEST START ===');
    console.log(`API Endpoint: ${this.apiEndpoint}`);
    console.log(`Database: ${this.database}`);
    console.log(`Headers:`, JSON.stringify(this.headers, null, 2));
    
    try {
      const query = gql`
        query GetMetadata($database: String) {
          metadata(database: $database) {
            labels
            relationshipTypes {
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

      console.log(`GraphQL query: ${query}`);
      console.log(`Variables: ${JSON.stringify(variables, null, 2)}`);
      console.log('Sending metadata request to GraphQL API...');
      
      console.time('Metadata Request Duration');
      const response = await this.client.request(query, variables) as { metadata: any };
      console.timeEnd('Metadata Request Duration');
      
      console.log('Metadata response received');
      
      if (response && response.metadata) {
        console.log(`Labels count: ${response.metadata.labels ? response.metadata.labels.length : 0}`);
        console.log(`Relationship types count: ${response.metadata.relationshipTypes ? response.metadata.relationshipTypes.length : 0}`);
        console.log(`Property keys count: ${response.metadata.propertyKeys ? response.metadata.propertyKeys.length : 0}`);
        console.log(`Functions count: ${response.metadata.functions ? response.metadata.functions.length : 0}`);
        console.log(`Procedures count: ${response.metadata.procedures ? response.metadata.procedures.length : 0}`);
      } else {
        console.log('Warning: Empty metadata received from GraphQL API');
      }
      
      console.log('=== GRAPHQL API METADATA REQUEST END (SUCCESS) ===');
      return response.metadata;
    } catch (error: unknown) {
      console.error('=== GRAPHQL API METADATA REQUEST ERROR ===');
      
      if (error instanceof Error) {
        console.error(`Error type: ${error.constructor.name}`);
        console.error(`Error message: ${error.message}`);
        console.error(`Stack trace: ${error.stack}`);
      } else {
        console.error(`Unknown error type: ${typeof error}`);
        console.error(`Error value: ${String(error)}`);
      }
      
      // Create a structured error with detailed information
      const graphqlError = GraphQLApiError.fromError(error);
      
      // Log additional details for debugging
      if (graphqlError.graphQLErrors) {
        console.error('GraphQL Errors:', JSON.stringify(graphqlError.graphQLErrors, null, 2));
      }
      
      // Check if error has response property (GraphQL client error)
      if (error && typeof error === 'object' && 'response' in error) {
        const responseError = error as { response: { data?: any, status?: number, headers?: any } };
        if (responseError.response) {
          console.error('Response data:', JSON.stringify(responseError.response.data, null, 2));
          console.error('Response status:', responseError.response.status);
          console.error('Response headers:', JSON.stringify(responseError.response.headers, null, 2));
        }
      }
      
      // Check if error has request property
      if (error && typeof error === 'object' && 'request' in error) {
        const requestError = error as { request: any };
        console.error('Request:', JSON.stringify(requestError.request, null, 2));
      }
      
      console.error('=== GRAPHQL API METADATA REQUEST END (ERROR) ===');
      throw graphqlError;
    }
  }

  /**
   * Get the GraphQL client instance.
   * @returns The GraphQLClient instance.
   */
  getClient(): GraphQLClient {
    return this.client;
  }

  /**
   * Set the database to use for queries.
   * @param database - The database name to use.
   */
  setDatabase(database: string): void {
    if (database) {
      this.database = database;
      this.headers['x-database'] = database;
      // Update the client with the new headers
      this.client = new GraphQLClient(this.apiEndpoint, { headers: this.headers });
    }
  }

  /**
   * Get the current database name.
   * @returns The current database name.
   */
  getDatabase(): string {
    return this.database;
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
  // If ALLOW_QUERIES_WITHOUT_LOGIN is enabled, we can create a service instance with default values
  if (!graphQLApiServiceInstance) {
    if (apiEndpoint) {
      // If an endpoint is provided, use it with the provided credentials
      graphQLApiServiceInstance = new GraphQLApiService(apiEndpoint, apiKey, authToken, database);
    } else if (ALLOW_QUERIES_WITHOUT_LOGIN) {
      // If no endpoint is provided but queries without login are allowed, use default values
      graphQLApiServiceInstance = new GraphQLApiService(
        'http://localhost:4000/graphql', // Default endpoint
        '', // No API key
        '', // No auth token
        database || 'neo4j' // Default database if not provided
      );
    } else {
      throw new Error('GraphQLApiService not initialized. Please provide an API endpoint.');
    }
  } else if (apiEndpoint) {
    // Update existing instance if endpoint is provided
    graphQLApiServiceInstance.updateConfig(apiEndpoint, apiKey, authToken, database);
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