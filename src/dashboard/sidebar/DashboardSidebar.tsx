import React, { useState } from 'react';
import { connect } from 'react-redux';
import { getDashboardIsEditable, getPageNumber } from '../../settings/SettingsSelectors';
import { getDashboardSettings, getDashboardTitle } from '../DashboardSelectors';
import { Button, SideNavigation, SideNavigationGroupHeader, SideNavigationList, TextInput } from '@neo4j-ndl/react';
import { removeReportThunk } from '../../page/PageThunks';
import {
  PlusIconOutline,
  MagnifyingGlassIconOutline,
  CircleStackIconOutline,
  ArrowPathIconOutline,
} from '@neo4j-ndl/react/icons';

import Tooltip from '@mui/material/Tooltip';
import { DashboardSidebarListItem } from './DashboardSidebarListItem';
import {
  applicationGetConnection,
  applicationGetConnectionDatabase,
  applicationGetStandaloneSettings,
  applicationIsStandalone,
  dashboardIsDraft,
} from '../../application/ApplicationSelectors';
import { setDraft } from '../../application/ApplicationActions';
import NeoDashboardSidebarLoadModal from './modal/DashboardSidebarLoadModal';
import { resetDashboardState } from '../DashboardActions';
import NeoDashboardSidebarCreateModal from './modal/DashboardSidebarCreateModal';
import NeoDashboardSidebarDatabaseMenu from './menu/DashboardSidebarDatabaseMenu';
import NeoDashboardSidebarDashboardMenu from './menu/DashboardSidebarDashboardMenu';
import {
  loadDashboardThunk,
} from '../DashboardThunks';
import NeoDashboardSidebarSaveModal from './modal/DashboardSidebarSaveModal';
import { getDashboardJson } from '../../modal/ModalSelectors';
import NeoDashboardSidebarCreateMenu from './menu/DashboardSidebarCreateMenu';
import NeoDashboardSidebarImportModal from './modal/DashboardSidebarImportModal';
import { createUUID } from '../../utils/uuid';
import NeoDashboardSidebarExportModal from './modal/DashboardSidebarExportModal';
import NeoDashboardSidebarDeleteModal from './modal/DashboardSidebarDeleteModal';
import NeoDashboardSidebarInfoModal from './modal/DashboardSidebarInfoModal';
import NeoDashboardSidebarShareModal from './modal/DashboardSidebarShareModal';
import NeoDashboardSidebarAccessModal from './modal/DashboardSidebarAccessModal';
import LegacyShareModal from './modal/legacy/LegacyShareModal';
import { NEODASH_VERSION } from '../DashboardReducer';

// Which (small) pop-up menu is currently open for the sidebar.
enum Menu {
  DASHBOARD = 0,
  DATABASE = 1,
  CREATE = 2,
  NONE = 3,
}

// Which (large) pop-up modal is currently open for the sidebar.
enum Modal {
  CREATE = 0,
  LOAD = 1,
  SAVE = 2,
  EXPORT = 3,
  DELETE = 4,
  INFO = 5,
  SHARE = 6,
  ACCESS = 7,
  SHARE_LEGACY = 8,
  NONE = 9,
}

// We use "index = -1" to represent a non-saved draft dashboard in the sidebar's dashboard list.
const UNSAVED_DASHBOARD_INDEX = -1;

/**
 * A component responsible for rendering the sidebar on the left of the screen.
 */
export const NeoDashboardSidebar = ({
  database,
  connection,
  title,
  readonly,
  draft,
  setDraft,
  dashboard,
  resetLocalDashboard,
  loadDashboard,
  standaloneSettings,
}) => {
  const [expanded, setOnExpanded] = useState(false);
  const [selectedDashboardIndex, setSelectedDashboardIndex] = React.useState(UNSAVED_DASHBOARD_INDEX);
  const [dashboardDatabase, setDashboardDatabase] = React.useState(database ? database : 'neo4j');
  const [databases, setDatabases] = useState([]);
  const [inspectedIndex, setInspectedIndex] = useState(UNSAVED_DASHBOARD_INDEX);
  const [searchText, setSearchText] = useState('');
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null);
  const [menuOpen, setMenuOpen] = useState(Menu.NONE);
  const [modalOpen, setModalOpen] = useState(Modal.NONE);
  const [dashboards, setDashboards] = React.useState([]);
  const [cachedDashboard, setCachedDashboard] = React.useState('');

  readonly=true

  const getDashboardListFromNeo4j = () => {
    // Retrieves list of all dashboards stored in a given database.
    // This function is a placeholder and should be replaced with a GraphQL API call
    setDashboards([]);

    // Update the UI to reflect the currently selected dashboard.
    if (dashboard && dashboard.uuid) {
      const index = dashboards.findIndex((element) => element.uuid == dashboard.uuid);
      setSelectedDashboardIndex(index);
      if (index == UNSAVED_DASHBOARD_INDEX) {
        // If we can't find the currently dashboard in the database, we are drafting a new one.
        setDraft(true);
      }
    }
  };

  function createDashboard() {
    // Creates new dashboard in draft state (not yet saved to Neo4j)
    resetLocalDashboard();
    setDraft(true);
  }

  function deleteDashboard(uuid) {
    // Creates new dashboard in draft state (not yet saved to Neo4j)
    // This function is a placeholder and should be replaced with a GraphQL API call
    if (uuid == dashboard.uuid) {
      setSelectedDashboardIndex(UNSAVED_DASHBOARD_INDEX);
      resetLocalDashboard();
      getDashboardListFromNeo4j();
      setDraft(true);
    }
    setTimeout(() => {
      getDashboardListFromNeo4j();
    }, 100);
  }

  return (
    <div>
      <NeoDashboardSidebarSaveModal
        open={modalOpen == Modal.SAVE}
        onConfirm={() => {
          // This function is a placeholder and should be replaced with a GraphQL API call
          // After saving successfully, refresh the list after a small delay.
          // The new dashboard will always be on top (the latest), so we select index 0.
          setDashboards([]);
          setTimeout(() => {
            getDashboardListFromNeo4j();
            setSelectedDashboardIndex(0);
            setDraft(false);
          }, 100);
        }}
        overwrite={selectedDashboardIndex >= 0}
        handleClose={() => setModalOpen(Modal.NONE)}
      />

      <NeoDashboardSidebarLoadModal
        open={modalOpen == Modal.LOAD}
        onConfirm={() => {
          if (inspectedIndex == UNSAVED_DASHBOARD_INDEX) {
            // Someone attempted to load the unsaved draft dashboard... this isn't possible, we create a fresh one.
            setSelectedDashboardIndex(UNSAVED_DASHBOARD_INDEX);
            createDashboard();
          } else {
            // Load one of the dashboards from the database.
            setModalOpen(Modal.LOAD);
            const { uuid } = dashboards[inspectedIndex];
            // This function is a placeholder and should be replaced with a GraphQL API call
            loadDashboard(uuid, '');
            setSelectedDashboardIndex(inspectedIndex);
          }
        }}
        handleClose={() => setModalOpen(Modal.NONE)}
      />

      <NeoDashboardSidebarShareModal
        connection={connection}
        uuid={dashboards[inspectedIndex] && dashboards[inspectedIndex].uuid}
        dashboardDatabase={dashboardDatabase}
        open={modalOpen == Modal.SHARE}
        onConfirm={() => {
          setModalOpen(Modal.NONE);
        }}
        onLegacyShareClicked={() => setModalOpen(Modal.SHARE_LEGACY)}
        handleClose={() => setModalOpen(Modal.NONE)}
      />

      <LegacyShareModal open={modalOpen == Modal.SHARE_LEGACY} handleClose={() => setModalOpen(Modal.NONE)} />

      <NeoDashboardSidebarCreateModal
        open={modalOpen == Modal.CREATE}
        onConfirm={() => {
          setModalOpen(Modal.NONE);
          createDashboard();
          setSelectedDashboardIndex(UNSAVED_DASHBOARD_INDEX);
        }}
        handleClose={() => setModalOpen(Modal.NONE)}
      />

      <NeoDashboardSidebarDeleteModal
        open={modalOpen == Modal.DELETE}
        title={dashboards[inspectedIndex] && dashboards[inspectedIndex].title}
        onConfirm={() => {
          setModalOpen(Modal.NONE);
          if (dashboards[inspectedIndex]) {
            deleteDashboard(dashboards[inspectedIndex].uuid);
          }
        }}
        handleClose={() => setModalOpen(Modal.NONE)}
      />

      <NeoDashboardSidebarImportModal
        open={modalOpen == Modal.IMPORT}
        onImport={(text) => {
          setModalOpen(Modal.NONE);
          setDraft(true);
          setSelectedDashboardIndex(UNSAVED_DASHBOARD_INDEX);
          loadDashboard(createUUID(), text);
        }}
        handleClose={() => setModalOpen(Modal.NONE)}
      />

      <NeoDashboardSidebarInfoModal
        open={modalOpen == Modal.INFO}
        dashboard={dashboards[inspectedIndex]}
        handleClose={() => {
          setModalOpen(Modal.NONE);
          setCachedDashboard('');
        }}
      />

      <NeoDashboardSidebarExportModal
        open={modalOpen == Modal.EXPORT}
        dashboard={cachedDashboard}
        handleClose={() => {
          setModalOpen(Modal.NONE);
          setCachedDashboard('');
        }}
      />

      <NeoDashboardSidebarAccessModal
        open={modalOpen == Modal.ACCESS}
        database={dashboardDatabase}
        dashboard={dashboards[inspectedIndex]}
        handleClose={() => {
          setModalOpen(Modal.NONE);
          setCachedDashboard('');
        }}
      />

      <SideNavigation
        position='left'
        type='overlay'
        expanded={expanded}
        onExpandedChange={(open) => {
          setOnExpanded(open);
          if (open) {
            getDashboardListFromNeo4j();
          }
          // Wait until the sidebar has fully opened. Then trigger a resize event to align the grid layout.
          const timeout = setTimeout(() => {
            window.dispatchEvent(new Event('resize'));
          }, 300);
        }}
      >
        <SideNavigationList>
          <NeoDashboardSidebarDatabaseMenu
            databases={databases}
            selected={dashboardDatabase}
            setSelected={(newDatabase) => {
              setDashboardDatabase(newDatabase);
              // We changed the active dashboard database, reload the list in the sidebar.
              getDashboardListFromNeo4j();
            }}
            open={menuOpen == Menu.DATABASE}
            anchorEl={menuAnchor}
            handleClose={() => {
              setMenuOpen(Menu.NONE);
              setMenuAnchor(null);
            }}
          />
          <NeoDashboardSidebarDashboardMenu
            draft={draft && selectedDashboardIndex == inspectedIndex}
            open={menuOpen == Menu.DASHBOARD}
            anchorEl={menuAnchor}
            handleInfoClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.INFO);
            }}
            handleDiscardClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.LOAD);
            }}
            handleSaveClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.SAVE);
            }}
            handleLoadClicked={() => {
              setMenuOpen(Menu.NONE);
              if (draft) {
                setModalOpen(Modal.LOAD);
              } else {
                const d = dashboards[inspectedIndex];
                loadDashboard(d.uuid, '');
                setSelectedDashboardIndex(inspectedIndex);
              }
            }}
            handleExportClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.EXPORT);
            }}
            handleShareClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.SHARE);
            }}
            handleAccessClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.ACCESS);
            }}
            handleDeleteClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.DELETE);
            }}
            handleClose={() => {
              setMenuOpen(Menu.NONE);
              setMenuAnchor(null);
            }}
          />

          <NeoDashboardSidebarCreateMenu
            open={menuOpen == Menu.CREATE}
            anchorEl={menuAnchor}
            handleNewClicked={() => {
              setMenuOpen(Menu.NONE);
              if (draft) {
                setModalOpen(Modal.CREATE);
              } else {
                setSelectedDashboardIndex(UNSAVED_DASHBOARD_INDEX);
                createDashboard();
              }
            }}
            handleImportClicked={() => {
              setMenuOpen(Menu.NONE);
              setModalOpen(Modal.IMPORT);
            }}
            handleClose={() => {
              setMenuOpen(Menu.NONE);
              setMenuAnchor(null);
            }}
          />

          <SideNavigationGroupHeader>
            <div style={{ display: 'inline-block', width: '100%' }}>
              <span className='n-text-palette-neutral-text-weak' style={{ lineHeight: '28px' }}>
                Dashboards
              </span>
              <Tooltip title='Refresh' aria-label='refresh' disableInteractive>
                <Button
                  aria-label={'refresh'}
                  fill='text'
                  size='small'
                  color='neutral'
                  style={{
                    float: 'right',
                    marginLeft: '3px',
                    marginRight: '12px',
                    paddingLeft: 0,
                    paddingRight: '3px',
                  }}
                  onClick={() => {
                    getDashboardListFromNeo4j();
                    // When reloading, if the dashboard is not in DRAFT mode, we can directly refresh it.
                    if (!draft) {
                      const d = dashboards[selectedDashboardIndex];
                      loadDashboard(d.uuid, '');
                    }
                  }}
                >
                  <ArrowPathIconOutline className='btn-icon-base-r-m' />
                </Button>
              </Tooltip>
              {/* Only let users create dashboards and change database when running in editor mode. */}
              {!readonly || (readonly && standaloneSettings.standaloneLoadFromOtherDatabases) ? (
                <>
                  <Tooltip title='Database' aria-label='database' disableInteractive>
                    <Button
                      aria-label={'settings'}
                      fill='text'
                      size='small'
                      color='neutral'
                      style={{
                        float: 'right',
                        marginLeft: '0px',
                        marginRight: '3px',
                        paddingLeft: 0,
                        paddingRight: '3px',
                      }}
                      onClick={(event) => {
                        setMenuOpen(Menu.DATABASE);
                        // Only when not yet retrieved, and needed, get the list of databases from Neo4j.
                        if (databases.length == 0) {
                          // This function is a placeholder and should be replaced with a GraphQL API call
                          setDatabases([]);
                        }
                        setMenuAnchor(event.currentTarget);
                      }}
                    >
                      <CircleStackIconOutline className='btn-icon-base-r' />
                    </Button>
                  </Tooltip>

                  {!readonly ? (
                    <Tooltip title='Create' aria-label='create' disableInteractive>
                      <Button
                        aria-label={'new dashboard'}
                        fill='text'
                        size='small'
                        color='neutral'
                        style={{
                          float: 'right',
                          marginLeft: '0px',
                          marginRight: '5px',
                          paddingLeft: 0,
                          paddingRight: '3px',
                        }}
                        onClick={(event) => {
                          setMenuAnchor(event.currentTarget);
                          setMenuOpen(Menu.CREATE);
                        }}
                      >
                        <PlusIconOutline className='btn-icon-base-r' />
                      </Button>
                    </Tooltip>
                  ) : (
                    <></>
                  )}
                </>
              ) : (
                <></>
              )}
            </div>
          </SideNavigationGroupHeader>
        </SideNavigationList>
        <SideNavigationList>
          <SideNavigationGroupHeader style={{ marginBottom: '10px' }}>
            <TextInput
              fluid
              size='small'
              leftIcon={<MagnifyingGlassIconOutline style={{ height: 16, marginTop: '2px' }} />}
              className='n-w-full n-mr-2'
              placeholder='Search...'
              aria-label='Search'
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
            />
          </SideNavigationGroupHeader>
          {draft && selectedDashboardIndex == UNSAVED_DASHBOARD_INDEX && !readonly ? (
            <DashboardSidebarListItem
              version={NEODASH_VERSION}
              selected={draft}
              title={title}
              saved={false}
              onSelect={() => {}}
              onSettingsOpen={(event) => {
                setInspectedIndex(UNSAVED_DASHBOARD_INDEX);
                setMenuOpen(Menu.DASHBOARD);
                setMenuAnchor(event.currentTarget);
              }}
            />
          ) : (
            <></>
          )}
          {dashboards
            .filter((d) => d.title.toLowerCase().includes(searchText.toLowerCase()))
            .map((d) => {
              // index stored in list
              return (
                <DashboardSidebarListItem
                  selected={selectedDashboardIndex == d.index}
                  title={draft && selectedDashboardIndex == d.index ? title : d.title}
                  version={d.version}
                  saved={!(draft && selectedDashboardIndex == d.index)}
                  readonly={readonly}
                  onSelect={() => {
                    if (draft && d.index !== selectedDashboardIndex) {
                      setInspectedIndex(d.index);
                      setModalOpen(Modal.LOAD);
                    } else {
                      loadDashboard(d.uuid, '');
                      setSelectedDashboardIndex(d.index);
                    }
                  }}
                  onSettingsOpen={(event) => {
                    setInspectedIndex(d.index);
                    setMenuOpen(Menu.DASHBOARD);
                    setMenuAnchor(event.currentTarget);
                  }}
                />
              );
            })}
        </SideNavigationList>
      </SideNavigation>
    </div>
  );
};

const mapStateToProps = (state) => {
  return {
    database: applicationGetConnectionDatabase(state),
    connection: applicationGetConnection(state),
    readonly: !getDashboardIsEditable(state),
    draft: dashboardIsDraft(state),
    title: getDashboardTitle(state),
    dashboard: getDashboardSettings(state),
    standaloneSettings: applicationGetStandaloneSettings(state),
  };
};

const mapDispatchToProps = (dispatch) => {
  return {
    setDraft: (draft) => dispatch(setDraft(draft)),
    resetLocalDashboard: () => dispatch(resetDashboardState()),
    loadDashboard: (dashboard) => dispatch(loadDashboardThunk(dashboard)),
  };
};

export default connect(mapStateToProps, mapDispatchToProps)(NeoDashboardSidebar);
