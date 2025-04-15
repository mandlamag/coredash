import React from 'react';

import { connect } from 'react-redux';
import { DataGrid } from '@mui/x-data-grid';
import NeoSetting from '../../../../component/field/Setting';
import { applicationGetConnection } from '../../../../application/ApplicationSelectors';
import { SELECTION_TYPES } from '../../../../config/CardConfig';
import { MenuItem, Button, Dialog, Dropdown, TextLink } from '@neo4j-ndl/react';
import {
  ShareIconOutline,
  PlayIconSolid,
  DocumentCheckIconOutline,
  DatabaseAddCircleIcon,
} from '@neo4j-ndl/react/icons';

const shareBaseURL = 'http://neodash.graphapp.io';
const shareLocalURL = window.location.origin.startsWith('file') ? shareBaseURL : window.location.origin;

export const NeoShareModal = ({ open, handleClose, connection }) => {
  const [loadFromNeo4jModalOpen, setLoadFromNeo4jModalOpen] = React.useState(false);
  const [loadFromFileModalOpen, setLoadFromFileModalOpen] = React.useState(false);
  const [rows, setRows] = React.useState([]);
  // Removed Neo4j driver context usage for GraphQL-only mode

  // One of [null, database, file]
  const shareType = 'url';
  const [shareID, setShareID] = React.useState(null);
  const [shareName, setShareName] = React.useState(null);
  const [shareConnectionDetails, setShareConnectionDetails] = React.useState('No');
  const [shareStandalone, setShareStandalone] = React.useState('No');
  const [selfHosted, setSelfHosted] = React.useState('No');
  const [shareLink, setShareLink] = React.useState(null);

  const [dashboardDatabase, setDashboardDatabase] = React.useState('neo4j');

  const columns = [
    { field: 'uuid', hide: true, headerName: 'ID', width: 150 },
    { field: 'date', headerName: 'Date', width: 200 },
    { field: 'title', headerName: 'Title', width: 370 },
    { field: 'author', headerName: 'Author', width: 160 },
    {
      field: 'load',
      headerName: ' ',
      renderCell: (c) => {
        return (
          <Button
            onClick={() => {
              setShareID(c.uuid);
              setShareName(c.row.title);
              // Removed database loading logic for GraphQL-only mode
              setLoadFromNeo4jModalOpen(false);
            }}
            style={{ float: 'right' }}
            fill='outlined'
            color='neutral'
            floating
          >
            Select
            <PlayIconSolid className='btn-icon-base-r' />
          </Button>
        );
      },
      width: 100,
    },
  ];

  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby='share-modal-title'>
      <Dialog.Header id='share-modal-title'>
        <ShareIconOutline className='icon-base icon-inline text-r' />
        Share Dashboard (GraphQL-only mode)
      </Dialog.Header>
      <Dialog.Content>
        <div>Legacy Neo4j driver-based sharing is disabled. Please use the new GraphQL API sharing features.</div>
      </Dialog.Content>
      <Dialog.Actions>
        <Button onClick={handleClose} color='primary'>Close</Button>
      </Dialog.Actions>
    </Dialog>
  );
};

const mapStateToProps = (state) => ({
  connection: applicationGetConnection(state),
});

const mapDispatchToProps = () => ({});

export default connect(mapStateToProps, mapDispatchToProps)(NeoShareModal);
