import React, { useState } from 'react';
import { connect } from 'react-redux';
import { IconButton, Menu, MenuItems, MenuItem } from '@neo4j-ndl/react';
import {
  QuestionMarkCircleIconOutline,
  BookOpenIconOutline,
  InformationCircleIconOutline,
} from '@neo4j-ndl/react/icons';
import { Tooltip } from '@mui/material';

import { DASHBOARD_HEADER_BUTTON_COLOR } from '../../config/ApplicationConfig';
import StyleConfig from '../../config/StyleConfig';
import { getDashboardExtensions } from '../DashboardSelectors';
import { getExampleReports } from '../../extensions/ExtensionUtils';
import { NeoReportExamplesModal as LedgerCoreReportExamplesModal } from '../../modal/ReportExamplesModal';
import { enterHandler, openTab } from '../../utils/accessibility';

type HelpMenuOpenEvent = React.MouseEvent<HTMLElement> | React.KeyboardEvent<HTMLElement>;

await StyleConfig.getInstance();

export const LedgerCoreAboutButton = ({ connection, onAboutModalOpen, extensions }) => {
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const handleHelpMenuOpen = (event: HelpMenuOpenEvent) => {
    setAnchorEl(event.currentTarget as HTMLButtonElement);
  };
  const handleHelpMenuClose = () => {
    setAnchorEl(null);
  };
  const menuOpen = Boolean(anchorEl);

  const menuAboutHandler = (e) => {
    onAboutModalOpen(e);
    handleHelpMenuClose();
  };

  return (
    <>
      <Tooltip title={'Help and documentation'} disableInteractive>
        <IconButton
          className='logo-btn n-p-1'
          aria-label={'help'}
          style={DASHBOARD_HEADER_BUTTON_COLOR ? { color: DASHBOARD_HEADER_BUTTON_COLOR } : {}}
          size='large'
          onClick={handleHelpMenuOpen}
          clean
        >
          <QuestionMarkCircleIconOutline className='header-icon' type='outline' />
        </IconButton>
      </Tooltip>
      <Menu
        anchorOrigin={{
          horizontal: 'right',
          vertical: 'bottom',
        }}
        transformOrigin={{
          horizontal: 'right',
          vertical: 'top',
        }}
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleHelpMenuClose}
        size='large'
      >
        <MenuItems>
          <LedgerCoreReportExamplesModal
            extensions={extensions}
            examples={getExampleReports(extensions)}
            database={connection.database}
          ></LedgerCoreReportExamplesModal>
          <MenuItem
            onKeyDown={(e) => enterHandler(e, () => openTab('https://github.com/silversixpence-crypto/ledgercore-dash'))}
            onClick={() => openTab('https://github.com/silversixpence-crypto/ledgercore-dash')}
            title={'Documentation'}
            icon={<BookOpenIconOutline />}
          />
          <MenuItem
            title={'About'}
            onClick={menuAboutHandler}
            onKeyDown={(e) => enterHandler(e, menuAboutHandler)}
            icon={<InformationCircleIconOutline />}
          />
        </MenuItems>
      </Menu>
    </>
  );
};

const mapStateToProps = (state) => ({
  extensions: getDashboardExtensions(state),
});

export default connect(mapStateToProps, null)(LedgerCoreAboutButton);
