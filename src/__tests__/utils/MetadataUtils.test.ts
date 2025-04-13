import { getDatabases } from '../../../src/utils/MetadataUtils';
import { getGraphQLApiService } from '../../../src/services/GraphQLApiService';
import { GraphQLApiError, GraphQLApiErrorType } from '../../../src/services/GraphQLApiError';

// Mock the GraphQLApiService
jest.mock('../../../src/services/GraphQLApiService', () => {
  const mockExecuteQuery = jest.fn();
  return {
    getGraphQLApiService: jest.fn(() => ({
      executeQuery: mockExecuteQuery,
    })),
    __mockExecuteQuery: mockExecuteQuery,
  };
});

describe('MetadataUtils', () => {
  const mockExecuteQuery = (getGraphQLApiService as any).__mockExecuteQuery;

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
  });

  describe('getDatabases', () => {
    it('should retrieve and transform database list from GraphQL API', async () => {
      // Mock a successful query execution with database records
      const mockQueryResult = {
        records: [
          { _fields: ['neo4j'], keys: ['name'], get: (key: string) => 'neo4j' },
          { _fields: ['system'], keys: ['name'], get: (key: string) => 'system' },
          { _fields: ['test'], keys: ['name'], get: (key: string) => 'test' }
        ],
        summary: { resultAvailableAfter: 10, resultConsumedAfter: 5 },
      };
      mockExecuteQuery.mockResolvedValue(mockQueryResult);

      const result = await getDatabases();

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'SHOW DATABASES YIELD name RETURN name ORDER BY name ASC',
        {}
      );
      expect(result).toEqual(['neo4j', 'system', 'test']);
    });

    it('should handle empty database list', async () => {
      // Mock a successful query execution with no database records
      const mockQueryResult = {
        records: [],
        summary: { resultAvailableAfter: 10, resultConsumedAfter: 5 },
      };
      mockExecuteQuery.mockResolvedValue(mockQueryResult);

      const result = await getDatabases();

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'SHOW DATABASES YIELD name RETURN name ORDER BY name ASC',
        {}
      );
      expect(result).toEqual([]);
    });

    it('should handle GraphQLApiError and return default database', async () => {
      // Mock a failed query execution with GraphQLApiError
      const graphqlApiError = new GraphQLApiError(
        'Failed to retrieve databases',
        GraphQLApiErrorType.QUERY_ERROR
      );
      mockExecuteQuery.mockRejectedValue(graphqlApiError);

      const result = await getDatabases();

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'SHOW DATABASES YIELD name RETURN name ORDER BY name ASC',
        {}
      );
      expect(result).toEqual(['neo4j']);
    });

    it('should handle generic errors and return default database', async () => {
      // Mock a failed query execution with a generic Error
      const genericError = new Error('Something went wrong');
      mockExecuteQuery.mockRejectedValue(genericError);

      const result = await getDatabases();

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'SHOW DATABASES YIELD name RETURN name ORDER BY name ASC',
        {}
      );
      expect(result).toEqual(['neo4j']);
    });

    it('should handle malformed response and return default database', async () => {
      // Mock a successful query execution with malformed response
      const mockQueryResult = {
        // Missing records property
        summary: { resultAvailableAfter: 10, resultConsumedAfter: 5 },
      };
      mockExecuteQuery.mockResolvedValue(mockQueryResult);

      const result = await getDatabases();

      expect(mockExecuteQuery).toHaveBeenCalledWith(
        'SHOW DATABASES YIELD name RETURN name ORDER BY name ASC',
        {}
      );
      expect(result).toEqual(['neo4j']);
    });
  });
});
