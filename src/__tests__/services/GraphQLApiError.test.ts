import { GraphQLApiError } from '../../../src/services/GraphQLApiError';

describe('GraphQLApiError', () => {
  describe('constructor', () => {
    it('should create an error with the provided message', () => {
      const message = 'Test error message';
      const error = new GraphQLApiError(message);

      expect(error.message).toBe(message);
      expect(error.name).toBe('GraphQLApiError');
      expect(error.originalError).toBeNull();
      expect(error.statusCode).toBeUndefined();
      expect(error.graphQLErrors).toBeUndefined();
      expect(error.networkError).toBeUndefined();
    });

    it('should create an error with options', () => {
      const message = 'Test error message';
      const statusCode = 401;
      const graphQLErrors = [{ message: 'GraphQL error' }];
      const networkError = new Error('Network error');
      const originalError = new Error('Original error');
      
      const error = new GraphQLApiError(message, {
        statusCode,
        graphQLErrors,
        networkError,
        originalError
      });

      expect(error.message).toBe(message);
      expect(error.name).toBe('GraphQLApiError');
      expect(error.statusCode).toBe(statusCode);
      expect(error.graphQLErrors).toBe(graphQLErrors);
      expect(error.networkError).toBe(networkError);
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('fromError', () => {
    it('should return the same error if it is already a GraphQLApiError', () => {
      const originalError = new GraphQLApiError('Original error');
      const error = GraphQLApiError.fromError(originalError);
      
      expect(error).toBe(originalError);
    });

    it('should create an error from GraphQL response errors', () => {
      const graphQLErrors = [
        { message: 'Field error 1' },
        { message: 'Field error 2' }
      ];
      const originalError = {
        response: {
          errors: graphQLErrors
        }
      };
      
      const error = GraphQLApiError.fromError(originalError);
      
      expect(error.message).toBe('Field error 1; Field error 2');
      expect(error.graphQLErrors).toBe(graphQLErrors);
      expect(error.originalError).toBe(originalError);
    });

    it('should create an error from HTTP error with status code', () => {
      const originalError = {
        response: {
          status: 404,
          statusText: 'Not Found'
        }
      };
      
      const error = GraphQLApiError.fromError(originalError);
      
      expect(error.message).toBe('HTTP Error 404: Not Found');
      expect(error.statusCode).toBe(404);
      expect(error.originalError).toBe(originalError);
    });

    it('should create an error from network error', () => {
      const originalError = {
        message: 'Network request failed'
      };
      
      const error = GraphQLApiError.fromError(originalError);
      
      expect(error.message).toBe('Network request to GraphQL API failed');
      expect(error.networkError).toBe(originalError);
      expect(error.originalError).toBe(originalError);
    });

    it('should create an error from generic error with message', () => {
      const originalError = {
        message: 'Generic error message'
      };
      
      const error = GraphQLApiError.fromError(originalError);
      
      expect(error.message).toBe('Generic error message');
      expect(error.originalError).toBe(originalError);
    });

    it('should create a default error when no specific information is available', () => {
      const originalError = {};
      
      const error = GraphQLApiError.fromError(originalError);
      
      expect(error.message).toBe('GraphQL API Error');
      expect(error.originalError).toBe(originalError);
    });
  });

  describe('getUserFriendlyMessage', () => {
    it('should return authentication error message for 401 status code', () => {
      const error = new GraphQLApiError('Auth failed', { statusCode: 401 });
      expect(error.getUserFriendlyMessage()).toBe('Authentication failed. Please check your API key or auth token.');
    });

    it('should return authentication error message for 403 status code', () => {
      const error = new GraphQLApiError('Auth failed', { statusCode: 403 });
      expect(error.getUserFriendlyMessage()).toBe('Authentication failed. Please check your API key or auth token.');
    });

    it('should return not found error message for 404 status code', () => {
      const error = new GraphQLApiError('Not found', { statusCode: 404 });
      expect(error.getUserFriendlyMessage()).toBe('GraphQL API endpoint not found. Please check the URL.');
    });

    it('should return server error message for 500+ status codes', () => {
      const error = new GraphQLApiError('Server error', { statusCode: 500 });
      expect(error.getUserFriendlyMessage()).toBe('GraphQL API server error. Please try again later.');
    });

    it('should return connection error message for network errors', () => {
      const networkError = new Error('Network error');
      const error = new GraphQLApiError('Connection failed', { networkError });
      expect(error.getUserFriendlyMessage()).toBe('Could not connect to the GraphQL API. Please check your internet connection and API endpoint.');
    });

    it('should return GraphQL error message for GraphQL errors', () => {
      const graphQLErrors = [
        { message: 'Field error 1' },
        { message: 'Field error 2' }
      ];
      const error = new GraphQLApiError('GraphQL error', { graphQLErrors });
      expect(error.getUserFriendlyMessage()).toBe('GraphQL Error: Field error 1; Field error 2');
    });

    it('should return the original message as fallback', () => {
      const message = 'Original error message';
      const error = new GraphQLApiError(message);
      expect(error.getUserFriendlyMessage()).toBe(message);
    });
  });
});
