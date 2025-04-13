import React, { useState, useEffect } from 'react';
import { Dropdown } from '@neo4j-ndl/react';
import { getDatabases } from '../utils/MetadataUtils';
import { useDispatch } from 'react-redux';
import { setDatabaseThunk } from '../application/ApplicationThunks';

interface DatabaseSelectorProps {
  currentDatabase: string;
  apiEndpoint: string;
}

/**
 * A component that allows users to select and switch between different databases
 * in the GraphQL API connection.
 */
const DatabaseSelector: React.FC<DatabaseSelectorProps> = ({ currentDatabase, apiEndpoint }) => {
  const [databases, setDatabases] = useState<string[]>([currentDatabase]);
  const [loading, setLoading] = useState<boolean>(false);
  const [selectedDatabase, setSelectedDatabase] = useState<string>(currentDatabase);
  const dispatch = useDispatch();

  // Load available databases when the component mounts or when the API endpoint changes
  useEffect(() => {
    if (apiEndpoint) {
      setLoading(true);
      // Use null for driver since we're using GraphQL API
      getDatabases(null, (dbs: string[]) => {
        setDatabases(dbs);
        setLoading(false);
      });
    }
  }, [apiEndpoint]);

  // Update selected database when currentDatabase prop changes
  useEffect(() => {
    setSelectedDatabase(currentDatabase);
  }, [currentDatabase]);

  const handleDatabaseChange = (newValue: any) => {
    if (newValue && newValue.value !== selectedDatabase) {
      setSelectedDatabase(newValue.value);
      // Dispatch the action to switch databases
      dispatch(setDatabaseThunk(newValue.value));
    }
  };

  return (
    <div className="database-selector">
      <Dropdown
        id="database-selector"
        label="Database"
        type="select"
        selectProps={{
          isDisabled: loading,
          isLoading: loading,
          onChange: handleDatabaseChange,
          options: databases.map((db) => ({
            label: db,
            value: db,
          })),
          value: { label: selectedDatabase, value: selectedDatabase },
          menuPlacement: 'bottom',
        }}
        fluid
      />
    </div>
  );
};

export default DatabaseSelector;
