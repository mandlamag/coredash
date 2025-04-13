import React from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import { TextField } from '@mui/material';
import { EditType } from '../GraphChartEditModal';
import { getNodeLabels, getRelationshipTypes } from '../../../../utils/MetadataUtils';

/**
 * Renders an auto-complete text field that uses either:
 * - The labels from the active Neo4j database.
 * - The relationship types from the active Neo4j database.
 * TODO - check that the same database is used that the component has selected.
 */
export const LabelTypeAutocomplete = ({
  type,
  disabled,
  input,
  setInput,
  value,
  setValue,
  records,
  setRecords,
  queryCallback,
}) => {
  return (
    <Autocomplete
      id='autocomplete-label-type'
      disabled={disabled}
      options={records.map((r) => (r._fields ? r._fields[0] : '(no data)'))}
      getOptionLabel={(option) => option || ''}
      style={{ width: '100%', marginLeft: '5px', marginTop: '5px' }}
      inputValue={input}
      onInputChange={(event, value) => {
        setInput(value);
        if (value && value.length > 0) {
          if (type == EditType.Node) {
            // Use the new MetadataUtils to get node labels
            getNodeLabels(null, '', (labels) => {
              // Filter labels based on input value
              const filteredLabels = labels
                .filter(label => label.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 5); // Limit to 5 results
              
              // Transform to match expected format
              const formattedRecords = filteredLabels.map(label => ({
                get: (key) => key === 'nodeLabel' ? label : null,
                keys: ['nodeLabel'],
                _fields: [label],
                toObject: () => ({ nodeLabel: label })
              }));
              
              setRecords(formattedRecords);
            });
          } else {
            // Use the new MetadataUtils to get relationship types
            getRelationshipTypes(null, '', (types) => {
              // Filter types based on input value
              const filteredTypes = types
                .filter(type => type.toLowerCase().includes(value.toLowerCase()))
                .slice(0, 5); // Limit to 5 results
              
              // Transform to match expected format
              const formattedRecords = filteredTypes.map(type => ({
                get: (key) => key === 'relType' ? type : null,
                keys: ['relType'],
                _fields: [type],
                toObject: () => ({ relType: type })
              }));
              
              setRecords(formattedRecords);
            });
          }
        }
      }}
      value={value}
      onChange={(event, newValue) => setValue(newValue)}
      renderInput={(params) => (
        <TextField
          {...params}
          placeholder='Start typing...'
          InputLabelProps={{ shrink: true }}
          label={type == EditType.Relationship ? 'Type' : 'Label'}
        />
      )}
    />
  );
};
