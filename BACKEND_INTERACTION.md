# Backend Interaction Summary

This document outlines how the frontend application interacts with backend services, based on the provided project files.

## 1. Primary API Type

The frontend primarily communicates with a **GraphQL API**. This is evident from the presence and usage of `src/services/GraphQLApiService.ts`, which is specifically designed to send GraphQL queries and mutations.

## 2. Backend Service Name

The primary backend service the frontend interacts with is named **`ledgercore-backend`**. This is indicated in the Nginx proxy configuration (`api-proxy.conf` and implied by `Dockerfile` references to proxy configurations), where requests are forwarded to this service.

## 3. Communication Mechanism

The communication with the backend GraphQL API is handled through a combination of a dedicated frontend service and a reverse proxy setup:

*   **`GraphQLApiService.ts` (`src/services/GraphQLApiService.ts`):**
    *   This TypeScript service is responsible for all GraphQL communication from the frontend.
    *   It likely encapsulates the logic for constructing GraphQL queries and mutations based on the needs of different components (e.g., fetching data for charts in the dashboard).
    *   It would use a library like Apollo Client or a simple `fetch` call to send these GraphQL requests to the designated endpoint.

*   **API Request Routing/Proxying (Nginx):**
    *   The `Dockerfile` suggests an Nginx setup is used to serve the frontend application and proxy API requests. It copies `conf/default.conf.template` and `api-proxy.conf`.
    *   The `api-proxy.conf` file (though its content wasn't fully provided in the prompt, its name is indicative) or a similar Nginx configuration file (like `default.conf.template`) is responsible for routing API requests.
    *   Specifically, requests made from the frontend to a path like `/graphql` are proxied to the `ledgercore-backend` service. For example, a typical Nginx `location` block for this would look like:
        ```nginx
        location /graphql {
            proxy_pass http://ledgercore-backend:8080/graphql; # Port might vary
            # Other proxy settings (headers, etc.)
        }
        ```
    *   This setup decouples the frontend's knowledge of the backend's exact address and port, and handles Cross-Origin Resource Sharing (CORS) issues at the proxy level.

## 4. Data Flow

The general data flow is as follows:

1.  Frontend components (e.g., charts within the `Dashboard.tsx`) require data.
2.  They trigger calls to functions within `GraphQLApiService.ts`.
3.  `GraphQLApiService.ts` constructs the appropriate GraphQL query and sends it to the `/graphql` endpoint (which is handled by the local Nginx).
4.  Nginx proxies the request to the `ledgercore-backend` service.
5.  `ledgercore-backend` processes the GraphQL query and returns the requested data.
6.  The response travels back through Nginx to the `GraphQLApiService.ts`.
7.  The service parses the response and provides the data to the requesting frontend component.
8.  The component then uses this data to render visualizations or display information.

This interaction model allows the frontend to efficiently fetch precisely the data it needs from `ledgercore-backend` to populate the dashboard and its various reports and visualizations.
