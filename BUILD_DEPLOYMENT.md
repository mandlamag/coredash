# Build and Deployment Process Summary

This document outlines the build and deployment process for the frontend application, based on the provided project files.

## 1. Build Process

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

## 2. Containerization (Docker)

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

## 3. Configuration

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
