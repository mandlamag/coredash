import React, { useEffect } from 'react';
import { SSOLoginButton } from '../component/sso/SSOLoginButton';
import { Button, Dialog, Switch, TextInput, Dropdown } from '@neo4j-ndl/react';
import { PlayIconOutline, ExclamationTriangleIconSolid } from '@neo4j-ndl/react/icons';
import { ALLOW_QUERIES_WITHOUT_LOGIN, GRAPHQL_API_URL } from '../config/ApplicationConfig';
import { getGraphQLApiService } from '../services/GraphQLApiService';

/**
 * Configures setting the current GraphQL API connection for the dashboard.
 * Automatically attempts connection without user interaction.
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

  // Auto-connect effect - attempts connection automatically when needed
  useEffect(() => {
    if (!connected && open) {
      console.log('%c[AUTO-CONNECTION ATTEMPT]', 'color: #ff6600; font-weight: bold; font-size: 14px;');
      
      // Try to connect using multiple fallback strategies
      const service = getGraphQLApiService();
      service.tryMultipleConnections()
        .then(() => {
          console.log('%c[AUTO-CONNECTION SUCCESSFUL]', 'color: #00cc00; font-weight: bold; font-size: 14px;', {
            endpoint: service.getApiEndpoint()
          });
          // If successful, create the connection with the updated endpoint
          createConnection(
            service.getApiEndpoint(),
            apiKey,
            authToken,
            database
          );
        })
        .catch(error => {
          console.error('%c[AUTO-CONNECTION FAILED]', 'color: #cc0000; font-weight: bold; font-size: 14px;', error);
          // Silently fail - no modal shown
          if (onConnectionModalClose) {
            onConnectionModalClose();
          }
        });
    }
  }, [connected, open, apiEndpoint, apiKey, authToken, database]);

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
  if (connected || !open) {
    return <></>;
  }

  // Never show any connection modal to the user
  return <></>;
}
