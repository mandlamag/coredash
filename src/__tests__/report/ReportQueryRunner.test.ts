import { runCypherQuery, QueryStatus } from '../../../src/report/ReportQueryRunner';
import { getGraphQLApiService } from '../../../src/services/GraphQLApiService';
import { GraphQLApiError } from '../../../src/services/GraphQLApiError';

// Mock the GraphQLApiService
jest.mock('../../../src/services/GraphQLApiService', () => {
  const mockExecuteQuery = jest.fn();
  return {
    getGraphQLApiService: jest.fn(() => ({
      executeQuery: mockExecuteQuery,
      getDatabase: jest.fn(() => 'test-database'),
    })),
    __mockExecuteQuery: mockExecuteQuery,
  };
});

describe('runCypherQuery', () => {
  const mockExecuteQuery = (getGraphQLApiService as any).__mockExecuteQuery;

  const mockQuery = 'MATCH (n) RETURN n LIMIT 10';
  const mockParameters = { param1: 'value1' };
  const mockSetStatus = jest.fn();
  const mockSetRecords = jest.fn();
  const mockSetFields = jest.fn();

  beforeEach(() => {
    // Reset mocks before each test
    jest.clearAllMocks();
    
    // Mock console.error to silence expected error logs during tests
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  
  afterEach(() => {
    // Restore console.error after each test
    jest.restoreAllMocks();
  });

  it('should execute a query and update status and records', async () => {
    // Mock a successful query execution
    const mockQueryResult = {
      records: [{ 
        keys: ['n'], 
        _fields: [{ properties: { name: 'test' } }],
        get: (key: string) => ({ properties: { name: 'test' } })
      }],
      summary: { resultAvailableAfter: 10, resultConsumedAfter: 5 },
    };
    mockExecuteQuery.mockResolvedValue(mockQueryResult);

    await runCypherQuery(
      null, // driver (not used)
      'test-database',
      mockQuery,
      mockParameters,
      1000, // rowLimit
      mockSetStatus,
      mockSetRecords,
      mockSetFields
    );

    expect(mockExecuteQuery).toHaveBeenCalledWith(mockQuery, mockParameters);
    expect(mockSetStatus).toHaveBeenCalledWith(QueryStatus.COMPLETE);
    expect(mockSetRecords).toHaveBeenCalledWith(mockQueryResult.records);
  });

  it('should handle empty query', async () => {
    await runCypherQuery(
      null, // driver (not used)
      'test-database',
      '', // empty query
      {},
      1000,
      mockSetStatus,
      mockSetRecords,
      mockSetFields
    );

    expect(mockSetStatus).toHaveBeenCalledWith(QueryStatus.NO_QUERY);
    expect(mockSetFields).toHaveBeenCalledWith([]);
    expect(mockExecuteQuery).not.toHaveBeenCalled();
  });

  it('should handle empty results', async () => {
    // Mock an empty result
    const mockEmptyResult = {
      records: [],
      summary: { resultAvailableAfter: 10, resultConsumedAfter: 5 },
    };
    mockExecuteQuery.mockResolvedValue(mockEmptyResult);

    await runCypherQuery(
      null,
      'test-database',
      mockQuery,
      mockParameters,
      1000,
      mockSetStatus,
      mockSetRecords,
      mockSetFields
    );

    expect(mockExecuteQuery).toHaveBeenCalledWith(mockQuery, mockParameters);
    expect(mockSetStatus).toHaveBeenCalledWith(QueryStatus.NO_DATA);
    expect(mockSetRecords).toHaveBeenCalledWith([]);
  });

  it('should handle GraphQLApiError errors', async () => {
    // Mock a failed query execution with GraphQLApiError
    const originalError = new Error('Query execution failed');
    const graphqlApiError = new GraphQLApiError('Failed to execute query', {
      originalError,
      graphQLErrors: [{ message: 'Query execution failed' }]
    });
    mockExecuteQuery.mockRejectedValue(graphqlApiError);

    await runCypherQuery(
      null,
      'test-database',
      mockQuery,
      mockParameters,
      1000,
      mockSetStatus,
      mockSetRecords,
      mockSetFields
    );

    expect(mockExecuteQuery).toHaveBeenCalledWith(mockQuery, mockParameters);
    expect(mockSetStatus).toHaveBeenCalledWith(QueryStatus.ERROR);
    expect(mockSetRecords).toHaveBeenCalledWith([{ error: expect.stringContaining('GraphQL API error') }]);
  });

  it('should handle timeout errors', async () => {
    // Mock a timeout error
    const timeoutError = new Error('Query execution timed out');
    mockExecuteQuery.mockRejectedValue(timeoutError);

    await runCypherQuery(
      null,
      'test-database',
      mockQuery,
      mockParameters,
      1000,
      mockSetStatus,
      mockSetRecords,
      mockSetFields
    );

    expect(mockExecuteQuery).toHaveBeenCalledWith(mockQuery, mockParameters);
    expect(mockSetStatus).toHaveBeenCalledWith(QueryStatus.ERROR);
  });

  it('should apply row limit when useHardRowLimit is true', async () => {
    // Mock a successful query execution
    const mockQueryResult = {
      records: Array(1100).fill({
        keys: ['n'],
        _fields: [{ properties: { name: 'test' } }],
        get: (key: string) => ({ properties: { name: 'test' } })
      }),
      summary: { resultAvailableAfter: 10, resultConsumedAfter: 5 },
    };
    mockExecuteQuery.mockResolvedValue(mockQueryResult);

    await runCypherQuery(
      null,
      'test-database',
      mockQuery,
      mockParameters,
      1000, // rowLimit
      mockSetStatus,
      mockSetRecords,
      mockSetFields,
      [], // fields
      false, // useNodePropsAsFields
      false, // useReturnValuesAsFields
      true // useHardRowLimit
    );

    // Check that the query was modified to include LIMIT
    expect(mockExecuteQuery).toHaveBeenCalledWith(
      expect.stringContaining('LIMIT 1001'),
      mockParameters
    );
  });
});
