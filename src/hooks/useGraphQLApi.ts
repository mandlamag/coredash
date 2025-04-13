import { useState, useCallback, useEffect } from 'react';
import { getGraphQLApiService, GraphQLApiService } from '../services/GraphQLApiService';

/**
 * Custom hook for interacting with the GraphQL API.
 * Provides methods for executing queries, retrieving metadata,
 * and verifying connections to the GraphQL API.
 * 
 * @param apiEndpoint - The URL of the GraphQL API endpoint.
 * @param apiKey - Optional API key for authentication.
 * @param authToken - Optional authentication token.
 * @param database - Optional database name.
 * @returns An object containing the GraphQL API service and connection state.
 */
export const useGraphQLApi = (
  apiEndpoint?: string,
  apiKey?: string,
  authToken?: string,
  database?: string
) => {
  const [service, setService] = useState<GraphQLApiService | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Initialize or update the GraphQL API service when parameters change
  useEffect(() => {
    if (apiEndpoint) {
      try {
        const apiService = getGraphQLApiService(apiEndpoint, apiKey, authToken, database);
        setService(apiService);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to initialize GraphQL API service'));
        setService(null);
      }
    }
  }, [apiEndpoint, apiKey, authToken, database]);

  /**
   * Verify connection to the GraphQL API.
   * @returns A promise that resolves to true if the connection is successful.
   */
  const verifyConnection = useCallback(async () => {
    if (!service) {
      throw new Error('GraphQL API service not initialized');
    }

    setIsConnecting(true);
    setError(null);

    try {
      const result = await service.verifyConnection();
      setIsConnected(true);
      setIsConnecting(false);
      return result;
    } catch (err) {
      setIsConnected(false);
      setError(err instanceof Error ? err : new Error('Failed to connect to GraphQL API'));
      setIsConnecting(false);
      throw err;
    }
  }, [service]);

  /**
   * Execute a Cypher query via the GraphQL API.
   * @param cypherQuery - The Cypher query to execute.
   * @param parameters - Optional parameters for the Cypher query.
   * @returns A promise that resolves to the query results.
   */
  const executeQuery = useCallback(
    async (cypherQuery: string, parameters: Record<string, any> = {}) => {
      if (!service) {
        throw new Error('GraphQL API service not initialized');
      }

      if (!isConnected) {
        throw new Error('Not connected to GraphQL API');
      }

      try {
        return await service.executeQuery(cypherQuery, parameters);
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to execute query'));
        throw err;
      }
    },
    [service, isConnected]
  );

  /**
   * Get metadata about the database from the GraphQL API.
   * @returns A promise that resolves to the database metadata.
   */
  const getMetadata = useCallback(async () => {
    if (!service) {
      throw new Error('GraphQL API service not initialized');
    }

    if (!isConnected) {
      throw new Error('Not connected to GraphQL API');
    }

    try {
      return await service.getMetadata();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to get metadata'));
      throw err;
    }
  }, [service, isConnected]);

  /**
   * Disconnect from the GraphQL API.
   */
  const disconnect = useCallback(() => {
    setIsConnected(false);
  }, []);

  return {
    service,
    isConnected,
    isConnecting,
    error,
    verifyConnection,
    executeQuery,
    getMetadata,
    disconnect,
  };
};
