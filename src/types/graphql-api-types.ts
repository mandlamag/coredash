/**
 * Type definitions to replace Neo4j driver types with GraphQL API compatible types
 * This helps maintain compatibility with existing code while removing the neo4j-driver dependency
 */

// Replacement for Neo4jRecord
export interface GraphQLRecord {
  keys: string[];
  _fields: any[];
  get: (key: string) => any;
  toObject: () => Record<string, any>;
}

// Replacement for QueryResult
export interface GraphQLQueryResult {
  records: GraphQLRecord[];
  summary: {
    resultAvailableAfter: number;
    resultConsumedAfter: number;
  };
}

// Replacement for Neo4j temporal types
export class GraphQLDate {
  year: number;
  month: number;
  day: number;

  constructor(year: number, month: number, day: number) {
    this.year = year;
    this.month = month;
    this.day = day;
  }

  toString(): string {
    return `${this.year}-${this.month.toString().padStart(2, '0')}-${this.day.toString().padStart(2, '0')}`;
  }
}

// Helper functions for type checking
export const isNode = (obj: any): boolean => {
  return obj && typeof obj === 'object' && obj.labels && Array.isArray(obj.labels) && obj.properties && typeof obj.properties === 'object';
};

export const isRelationship = (obj: any): boolean => {
  return obj && typeof obj === 'object' && obj.type && typeof obj.type === 'string' && obj.properties && typeof obj.properties === 'object';
};

export const isPath = (obj: any): boolean => {
  return obj && typeof obj === 'object' && obj.segments && Array.isArray(obj.segments);
};
