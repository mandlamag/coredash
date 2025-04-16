import React, { useEffect } from 'react';
import { SSOLoginButton } from '../component/sso/SSOLoginButton';
import { Button, Dialog, Switch, TextInput, Dropdown } from '@neo4j-ndl/react';
import { PlayIconOutline, ExclamationTriangleIconSolid } from '@neo4j-ndl/react/icons';
import { ALLOW_QUERIES_WITHOUT_LOGIN, GRAPHQL_API_URL } from '../config/ApplicationConfig';
import { getGraphQLApiService } from '../services/GraphQLApiService';

/**
 * Configures setting the current GraphQL API connection for the dashboard.
 * If connection fails, shows a simple error dialog instead of the connection form.
 */
export default function NeoConnectionModal({
  connected,
  open,
  standalone,
  standaloneSettings,
  ssoSettings,
  connection,
  dismissable,
  createConnection,
  setConnectionProperties,
  onConnectionModalClose,
  onSSOAttempt,
  setWelcomeScreenOpen,
}) {
  const [ssoVisible, setSsoVisible] = React.useState(ssoSettings.ssoEnabled);
  const [apiEndpoint, setApiEndpoint] = React.useState(connection.apiEndpoint);
  const [apiKey, setApiKey] = React.useState(connection.apiKey);
  const [authToken, setAuthToken] = React.useState(connection.authToken);
  const [database, setDatabase] = React.useState(connection.database);

  // Make sure local vars are updated on external connection updates.
  useEffect(() => {
    setApiEndpoint(connection.apiEndpoint);
    setApiKey(connection.apiKey);
    setAuthToken(connection.authToken);
    setDatabase(connection.database);
  }, [JSON.stringify(connection)]);

  useEffect(() => {
    setSsoVisible(ssoSettings.ssoEnabled);
  }, [JSON.stringify(ssoSettings)]);

  const discoveryAPIUrl = ssoSettings && ssoSettings.ssoDiscoveryUrl;

  // since config is loaded asynchronously, value may not be yet defined when this runs for first time
  let standaloneDatabaseList = [standaloneSettings.standaloneDatabase];
  try {
    standaloneDatabaseList = standaloneSettings.standaloneDatabaseList
      ? standaloneSettings.standaloneDatabaseList.split(',')
      : standaloneDatabaseList;
  } catch (e) {
    console.log(e);
  }

  // If we're already connected, or if we're in standalone mode, we don't need the connection modal.
  if (connected && !standalone) {
    return <></>;
  }

  // If the connection failed and we're not in standalone mode, show a simple error dialog
  if (!connected && !standalone && open) {
    return (
      <Dialog
        open={open}
        onClose={onConnectionModalClose}
        aria-labelledby="connection-error-dialog-title"
        size="small"
      >
        <Dialog.Header id="connection-error-dialog-title">
          API Connection Error
        </Dialog.Header>
        <Dialog.Content className="n-py-2">
          <p>The application cannot connect to the backend API. Please check your network connection and try again later.</p>
          <p className="n-mt-2 n-text-sm n-text-neutral-500">
            If you're running in Docker, ensure both frontend and backend containers are on the same network.
          </p>
          <div className="n-mt-4">
            <Button 
              onClick={() => {
                // Try to connect using multiple fallback strategies
                const service = getGraphQLApiService();
                service.tryMultipleConnections()
                  .then(() => {
                    // If successful, create the connection with the updated endpoint
                    createConnection(
                      service.getApiEndpoint(),
                      apiKey,
                      authToken,
                      database
                    );
                  })
                  .catch(error => {
                    console.error("All connection attempts failed:", error);
                    // Keep dialog open
                  });
              }} 
              color="primary" 
              size="small"
            >
              Try Alternative Connections
            </Button>
          </div>
        </Dialog.Content>
        <Dialog.Actions className="n-justify-end">
          <Button onClick={onConnectionModalClose} color="neutral" size="small">
            Close
          </Button>
        </Dialog.Actions>
      </Dialog>
    );
  }

  // For standalone mode, we show a simplified connection dialog.
  if (standalone) {
    return (
      <Dialog
        open={open}
        onClose={dismissable ? onConnectionModalClose : undefined}
        aria-labelledby="connection-dialog-title"
      >
        <Dialog.Header id="connection-dialog-title">Connect to Database</Dialog.Header>
        <Dialog.Content>
          <div className="n-flex n-flex-col n-gap-4">
            <div className="n-flex n-flex-col n-gap-2">
              <label htmlFor="database">Database</label>
              <Dropdown
                id="database"
                value={{ value: database, label: database }}
                onChange={(newValue) => {
                  if (newValue) {
                    setDatabase(newValue.value);
                  }
                }}
                options={standaloneDatabaseList.map((db) => ({ value: db, label: db }))}
              />
            </div>
          </div>
        </Dialog.Content>
        <Dialog.Actions>
          <Button
            onClick={() => {
              createConnection(
                standaloneSettings.standaloneDashboardURL,
                apiKey,
                authToken,
                database
              );
            }}
            color="primary"
          >
            <PlayIconOutline className="btn-icon-base-l" />
            Connect
          </Button>
        </Dialog.Actions>
      </Dialog>
    );
  }

  // Otherwise, show the full connection dialog.
  return (
    <Dialog
      open={open}
      onClose={dismissable ? onConnectionModalClose : undefined}
      aria-labelledby="connection-dialog-title"
    >
      <Dialog.Header id="connection-dialog-title">Connect to Database</Dialog.Header>
      <Dialog.Content>
        <div className="n-flex n-flex-col n-gap-4">
          <div className="n-flex n-flex-col n-gap-2">
            <label htmlFor="apiEndpoint">GraphQL API Endpoint</label>
            <TextInput
              id="apiEndpoint"
              value={apiEndpoint}
              onChange={(e) => setApiEndpoint(e.target.value)}
              placeholder={GRAPHQL_API_URL || 'http://localhost:4000/graphql'}
            />
          </div>
          <div className="n-flex n-flex-col n-gap-2">
            <label htmlFor="apiKey">API Key (optional)</label>
            <TextInput
              id="apiKey"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Your API key"
            />
          </div>
          <div className="n-flex n-flex-col n-gap-2">
            <label htmlFor="database">Database</label>
            <TextInput
              id="database"
              value={database}
              onChange={(e) => setDatabase(e.target.value)}
              placeholder="neo4j"
            />
          </div>
          {ssoVisible && (
            <div className="n-flex n-flex-col n-gap-2">
              <div className="n-flex n-flex-row n-justify-between n-items-center">
                <label htmlFor="sso-toggle">Use Single Sign-On</label>
                <Switch
                  id="sso-toggle"
                  checked={ssoVisible}
                  onChange={() => setSsoVisible(!ssoVisible)}
                />
              </div>
              <SSOLoginButton
                hostname={apiEndpoint}
                port=""
                discoveryAPIUrl={discoveryAPIUrl}
                onSSOAttempt={onSSOAttempt}
                onClick={() => {
                  // Remember credentials on click
                  setConnectionProperties(apiEndpoint, apiKey, '', database);
                }}
                providers={ssoSettings.ssoProviders}
              />
            </div>
          )}
          {!ssoVisible && (
            <div className="n-flex n-flex-row n-justify-center n-gap-4" style={{ marginTop: '20px', marginBottom: '20px' }}>
              {ALLOW_QUERIES_WITHOUT_LOGIN && (
                <Button
                  type='button'
                  onClick={() => {
                    createConnection(apiEndpoint, apiKey, authToken, database);
                  }}
                  color="primary"
                >
                  <PlayIconOutline className="btn-icon-base-l" />
                  Connect
                </Button>
              )}
            </div>
          )}
        </div>
      </Dialog.Content>
    </Dialog>
  );
}
