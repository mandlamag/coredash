# NeoDash GraphQL API Integration: Task List

This document lists the specific tasks required to modify NeoDash to use a GraphQL API for data access instead of a direct Neo4j driver connection, based on the accompanying `PLANNING.md`.

**Prerequisite:** A functional External GraphQL API implementing the required schema (executeQuery, metadata, verifyConnection) must be available or mocked for development and testing.

## Phase 1: Setup and Configuration

*   [ ] **Task 1.1:** Update Project Dependencies:
    *   Add a GraphQL client library (e.g., `graphql-request`, `axios`, or potentially `apollo-client`/`urql` if advanced features are needed later).
    *   Remove `neo4j-driver` dependency. (Consider doing this later after full replacement to avoid breaking the build initially).
*   [ ] **Task 1.2:** Modify Connection State Management:
    *   Locate the state management for connection details (likely in `src/context/Neo4jConnectionContext.tsx` or similar Redux/Zustand store).
    *   Remove state variables related to Bolt URL, Neo4j username, password, direct database name.
    *   Add state variables for GraphQL API Endpoint URL, API authentication details (e.g., `apiKey`, `authToken`), and API connection status (`connected`, `connecting`, `error`).
*   [ ] **Task 1.3:** Update Connection Settings UI:
    *   Modify the connection settings modal/page (`src/components/connection/ConnectionModal.tsx` or similar).
    *   Remove input fields for Bolt URL, Neo4j username, password.
    *   Add input fields for GraphQL API Endpoint URL.
    *   Add input fields/mechanism for API authentication (e.g., text input for API Key, password field for Bearer Token). The exact UI depends on the chosen API authentication method.
    *   Update labels and helper text accordingly.

## Phase 2: Implement GraphQL API Service

*   [ ] **Task 2.1:** Create GraphQL Client Wrapper:
    *   Create a new file (e.g., `src/services/GraphQLApiService.js` or `src/hooks/useGraphQLApi.js`).
    *   Initialize the chosen GraphQL client library within this module.
    *   Implement configuration logic to set the target API endpoint and authentication headers based on user input/state.
*   [ ] **Task 2.2:** Implement `verifyConnection` Function:
    *   Add a function `verifyConnection()` to the service/hook.
    *   This function should send the `verifyConnection` GraphQL query to the configured endpoint.
    *   It should handle success and error responses, returning a boolean or throwing an error.
*   [ ] **Task 2.3:** Implement `executeQuery` Function:
    *   Add a function `executeQuery(query: string, params: object)` to the service/hook.
    *   This function should construct and send the `executeQuery` GraphQL mutation, passing the Cypher query and parameters.
    *   It must handle the GraphQL response, potentially transforming the `QueryResult.records` and `QueryResult.summary` into a format closely matching the `neo4j-driver`'s result structure if possible. Document any necessary transformations.
    *   Handle GraphQL errors returned in the response body.
*   [ ] **Task 2.4:** Implement Metadata Fetching Functions:
    *   Add functions like `getLabels()`, `getRelationshipTypes()`, `getPropertyKeys()` to the service/hook.
    *   These functions should call the `metadata` GraphQL query.
    *   Extract the relevant arrays (labels, relTypes, propKeys) from the response.
*   [ ] **Task 2.5:** Implement `connect` / `disconnect` Logic:
    *   Update or create functions that orchestrate setting the API configuration (`apiUrl`, `authDetails`) in the service/hook and potentially triggering an initial `verifyConnection` call.
    *   Implement logic to clear the configuration and connection state.

## Phase 3: Replace Driver Usage

*   [ ] **Task 3.1:** Update Connection Logic:
    *   Modify the code triggered by the "Connect" button in the UI.
    *   Instead of creating a `neo4j-driver` instance, call the new `GraphQLApiService.connect()` or equivalent setup function.
    *   Use `GraphQLApiService.verifyConnection()` to check the connection status and update the application state accordingly.
    *   Update disconnection logic to call `GraphQLApiService.disconnect()`.
*   [ ] **Task 3.2:** Update Report Query Execution:
    *   Locate the primary code responsible for running Cypher queries for reports (e.g., `src/data/QueryRunner.ts`, hooks used by report components).
    *   Replace calls to `session.run(query, params)` with calls to `GraphQLApiService.executeQuery(query, params)`.
    *   Ensure the data passed to the report rendering components is correctly formatted based on the `executeQuery` response. Adapt data mapping logic *minimally* if the GraphQL response structure differs slightly from the driver's structure (e.g., accessing record fields).
*   [ ] **Task 3.3:** Update Metadata Usage:
    *   Find all places where database metadata (labels, relTypes, propKeys) is fetched or used (e.g., schema views, query editor autocompletion).
    *   Replace direct driver calls for metadata with calls to `GraphQLApiService.getLabels()`, `GraphQLApiService.getRelationshipTypes()`, `GraphQLApiService.getPropertyKeys()`.
    *   Ensure components using this metadata receive it in the expected format (likely simple string arrays).
*   [ ] **Task 3.4:** Handle Potential Multi-Database Logic:
    *   Analyze if/how NeoDash currently handles Neo4j multi-database selection via the driver.
    *   If needed, determine how the GraphQL API exposes this (e.g., different API endpoints per DB, a parameter in `executeQuery`, a header).
    *   Adapt the `GraphQLApiService` and potentially the UI/state to handle database selection via the API mechanism. If the API doesn't support it, this feature might be temporarily disabled or require API modification.

## Phase 4: Error Handling, Testing, and Cleanup

*   [ ] **Task 4.1:** Implement Comprehensive Error Handling:
    *   Review all calls to the `GraphQLApiService`.
    *   Add `try...catch` blocks or equivalent error handling (e.g., `.catch()` for promises).
    *   Handle network errors, HTTP status code errors, and GraphQL-specific errors (from the `errors` array in the response).
    *   Update UI components (e.g., notification systems, error messages on reports) to display meaningful error information originating from the API layer.
*   [ ] **Task 4.2:** Write Unit Tests:
    *   Write unit tests for the `GraphQLApiService` functions, mocking the GraphQL client responses to cover success and error cases.
*   [ ] **Task 4.3:** Write Integration/End-to-End Tests:
    *   Set up a mock GraphQL server implementing the defined schema.
    *   Write integration tests verifying components interact correctly with the mocked service.
    *   Perform manual end-to-end testing against a real GraphQL API instance connected to Neo4j, covering all major features (connecting, rendering all report types, parameters, saving/loading).
*   [ ] **Task 4.4:** Code Cleanup:
    *   Remove all unused `neo4j-driver` imports and related code.
    *   Ensure consistent coding style and add comments where necessary, especially around data mapping logic.
*   [ ] **Task 4.5:** Update Documentation:
    *   Update any internal documentation or README sections related to database connection setup to reflect the new GraphQL API approach.

## Phase 5: Final Review and Refinement

*   [ ] **Task 5.1:** Performance Review:
    *   Assess the performance impact of introducing the API layer. Identify any potential bottlenecks.
*   [ ] **Task 5.2:** Security Review:
    *   Ensure API credentials are handled securely within the frontend (avoiding hardcoding, considering secure storage options if applicable beyond simple state).
*   [ ] **Task 5.3:** Code Review:
    *   Conduct a thorough code review of all changes.
*   [ ] **Task 5.4:** Final Feature Parity Check:
    *   One last check to confirm all original NeoDash features are working as expected with the new data layer.

---