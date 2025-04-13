# NeoDash GraphQL API Integration: Planning and Architecture Guide

## 1. Introduction

This document outlines the plan and architectural strategy for modifying the NeoDash application (https://github.com/neo4j-labs/neodash) to interact with a Neo4j database via an intermediary GraphQL API instead of a direct driver connection. The primary goal is to maintain **100% feature parity** with the original NeoDash while abstracting the data access layer.

This guide is intended to be **strict** to ensure a focused and consistent implementation, minimizing deviation and potential issues ("hallucinations") during development.

## 2. Core Objective

Replace the direct usage of the `neo4j-driver` within the NeoDash frontend application with calls to a predefined GraphQL API. All user-facing features, including report creation, dashboard rendering, parameter usage, connection management (conceptually), styling, and saving/loading dashboards, must remain functionally identical.

## 3. Guiding Principles

*   **Abstraction is Key:** Introduce a well-defined data access layer within NeoDash that handles communication with the backend, whether it's the original driver or the new GraphQL API.
*   **Minimal UI/UX Changes:** The user experience for connecting (to the API endpoint) and using NeoDash should remain as close to the original as possible. Configuration screens will necessarily change.
*   **Preserve Core Logic:** The logic for translating dashboard configurations into queries, handling parameters, and rendering reports should remain largely untouched. The change focuses *only* on *how* the query is executed and *how* the results are retrieved.
*   **API Contract First:** The structure and capabilities of the target GraphQL API are paramount. This plan assumes a specific GraphQL API structure exists or will be created. Changes in NeoDash *depend* on this API contract.
*   **Stateless API Interaction:** Assume the GraphQL API itself is stateless regarding NeoDash sessions. Authentication/session management will be handled per request or via tokens managed by NeoDash.

## 4. Target Architecture

*   **NeoDash Frontend:** Remains the React application, handling UI, state, and dashboard logic.
*   **NeoDash GraphQL Client (New Layer):** A new module/service within NeoDash responsible for:
    *   Knowing the GraphQL API endpoint URL.
    *   Handling authentication with the GraphQL API (e.g., sending API keys, tokens).
    *   Constructing GraphQL queries/mutations based on requests from the core NeoDash logic (e.g., "execute this Cypher query", "get database metadata").
    *   Sending requests to the GraphQL API using a standard GraphQL client library (like Apollo Client, urql, or even `fetch`).
    *   Receiving GraphQL responses and transforming them (if necessary) into the data structure expected by the existing NeoDash components/logic (ideally mimicking the `neo4j-driver` results format closely).
    *   Handling API-specific errors (network errors, GraphQL errors).
*   **External GraphQL API:** This is the **critical intermediary component that needs to be built separately**. It is *not* part of the NeoDash codebase itself. It must expose endpoints to:
    *   **Execute Arbitrary Cypher:** Accept a Cypher query string and parameters, execute it against the Neo4j database, and return the results.
    *   **Fetch Database Metadata:** Provide endpoints to get labels, relationship types, property keys, and potentially constraints/indexes if NeoDash uses them.
    *   **Verify Connection/Authentication:** A simple query to check if the API is reachable and authenticated correctly against the target Neo4j DB.
    *   **Handle Authentication/Authorization:** Authenticate requests from NeoDash and authorize them against the Neo4j database (this logic resides *within* the API).
*   **Neo4j Database:** The ultimate data source, now accessed *only* by the External GraphQL API.

## 5. Assumed GraphQL API Schema (Minimal Example)

The exact schema needs to be defined, but it *must* support operations like the following. NeoDash implementation will target this *assumed* contract.

```graphql
# Example Schema Snippet (Illustrative)

type Query {
  """ Verifies API connection and authentication to the backend Neo4j DB """
  verifyConnection: Boolean

  """ Fetches database metadata """
  metadata: Neo4jMetadata
}

type Mutation {
  """ Executes a Cypher query with parameters """
  executeQuery(query: String!, params: JSON): QueryResult
}

type Neo4jMetadata {
  labels: [String!]!
  relationshipTypes: [String!]!
  propertyKeys: [String!]!
  # Potentially add more metadata fields as needed by NeoDash
}

""" Represents the result of a Cypher query, structured similarly to neo4j-driver output """
type QueryResult {
  """ Raw records returned by the query """
  records: [JSON] # Could be more strongly typed if needed

  """ Summary information about the query execution """
  summary: QuerySummary # Or JSON if simpler initially
}

type QuerySummary {
  # Fields like counters, query type, notifications, etc.
  # Mirroring parts of the neo4j-driver result summary
  counters: JSON
  queryType: String
  # ... other summary fields
}

""" Using a Scalar type for flexibility with parameters and results """
Strict Requirement: The QueryResult.records structure returned by the executeQuery mutation must be processable by NeoDash's existing report rendering logic. Ideally, it should closely mimic the structure returned by the neo4j-driver's session.run() method (an array of Record objects, where each record can be accessed by field name or index, and values have types like Nodes, Relationships, Paths, numbers, strings, etc., potentially serialized as JSON). Mapping this correctly is critical.
6. NeoDash Code Modifications Strategy
Configuration Update:
Modify the connection settings UI and state management.
Remove fields for Neo4j Bolt URL, username, password, database name (unless the API needs them passed explicitly).
Add fields for GraphQL API Endpoint URL.
Add fields for API authentication (e.g., API Key, Bearer Token header input). How the API authenticates dictates this UI.
Introduce Data Access Abstraction:
Create a new service/module (e.g., src/services/GraphQLApiService.js or hooks like useGraphQLApi).
This layer will use a GraphQL client library (e.g., graphql-request, fetch, or integrate Apollo Client/urql if more complex state management around caching/optimistic UI is desired, though likely overkill initially).
Define methods within this service that mirror the required database interactions:
connect(apiUrl, authDetails): Configure the client.
disconnect(): Clear configuration/state.
verifyConnection(): Call the verifyConnection query.
executeQuery(query, params): Call the executeQuery mutation.
getLabels(): Call the metadata query, extract labels.
getRelationshipTypes(): Call the metadata query, extract rel types.
getPropertyKeys(): Call the metadata query, extract prop keys.
Potentially others as identified (e.g., specific calls for multi-database support if NeoDash handles that via the driver currently).
Replace Driver Usage:
Identify all places in the codebase where neo4j-driver is imported and used. Key areas likely include:
Connection management logic (src/context/Neo4jConnectionContext.tsx or similar).
Query execution logic related to reports (src/data/QueryRunner.ts or similar).
Metadata fetching logic (often used for auto-completion or schema exploration features).
Replace direct driver calls with calls to the corresponding methods in the new GraphQLApiService / hooks.
Ensure the data returned by the GraphQLApiService methods is mapped correctly to the format expected by the calling code. This is the most delicate part.
State Management Adaptation:
Update relevant context providers or state stores (e.g., Redux reducers, Zustand stores) to reflect the new connection model (API URL, API connection status) instead of the direct DB connection status.
Error Handling:
Implement robust error handling for API communication failures (network issues, 4xx/5xx responses) and GraphQL-specific errors (returned in the errors array of the GraphQL response).
Map API/GraphQL errors to user-friendly messages within the NeoDash UI, similar to how driver errors are handled currently.
7. Testing Strategy
Unit Tests: Test the new GraphQLApiService components in isolation, mocking the GraphQL client responses.
Integration Tests:
Test the interaction between NeoDash components and the GraphQLApiService, ensuring data flows correctly.
Requires a mock GraphQL API server that implements the defined contract.
End-to-End Tests: Test the complete workflow using a real instance of the External GraphQL API connected to a test Neo4j database. Cover:
Connecting to the API.
Creating/editing/running all report types.
Using parameters.
Saving/Loading dashboards.
Error scenarios (invalid API URL, incorrect auth, invalid Cypher passed to API, API errors).
8. Implementation Constraints (Strict Guidelines for AI/Windsurf)
DO NOT modify core report rendering logic unless absolutely necessary for adapting to the GraphQL response format. Prioritize mapping the response format.
DO NOT introduce unrelated features or architectural changes. Focus solely on replacing the data access mechanism.
DO create the abstraction layer (GraphQLApiService or hooks) as described.
DO ensure all functionalities previously relying on neo4j-driver (query execution, metadata fetching, connection testing) are routed through the new abstraction layer.
DO handle the necessary UI changes for API configuration.
DO assume the existence and contract of the External GraphQL API as defined (or provide clear placeholders if the exact schema is pending).
DO pay close attention to the data format returned by the executeQuery mutation and ensure it's correctly processed by existing code. If the API cannot perfectly mimic the driver's rich types (Nodes, Relationships), define a clear JSON structure and adapt the NeoDash processing logic minimally to handle this JSON structure.