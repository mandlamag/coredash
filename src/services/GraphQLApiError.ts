/**
 * Custom error class for GraphQL API errors.
 * This provides structured error information for GraphQL-specific errors.
 */
export class GraphQLApiError extends Error {
  public readonly statusCode?: number;
  public readonly graphQLErrors?: any[];
  public readonly networkError?: Error;
  public readonly originalError: any;

  constructor(message: string, options: {
    statusCode?: number;
    graphQLErrors?: any[];
    networkError?: Error;
    originalError?: any;
  } = {}) {
    super(message);
    this.name = 'GraphQLApiError';
    this.statusCode = options.statusCode;
    this.graphQLErrors = options.graphQLErrors;
    this.networkError = options.networkError;
    this.originalError = options.originalError || null;

    // Maintains proper stack trace for where our error was thrown (only available on V8)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, GraphQLApiError);
    }
  }

  /**
   * Creates a GraphQLApiError from a caught error.
   * Attempts to extract as much useful information as possible from the original error.
   */
  static fromError(error: any): GraphQLApiError {
    // If it's already a GraphQLApiError, return it
    if (error instanceof GraphQLApiError) {
      return error;
    }

    let message = 'GraphQL API Error';
    let statusCode: number | undefined;
    let graphQLErrors: any[] | undefined;
    let networkError: Error | undefined;

    // Handle different error types from graphql-request
    if (error.response && error.response.errors) {
      // GraphQL errors from the response
      graphQLErrors = error.response.errors;
      message = graphQLErrors.map(e => e.message).join('; ') || 'GraphQL API returned errors';
    } else if (error.response && error.response.status) {
      // HTTP error with status code
      statusCode = error.response.status;
      message = `HTTP Error ${statusCode}: ${error.response.statusText || 'Unknown HTTP error'}`;
    } else if (error.message && error.message.includes('Network request failed')) {
      // Network error
      networkError = error;
      message = 'Network request to GraphQL API failed';
    } else if (error.message) {
      // Generic error with message
      message = error.message;
    }

    return new GraphQLApiError(message, {
      statusCode,
      graphQLErrors,
      networkError,
      originalError: error
    });
  }

  /**
   * Returns a user-friendly error message.
   */
  getUserFriendlyMessage(): string {
    if (this.statusCode === 401 || this.statusCode === 403) {
      return 'Authentication failed. Please check your API key or auth token.';
    } else if (this.statusCode === 404) {
      return 'GraphQL API endpoint not found. Please check the URL.';
    } else if (this.statusCode && this.statusCode >= 500) {
      return 'GraphQL API server error. Please try again later.';
    } else if (this.networkError) {
      return 'Could not connect to the GraphQL API. Please check your internet connection and API endpoint.';
    } else if (this.graphQLErrors && this.graphQLErrors.length > 0) {
      // Return a simplified version of the GraphQL errors
      return `GraphQL Error: ${this.graphQLErrors?.map(e => e.message).join('; ') || 'Unknown GraphQL error'}`;
    }
    
    return this.message;
  }
}
