// This file is dynamically generated at container startup
// It injects environment variables into the browser
window.__ENV__ = window.__ENV__ || {};

// GraphQL API URL - this will be replaced at runtime in Docker
window.__ENV__.GRAPHQL_API_URL = '%%GRAPHQL_API_URL%%';

// Database settings
window.__ENV__.DEFAULT_NEO4J_DATABASE = '%%DEFAULT_NEO4J_DATABASE%%';

// Application settings
window.__ENV__.ALLOW_QUERIES_WITHOUT_LOGIN = '%%ALLOW_QUERIES_WITHOUT_LOGIN%%';

// Add any other environment variables you need here
