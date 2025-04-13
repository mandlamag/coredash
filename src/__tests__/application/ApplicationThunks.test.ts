import configureMockStore from 'redux-mock-store';
import thunk from 'redux-thunk';
import { createConnectionThunk, setDatabaseThunk } from '../../../src/application/ApplicationThunks';
import { getGraphQLApiService } from '../../../src/services/GraphQLApiService';
import { GraphQLApiError } from '../../../src/services/GraphQLApiError';

// Mock the GraphQLApiService
jest.mock('../../../src/services/GraphQLApiService', () => {
  const mockVerifyConnection = jest.fn();
  const mockSetDatabase = jest.fn();
  return {
    getGraphQLApiService: jest.fn(() => ({
      verifyConnection: mockVerifyConnection,
      setDatabase: mockSetDatabase,
    })),
    __mockVerifyConnection: mockVerifyConnection,
    __mockSetDatabase: mockSetDatabase,
  };
});

// Create mock store
const middlewares = [thunk];
const mockStore = configureMockStore(middlewares);

describe('ApplicationThunks', () => {
  const mockVerifyConnection = (getGraphQLApiService as any).__mockVerifyConnection;
  const mockSetDatabase = (getGraphQLApiService as any).__mockSetDatabase;
  
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

  describe('createConnectionThunk', () => {
    const apiEndpoint = 'https://api.example.com/graphql';
    const apiKey = 'test-api-key';
    const authToken = 'test-auth-token';
    const database = 'test-database';

    it('should successfully establish a connection and update state', async () => {
      // Mock successful connection verification
      mockVerifyConnection.mockResolvedValue(true);
      
      // Create mock store with initial state
      const store = mockStore({
        application: {
          connection: {
            apiEndpoint: '',
            apiKey: '',
            authToken: '',
            database: '',
            status: 'disconnected',
          },
        },
      });

      // Dispatch the thunk
      await store.dispatch(createConnectionThunk(apiEndpoint, apiKey, authToken, database) as any);

      // Check the dispatched actions
      const actions = store.getActions();
      
      // Expect actions for starting connection, setting connection properties, and connection success
      expect(actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'application/startConnection' }),
          expect.objectContaining({ 
            type: 'application/setConnectionProperties',
            payload: {
              apiEndpoint,
              apiKey,
              authToken,
              database,
            }
          }),
          expect.objectContaining({ type: 'application/connectionSuccess' }),
        ])
      );
      
      // Verify that getGraphQLApiService was called with the correct parameters
      expect(getGraphQLApiService).toHaveBeenCalledWith(apiEndpoint, apiKey, authToken, database);
      expect(mockVerifyConnection).toHaveBeenCalled();
    });

    it('should handle connection errors and update state with error notification', async () => {
      // Mock failed connection verification with GraphQLApiError
      const connectionError = new GraphQLApiError('Failed to connect to GraphQL API', {
        networkError: new Error('Network error'),
        statusCode: 500
      });
      mockVerifyConnection.mockRejectedValue(connectionError);
      
      // Create mock store with initial state
      const store = mockStore({
        application: {
          connection: {
            apiEndpoint: '',
            apiKey: '',
            authToken: '',
            database: '',
            status: 'disconnected',
          },
        },
      });

      // Dispatch the thunk
      await store.dispatch(createConnectionThunk(apiEndpoint, apiKey, authToken, database) as any);

      // Check the dispatched actions
      const actions = store.getActions();
      
      // Expect actions for starting connection and connection failure
      expect(actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ type: 'application/startConnection' }),
          expect.objectContaining({ type: 'application/connectionFailed' }),
          expect.objectContaining({ 
            type: 'application/createNotification',
            payload: expect.objectContaining({
              message: connectionError.getUserFriendlyMessage(),
              severity: 'error',
            })
          }),
        ])
      );
      
      // Verify that getGraphQLApiService was called with the correct parameters
      expect(getGraphQLApiService).toHaveBeenCalledWith(apiEndpoint, apiKey, authToken, database);
      expect(mockVerifyConnection).toHaveBeenCalled();
    });

    it('should handle authentication errors with appropriate error message', async () => {
      // Mock failed connection verification with authentication error
      const authError = new GraphQLApiError('Authentication failed', {
        statusCode: 401
      });
      mockVerifyConnection.mockRejectedValue(authError);
      
      // Create mock store with initial state
      const store = mockStore({
        application: {
          connection: {
            apiEndpoint: '',
            apiKey: '',
            authToken: '',
            database: '',
            status: 'disconnected',
          },
        },
      });

      // Dispatch the thunk
      await store.dispatch(createConnectionThunk(apiEndpoint, apiKey, authToken, database) as any);

      // Check the dispatched actions
      const actions = store.getActions();
      
      // Expect notification with authentication error message
      const notificationAction = actions.find(action => action.type === 'application/createNotification');
      expect(notificationAction).toBeDefined();
      expect(notificationAction.payload.message).toBe(authError.getUserFriendlyMessage());
      expect(notificationAction.payload.severity).toBe('error');
    });

    it('should handle generic errors with fallback error message', async () => {
      // Mock failed connection verification with generic error
      const genericError = new Error('Something went wrong');
      mockVerifyConnection.mockRejectedValue(genericError);
      
      // Create mock store with initial state
      const store = mockStore({
        application: {
          connection: {
            apiEndpoint: '',
            apiKey: '',
            authToken: '',
            database: '',
            status: 'disconnected',
          },
        },
      });

      // Dispatch the thunk
      await store.dispatch(createConnectionThunk(apiEndpoint, apiKey, authToken, database) as any);

      // Check the dispatched actions
      const actions = store.getActions();
      
      // Expect notification with generic error message
      const notificationAction = actions.find(action => action.type === 'application/createNotification');
      expect(notificationAction).toBeDefined();
      expect(notificationAction.payload.message).toContain('Something went wrong');
      expect(notificationAction.payload.severity).toBe('error');
    });
  });

  describe('setDatabaseThunk', () => {
    const database = 'new-database';

    it('should update the database and dispatch actions', async () => {
      // Create mock store with initial state
      const store = mockStore({
        application: {
          connection: {
            apiEndpoint: 'https://api.example.com/graphql',
            apiKey: 'test-api-key',
            authToken: 'test-auth-token',
            database: 'old-database',
            status: 'connected',
          },
        },
      });

      // Dispatch the thunk
      await store.dispatch(setDatabaseThunk(database) as any);

      // Check the dispatched actions
      const actions = store.getActions();
      
      // Expect actions for setting database
      expect(actions).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            type: 'application/setConnectionDatabase',
            payload: database
          }),
          expect.objectContaining({ 
            type: 'application/createNotification',
            payload: expect.objectContaining({
              message: `Switched to database: ${database}`,
              severity: 'success',
            })
          }),
        ])
      );
      
      // Verify that setDatabase was called with the correct parameter
      expect(mockSetDatabase).toHaveBeenCalledWith(database);
    });

    it('should handle errors when setting database', async () => {
      // Mock setDatabase to throw an error
      const databaseError = new GraphQLApiError('Failed to set database', {
        graphQLErrors: [{ message: 'Database not found or not accessible' }]
      });
      mockSetDatabase.mockImplementation(() => {
        throw databaseError;
      });
      
      // Create mock store with initial state
      const store = mockStore({
        application: {
          connection: {
            apiEndpoint: 'https://api.example.com/graphql',
            apiKey: 'test-api-key',
            authToken: 'test-auth-token',
            database: 'old-database',
            status: 'connected',
          },
        },
      });

      // Dispatch the thunk
      await store.dispatch(setDatabaseThunk(database) as any);

      // Check the dispatched actions
      const actions = store.getActions();
      
      // Expect error notification
      const notificationAction = actions.find(action => action.type === 'application/createNotification');
      expect(notificationAction).toBeDefined();
      expect(notificationAction.payload.message).toBe(databaseError.getUserFriendlyMessage());
      expect(notificationAction.payload.severity).toBe('error');
    });
  });
});
