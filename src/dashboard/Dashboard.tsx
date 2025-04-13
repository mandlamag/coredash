import React from 'react';
import NeoPage from '../page/Page';
import LedgerCoreDashboardHeader from './header/DashboardHeader';
import LedgerCoreDashboardTitle from './header/DashboardTitle';
import LedgerCoreDashboardHeaderPageList from './header/DashboardHeaderPageList';
// Import GraphQLApiService instead of Neo4j driver
import { getGraphQLApiService } from '../services/GraphQLApiService';
import { applicationGetConnection, applicationGetStandaloneSettings } from '../application/ApplicationSelectors';
import { connect } from 'react-redux';
import LedgerCoreDashboardConnectionUpdateHandler from '../component/misc/DashboardConnectionUpdateHandler';
import { forceRefreshPage } from '../page/PageActions';
import { getPageNumber } from '../settings/SettingsSelectors';
import { createNotificationThunk } from '../page/PageThunks';
import { version } from '../modal/AboutModal';
import LedgerCoreDashboardSidebar from './sidebar/DashboardSidebar';

const Dashboard = ({
  pagenumber,
  connection,
  standaloneSettings,
  onConnectionUpdate,
  onDownloadDashboardAsImage,
  onAboutModalOpen,
  resetApplication,
}) => {
  // Use GraphQLApiService instead of Neo4j driver
  const [apiService, setApiService] = React.useState(undefined);

  // If no API service is yet instantiated, get the singleton instance
  if (apiService === undefined && connection.connected) {
    // Get the GraphQLApiService singleton instance
    const service = getGraphQLApiService();
    setApiService(service);
  }
  const content = (
    <div>
      <LedgerCoreDashboardConnectionUpdateHandler
        pagenumber={pagenumber}
        connection={connection}
        onConnectionUpdate={onConnectionUpdate}
      />

      {/* Navigation Bar */}
      <div
        className='n-w-screen n-flex n-flex-row n-items-center n-bg-neutral-bg-weak n-border-b'
        style={{ borderColor: 'lightgrey' }}
      >
        <LedgerCoreDashboardHeader
          connection={connection}
          onDownloadImage={onDownloadDashboardAsImage}
          onAboutModalOpen={onAboutModalOpen}
          resetApplication={resetApplication}
        ></LedgerCoreDashboardHeader>
      </div>
      {/* Main Page */}
      <div
        style={{
          display: 'flex',
          height: 'calc(40vh - 32px)',
          minHeight: window.innerHeight - 62,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        {!standaloneSettings.standalone || (standaloneSettings.standalone && standaloneSettings.standaloneAllowLoad) ? (
          <LedgerCoreDashboardSidebar />
        ) : (
          <></>
        )}
        <div className='n-w-full n-h-full n-flex n-flex-col n-items-center n-justify-center n-rounded-md'>
          <div className='n-w-full n-h-full n-overflow-y-scroll n-flex n-flex-row'>
            {/* Main Content */}
            <main className='n-flex-1 n-relative n-z-0 n-scroll-smooth n-w-full'>
              <div className='n-absolute n-inset-0 page-spacing'>
                <div className='page-spacing-overflow'>
                  {/* The main content of the page */}

                  <div>
                    {standaloneSettings.standalonePassword &&
                    standaloneSettings.standalonePasswordWarningHidden !== true ? (
                      <div style={{ textAlign: 'center', color: 'red', paddingTop: 60, marginBottom: -50 }}>
                        Warning: LedgerCore is running with a plaintext password in config.json.
                      </div>
                    ) : (
                      <></>
                    )}
                    <LedgerCoreDashboardTitle />
                    <LedgerCoreDashboardHeaderPageList />
                    <NeoPage></NeoPage>
                  </div>
                </div>
              </div>
            </main>
          </div>
        </div>
      </div>
    </div>
  );
  return content;
};

const mapStateToProps = (state) => ({
  connection: applicationGetConnection(state),
  pagenumber: getPageNumber(state),
  standaloneSettings: applicationGetStandaloneSettings(state),
});

const mapDispatchToProps = (dispatch) => ({
  onConnectionUpdate: (pagenumber) => {
    dispatch(
      createNotificationThunk(
        'Connection Updated',
        'You have updated your GraphQL connection, your reports have been reloaded.'
      )
    );
    dispatch(forceRefreshPage(pagenumber));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(Dashboard);
