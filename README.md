## LedgerCore Dashboard

![LedgerCore](public/ss_logo.png)

## About LedgerCore Dashboard
LedgerCore Dashboard is a web-based tool for visualizing blockchain data through a GraphQL API. It lets you group visualizations together as dashboards and allows for interactions between reports.

LedgerCore Dashboard supports presenting your data as tables, graphs, bar charts, line charts, maps, and more. It contains a query editor to directly write the queries that populate the reports. You can save dashboards and share them with others.

## Run LedgerCore Dashboard
You can run LedgerCore Dashboard in one of three ways:

1. You can run the application locally in development mode (see Build and Run section below)
2. For deployments, you can build the application yourself
3. Using Docker (see Docker section below)

```
# Run the application on http://localhost:5005
yarn run dev
```

## Docker

### Running with Docker Compose

The application is configured to run in Docker and connect to your existing `ledgercore-backend` container:

```bash
# Start the dashboard container
docker-compose up -d
```

### Environment Configuration

The Docker setup uses environment variables for configuration. You can customize these in several ways:

1. Edit the `.env` file (for local development)
2. Override variables when running docker-compose:

```bash
GRAPHQL_API_URL=http://custom-backend:4000/graphql docker-compose up -d
```

3. Set environment variables in your CI/CD pipeline

### Key Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| GRAPHQL_API_URL | URL of the GraphQL API | http://ledgercore-backend:4000/graphql |
| API_URL | URL of the REST API | http://ledgercore-backend:4000/api |
| NEO4J_DATABASE | Default Neo4j database | bitcoin |
| ALLOW_QUERIES_WITHOUT_LOGIN | Allow running queries without login | true |

### Network Configuration

The Docker Compose file is configured to use an external network named `ledgercore-network` to connect to your existing `ledgercore-backend` container. If your backend uses a different network, you can specify it:

```bash
NETWORK_NAME=your-network-name docker-compose up -d
```

## Build and Run
This project uses `yarn` to install, run, build prettify and apply linting to the code.

To install dependencies:
```
yarn install
```

To run the application in development mode:
```
yarn run dev
```

To build the app for deployment:
```
yarn run build
```

To manually prettify all the project `.ts` and `.tsx` files, run:
```
yarn run format
```

To manually run linting of all your .ts and .tsx files, run:
```
yarn run lint
```

To manually run linting of all your .ts and .tsx staged files, run:
```
yarn run lint-staged
```

See the [Developer Guide](https://neo4j.com/labs/neodash/2.3/developer-guide/) for more on installing, building, and running the application.

### Pre-Commit Hook
While commiting, a pre-commit hook will be executed in order to prettify and run the Linter on your staged files. Linter warnings are currently accepted. The commands executed by this hook can be found in /.lintstagedrc.json.

There is also a dedicated linting step in the Github project pipeline in order to catch each potential inconsistency.

> Don't hesitate to setup your IDE formatting feature to use the Prettier module and our defined rules (.prettierrc.json).


## User Guide
LedgerCore Dashboard comes with built-in examples of dashboards and reports for Bitcoin blockchain analysis. The dashboard provides various visualizations to help you understand blockchain data and transactions.

## Features
- Bitcoin transaction analysis
- Address balance tracking
- Transaction network visualization
- Time-series analysis of blockchain data
- GraphQL API integration for efficient data retrieval

## Questions / Suggestions
If you have any questions about LedgerCore Dashboard, please reach out to the maintainers:
- Create an [Issue](https://github.com/silversixpence-crypto/ledgercore-dash/issues/new) on GitHub for feature requests/bugs.