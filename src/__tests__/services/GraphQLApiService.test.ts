import { GraphQLClient } from 'graphql-request';
import { GraphQLApiService, getGraphQLApiService, resetGraphQLApiService } from '../../../src/services/GraphQLApiService';
import { GraphQLApiError } from '../../../src/services/GraphQLApiError';

// Mock the GraphQLClient
jest.mock('graphql-request', () => {
  return {
    GraphQLClient: jest.fn().mockImplementation(() => {
      return {
        request: jest.fn(),
      };
    }),
    gql: jest.fn((query) => query),
  };
});

describe('GraphQLApiService', () => {
  let service: GraphQLApiService;
  const mockApiEndpoint = 'https://api.example.com/graphql';
  const mockApiKey = 'test-api-key';
  const mockAuthToken = 'test-auth-token';
  const mockDatabase = 'test-database';

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    resetGraphQLApiService();
    
    // Create a new service instance
    service = new GraphQLApiService(mockApiEndpoint, mockApiKey, mockAuthToken, mockDatabase);
    
    // Mock console.error to silence expected error logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore console.error after each test
    jest.restoreAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with the provided parameters', () => {
      // Verify that GraphQLClient was called with the correct parameters
      expect(GraphQLClient).toHaveBeenCalledWith(mockApiEndpoint, {
        headers: {
          'x-api-key': mockApiKey,
          'Authorization': `Bearer ${mockAuthToken}`,
          'x-database': mockDatabase,
        },
      });
    });

    it('should use default database if not provided', () => {
      const serviceWithoutDb = new GraphQLApiService(mockApiEndpoint);
      
      // Verify that GraphQLClient was called with the correct parameters
      expect(GraphQLClient).toHaveBeenCalledWith(mockApiEndpoint, {
        headers: {},
      });
      
      // Verify that the default database is set
      expect(serviceWithoutDb.getDatabase()).toBe('neo4j');
    });
  });

  describe('verifyConnection', () => {
    it('should return true when connection is successful', async () => {
      // Mock a successful connection
      const mockRequest = jest.fn().mockResolvedValue({ data: { __schema: { queryType: { name: 'Query' } } } });
      (service as any).client.request = mockRequest;

      const result = await service.verifyConnection();

      expect(result).toBe(true);
      expect(mockRequest).toHaveBeenCalled();
    });

    it('should throw GraphQLApiError when connection fails', async () => {
      // Mock a failed connection
      const mockError = new Error('Connection failed');
      const mockRequest = jest.fn().mockRejectedValue(mockError);
      (service as any).client.request = mockRequest;

      await expect(service.verifyConnection()).rejects.toBeInstanceOf(GraphQLApiError);
      expect(mockRequest).toHaveBeenCalled();
    });
  });

  describe('executeQuery', () => {
    const mockCypherQuery = 'MATCH (n) RETURN n LIMIT 10';
    const mockParameters = { param1: 'value1' };

    it('should execute a query and return the results', async () => {
      // Mock a successful query execution
      const mockQueryResult = {
        executeQuery: {
          records: [{ _fields: [1, 2, 3] }],
          summary: { resultAvailableAfter: 10, resultConsumedAfter: 5 },
        },
      };
      const mockRequest = jest.fn().mockResolvedValue(mockQueryResult);
      (service as any).client.request = mockRequest;

      const result = await service.executeQuery(mockCypherQuery, mockParameters);

      expect(result).toEqual(mockQueryResult.executeQuery);
      // Verify that the request was called with the correct parameters
      expect(mockRequest).toHaveBeenCalled();
      const callArgs = mockRequest.mock.calls[0];
      expect(callArgs[1]).toEqual({
        query: mockCypherQuery,
        parameters: mockParameters,
        database: mockDatabase,
      });
    });

    it('should throw GraphQLApiError when query execution fails', async () => {
      // Mock a failed query execution
      const mockError = new Error('Query execution failed');
      const mockRequest = jest.fn().mockRejectedValue(mockError);
      (service as any).client.request = mockRequest;

      await expect(service.executeQuery(mockCypherQuery, mockParameters)).rejects.toBeInstanceOf(GraphQLApiError);
      expect(mockRequest).toHaveBeenCalled();
    });
  });

  describe('getMetadata', () => {
    it('should retrieve metadata from the GraphQL API', async () => {
      // Mock a successful metadata retrieval
      const mockMetadataResult = {
        metadata: {
          nodes: [{ name: 'Person', labels: ['Person'], properties: [{ name: 'name', type: 'string' }] }],
          relationships: [{ name: 'KNOWS', type: 'KNOWS', properties: [] }],
          propertyKeys: ['name', 'age'],
          functions: [],
          procedures: [],
        },
      };
      const mockRequest = jest.fn().mockResolvedValue(mockMetadataResult);
      (service as any).client.request = mockRequest;

      const result = await service.getMetadata();

      expect(result).toEqual(mockMetadataResult.metadata);
      // Verify that the request was called with the correct parameters
      expect(mockRequest).toHaveBeenCalled();
      const callArgs = mockRequest.mock.calls[0];
      expect(callArgs[1]).toEqual({
        database: mockDatabase,
      });
    });

    it('should throw GraphQLApiError when metadata retrieval fails', async () => {
      // Mock a failed metadata retrieval
      const mockError = new Error('Metadata retrieval failed');
      const mockRequest = jest.fn().mockRejectedValue(mockError);
      (service as any).client.request = mockRequest;

      await expect(service.getMetadata()).rejects.toBeInstanceOf(GraphQLApiError);
      expect(mockRequest).toHaveBeenCalled();
    });
  });

  describe('getClient', () => {
    it('should return the GraphQL client instance', () => {
      const client = service.getClient();
      expect(client).toBeDefined();
    });
  });

  describe('setDatabase', () => {
    it('should update the database and recreate the client', () => {
      const newDatabase = 'new-database';
      service.setDatabase(newDatabase);

      expect(service.getDatabase()).toBe(newDatabase);
      expect(GraphQLClient).toHaveBeenCalledWith(mockApiEndpoint, {
        headers: expect.objectContaining({
          'x-database': newDatabase,
        }),
      });
    });
  });

  describe('getDatabase', () => {
    it('should return the current database name', () => {
      expect(service.getDatabase()).toBe(mockDatabase);
    });
  });

  describe('updateConfig', () => {
    it('should update the configuration with new values', () => {
      const newApiEndpoint = 'https://new-api.example.com/graphql';
      const newApiKey = 'new-api-key';
      const newAuthToken = 'new-auth-token';
      const newDatabase = 'new-database';

      service.updateConfig(newApiEndpoint, newApiKey, newAuthToken, newDatabase);

      expect(GraphQLClient).toHaveBeenCalledWith(newApiEndpoint, {
        headers: {
          'x-api-key': newApiKey,
          'Authorization': `Bearer ${newAuthToken}`,
          'x-database': newDatabase,
        },
      });
    });

    it('should only update the provided values', () => {
      const newApiKey = 'new-api-key';

      service.updateConfig(undefined, newApiKey);

      // Verify that GraphQLClient was called with the correct parameters
      expect(GraphQLClient).toHaveBeenCalled();
      const calls = (GraphQLClient as jest.Mock).mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0]).toBe(mockApiEndpoint);
      expect(lastCall[1].headers).toMatchObject({
        'x-api-key': newApiKey,
        'Authorization': `Bearer ${mockAuthToken}`,
        'x-database': mockDatabase,
      });
    });
  });

  describe('getGraphQLApiService', () => {
    it('should create a new instance if none exists', () => {
      resetGraphQLApiService();
      const instance = getGraphQLApiService(mockApiEndpoint, mockApiKey, mockAuthToken, mockDatabase);

      expect(instance).toBeInstanceOf(GraphQLApiService);
      expect(GraphQLClient).toHaveBeenCalledWith(mockApiEndpoint, {
        headers: {
          'x-api-key': mockApiKey,
          'Authorization': `Bearer ${mockAuthToken}`,
          'x-database': mockDatabase,
        },
      });
    });

    it('should update the existing instance if one exists', () => {
      const instance1 = getGraphQLApiService(mockApiEndpoint, mockApiKey, mockAuthToken, mockDatabase);
      const newApiEndpoint = 'https://new-api.example.com/graphql';
      const instance2 = getGraphQLApiService(newApiEndpoint, mockApiKey, mockAuthToken, mockDatabase);

      expect(instance1).toBe(instance2);
      expect(GraphQLClient).toHaveBeenCalledWith(newApiEndpoint, {
        headers: {
          'x-api-key': mockApiKey,
          'Authorization': `Bearer ${mockAuthToken}`,
          'x-database': mockDatabase,
        },
      });
    });

    it('should throw an error if no API endpoint is provided and no instance exists', () => {
      resetGraphQLApiService();
      expect(() => getGraphQLApiService()).toThrow('GraphQLApiService not initialized. Please provide an API endpoint.');
    });
  });

  describe('resetGraphQLApiService', () => {
    it('should reset the GraphQLApiService instance', () => {
      const instance1 = getGraphQLApiService(mockApiEndpoint);
      resetGraphQLApiService();
      
      // This should throw an error because the instance was reset
      expect(() => getGraphQLApiService()).toThrow('GraphQLApiService not initialized. Please provide an API endpoint.');
      
      // Creating a new instance should work
      const instance2 = getGraphQLApiService(mockApiEndpoint);
      expect(instance2).not.toBe(instance1);
    });
  });
});
