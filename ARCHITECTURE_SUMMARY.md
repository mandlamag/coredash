# LedgerCore Dashboard - Architecture Summary

## Key Features and Functionality

This document summarizes the key features and functionality of the LedgerCore Dashboard, based on the project's `README.md` and overall application understanding.

### 1. Core Purpose

LedgerCore Dashboard is a **web-based visualization tool** designed to interact with and display data from a **GraphQL API**, specifically for analyzing blockchain data. It aims to provide users with an intuitive interface to explore and understand complex datasets originating from distributed ledgers.

### 2. Dashboarding

The application offers robust dashboarding capabilities, allowing users to organize and interact with various data visualizations.

*   **Grouping Visualizations:** Users can create dashboards that group multiple "reports" or visualizations together. This allows for a consolidated view of different aspects of the data.
*   **Interactions Between Reports:** The `README.md` mentions "interactions between reports," suggesting that visualizations within a dashboard are not static and isolated. This could imply features like:
    *   **Cross-filtering:** Selecting data in one report might filter or highlight data in other reports on the same dashboard.
    *   **Drill-downs:** Users might be able to click on parts of a report to see more detailed information, possibly in another report or view.
    *   The `Dashboard.tsx` component, with its management of pages and reports, supports this concept of a collection of interactive elements.

### 3. Report Types

LedgerCore Dashboard supports a diverse range of report types to visualize data in various formats. As stated in the `README.md`, these include:

*   **Tables:** For displaying structured, row-based data.
*   **Graphs:** General term, likely encompassing various network or relational data visualizations.
*   **Bar Charts:** For comparing categorical data.
*   **Line Charts:** For showing trends over time or continuous data.
*   **Maps:** For visualizing geospatial data, potentially plotting transaction origins/destinations or node locations.
*   **Single Value Displays:** For highlighting key metrics or KPIs.
*   **(Other visualizations)** The list suggests flexibility, and the architecture likely allows for adding new visualization types. The `Card` component in `Dashboard.tsx` dynamically renders reports based on their `type`, which aligns with this.

### 4. Querying and Collaboration

The dashboard provides tools for data exploration and sharing:

*   **Query Editor:** A significant feature is the inclusion of a "query editor." This allows users to directly write and execute queries against the backend GraphQL API. This is a powerful feature for advanced users who want to explore data beyond pre-defined reports or create new visualizations from scratch.
*   **Saving and Sharing Dashboards:** Users can save their customized dashboards (collections of reports, layouts, and configurations). The `README.md` also mentions the ability to "share dashboards," facilitating collaboration among users or teams. The Redux state persistence for `dashboard` state (seen in `store.ts`) likely supports saving dashboard configurations locally, while sharing might involve exporting/importing configurations or a backend mechanism.

### 5. Specific Use Case Example

The `README.md` highlights a specific application: **analysis of the Bitcoin blockchain**. This suggests that LedgerCore is particularly well-suited for, or was initially developed with, the exploration of cryptocurrency and blockchain data in mind. The types of visualizations and the direct query capability would be valuable for tasks like:

*   Tracking transaction patterns.
*   Analyzing network activity.
*   Monitoring wallet balances or smart contract interactions (if applicable to the specific blockchain).

In summary, LedgerCore Dashboard aims to be a comprehensive and interactive platform for users to connect to blockchain data via GraphQL, build custom dashboards with a variety of visualizations, directly query the data, and share their insights.

## Frontend Architecture

This document provides a summary of the frontend architecture based on the project's codebase.

### 1. Main Technologies Used

*   **Programming Language:** TypeScript
*   **UI Library:** React
*   **State Management:**
    *   Redux
    *   `redux-thunk` (for asynchronous actions)
    *   `redux-persist` (for state persistence)
*   **Key UI Component Libraries:**
    *   Material-UI (for UI components like buttons, cards, etc.)
    *   Nivo (for charts - inferred from typical dashboard components, though not explicitly in provided files)
    *   React Grid Layout (for draggable and resizable grid layouts)
*   **Styling Approaches:**
    *   Tailwind CSS (utility-first CSS framework)
    *   PostCSS (for transforming CSS with JavaScript plugins)

### 2. Component Hierarchy

The application follows a hierarchical component structure, starting from the main `Application` component and drilling down to specific UI elements like charts.

A typical flow can be illustrated as:

1.  **`Application` Component (`src/index.tsx`):**
    *   The root component of the application.
    *   Likely responsible for setting up the Redux Provider, Router, and overall application layout.

2.  **`Dashboard` Component (`src/dashboard/Dashboard.tsx`):**
    *   A major component, likely rendered by the `Application` component, possibly via routing.
    *   Manages the overall dashboard layout and its pages.
    *   Uses `ReactGridLayout` to arrange content.

3.  **`Page` Component (Inferred):**
    *   The `Dashboard` component likely manages multiple `Page` instances.
    *   Each `Page` would represent a distinct view or tab within the dashboard.
    *   Responsible for rendering a collection of `Card` components.

4.  **`Card` Component (Inferred, based on `Dashboard.tsx`'s interaction with `dashboardState.pages[dashboardState.pagenumber].reports`):**
    *   Individual content blocks within a `Page`.
    *   Each `Card` is likely responsible for displaying a specific piece of information, often a chart or a table.
    *   The `type` property of a report (e.g., `bar`, `line`, `table`) determines which chart component is rendered.

5.  **Specific Chart Components (e.g., `BarChart`, `TableChart`, `LineChart` - Inferred):**
    *   Leaf components responsible for visualizing data.
    *   These components would receive data and configuration props from their parent `Card` component.
    *   Nivo library components are likely used here for rendering various chart types.

**Example Flow:**

`Application` -> (Router) -> `Dashboard` -> `Page` (selected by pagenumber) -> `Card` (iterated from reports) -> Specific Chart Component (e.g., `NivoBarChart`, `NivoLineChart`)

### 3. State Management with Redux

The application utilizes Redux for managing its global state.

*   **Store Configuration (`src/store.ts`):**
    *   The Redux store is configured using `configureStore` from `@reduxjs/toolkit`, which simplifies setup.
    *   `redux-thunk` middleware is applied to enable asynchronous actions (e.g., for API calls).
    *   `redux-persist` is used to persist and rehydrate parts of the Redux state.
        *   It's configured to use `localStorage` for web storage.
        *   A `persistConfig` specifies which reducers (in this case, `application` and `dashboard`) should be persisted.
    *   The `persistedReducer` combines the root reducer with the persistence configuration.
    *   A `persistor` object is created using `persistStore` to manage the persistence process.

*   **Reducers:**
    *   Reducers are responsible for updating the state in response to dispatched actions.
    *   The root reducer is created by combining multiple slice reducers. Based on `src/store.ts`, the key reducers are:
        *   **`dashboardReducer` (`src/dashboard/DashboardReducer.ts` - path inferred):** Manages state related to the dashboard, such as pages, reports, layouts, and currently selected page number.
        *   **`applicationReducer` (`src/ApplicationReducer.ts` - path inferred):** Likely manages application-level state, such as settings, user information, or global UI states.

*   **Actions and Thunks:**
    *   Actions are plain JavaScript objects that describe an intention to change the state.
    *   Thunks are functions that can dispatch actions or other thunks, allowing for asynchronous logic.
    *   While specific action/thunk implementations were not in the provided `Dashboard.tsx` or `store.ts` snippets (other than `updateDashboardSetting` which is a regular action creator), it's standard practice to use thunks for API calls to fetch or update data, which would then dispatch actions with the retrieved data to update the store. For example, fetching report data for a chart would typically be handled by a thunk.

*   **State Persistence (`redux-persist`):**
    *   `redux-persist` is configured in `src/store.ts` to save the `application` and `dashboard` slices of the state to `localStorage`.
    *   This ensures that the user's dashboard configuration (like customized layouts, added reports) and application settings are preserved across browser sessions.
    *   The `PersistGate` component (likely used in `src/index.tsx` or `Application.tsx`) delays the rendering of the app's UI until the persisted state has been retrieved and rehydrated.

This architecture provides a scalable and maintainable structure for the frontend application, leveraging well-established libraries and patterns in the React ecosystem.

## Backend Interaction

This document outlines how the frontend application interacts with backend services, based on the provided project files.

### 1. Primary API Type

The frontend primarily communicates with a **GraphQL API**. This is evident from the presence and usage of `src/services/GraphQLApiService.ts`, which is specifically designed to send GraphQL queries and mutations.

### 2. Backend Service Name

The primary backend service the frontend interacts with is named **`ledgercore-backend`**. This is indicated in the Nginx proxy configuration (`api-proxy.conf` and implied by `Dockerfile` references to proxy configurations), where requests are forwarded to this service.

### 3. Communication Mechanism

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

### 4. Data Flow

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

## Build and Deployment Process

This document outlines the build and deployment process for the frontend application, based on the provided project files.

### 1. Build Process

The frontend code, written in TypeScript and using React, is built into static assets ready for deployment.

*   **Build Command:** The primary build command is `yarn build`. This is defined in the `scripts` section of `package.json`:
    ```json
    "scripts": {
      "build": "react-scripts build",
      // ... other scripts
    }
    ```
    The `react-scripts build` command typically invokes Webpack (or a similar bundler like Create React App's customized Webpack setup) under the hood.

*   **Build Steps (Inferred from `react-scripts build`):**
    1.  **Transpilation:** TypeScript code (`.ts`, `.tsx`) is transpiled into JavaScript.
    2.  **Bundling:** JavaScript modules are bundled together into optimized chunks.
    3.  **Minification:** HTML, CSS, and JavaScript assets are minified to reduce their size.
    4.  **Static Asset Generation:** The process generates static HTML, CSS, and JavaScript files, along with any other assets (images, fonts) used by the application. These are typically placed in a `build` or `dist` directory.

*   **Output:** The output of the build process is a set of static files (e.g., `index.html`, JavaScript bundles, CSS files, images) that can be served by any static web server.

### 2. Containerization (Docker)

The application is containerized using Docker for consistent deployment across different environments.

*   **Multi-Stage Docker Build (`Dockerfile`):** The `Dockerfile` defines a multi-stage build process to create an optimized and secure production image:
    1.  **Build Stage (Node.js):**
        *   Starts from a Node.js base image (e.g., `node:18-alpine`).
        *   Copies `package.json`, `yarn.lock`, and potentially other necessary configuration files.
        *   Installs project dependencies using `yarn install --frozen-lockfile`.
        *   Copies the application source code.
        *   Runs the build command (`yarn build`) to generate the static assets. The output is typically in a directory like `/app/build`.

    2.  **Production Stage (Nginx):**
        *   Starts from a lightweight Nginx base image (e.g., `nginx:1.25-alpine`).
        *   Copies the static assets generated in the build stage (e.g., from `/app/build`) into Nginx's HTML directory (e.g., `/usr/share/nginx/html`).
        *   Copies Nginx configuration files (like `conf/default.conf.template` and `api-proxy.conf`) into the appropriate Nginx configuration directories (e.g., `/etc/nginx/templates/` or `/etc/nginx/conf.d/`).
        *   Copies entrypoint scripts like `config-entrypoint.sh` and `generate-env-config.sh` that are used for runtime configuration.
        *   Sets the `config-entrypoint.sh` as the command to run when the container starts. This script often processes environment variables to finalize the Nginx configuration before starting the Nginx server.

*   **Nginx for Serving Assets:** In the final production image, Nginx is used as the web server. Its role is to:
    *   Serve the static frontend assets (HTML, CSS, JavaScript) that were built in the previous stage.
    *   Proxy API requests to the backend services, as configured (see Configuration section below).

*   **Orchestration (`docker-compose`):**
    *   The `README.md` mentions `docker-compose up -d --build`. This indicates that `docker-compose` is used to define and manage multi-container Docker applications.
    *   It simplifies the process of building images, starting containers, and linking them together (e.g., linking the frontend container with backend services).

### 3. Configuration

The application is designed to be configurable at runtime, especially when deployed in a Docker environment.

*   **Runtime Configuration via Environment Variables:**
    *   The primary mechanism for runtime configuration is through environment variables.
    *   The `Dockerfile` includes scripts like `generate-env-config.sh` and `config-entrypoint.sh`.
        *   `generate-env-config.sh`: This script is likely responsible for reading environment variables (e.g., `GRAPHQL_API_URL`) and generating a configuration file (e.g., a JavaScript or JSON file) that the frontend application can consume. This file might be placed in the static assets directory to be loaded by the frontend.
        *   `config-entrypoint.sh`: This script is set as the Docker container's entrypoint. It often:
            1.  Executes `generate-env-config.sh` to create the dynamic configuration based on environment variables passed to the container.
            2.  Processes Nginx configuration templates (like `default.conf.template`) to substitute environment variables into the Nginx configuration (e.g., setting proxy timeouts, listener ports, or backend URLs if they are dynamic).
            3.  Finally, starts the Nginx server (`nginx -g 'daemon off;'`).

*   **Key Configurable Aspects:**
    *   **GraphQL API URL:** A crucial piece of configuration is the URL of the GraphQL backend (`GRAPHQL_API_URL`). This allows the frontend to connect to the correct backend API endpoint in different environments (development, staging, production) without rebuilding the image.
    *   Other settings might include feature flags, logging levels, or Nginx-specific parameters.

*   **Nginx's Role in Configuration and Serving:**
    *   As mentioned, Nginx serves the static assets.
    *   It also plays a key role in API proxying. The `api-proxy.conf` (or similar Nginx configuration files like `default.conf.template` that might include it) defines rules to forward requests from the frontend (e.g., to `/graphql`) to the appropriate backend service (e.g., `http://ledgercore-backend:8080/graphql`). This proxying can also be made dynamic using environment variables processed by the entrypoint scripts.
    *   The `default.conf.template` file suggests that Nginx configuration itself is templated and finalized at container startup by the `envsubst` command within `config-entrypoint.sh`, allowing environment variables to be injected into the Nginx configuration.

This build and deployment strategy ensures a reproducible build process, a lightweight and secure production environment using Docker and Nginx, and flexible runtime configuration through environment variables.
