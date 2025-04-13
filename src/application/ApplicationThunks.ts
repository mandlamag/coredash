import { GraphQLClient } from 'graphql-request';
import { initializeSSO } from '../component/sso/SSOUtils';
import { DEFAULT_SCREEN, Screens } from '../config/ApplicationConfig';
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
 */
export const createConnectionThunk =
  (apiEndpoint: string, apiKey: string, authToken: string, database: string) => (dispatch: any, getState: any) => {
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
            console.log(`Established connection to GraphQL API in ${neodashMode} mode at ${Date(Date.now()).substring(0, 33)}`);
            
            if (loggingSettings.loggingMode === '2') {
              dispatch(createLogThunk('Connection', 'Established connection to GraphQL API'));
            }
          }
          
          // If we have logging enabled, set up the logging database.
          if (loggingSettings.loggingMode) {
            dispatch(setLoggingDatabase(database));
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
              .then((data) => dispatch(loadDashboardThunk(data)));
            dispatch(setDashboardToLoadAfterConnecting(null));
          } else if (application.dashboardToLoadAfterConnecting) {
            // If we specify a dashboard by name, load the latest version of it.
            // If we specify a dashboard by UUID, load it directly.
            if (application.dashboardToLoadAfterConnecting.startsWith('name:')) {
              // TODO: In Phase 2, update to use GraphQL API for loading dashboards
              dispatch(loadDashboardFromNeo4jByNameThunk(application.dashboardToLoadAfterConnecting.substring(5)));
            } else {
              // TODO: In Phase 2, update to use GraphQL API for loading dashboards
              dispatch(loadDashboardFromNeo4jThunk(application.dashboardToLoadAfterConnecting));
            }
            dispatch(setDashboardToLoadAfterConnecting(null));
          }
          
          // If we have parameters to load after connecting, load them now
          if (application.parametersToLoadAfterConnecting) {
            dispatch(updateGlobalParametersThunk(application.parametersToLoadAfterConnecting));
            dispatch(setParametersToLoadAfterConnecting(null));
          }

          // If we have a shared dashboard to load, load it now.
          const shareDetails = application.shareDetails;
          if (shareDetails) {
            if (shareDetails.standalone) {
              dispatch(setStandaloneMode(true));
              dispatch(setStandaloneDashboardDatabase(shareDetails.dashboardDatabase));
            }
            if (shareDetails.type === 'create') {
              dispatch(loadDashboardThunk(shareDetails.id));
            } else {
              // TODO: In Phase 2, update to use GraphQL API for loading dashboards
              dispatch(loadDashboardFromNeo4jThunk(shareDetails.id));
            }
            dispatch(resetShareDetails());
          }

          // If we are in standalone mode, set the dashboard database.
          if (application.standalone) {
            dispatch(setStandaloneDashboardDatabase(database));
          }
        })
        .catch((error) => {
          // Connection failed
          dispatch(createNotificationThunk('Unable to establish connection to GraphQL API', error.message || 'Check your connection details and try again.'));
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
            
            dispatch(setDesktopConnectionProperties(apiEndpoint, apiKey, authToken, database));
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

    if (urlParams.get('share') !== null) {
      const id = decodeURIComponent(urlParams.get('id'));
      const type = urlParams.get('type');
      const standalone = urlParams.get('standalone') == 'Yes';
      const skipConfirmation = urlParams.get('skipConfirmation') == 'Yes';

      const dashboardDatabase = urlParams.get('dashboardDatabase');
      if (dashboardDatabase) {
        dispatch(setStandaloneDashboardDatabase(dashboardDatabase));
      }
      if (urlParams.get('credentials')) {
        setWelcomeScreenOpen(false);
        const connection = decodeURIComponent(urlParams.get('credentials'));
        const protocol = connection.split('://')[0];
        const username = connection.split('://')[1].split(':')[0];
        const password = connection.split('://')[1].split(':')[1].split('@')[0];
        const database = connection.split('@')[1].split(':')[0];
        const url = connection.split('@')[1].split(':')[1];
        const port = connection.split('@')[1].split(':')[2];

        dispatch(setConnectionModalOpen(false));
        dispatch(
          setShareDetailsFromUrl(
            type,
            id,
            standalone,
            protocol,
            url,
            port,
            database,
            username,
            password,
            dashboardDatabase,
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
        dispatch(
          setShareDetailsFromUrl(
            type,
            id,
            standalone,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            undefined,
            false
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
      dispatch(
        createConnectionThunk(
          shareDetails.apiEndpoint,
          shareDetails.apiKey,
          shareDetails.authToken,
          shareDetails.database
        )
      );
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
      const paramsBeforeSSO = JSON.parse(sessionStorage.getItem('SSO_PARAMS_BEFORE_REDIRECT') || '{}');
      Object.entries(paramsBeforeSSO).forEach(([key, value]) => {
        urlParams.set(key, value);
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
    dispatch(
      setStandaloneEnabled(
        standalone,
        config.standaloneProtocol,
        config.standaloneHost,
        config.standalonePort,
        config.standaloneDatabase,
        config.standaloneDashboardName,
        dashboardDatabase || config.standaloneDashboardDatabase,
        config.standaloneDashboardURL,
        config.standaloneUsername,
        config.standalonePassword,
        config.standalonePasswordWarningHidden,
        config.standaloneAllowLoad,
        config.standaloneLoadFromOtherDatabases,
        config.standaloneMultiDatabase,
        config.standaloneDatabaseList
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
              config.standaloneProtocol,
              config.standaloneHost,
              config.standalonePort,
              config.standaloneDatabase,
              credentials.username,
              credentials.password
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
export const initializeApplicationAsEditorThunk = (_, paramsToSetAfterConnecting) => (dispatch: any) => {
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

  // Check config to determine which screen is shown by default.
  if (DEFAULT_SCREEN == Screens.CONNECTION_MODAL) {
    dispatch(setWelcomeScreenOpen(false));
    dispatch(setConnectionModalOpen(true));
  } else if (DEFAULT_SCREEN == Screens.WELCOME_SCREEN) {
    dispatch(setWelcomeScreenOpen(true));
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
  (config, paramsToSetAfterConnecting) => (dispatch: any, getState: any) => {
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
          config.standaloneApiEndpoint,
          config.standaloneApiKey,
          config.standaloneAuthToken,
          config.standaloneDatabase
        )
      );
    } else {
      dispatch(setConnectionModalOpen(true));
    }
    dispatch(handleSharedDashboardsThunk());
  };
