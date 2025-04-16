import { GraphQLClient } from 'graphql-request';
import { gql } from 'graphql-request';
import { GraphQLApiError } from './GraphQLApiError';
import { ALLOW_QUERIES_WITHOUT_LOGIN, GRAPHQL_API_URL } from '../config/ApplicationConfig';

// Add detailed connection logging to console
const logConnectionAttempt = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`%c[${timestamp}] GraphQL Connection: ${message}`, 'color: #0066cc; font-weight: bold;', data);
};

const logConnectionError = (message, error: Record<string, unknown>) => {
  const timestamp = new Date().toISOString();
  console.error(`%c[${timestamp}] GraphQL Connection Error: ${message}`, 'color: #cc0000; font-weight: bold;', error);
};

const logConnectionSuccess = (message, data = {}) => {
  const timestamp = new Date().toISOString();
  console.log(`%c[${timestamp}] GraphQL Connection Success: ${message}`, 'color: #00cc00; font-weight: bold;', data);
};

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
    logConnectionAttempt('Verifying connection...');
    console.log('=== GRAPHQL API CONNECTION VERIFICATION START ===');
    console.log(`API Endpoint: ${this.apiEndpoint}`);
    console.log(`Headers:`, JSON.stringify(this.headers, null, 2));
    console.log(`Database: ${this.database}`);
    console.log(`Navigator online status: ${navigator.onLine}`);
    console.log(`Window location: ${window.location.href}`);
    
    try {
      // If ALLOW_QUERIES_WITHOUT_LOGIN is enabled and we have no auth credentials,
      // we can skip the connection verification
      if (
        ALLOW_QUERIES_WITHOUT_LOGIN &&
        !this.headers['Authorization'] &&
        !this.headers['x-api-key']
      ) {
        console.log(
          'ALLOW_QUERIES_WITHOUT_LOGIN is enabled and no auth credentials provided, skipping connection verification'
        );
        logConnectionSuccess('Connection verification skipped');
        return true;
      }

      console.log('Sending GraphQL introspection query...');
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
      const result = await this.client.request(query);
      console.timeEnd('Connection Verification Duration');
      
      console.log('Connection successful!', result);
      console.log(`Connection verification took ${Date.now()}ms`);
      logConnectionSuccess('Connection verified');
      console.log('=== GRAPHQL API CONNECTION VERIFICATION END (SUCCESS) ===');
      return true;
    } catch (error: any) {
      logConnectionError('Connection failed', error);
      console.error('=== GRAPHQL API CONNECTION ERROR ===');
      console.error('Connection failed with error:', error);
      
      if (error instanceof Error) {
        console.error('Error type:', error.constructor.name);
        console.error('Error message:', error.message);
        console.error('Error stack:', error.stack);
      }
      
      console.error('Navigator online status:', navigator.onLine);
      console.error('Window location:', window.location.href);
      
      // Log additional network information if available
      try {
        if ('connection' in navigator && navigator.connection) {
          console.error('Network type:', (navigator as any).connection.type);
          console.error('Network speed:', (navigator as any).connection.downlink);
        }
      } catch (e) {
        console.error('Could not access network information');
      }
      
      throw new GraphQLApiError('Failed to connect to GraphQL API', error);
    } finally {
      console.log('=== GRAPHQL API CONNECTION VERIFICATION END ===');
    }
  }

  /**
   * Try to connect using multiple possible endpoints.
   * This helps overcome Docker networking issues by trying different connection strategies.
   * @returns A promise that resolves to true if any connection is successful.
   */
  async tryMultipleConnections(): Promise<boolean> {
    logConnectionAttempt('Trying multiple connections...');
    console.log('=== TRYING MULTIPLE CONNECTION STRATEGIES ===');
    
    // Original endpoint from configuration
    const originalEndpoint = this.apiEndpoint;
    console.log(`Original endpoint: ${originalEndpoint}`);
    
    // List of fallback endpoints to try
    const fallbackEndpoints = [
      originalEndpoint,                              // Try original first
      '/graphql',                                    // Relative path (for NGINX proxy)
      window.location.origin + '/graphql',           // Absolute path using current origin
      'http://localhost:4000/graphql',               // Direct localhost connection
      'http://host.docker.internal:4000/graphql'     // Special Docker hostname for host machine
    ];
    
    // Filter out duplicates
    const uniqueEndpoints = [...new Set(fallbackEndpoints)];
    console.log(`Will try ${uniqueEndpoints.length} different endpoints:`, uniqueEndpoints);
    
    // Try each endpoint
    for (const endpoint of uniqueEndpoints) {
      console.log(`Trying endpoint: ${endpoint}`);
      
      try {
        // Temporarily update the client with the new endpoint
        const tempClient = new GraphQLClient(endpoint, { headers: this.headers });
        const originalClient = this.client;
        this.client = tempClient;
        
        // Try to connect
        const query = gql`
          query {
            __schema {
              queryType {
                name
              }
            }
          }
        `;
        
        const result = await this.client.request(query);
        console.log(`Connection successful with endpoint: ${endpoint}`);
        
        // If successful, update the service to use this endpoint
        this.apiEndpoint = endpoint;
        console.log(`Updated service to use endpoint: ${endpoint}`);
        
        logConnectionSuccess(`Connection established with endpoint: ${endpoint}`);
        return true;
      } catch (error) {
        logConnectionError(`Connection failed for endpoint: ${endpoint}`, error as Record<string, unknown>);
        console.error(`Connection failed for endpoint: ${endpoint}`);
        console.error('Error:', error);
      }
    }
    
    // If we get here, all connection attempts failed
    logConnectionError('All connection attempts failed');
    console.error('All connection attempts failed');
    
    // Restore original endpoint
    this.apiEndpoint = originalEndpoint;
    this.client = new GraphQLClient(originalEndpoint, { headers: this.headers });
    
    throw new GraphQLApiError('Failed to connect to GraphQL API using any available endpoint');
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
  async handleSpecialQuery(query: string, parameters: Record<string, any> = {}): Promise<any> {
    const normalizedQuery = query.trim().toUpperCase();
    
    try {
      // For SHOW DATABASES, provide a more comprehensive response with available databases
      // This is critical for database selection in the UI
      if (normalizedQuery.startsWith('SHOW DATABASES')) {
        console.log('Handling SHOW DATABASES query with enhanced response');
        
        // In GraphQL-only mode, we'll provide a fixed list of databases
        // This can be customized based on your environment or configuration
        const availableDatabases = [this.database];
        
        // If we have a specific database configured in headers, add it to the list
        if (this.headers['x-database'] && !availableDatabases.includes(this.headers['x-database'])) {
          availableDatabases.push(this.headers['x-database']);
        }
        
        // Add standard Neo4j databases if they're not already in the list
        ['neo4j', 'system'].forEach(db => {
          if (!availableDatabases.includes(db)) {
            availableDatabases.push(db);
          }
        });
        
        // Create a Neo4j-like response with the available databases
        return {
          records: availableDatabases.map(db => ({
            keys: ['name'],
            _fields: [db],
            get: (key: string) => key === 'name' ? db : null,
            toObject: () => ({ name: db })
          })),
          summary: {
            resultAvailableAfter: 0,
            resultConsumedAfter: 0
          }
        };
      }
      
      // For other special queries, attempt to execute them using the standard executeQuery method
      // We can't call executeQuery directly as it would create an infinite loop
      // So we'll use a simplified direct GraphQL call instead
      const formattedQuery = JSON.stringify(query);
      const graphqlQuery = gql`
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
      
      const response = await this.client.request(graphqlQuery) as { executeCypherQuery: any };
      if (response && response.executeCypherQuery) {
        return response.executeCypherQuery;
      }
      
      throw new Error('Invalid response from GraphQL API');
    } catch (error) {
      console.error('Error handling special query:', error);
      
      // For SHOW DATABASES, provide a minimal response with the current database
      // This is a fallback if the enhanced handling fails
      if (normalizedQuery.startsWith('SHOW DATABASES')) {
        console.log('Providing minimal response for SHOW DATABASES');
        return {
          records: [
            { 
              keys: ['name'],
              _fields: [this.database],
              get: (key: string) => key === 'name' ? this.database : null,
              toObject: () => ({ name: this.database })
            }
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
    logConnectionAttempt('Executing query...');
    console.log('=== GRAPHQL API REQUEST START ===');
    console.log(`Timestamp: ${new Date().toISOString()}`);
    console.log(`Cypher Query: ${cypherQuery}`);
    console.log(`Database: ${this.database}`);
    console.log(`Parameters:`, JSON.stringify(parameters, null, 2));
    console.log(`API Endpoint: ${this.apiEndpoint}`);
    
    // Ensure required parameters always have a default value
    const safeParameters = { ...parameters };
    
    // Check for $input parameter in query and ensure it has a default value
    if (cypherQuery.includes('$input') && (!('input' in safeParameters) || safeParameters.input === undefined)) {
      console.log('Adding default empty string for $input parameter');
      safeParameters.input = '';
    }
    
    // Handle special queries that the GraphQL API might need special handling for
    if (this.isSpecialQuery(cypherQuery)) {
      console.log('Query identified as special query, using special handling');
      try {
        const result = await this.handleSpecialQuery(cypherQuery, safeParameters);
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
      // Check if the query is complex (multi-line or contains special characters)
      const isComplexQuery = cypherQuery.includes('\n') || 
                            cypherQuery.includes('datetime') || 
                            cypherQuery.includes('duration') ||
                            cypherQuery.includes('{') ||
                            cypherQuery.includes('}');
      
      // For complex queries with triple quotes, use a different approach
      let graphqlQuery;
      if (isComplexQuery) {
        console.log('Using triple quotes for complex query');
        const tripleQuotedQuery = `"""${cypherQuery}"""`;
        
        graphqlQuery = gql`
          query ExecuteCypherQuery($parameters: JSON) {
            executeCypherQuery(query: ${tripleQuotedQuery}, parameters: $parameters) {
              records
              summary {
                resultAvailableAfter
                resultConsumedAfter
                counters
              }
            }
          }
        `;
      } else {
        // For simple queries, use the standard JSON.stringify approach
        const formattedQuery = JSON.stringify(cypherQuery);
        console.log(`Formatted query: ${formattedQuery}`);
        
        graphqlQuery = gql`
          query ExecuteCypherQuery($parameters: JSON) {
            executeCypherQuery(query: ${formattedQuery}, parameters: $parameters) {
              records
              summary {
                resultAvailableAfter
                resultConsumedAfter
                counters
              }
            }
          }
        `;
      }
      
      console.log(`Full GraphQL query: ${graphqlQuery}`);

      // Set the database header if needed
      if (this.database) {
        console.log(`Setting database header: x-database: ${this.database}`);
        this.client.setHeader('x-database', this.database);
      }

      console.log('Sending request to GraphQL API...');
      console.time('GraphQL API Request Duration');
      
      // Execute the query against the GraphQL API
      const response = await this.client.request(graphqlQuery, { parameters: safeParameters }) as { executeCypherQuery: any };
      
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
      logConnectionSuccess('Query executed successfully');
      console.log('=== GRAPHQL API REQUEST END (SUCCESS) ===');
      return result;
    } catch (error: unknown) {
      logConnectionError('Query execution failed', error as Record<string, unknown>);
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
    logConnectionAttempt('Retrieving metadata...');
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
      
      logConnectionSuccess('Metadata retrieved');
      console.log('=== GRAPHQL API METADATA REQUEST END (SUCCESS) ===');
      return response.metadata;
    } catch (error: unknown) {
      logConnectionError('Metadata retrieval failed', error as Record<string, unknown>);
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
   * Get the current API endpoint.
   * @returns The current API endpoint URL.
   */
  getApiEndpoint(): string {
    return this.apiEndpoint;
  }

  /**
   * Update the service configuration.
   * @param apiEndpoint - Optional new API endpoint.
   * @param apiKey - Optional new API key.
   * @param authToken - Optional new auth token.
   * @param database - Optional new database name.
   */
  updateConfig(apiEndpoint?: string, apiKey?: string, authToken?: string, database?: string): void {
    console.log('=== UPDATING GRAPHQL API SERVICE CONFIG ===');
    
    if (apiEndpoint) {
      console.log(`Updating API endpoint: ${this.apiEndpoint} -> ${apiEndpoint}`);
      this.apiEndpoint = apiEndpoint;
      // Recreate client with new endpoint
      this.client = new GraphQLClient(this.apiEndpoint, { headers: this.headers });
    }
    
    if (apiKey) {
      console.log('Updating API key');
      this.headers['x-api-key'] = apiKey;
    }
    
    if (authToken) {
      console.log('Updating auth token');
      this.headers['Authorization'] = `Bearer ${authToken}`;
    }
    
    if (database) {
      console.log(`Updating database: ${this.database} -> ${database}`);
      this.database = database;
      this.headers['x-database'] = database;
    }
    
    // Update client headers
    this.client = new GraphQLClient(this.apiEndpoint, { headers: this.headers });
    
    console.log('=== GRAPHQL API SERVICE CONFIG UPDATED ===');
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
  if (!graphQLApiServiceInstance) {
    // Use configured URL with fallbacks
    const configuredEndpoint = apiEndpoint || GRAPHQL_API_URL;
    
    console.log('=== GRAPHQL API SERVICE INITIALIZATION ===');
    console.log(`Configured endpoint: ${configuredEndpoint}`);
    
    // Create service with the configured endpoint
    graphQLApiServiceInstance = new GraphQLApiService(
      configuredEndpoint || '/graphql', // Default to relative path if nothing else is provided
      apiKey,
      authToken,
      database
    );
  } else if (apiEndpoint || apiKey || authToken || database) {
    // Update the existing instance if new parameters are provided
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