// Mock for graphql-request
export class GraphQLClient {
  constructor(endpoint: string, options?: any) {
    this.endpoint = endpoint;
    this.options = options;
  }

  endpoint: string;
  options: any;

  request = jest.fn();
}

export const gql = (query: string) => query;
