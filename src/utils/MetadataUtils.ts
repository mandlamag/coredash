/**
 * MetadataUtils - Utilities for retrieving and transforming database metadata.
 * These utilities provide a consistent interface for retrieving metadata
 * regardless of whether the data source is Neo4j directly or the GraphQL API.
 */

import { getGraphQLApiService } from '../services/GraphQLApiService';
import { transformGraphQLMetadataToNeo4jMetadata } from './GraphQLDataTransformUtils';
import { runCypherQuery } from '../report/ReportQueryRunner';

/**
 * Get all node labels from the database.
 * @param driver - Not used in GraphQL implementation, kept for backward compatibility.
 * @param database - The database to retrieve labels from.
 * @param setLabels - Callback to set the labels.
 */
export const getNodeLabels = async (
  driver: any,
  database: string,
  setLabels: (labels: string[]) => void
): Promise<void> => {
  try {
    // Get the GraphQL API service
    const graphQLApiService = getGraphQLApiService();

    if (graphQLApiService) {
      // Use the GraphQL API service to get metadata
      const metadata = await graphQLApiService.getMetadata();
      const transformedMetadata = transformGraphQLMetadataToNeo4jMetadata(metadata);
      
      // Extract labels from nodes
      const labels: string[] = transformedMetadata.nodes
        ? transformedMetadata.nodes.flatMap((node: any) => 
            Array.isArray(node.labels) ? node.labels.map(String) : []
          )
        : [];
      
      // Remove duplicates
      const uniqueLabels = [...new Set(labels)];
      
      setLabels(uniqueLabels);
    } else {
      // Fallback to using runCypherQuery which now uses GraphQL API internally
      runCypherQuery(
        driver,
        database,
        'CALL db.labels()',
        {},
        1000,
        () => {},
        (records) => {
          const labels = records.map((record: any) => record.get('label'));
          setLabels(labels);
        }
      );
    }
  } catch (error) {
    console.error('Error retrieving node labels:', error);
    setLabels([]);
  }
};

/**
 * Get all relationship types from the database.
 * @param driver - Not used in GraphQL implementation, kept for backward compatibility.
 * @param database - The database to retrieve relationship types from.
 * @param setRelationshipTypes - Callback to set the relationship types.
 */
export const getRelationshipTypes = async (
  driver: any,
  database: string,
  setRelationshipTypes: (types: string[]) => void
): Promise<void> => {
  try {
    // Get the GraphQL API service
    const graphQLApiService = getGraphQLApiService();

    if (graphQLApiService) {
      // Use the GraphQL API service to get metadata
      const metadata = await graphQLApiService.getMetadata();
      const transformedMetadata = transformGraphQLMetadataToNeo4jMetadata(metadata);
      
      // Extract relationship types
      const relationshipTypes: string[] = transformedMetadata.relationships
        ? transformedMetadata.relationships.map((rel: any) => String(rel.type))
        : [];
      
      // Remove duplicates
      const uniqueTypes = [...new Set(relationshipTypes)];
      
      setRelationshipTypes(uniqueTypes);
    } else {
      // Fallback to using runCypherQuery which now uses GraphQL API internally
      runCypherQuery(
        driver,
        database,
        'CALL db.relationshipTypes()',
        {},
        1000,
        () => {},
        (records) => {
          const types = records.map((record: any) => record.get('relationshipType'));
          setRelationshipTypes(types);
        }
      );
    }
  } catch (error) {
    console.error('Error retrieving relationship types:', error);
    setRelationshipTypes([]);
  }
};

/**
 * Get all property keys from the database.
 * @param driver - Not used in GraphQL implementation, kept for backward compatibility.
 * @param database - The database to retrieve property keys from.
 * @param setPropertyKeys - Callback to set the property keys.
 */
export const getPropertyKeys = async (
  driver: any,
  database: string,
  setPropertyKeys: (keys: string[]) => void
): Promise<void> => {
  try {
    // Get the GraphQL API service
    const graphQLApiService = getGraphQLApiService();

    if (graphQLApiService) {
      // Use the GraphQL API service to get metadata
      const metadata = await graphQLApiService.getMetadata();
      const transformedMetadata = transformGraphQLMetadataToNeo4jMetadata(metadata);
      
      // Extract property keys
      const propertyKeys = transformedMetadata.propertyKeys || [];
      
      setPropertyKeys(propertyKeys);
    } else {
      // Fallback to using runCypherQuery which now uses GraphQL API internally
      runCypherQuery(
        driver,
        database,
        'CALL db.propertyKeys()',
        {},
        1000,
        () => {},
        (records) => {
          const keys = records.map((record: any) => record.get('propertyKey'));
          setPropertyKeys(keys);
        }
      );
    }
  } catch (error) {
    console.error('Error retrieving property keys:', error);
    setPropertyKeys([]);
  }
};

/**
 * Get all database names from the server.
 * @param driver - Not used in GraphQL implementation, kept for backward compatibility.
 * @param setDatabases - Callback to set the database names.
 */
export const getDatabases = async (
  driver: any,
  setDatabases: (databases: string[]) => void
): Promise<void> => {
  try {
    // Get the GraphQL API service
    const graphQLApiService = getGraphQLApiService();

    if (graphQLApiService) {
      try {
        // First try to use the metadata query if the API supports it
        const query = `
          query GetDatabases {
            databases
          }
        `;
        
        const client = graphQLApiService.getClient();
        const response = await client.request(query) as { databases?: string[] };
        
        if (response && response.databases && Array.isArray(response.databases)) {
          setDatabases(response.databases);
          return;
        }
      } catch (metadataError) {
        console.log('GraphQL API does not support direct database listing, falling back to SHOW DATABASES query');
        // If the metadata query fails, fall back to the Cypher query approach
      }
      
      // Fallback: Use the GraphQL API service to execute a Cypher query
      const result = await graphQLApiService.executeQuery('SHOW DATABASES', {});
      
      if (result && result.records) {
        const databases = result.records.map((record: any) => {
          // Handle different record formats
          if (record.get && typeof record.get === 'function') {
            return record.get('name');
          } else if (record.name) {
            return record.name;
          } else if (record._fields && record._fields[0]) {
            return record._fields[0];
          }
          return null;
        }).filter(Boolean); // Remove any null values
        
        if (databases.length > 0) {
          setDatabases(databases);
          return;
        }
      }
      
      // If no databases are returned, default to 'neo4j'
      setDatabases(['neo4j']);
    } else {
      // Fallback to using runCypherQuery which now uses GraphQL API internally
      runCypherQuery(
        driver,
        '',
        'SHOW DATABASES',
        {},
        1000,
        () => {},
        (records) => {
          if (records && records.length > 0) {
            const databases = records.map((record: any) => {
              if (record.get && typeof record.get === 'function') {
                return record.get('name');
              } else if (record.name) {
                return record.name;
              } else if (record._fields && record._fields[0]) {
                return record._fields[0];
              }
              return null;
            }).filter(Boolean);
            
            if (databases.length > 0) {
              setDatabases(databases);
              return;
            }
          }
          
          // Default to 'neo4j' if no databases are found
          setDatabases(['neo4j']);
        }
      );
    }
  } catch (error) {
    console.error('Error retrieving databases:', error);
    // Default to 'neo4j' if there's an error
    setDatabases(['neo4j']);
  }
};
