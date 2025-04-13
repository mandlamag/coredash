import React, { useEffect } from 'react';
import { connect } from 'react-redux';
import { setDashboardTitle } from '../DashboardActions';
import { getDashboardSettings, getDashboardTheme, getDashboardTitle, getPages } from '../DashboardSelectors';
import { setConnectionModalOpen } from '../../application/ApplicationActions';
import { applicationGetStandaloneSettings, applicationGetCustomHeader, applicationGetConnection } from '../../application/ApplicationSelectors';
import { getDashboardIsEditable, getPageNumber } from '../../settings/SettingsSelectors';
import { LedgerCoreDashboardHeaderLogo } from './DashboardHeaderLogo';
import LedgerCoreAboutButton from './DashboardHeaderAboutButton';
import { LedgerCoreLogoutButton } from './DashboardHeaderLogoutButton';
import { LedgerCoreDashboardHeaderDownloadImageButton } from './DashboardHeaderDownloadImageButton';
import { updateDashboardSetting } from '../../settings/SettingsActions';
import { MoonIconOutline, SunIconOutline } from '@neo4j-ndl/react/icons';
import { DASHBOARD_HEADER_BUTTON_COLOR } from '../../config/ApplicationConfig';
import { Tooltip } from '@mui/material';
import DatabaseSelector from '../../component/DatabaseSelector';

export const LedgerCoreDashboardHeader = ({
  standaloneSettings,
  dashboardTitle,
  customHeader,
  connection,
  settings,
  onConnectionModalOpen,
  onDownloadImage,
  onAboutModalOpen,
  resetApplication,
  themeMode,
  setTheme,
  isConnected,
}) => {
  const downloadImageEnabled = settings ? settings.downloadImageEnabled : false;
  const [dashboardTitleText, setDashboardTitleText] = React.useState(dashboardTitle);

  const [isDarkMode, setDarkMode] = React.useState(themeMode !== 'light');

  const toggleDarkMode = (checked: boolean) => {
    setDarkMode(checked);
  };

  useEffect(() => {
    // Reset text to the dashboard state when the page gets reorganized.
    if (dashboardTitle !== dashboardTitleText) {
      setDashboardTitleText(dashboardTitle);
    }
  }, [dashboardTitle]);

  useEffect(() => {
    setTheme(isDarkMode ? 'dark' : 'light');
  }, [isDarkMode]);
  const content = (
    <div className='n-relative n-bg-palette-neutral-bg-weak n-w-full'>
      <div className='n-min-w-full'>
        <div className='n-flex n-justify-between n-h-16 n-items-center n-py-6 md:n-justify-start md:n-space-x-10 n-mx-4'>
          <LedgerCoreDashboardHeaderLogo resetApplication={resetApplication} />
          <div className='n-flex-1'></div>
          <div className='sm:n-flex n-items-center n-justify-end md:n-flex-1 lg:n-w-0'>
            <div className='n-flex n-flex-row'>
              <Tooltip title={'Toggle Theme'} disableInteractive>
                <div
                  onClick={() => toggleDarkMode(!isDarkMode)}
                  className={'ndl-icon-btn n-p-2 ndl-large ndl-clean n-cursor-pointer n-rounded-full hover:n-bg-palette-neutral-bg-strong'}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  {isDarkMode ? (
                    <SunIconOutline style={{ color: '#FF8C00', fontSize: '24px' }} />
                  ) : (
                    <MoonIconOutline style={{ color: '#000000', fontSize: '24px' }} />
                  )}
                </div>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  return content;
};

const mapStateToProps = (state) => ({
  dashboardTitle: getDashboardTitle(state),
  standaloneSettings: applicationGetStandaloneSettings(state),
  customHeader: applicationGetCustomHeader(state),
  connection: applicationGetConnection(state),
  pages: getPages(state),
  settings: getDashboardSettings(state),
  editable: getDashboardIsEditable(state),
  pagenumber: getPageNumber(state),
  themeMode: getDashboardTheme(state),
  isConnected: state.application.connected,
});

const mapDispatchToProps = (dispatch) => ({
  setDashboardTitle: (title: any) => {
    dispatch(setDashboardTitle(title));
  },

  setTheme: (theme: string) => {
    dispatch(updateDashboardSetting('theme', theme));
  },

  onConnectionModalOpen: () => {
    dispatch(setConnectionModalOpen(true));
  },
});

export default connect(mapStateToProps, mapDispatchToProps)(LedgerCoreDashboardHeader);
