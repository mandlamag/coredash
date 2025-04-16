import { GraphQLClient } from 'graphql-request';
import { getGraphQLApiService } from '../services/GraphQLApiService';
import { GraphQLApiError } from '../services/GraphQLApiError';
import { initializeSSO } from '../component/sso/SSOUtils';
import { DEFAULT_SCREEN, Screens, GRAPHQL_API_URL } from '../config/ApplicationConfig';
import { setDashboard } from '../dashboard/DashboardActions';
import { NEODASH_VERSION, VERSION_TO_MIGRATE } from '../dashboard/DashboardReducer';
import {
  assignDashboardUuidIfNotPresentThunk,
  loadDashboardFromNeo4jByNameThunk,
  loadDashboardFromNeo4jThunk,
  loadDashboardThunk,
  upgradeDashboardVersion,
} from '../dashboard/DashboardThunks';
import { createNotificationThunk } from '../page/PageThunks';
import { runCypherQuery } from '../report/ReportQueryRunner';
import {
  setPageNumberThunk,
  updateGlobalParametersThunk,
  updateSessionParameterThunk,
} from '../settings/SettingsThunks';
import {
  setConnected,
  setConnectionModalOpen,
  setConnectionProperties,
  setDesktopConnectionProperties,
  resetShareDetails,
  setShareDetailsFromUrl,
  setWelcomeScreenOpen,
  setDashboardToLoadAfterConnecting,
  setOldDashboard,
  clearDesktopConnectionProperties,
  clearNotification,
  setSSOEnabled,
  setSSOProviders,
  setStandaloneEnabled,
  setAboutModalOpen,
  setStandaloneMode,
  setStandaloneDashboardDatabase,
  setWaitForSSO,
  setParametersToLoadAfterConnecting,
  setReportHelpModalOpen,
  setDraft,
  setCustomHeader,
} from './ApplicationActions';
import { setLoggingMode, setLoggingDatabase, setLogErrorNotification } from './logging/LoggingActions';
import { version } from '../modal/AboutModal';
import { applicationIsStandalone } from './ApplicationSelectors';
import { applicationGetLoggingSettings } from './logging/LoggingSelectors';
import { createLogThunk } from './logging/LoggingThunk';
import { createUUID } from '../utils/uuid';

/**
 * Application Thunks (https://redux.js.org/usage/writing-logic-thunks) handle complex state manipulations.
 * Several actions/other thunks may be dispatched from here.
 */

/**
 * Establish a connection to the GraphQL API with the specified credentials. Open/close the relevant windows when connection is made (un)successfully.
 * @param apiEndpoint - URL of the GraphQL API endpoint.
 * @param apiKey - API key for authentication (optional).
 * @param authToken - Authentication token (optional).
 * @param database - the Neo4j database to connect to (optional).
 * @param skipConnectionModal - if true, will not show the connection modal even if connection fails
 */
export const createConnectionThunk =
  (apiEndpoint: string, apiKey: string, authToken: string, database: string, skipConnectionModal = false) => (dispatch: any, getState: any) => {
    const loggingState = getState();
    const loggingSettings = applicationGetLoggingSettings(loggingState);
    const neodashMode = applicationIsStandalone(loggingState) ? 'Standalone' : 'Editor';
    try {
      // Create a GraphQL client to test the connection
      const headers: Record<string, string> = {};
      
      if (apiKey) {
        headers['x-api-key'] = apiKey;
      }
      
      if (authToken) {
        headers['Authorization'] = `Bearer ${authToken}`;
      }
      
      if (database) {
        headers['x-database'] = database;
      }
      
      // Initialize the GraphQL API service
      const apiService = getGraphQLApiService();
      apiService.updateConfig(apiEndpoint, apiKey, authToken, database);
      
      const client = new GraphQLClient(apiEndpoint, { headers });
      
      // Test query to verify connection
      const testQuery = `query { __schema { queryType { name } } }`;
      
      // Execute the test query to verify connection
      client.request(testQuery)
        .then(() => {
          // Connection successful
          dispatch(setConnectionProperties(apiEndpoint, apiKey, authToken, database));
          dispatch(setConnectionModalOpen(false));
          dispatch(setConnected(true));
          
          // An old dashboard (pre-2.3.5) may not always have a UUID. We catch this case here.
          dispatch(assignDashboardUuidIfNotPresentThunk());
          dispatch(updateSessionParameterThunk('session_uri', apiEndpoint));
          dispatch(updateSessionParameterThunk('session_database', database));
          dispatch(updateSessionParameterThunk('session_api_key', apiKey));
          
          if (loggingSettings.loggingMode > '0') {
            // Log successful connection
            // Remove direct console.log call to avoid lint error
            const connectionTime = new Date(Date.now()).toISOString().substring(0, 23);
            
            if (loggingSettings.loggingMode === '2') {
              // Get the driver, database, and user information for logging
              const driver = null; // GraphQL API doesn't use Neo4j driver
              const user = 'user'; // Default user
              const logDatabase = database || '';
              const logDashboard = '';
              
              // Create log entry with appropriate parameters
              dispatch(createLogThunk({
                driver, // GraphQL API client
                database: logDatabase,
                mode: neodashMode,
                user: user || '',
                category: 'Connection', // This is the correct category for connection logs
                action: `Established connection to GraphQL API in ${neodashMode} mode at ${connectionTime}`,
                dashboardId: logDashboard || ''
              }));
            }
          }
          
          // If we have logging enabled, set up the logging endpoint and mode.
          if (loggingSettings.loggingMode) {
            // Convert loggingMode to string if it's not already
            const loggingModeStr = typeof loggingSettings.loggingMode === 'string' ? 
              loggingSettings.loggingMode : String(loggingSettings.loggingMode);
            
            // Set the logging mode and database (using API endpoint as the "database" in GraphQL context)
            dispatch(setLoggingMode(loggingModeStr));
            dispatch(setLoggingDatabase(apiEndpoint || ''));
          }
          
          // If we have remembered to load a specific dashboard after connecting to the database, take care of it here.
          const { application } = getState();
          if (
            application.dashboardToLoadAfterConnecting &&
            (application.dashboardToLoadAfterConnecting.startsWith('http') ||
            application.dashboardToLoadAfterConnecting.startsWith('./') ||
            application.dashboardToLoadAfterConnecting.startsWith('/'))
          ) {
            fetch(application.dashboardToLoadAfterConnecting)
              .then((response) => response.text())
              .then((data) => dispatch(loadDashboardThunk(data)))
              .catch((error) => {
                console.error('Error loading dashboard from URL:', error);
                dispatch(createNotificationThunk('Error Loading Dashboard', 'Failed to load dashboard from URL. Please check the URL and try again.'));
              });
            dispatch(setDashboardToLoadAfterConnecting(''));
          } else if (application.dashboardToLoadAfterConnecting) {
            // If we specify a dashboard by name, load the latest version of it.
            // If we specify a dashboard by UUID, load it directly.
            if (application.dashboardToLoadAfterConnecting.startsWith('name:')) {
              // TODO: In Phase 2, update to use GraphQL API for loading dashboards
              dispatch(loadDashboardFromNeo4jByNameThunk(application.dashboardToLoadAfterConnecting.substring(5)));
            } else {
              // TODO: In Phase 2, update to use GraphQL API for loading dashboards
              // Use GraphQL API to load dashboard
              // For now, create a temporary GraphQL client to load the dashboard
              const client = new GraphQLClient(apiEndpoint, { headers });
              // Create a driver placeholder for compatibility
              const driver = null;
              // In Phase 2, this will be replaced with a proper GraphQL query
              // For now, we're simulating the loading of a dashboard with the existing function signature
              dispatch(loadDashboardFromNeo4jThunk(
                driver,
                database || '',
                application.dashboardToLoadAfterConnecting || '',
                (dashboardContent) => {
                  // Callback function to handle the loaded dashboard content
                  dispatch(loadDashboardThunk(
                    application.dashboardToLoadAfterConnecting || '', 
                    dashboardContent || '{}'
                  ));
                }
              ));
            }
            dispatch(setDashboardToLoadAfterConnecting(''));
          }
          
          // If we have parameters to load after connecting, load them now
          if (application.parametersToLoadAfterConnecting) {
            dispatch(updateGlobalParametersThunk(application.parametersToLoadAfterConnecting));
            dispatch(setParametersToLoadAfterConnecting({}));
          }

          // If we have a shared dashboard to load, load it now.
          const shareDetails = application.shareDetails;
          if (shareDetails) {
            if (shareDetails.standalone) {
              dispatch(setStandaloneMode(true));
              dispatch(setStandaloneDashboardDatabase(shareDetails.dashboardDatabase || ''));
            }
            if (shareDetails.type === 'create') {
              dispatch(loadDashboardThunk(shareDetails.id, shareDetails.text || ''));
            } else {
              // TODO: In Phase 2, update to use GraphQL API for loading dashboards
              // Use GraphQL API to load dashboard
              // For now, create a temporary GraphQL client to load the dashboard
              const client = new GraphQLClient(apiEndpoint, { headers });
              // Create a driver placeholder for compatibility
              const driver = null;
              // In Phase 2, this will be replaced with a proper GraphQL query
              // For now, we're simulating the loading of a dashboard with the existing function signature
              dispatch(loadDashboardFromNeo4jThunk(
                driver,
                database || '',
                shareDetails.id || '',
                (dashboardContent) => {
                  // Callback function to handle the loaded dashboard content
                  dispatch(loadDashboardThunk(shareDetails.id || '', dashboardContent || '{}'));
                }
              ));
            }
            dispatch(resetShareDetails());
          }

          // If we are in standalone mode, set the dashboard API endpoint.
          if (application.standalone) {
            dispatch(setStandaloneDashboardDatabase(apiEndpoint || ''));
          }
        })
        .catch((error) => {
          // Connection failed
          dispatch(createNotificationThunk('Unable to establish connection to GraphQL API', error.message || 'Check your connection details and try again.'));
        })
        .catch((error) => {
          console.error('Error connecting to GraphQL API:', error);
          
          // Convert to GraphQLApiError for structured error handling
          const graphqlError = error instanceof GraphQLApiError ? error : GraphQLApiError.fromError(error);
          
          // Get a user-friendly error message
          let errorMessage = graphqlError.getUserFriendlyMessage();
          
          // Add specific context based on error type
          if (graphqlError.statusCode === 404) {
            errorMessage = 'GraphQL API endpoint not found. Please check the URL and try again.';
          } else if (graphqlError.statusCode === 401 || graphqlError.statusCode === 403) {
            errorMessage = 'Authentication failed. Please check your API key or authentication token.';
          } else if (graphqlError.networkError) {
            errorMessage = 'Could not connect to the GraphQL API. Please check your internet connection and API endpoint.';
          }
          
          // Set notification with error details
          dispatch(createNotificationThunk('Connection Error', errorMessage));
          
          // Update application state to reflect failed connection
          dispatch(setConnected(false));
          if (!skipConnectionModal) {
            dispatch(setConnectionModalOpen(true));
          }
        });
    } catch (e) {
      dispatch(createNotificationThunk('Unable to establish connection', e instanceof Error ? e.message : String(e)));
    }
  };

/**
 * Establish a connection directly from the Neo4j Desktop integration (if running inside Neo4j Desktop)
 * Note: This function is maintained for backward compatibility but will use GraphQL API instead
 */
export const createConnectionFromDesktopIntegrationThunk = () => (dispatch: any, getState: any) => {
  try {
    const desktopConnectionDetails = getState().application.desktopConnection;
    // Convert Neo4j Desktop connection to GraphQL API connection
    const { apiEndpoint, apiKey, authToken, database } = desktopConnectionDetails;
    dispatch(createConnectionThunk(apiEndpoint, apiKey, authToken, database));
  } catch (e) {
    dispatch(createNotificationThunk('Unable to establish connection to GraphQL API', e instanceof Error ? e.message : String(e)));
  }
};

/**
 * Find the active database from Neo4j Desktop.
 * Set global state values to remember the values retrieved from the integration so that we can connect later if possible.
 * Note: This function is maintained for backward compatibility but will use GraphQL API instead
 */
/**
 * Switch to a different database in the current GraphQL API connection.
 * @param database - The database name to switch to.
 */
export const setDatabaseThunk = (database: string) => (dispatch: any, getState: any) => {
  if (!database) {
    return;
  }

  try {
    const state = getState();
    // Get connection details from the state
    const connection = state.application.connection;
    const apiEndpoint = connection.apiEndpoint;
    const apiKey = connection.apiKey;
    const authToken = connection.authToken;

    // Get the GraphQL API service instance
    const graphQLApiService = getGraphQLApiService();
    
    // Update the configuration with the new database
    graphQLApiService.updateConfig(apiEndpoint, apiKey, authToken, database);
    
    // Update the database in the service
    graphQLApiService.setDatabase(database);
    
    // Update the connection properties in the Redux store
    dispatch(setConnectionProperties(apiEndpoint, apiKey, authToken, database));
    
    // Update the session parameter
    dispatch(updateSessionParameterThunk('session_database', database));
    
    // Log the database switch if logging is enabled
    const loggingSettings = state.application.loggingSettings;
    const neodashMode = state.application.standalone ? 'Standalone' : 'Editor';
    
    if (loggingSettings.loggingMode > '0') {
      const switchTime = new Date(Date.now()).toISOString().substring(0, 23);
      
      if (loggingSettings.loggingMode === '2') {
        const driver = null; // GraphQL API doesn't use Neo4j driver
        const user = 'user'; // Default user
        const logDatabase = database || '';
        const logDashboard = '';
        
        dispatch(createLogThunk({
          driver,
          database: logDatabase,
          mode: neodashMode,
          user,
          category: 'Database',
          action: `Switched to database '${database}' in ${neodashMode} mode at ${switchTime}`,
          dashboardId: logDashboard
        }));
      }
    }
  } catch (error: any) {
    console.error('Error switching database:', error);
    dispatch({
      type: 'SET_NOTIFICATION',
      title: 'Error switching database',
      message: error.message || String(error)
    });
  }
};

export const setDatabaseFromNeo4jDesktopIntegrationThunk = () => (dispatch: any) => {
  const getActiveDatabase = (context: any) => {
    if (context && context.projects) {
      for (let pi = 0; pi < context.projects.length; pi++) {
        const prj = context.projects[pi];
        if (prj.graphs && prj.graphs.length > 0) {
          for (let gi = 0; gi < prj.graphs.length; gi++) {
            const grf = prj.graphs[gi];
            if (grf.status === 'ACTIVE') {
              return grf;
            }
          }
        }
      }
    }
    // No active database found - ask for manual connection details.
    return null;
  };

  try {
    // This is kept for compatibility, but in practice we'll use GraphQL API
    // instead of Neo4j Desktop integration
    if ((window as any).neo4jDesktopApi) {
      (window as any).neo4jDesktopApi.getContext().then((context: any) => {
        try {
          const activeGraph = getActiveDatabase(context);
          if (activeGraph) {
            // Convert Neo4j connection to GraphQL API connection
            // In a real implementation, this would map Neo4j connection details to GraphQL API details
            const apiEndpoint = 'https://graphql-api.example.com/graphql';
            const apiKey = '';
            const authToken = '';
            const database = 'neo4j'; // Default to neo4j
            
            // Ensure we don't pass null values to the function
            dispatch(setDesktopConnectionProperties(
              apiEndpoint || '', 
              apiKey || '', 
              authToken || '', 
              database || ''
            ));
          }
        } catch (e) {
          // eslint-disable-next-line no-console
          console.log(e);
        }
      });
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(e);
  }
};

/**
 * On application startup, check the URL to see if we are loading a shared dashboard.
 * If yes, decode the URL parameters and set the application state accordingly, so that it can be loaded later.
 */
export const handleSharedDashboardsThunk = () => (dispatch: any) => {
  try {
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);

    //  Parse the URL parameters to see if there's any deep linking of parameters.
    const paramsToSetAfterConnecting = {};
    Array.from(urlParams.entries()).forEach(([key, value]) => {
      if (key.startsWith('neodash_')) {
        paramsToSetAfterConnecting[key] = value;
      }
    });
    if (Object.keys(paramsToSetAfterConnecting).length > 0) {
      dispatch(setParametersToLoadAfterConnecting(paramsToSetAfterConnecting));
    }

    // Check if share parameter exists
    const shareParam = urlParams.get('share');
    // Use null-safe comparison for string parameter
    if (shareParam !== null) { // This is fine, we're just checking if the parameter exists
      // shareParam is a string, but we're using it in a boolean context
      const idParam = urlParams.get('id');
      const id = idParam ? decodeURIComponent(idParam) : '';
      const type = urlParams.get('type') || '';
      const standalone = urlParams.get('standalone') === 'Yes';
      const skipConfirmation = urlParams.get('skipConfirmation') === 'Yes';

      const dashboardDatabase = urlParams.get('dashboardDatabase');
      if (dashboardDatabase) {
        dispatch(setStandaloneDashboardDatabase(dashboardDatabase));
      }
      if (urlParams.get('credentials')) {
        setWelcomeScreenOpen(false);
        const credentialsParam = urlParams.get('credentials');
        const connection = credentialsParam ? decodeURIComponent(credentialsParam) : '';
        const protocol = connection.split('://')[0];
        const username = connection.split('://')[1].split(':')[0];
        const password = connection.split('://')[1].split(':')[1].split('@')[0];
        const database = connection.split('@')[1].split(':')[0];
        const url = connection.split('@')[1].split(':')[1];
        const port = connection.split('@')[1].split(':')[2];

        dispatch(setConnectionModalOpen(false));
        // Construct GraphQL API endpoint from protocol, url, and port
        const apiEndpoint = `${protocol}://${url}:${port}`;
        
        // Create authentication token from username and password
        const authToken = `${username}:${password}`;
        
        // Set share details with the correct parameter count (9 parameters)
        dispatch(
          setShareDetailsFromUrl(
            type,
            id,
            standalone,
            apiEndpoint,
            '', // apiKey
            authToken,
            database,
            dashboardDatabase || '',
            skipConfirmation
          )
        );

        if (skipConfirmation === true) {
          dispatch(onConfirmLoadSharedDashboardThunk());
        }
        window.history.pushState({}, document.title, window.location.pathname);
      } else {
        dispatch(setConnectionModalOpen(false));
        // dispatch(setWelcomeScreenOpen(false));
        // Set share details with default values for missing parameters (9 parameters total)
        dispatch(
          setShareDetailsFromUrl(
            type,
            id,
            standalone,
            '', // apiEndpoint
            '', // apiKey
            '', // authToken
            '', // database
            dashboardDatabase || '', // dashboardDatabase
            false // skipConfirmation
          )
        );
        window.history.pushState({}, document.title, window.location.pathname);
      }
    } else {
      // dispatch(resetShareDetails());
    }
  } catch (e) {
    dispatch(
      createNotificationThunk(
        'Unable to load shared dashboard',
        'You have specified an invalid/incomplete share URL. Try regenerating the share URL from the sharing window.'
      )
    );
  }
};

/**
 * Confirm that we load a shared dashboard. This requires that the state was previously set in `handleSharedDashboardsThunk()`.
 */
export const onConfirmLoadSharedDashboardThunk = () => (dispatch: any, getState: any) => {
  try {
    const state = getState();
    const { shareDetails } = state.application;
    dispatch(setWelcomeScreenOpen(false));
    dispatch(setDashboardToLoadAfterConnecting(shareDetails.id));

    if (shareDetails.dashboardDatabase) {
      dispatch(setStandaloneDashboardDatabase(shareDetails.dashboardDatabase));
    } else if (!state.application.standaloneDashboardDatabase) {
      // No standalone dashboard database configured, fall back to default
      dispatch(setStandaloneDashboardDatabase(shareDetails.database));
    }
    if (shareDetails.url) {
      // Create connection using the GraphQL API client
      // Ensure we have all required parameters for createConnectionThunk
      const apiEndpoint = shareDetails.apiEndpoint || '';
      const apiKey = shareDetails.apiKey || '';
      const authToken = shareDetails.authToken || '';
      const database = shareDetails.database || 'neo4j';
      
      dispatch(createConnectionThunk(apiEndpoint, apiKey, authToken, database));
    } else {
      dispatch(setConnectionModalOpen(true));
    }
    if (shareDetails.standalone == true) {
      dispatch(setStandaloneMode(true));
    }
    dispatch(resetShareDetails());
  } catch (e) {
    dispatch(
      createNotificationThunk(
        'Unable to load shared dashboard',
        'The provided connection or dashboard identifiers are invalid. Try regenerating the share URL from the sharing window.'
      )
    );
  }
};

/**
 * Initializes the NeoDash application.
 *
 * This is a multi step process, starting with loading the runtime configuration.
 * This is present in the file located at /config.json on the URL where NeoDash is deployed.
 * Note: this does not work in Neo4j Desktop, so we revert to defaults.
 */
export const loadApplicationConfigThunk = () => async (dispatch: any, getState: any) => {
  let config = {
    ssoEnabled: false,
    ssoProviders: [],
    ssoDiscoveryUrl: 'http://example.com',
    standalone: false,
    standaloneProtocol: 'neo4j+s',
    standaloneHost: 'localhost',
    standalonePort: '7687',
    standaloneDatabase: 'neo4j',
    standaloneDashboardName: 'My Dashboard',
    standaloneDashboardDatabase: 'dashboards',
    standaloneDashboardURL: '',
    loggingMode: '0',
    loggingDatabase: 'logs',
    logErrorNotification: '3',
    standaloneAllowLoad: false,
    standaloneLoadFromOtherDatabases: false,
    standaloneMultiDatabase: false,
    standaloneDatabaseList: 'neo4j',
    customHeader: '',
  };
  try {
    config = await (await fetch('config.json')).json();
  } catch (e) {
    // Config may not be found, for example when we are in Neo4j Desktop.
    // eslint-disable-next-line no-console
    console.log('No config file detected. Setting to safe defaults.');
  }

  try {
    // Parse the URL parameters to see if there's any deep linking of parameters.
    const state = getState();
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (state.application.waitForSSO) {
      const ssoParamsString = sessionStorage.getItem('SSO_PARAMS_BEFORE_REDIRECT');
      const paramsBeforeSSO = ssoParamsString ? JSON.parse(ssoParamsString) : {};
      Object.entries(paramsBeforeSSO).forEach(([key, value]) => {
        if (typeof value === 'string') {
          urlParams.set(key, value);
        }
      });
    }
    const paramsToSetAfterConnecting = {};
    Array.from(urlParams.entries()).forEach(([key, value]) => {
      if (key.startsWith('neodash_')) {
        paramsToSetAfterConnecting[key] = value;
      }
    });
    sessionStorage.getItem('SSO_PARAMS_BEFORE_REDIRECT');
    const page = urlParams.get('page');
    if (page !== '' && page !== null) {
      if (!isNaN(page)) {
        dispatch(setPageNumberThunk(parseInt(page)));
      }
    }
    dispatch(setSSOEnabled(config.ssoEnabled, state.application.cachedSSODiscoveryUrl));
    dispatch(setSSOProviders(config.ssoProviders));

    // Check if we are in standalone mode
    const standalone = config.standalone || urlParams.get('standalone') == 'Yes';

    // if a dashboard database was previously set, remember to use it.
    const dashboardDatabase = state.application.standaloneDashboardDatabase;
    // For GraphQL API integration, we map API properties to the existing standalone properties
    // This maintains compatibility with the existing function signature while using GraphQL API concepts
    dispatch(
      setStandaloneEnabled(
        standalone,
        config.standaloneProtocol,  // In GraphQL context, this could represent API protocol (http/https)
        config.standaloneHost,      // In GraphQL context, this could represent API host
        config.standalonePort,      // In GraphQL context, this could represent API port if applicable
        config.standaloneDatabase,  // Keep database name for compatibility
        config.standaloneDashboardName,
        dashboardDatabase || config.standaloneDashboardDatabase,
        config.standaloneDashboardURL,
        '',  // standaloneUsername - not needed for GraphQL API but required by function signature
        '',  // standalonePassword - not needed for GraphQL API but required by function signature
        false, // standalonePasswordWarningHidden - default value
        config.standaloneAllowLoad || false,
        config.standaloneLoadFromOtherDatabases || false,
        config.standaloneMultiDatabase || false,
        config.standaloneDatabaseList || ''
      )
    );

    dispatch(setLoggingMode(config.loggingMode));
    dispatch(setLoggingDatabase(config.loggingDatabase));
    dispatch(setLogErrorNotification('3'));

    dispatch(setConnectionModalOpen(false));

    dispatch(setCustomHeader(config.customHeader));

    // Auto-upgrade the dashboard version if an old version is cached.
    if (state.dashboard && state.dashboard.version !== NEODASH_VERSION) {
      // Attempt upgrade if dashboard version is outdated.
      while (VERSION_TO_MIGRATE[state.dashboard.version]) {
        const upgradedDashboard = upgradeDashboardVersion(
          state.dashboard,
          state.dashboard.version,
          VERSION_TO_MIGRATE[state.dashboard.version]
        );
        dispatch(setDashboard(upgradedDashboard));
        dispatch(setDraft(true));
        dispatch(
          createNotificationThunk(
            'Successfully upgraded dashboard',
            `Your old dashboard was migrated to version ${upgradedDashboard.version}. You might need to refresh this page and reactivate extensions.`
          )
        );
      }
    }

    // SSO - specific case starts here.
    if (state.application.waitForSSO) {
      // We just got redirected from the SSO provider. Hide all windows and attempt the connection.
      dispatch(setAboutModalOpen(false));
      dispatch(setConnected(false));
      dispatch(setWelcomeScreenOpen(false));
      const success = await initializeSSO(state.application.cachedSSODiscoveryUrl, (credentials) => {
        if (standalone) {
          // Redirected from SSO and running in viewer mode, merge retrieved config with hardcoded credentials.
          dispatch(
            setConnectionProperties(
              config.standaloneProtocol,
              config.standaloneHost,
              config.standalonePort,
              config.standaloneDatabase,
              credentials.username,
              credentials.password
            )
          );
          dispatch(
            createConnectionThunk(
              `${config.standaloneProtocol}://${config.standaloneHost}:${config.standalonePort}/graphql`,
              '', // No API key
              '', // No auth token
              config.standaloneDatabase,
              true // Skip connection modal
            )
          );
        } else {
          // Redirected from SSO and running in editor mode, merge retrieved config with existing details.
          dispatch(
            setConnectionProperties(
              state.application.connection.protocol,
              state.application.connection.url,
              state.application.connection.port,
              state.application.connection.database,
              credentials.username,
              credentials.password
            )
          );
          dispatch(setConnected(true));
        }

        if (standalone) {
          if (urlParams.get('id')) {
            dispatch(setDashboardToLoadAfterConnecting(urlParams.get('id')));
          } else if (config.standaloneDashboardURL !== undefined && config.standaloneDashboardURL.length > 0) {
            dispatch(setDashboardToLoadAfterConnecting(config.standaloneDashboardURL));
          } else {
            dispatch(setDashboardToLoadAfterConnecting(`name:${config.standaloneDashboardName}`));
          }
          dispatch(setParametersToLoadAfterConnecting(paramsToSetAfterConnecting));
        }
        sessionStorage.removeItem('SSO_PARAMS_BEFORE_REDIRECT');
      });

      dispatch(setWaitForSSO(false));
      if (!success) {
        alert('Unable to connect using SSO. See the browser console for more details.');
        dispatch(
          createNotificationThunk(
            'Unable to connect using SSO',
            'Something went wrong. Most likely your credentials are incorrect...'
          )
        );
      } else {
        return;
      }
    } else if (state.application.ssoEnabled && !state.application.waitForSSO && urlParams) {
      let paramsToStore = {};
      urlParams.forEach((value, key) => {
        paramsToStore[key] = value;
      });
      sessionStorage.setItem('SSO_PARAMS_BEFORE_REDIRECT', JSON.stringify(paramsToStore));
    }

    if (standalone) {
      dispatch(initializeApplicationAsStandaloneThunk(config, paramsToSetAfterConnecting));
    } else {
      dispatch(initializeApplicationAsEditorThunk(config, paramsToSetAfterConnecting));
    }
  } catch (e) {
    console.log(e);
    dispatch(setWelcomeScreenOpen(false));
    dispatch(
      createNotificationThunk(
        'Unable to load application configuration',
        'Do you have a valid config.json deployed with your application?'
      )
    );
  }
};

// Set up NeoDash to run in editor mode.
export const initializeApplicationAsEditorThunk = (_: any, paramsToSetAfterConnecting: Record<string, any>) => (dispatch: any) => {
  const clearNotificationAfterLoad = true;
  dispatch(clearDesktopConnectionProperties());
  dispatch(setDatabaseFromNeo4jDesktopIntegrationThunk());
  const old = localStorage.getItem('neodash-dashboard');
  dispatch(setOldDashboard(old));
  dispatch(setConnected(false));
  dispatch(setDashboardToLoadAfterConnecting(null));
  dispatch(updateGlobalParametersThunk(paramsToSetAfterConnecting));
  // TODO: this logic around loading/saving/upgrading/migrating dashboards needs a cleanup
  if (Object.keys(paramsToSetAfterConnecting).length > 0) {
    dispatch(setParametersToLoadAfterConnecting(null));
  }

  // Load the Bitcoin dashboard by default
  try {
    // Skip the welcome screen
    dispatch(setWelcomeScreenOpen(false));
    
    // First, automatically connect to the GraphQL API with hardcoded values
    const apiEndpoint = GRAPHQL_API_URL;
    const apiKey = '';
    const authToken = '';
    const database = 'bitcoin';
    
    // Set connection properties and create the connection
    dispatch(setConnectionProperties(apiEndpoint, apiKey, authToken, database));
    dispatch(createConnectionThunk(apiEndpoint, apiKey, authToken, database, true));
    
    // Load the Bitcoin dashboard from the config file after connecting
    fetch('/config/bitcoin-dashboard.json')
      .then((response) => response.text())
      .then((data) => {
        // Generate a UUID for the dashboard
        const uuid = createUUID();
        dispatch(loadDashboardThunk(uuid, data));
      })
      .catch((error) => {
        console.error('Error loading Bitcoin dashboard:', error);
        // Fallback to default behavior if loading fails
        if (DEFAULT_SCREEN === Screens.CONNECTION_MODAL as any) {
          dispatch(setWelcomeScreenOpen(false));
          dispatch(setConnectionModalOpen(true));
        } else {
          // Default to welcome screen for any other value
          dispatch(setWelcomeScreenOpen(true));
        }
      });
  } catch (e) {
    console.error('Error in Bitcoin dashboard initialization:', e);
    // Fallback to default behavior
    if (DEFAULT_SCREEN === Screens.CONNECTION_MODAL as any) {
      dispatch(setWelcomeScreenOpen(false));
      dispatch(setConnectionModalOpen(true));
    } else {
      // Default to welcome screen for any other value
      dispatch(setWelcomeScreenOpen(true));
    }
  }

  if (clearNotificationAfterLoad) {
    dispatch(clearNotification());
  }
  dispatch(handleSharedDashboardsThunk());
  dispatch(setReportHelpModalOpen(false));
  dispatch(setAboutModalOpen(false));
};

// Set up NeoDash to run in standalone mode.
export const initializeApplicationAsStandaloneThunk =
  (config: any, paramsToSetAfterConnecting: Record<string, any>) => (dispatch: any, getState: any) => {
    const clearNotificationAfterLoad = true;
    const state = getState();
    // If we are running in standalone mode, auto-set the connection details that are configured.
    dispatch(
      setConnectionProperties(
        config.standaloneApiEndpoint,
        config.standaloneApiKey,
        config.standaloneAuthToken,
        config.standaloneDatabase
      )
    );

    dispatch(setAboutModalOpen(false));
    dispatch(setConnected(false));
    dispatch(setWelcomeScreenOpen(false));
    if (config.standaloneDashboardURL !== undefined && config.standaloneDashboardURL.length > 0) {
      dispatch(setDashboardToLoadAfterConnecting(config.standaloneDashboardURL));
    } else {
      dispatch(setDashboardToLoadAfterConnecting(`name:${config.standaloneDashboardName}`));
    }
    dispatch(setParametersToLoadAfterConnecting(paramsToSetAfterConnecting));
    dispatch(updateGlobalParametersThunk(paramsToSetAfterConnecting));

    if (clearNotificationAfterLoad) {
      dispatch(clearNotification());
    }

    // Override for when API credentials are specified in the config - automatically connect to the specified URL.
    if (config.standaloneApiKey || config.standaloneAuthToken) {
      dispatch(
        createConnectionThunk(
          `${config.standaloneProtocol}://${config.standaloneHost}:${config.standalonePort}/graphql`,
          '', // No API key
          '', // No auth token
          config.standaloneDatabase,
          true // Skip connection modal
        )
      );
    } else {
      dispatch(setConnectionModalOpen(true));
    }
    dispatch(handleSharedDashboardsThunk());
  };
