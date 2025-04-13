import React, { useEffect } from 'react';
import { SSOLoginButton } from '../component/sso/SSOLoginButton';
import { Button, Dialog, Switch, TextInput, Dropdown, TextLink, IconButton } from '@neo4j-ndl/react';
import { PlayIconOutline, ArrowLeftIconOutline } from '@neo4j-ndl/react/icons';

/**
 * Configures setting the current GraphQL API connection for the dashboard.
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

  return (
    <>
      <Dialog
        size='small'
        open={open}
        onClose={() => {
          onConnectionModalClose();
          if (!connected) {
            setWelcomeScreenOpen(true);
          }
        }}
        aria-labelledby='form-dialog-title'
        disableCloseButton={!dismissable}
      >
        <Dialog.Header id='form-dialog-title'>{standalone ? 'Connect to Dashboard' : 'Connect to GraphQL API'}</Dialog.Header>
        <Dialog.Content className='n-flex n-flex-col n-gap-token-4'>
          {!standalone ? (
            <div className='n-flex n-flex-col n-gap-token-4'>
              <TextInput
                id='apiEndpoint'
                value={apiEndpoint}
                disabled={standalone}
                onChange={(e) => setApiEndpoint(e.target.value)}
                label='GraphQL API Endpoint'
                placeholder='https://api.example.com/graphql'
                autoFocus
                fluid
              />
              <TextInput
                id='apiKey'
                value={apiKey}
                disabled={standalone}
                onChange={(e) => setApiKey(e.target.value)}
                label='API Key (Optional)'
                placeholder='your-api-key'
                fluid
              />
              <TextInput
                id='authToken'
                value={authToken}
                disabled={standalone}
                onChange={(e) => setAuthToken(e.target.value)}
                label='Auth Token (Optional)'
                placeholder='Bearer token'
                type='password'
                fluid
              />
              <TextInput
                id='database'
                value={database}
                onChange={(e) => setDatabase(e.target.value)}
                label='Database (Optional)'
                placeholder='neo4j'
                fluid
              />
            </div>
          ) : (
            <Dropdown
              id='database'
              label='Database'
              type='select'
              selectProps={{
                onChange: (newValue) => {
                  if (newValue) {
                    setDatabase(newValue.value);
                  }
                },
                options: standaloneDatabaseList.map((option) => ({
                  label: option,
                  value: option,
                })),
                value: { label: database, value: database },
                menuPlacement: 'auto',
              }}
              fluid
            ></Dropdown>
          )}

          {ssoSettings.ssoEnabled ? (
            <div style={{ marginTop: 10 }}>
              <Switch
                label='Use SSO'
                checked={ssoVisible}
                onChange={() => setSsoVisible(!ssoVisible)}
                style={{ marginLeft: '5px' }}
              />
            </div>
          ) : (
            <></>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              onConnectionModalClose();
              createConnection(apiEndpoint, apiKey, authToken, database);
            }}
          >
            {ssoVisible ? (
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
            ) : (
              <Button
                type='submit'
                onClick={(e) => {
                  e.preventDefault();
                  onConnectionModalClose();
                  createConnection(apiEndpoint, apiKey, authToken, database);
                }}
                style={{ float: 'right', marginTop: '20px', marginBottom: '20px' }}
                size='large'
              >
                Connect
                <PlayIconOutline className='btn-icon-base-r' />
              </Button>
            )}
          </form>
        </Dialog.Content>
        <Dialog.Actions
          style={{
            background: '#555',
            marginLeft: '-3rem',
            marginRight: '-3rem',
            marginBottom: '-3rem',
            padding: '3rem',
          }}
        >
          {standalone ? (
            <div style={{ color: 'lightgrey' }}>
              {standaloneSettings.standaloneDashboardURL === '' ? (
                <>
                  Sign in to continue. You will be connected to the GraphQL API, and load a dashboard called&nbsp;
                  <b>{standaloneSettings.standaloneDashboardName}</b>.
                </>
              ) : (
                <> Sign in to continue. You will be connected to the GraphQL API, and load a dashboard.</>
              )}
            </div>
          ) : (
            <div style={{ color: 'white' }}>
              Enter your GraphQL API endpoint and authentication details to start. The API should implement the required GraphQL schema for Neo4j data access.
            </div>
          )}
        </Dialog.Actions>
      </Dialog>
    </>
  );
}
