// TODO: this file (in a way) belongs to chart/parameter/ParameterSelectionChart. It would make sense to move it there

import React, { useCallback, useEffect } from 'react';
import NeoCodeEditorComponent, {
  DEFAULT_CARD_SETTINGS_HELPER_TEXT_STYLE,
} from '../../../component/editor/CodeEditorComponent';
import debounce from 'lodash/debounce';
import { Banner, IconButton } from '@neo4j-ndl/react';
import { PencilIconOutline, PlusIconOutline, XMarkIconOutline } from '@neo4j-ndl/react/icons';
import NeoFormCardSettingsModal from './NeoFormCardSettingsModal';
import { SortableList } from './list/NeoFormSortableList';

const NeoFormCardSettings = ({ query, database, settings, extensions, onReportSettingUpdate, onQueryUpdate }) => {
  // Removed Neo4j driver context usage for GraphQL-only mode
  // All data access must go through GraphQL API service

  // Ensure that we only trigger a text update event after the user has stopped typing.
  const [queryText, setQueryText] = React.useState(query);
  const debouncedQueryUpdate = useCallback(debounce(onQueryUpdate, 250), []);
  const formFields = settings.formFields ? settings.formFields : [];
  const [selectedFieldIndex, setSelectedFieldIndex] = React.useState(-1);
  const [fieldModalOpen, setFieldModalOpen] = React.useState(false);
  const [indexedFormFields, setIndexedFormFields] = React.useState([]);

  function updateCypherQuery(value) {
    debouncedQueryUpdate(value);
    setQueryText(value);
  }

  function updateFormFields(newFormFields) {
    onReportSettingUpdate('formFields', newFormFields);
  }

  const addFieldButton = (
    <div style={{ width: '100%', display: 'flex' }}>
      <IconButton
        className='form-add-parameter'
        style={{ marginLeft: 'auto', marginRight: 'auto', marginTop: 5, marginBottom: 5 }}
        aria-label='add'
        size='medium'
        floating
        onClick={() => {
          const newField = { type: 'Node Property', settings: {}, query: '' };
          const newIndex = formFields.length;
          updateFormFields(formFields.concat(newField));
          setSelectedFieldIndex(newIndex);
          setFieldModalOpen(true);
        }}
      >
        <PlusIconOutline />
      </IconButton>
    </div>
  );

  useEffect(() => {
    if (formFields && !(formFields.length == 0 && indexedFormFields.length == 0)) {
      setIndexedFormFields(
        formFields.map((field, idx) => ({ ...field, idx }))
      );
    }
  }, [formFields]);

  return (
    <div style={{ width: '100%' }}>
      <div style={{ padding: 8 }}>
        <div style={{ fontWeight: 'bold', marginBottom: 8 }}>Form Fields</div>
        <SortableList
          items={indexedFormFields}
          onSort={updateFormFields}
          onEdit={setSelectedFieldIndex}
          onDelete={(idx) => {
            const newFields = [...formFields];
            newFields.splice(idx, 1);
            updateFormFields(newFields);
          }}
        />
        {addFieldButton}
        {fieldModalOpen && (
          <NeoFormCardSettingsModal
            open={fieldModalOpen}
            onClose={() => setFieldModalOpen(false)}
            field={formFields[selectedFieldIndex]}
            onSave={(updatedField) => {
              const newFields = [...formFields];
              newFields[selectedFieldIndex] = updatedField;
              updateFormFields(newFields);
              setFieldModalOpen(false);
            }}
          />
        )}
        <div style={{ borderTop: '1px dashed lightgrey', width: '100%' }}>
          <span>Form Submission Query:</span>
          <NeoCodeEditorComponent
            value={queryText}
            editable={true}
            language={'cypher'}
            onChange={(value) => {
              updateCypherQuery(value);
            }}
            placeholder={`Enter Cypher here...`}
          />
          <div style={DEFAULT_CARD_SETTINGS_HELPER_TEXT_STYLE}>
            This query is executed when the user submits the form.
          </div>
        </div>
      </div>
    </div>
  );
};

export default NeoFormCardSettings;
