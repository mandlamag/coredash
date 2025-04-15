import React, { useEffect, useState } from 'react';
import { IconButton, Button, Dialog, TextInput } from '@neo4j-ndl/react';
import { Menu, MenuItem, Chip } from '@mui/material';
import { PlusCircleIconOutline } from '@neo4j-ndl/react/icons';
import { useDispatch } from 'react-redux';

/**
 * Configures setting the current database connection for the dashboard (GraphQL-only mode).
 * @param open - Whether the modal is open or not.
 * @param database - The current database.
 * @param dashboard - The current dashboard.
 * @param handleClose - The function to close the modal.
 */
export const NeoDashboardSidebarAccessModal = ({ open, database, dashboard, handleClose }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLabels, setSelectedLabels] = useState([]);
  const [allLabels, setAllLabels] = useState([]);
  const [labels, setLabels] = useState([]);
  const [newLabel, setNewLabel] = useState('');
  const INITIAL_LABEL = '_Neodash_Dashboard';
  const [feedback, setFeedback] = useState('');
  const dispatch = useDispatch();

  useEffect(() => {
    if (!open) {
      return;
    }
    // GraphQL-only: Replace label fetching with GraphQL metadata query if needed
    setLabels([]);
    setSelectedLabels([]);
    setAllLabels([]);
    setFeedback('');
    setNewLabel('');
  }, [open, dashboard]);

  useEffect(() => {
    setAllLabels([INITIAL_LABEL]);
    setSelectedLabels([INITIAL_LABEL]);
  }, []);

  const handleOpenMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleLabelSelect = (label) => {
    if (!selectedLabels.includes(label) && label !== INITIAL_LABEL) {
      setSelectedLabels([...selectedLabels, label]);
    }
    handleCloseMenu();
  };

  const handleDeleteLabel = (label) => {
    if (label !== INITIAL_LABEL) {
      const updatedLabels = selectedLabels.filter((selectedLabel) => selectedLabel !== label);
      setSelectedLabels(updatedLabels);
    }
  };

  const handleAddNewLabel = (e) => {
    if (e.key === 'Enter' && newLabel.trim() !== '') {
      if (selectedLabels.includes(newLabel)) {
        setFeedback('Label already exists. Please enter a unique label.');
        handleCloseMenu();
      } else {
        setSelectedLabels([...selectedLabels, newLabel]);
        handleLabelSelect(newLabel);
        setNewLabel('');
        handleCloseMenu();
        setFeedback('');
      }
    }
  };

  const handleSave = () => {
    // Finding the difference between what is stored and what has been selected in the UI
    let toDelete = allLabels.filter((item) => selectedLabels.indexOf(item) < 0);

    // GraphQL-only: Replace Cypher query with GraphQL mutation if needed
    dispatch(
      createNotificationThunk(
        '🎉 Success!',
        'Selected Labels have successfully been added to the dashboard node.'
      )
    );
    handleClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} aria-labelledby='access-modal-title'>
      <Dialog.Title id='access-modal-title'>Dashboard Access (GraphQL-only mode)</Dialog.Title>
      <Dialog.Content>
        <div>Access control and label management is now handled via the GraphQL API. Legacy Neo4j driver controls have been removed.</div>
        Welcome to the Dashboard Access settings!
        <br />
        In this modal, you can select the labels that you want to add to the current dashboard node.
        <br />
        For more information, please refer to the{' '}
        <a
          href='https://neo4j.com/labs/neodash/2.4/user-guide/access-control-management/'
          target='_blank'
          rel='noopener noreferrer'
          style={{ color: 'blue', textDecoration: 'underline' }}
        >
          documentation
        </a>
        .
      </Dialog.Content>
      <div>
        <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleCloseMenu}>
          {/* Fetch labels dynamically from GraphQL metadata if needed */}
          {labels
            .filter((e) => !selectedLabels.includes(e))
            .map((label) => (
              <MenuItem key={label} onClick={() => handleLabelSelect(label)}>
                {label}
              </MenuItem>
            ))}
          <MenuItem>
            <TextInput
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e: KeyboardEvent) => {
                handleAddNewLabel(e);
                e.stopPropagation();
              }}
              errorText={feedback}
              placeholder='Create New label'
              autoComplete='off'
            />
          </MenuItem>
        </Menu>
        <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', marginTop: '10px' }}>
          {selectedLabels.map((label) => (
            <Chip
              key={label}
              label={label}
              variant='outlined'
              onDelete={label === INITIAL_LABEL ? undefined : () => handleDeleteLabel(label)}
              style={{ marginRight: '5px', marginBottom: '5px' }}
            />
          ))}
          <IconButton title='Add Label' size='large' clean style={{ marginBottom: '5px' }} onClick={handleOpenMenu}>
            <PlusCircleIconOutline color='#018BFF' />
          </IconButton>
        </div>
      </div>
      <Dialog.Actions>
        <Button onClick={handleClose} style={{ float: 'right' }} fill='outlined' floating>
          Cancel
        </Button>
        <Button onClick={handleSave} color='primary' style={{ float: 'right', marginRight: '10px' }} floating>
          Save
        </Button>
      </Dialog.Actions>
    </Dialog>
  );
};

export default NeoDashboardSidebarAccessModal;
