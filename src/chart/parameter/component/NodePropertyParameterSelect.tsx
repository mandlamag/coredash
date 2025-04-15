import React, { useCallback, useEffect } from 'react';
import { debounce, TextField } from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import { ParameterSelectProps } from './ParameterSelect';
import { RenderSubValue } from '../../../report/ReportRecordProcessing';
import { SelectionConfirmationButton } from './SelectionConfirmationButton';
import NeoCodeViewerComponent from '../../../component/editor/CodeViewerComponent';
import { getRecordType, toNumber } from '../../ChartUtils';

const NodePropertyParameterSelectComponent = (props: ParameterSelectProps) => {
  const suggestionsUpdateTimeout =
    props.settings && props.settings.suggestionsUpdateTimeout ? props.settings.suggestionsUpdateTimeout : 250;
  const defaultValue =
    props.settings && props.settings.defaultValue && props.settings.defaultValue.length > 0
      ? props.settings.defaultValue
      : '';

  const disabled = props?.settings?.disabled ? props.settings.disabled : false;
  const getInitialValue = (value, multi) => {
    if (value && Array.isArray(value)) {
      return multi ? value : null;
    } else if (value) {
      return multi ? [value] : value;
    }
    return multi ? [] : value;
  };
  const { multiSelector, manualParameterSave } = props;
  const allParameters = props.allParameters ? props.allParameters : {};
  const [extraRecords, setExtraRecords] = React.useState([]);

  const [inputDisplayText, setInputDisplayText] = React.useState(
    props.parameterDisplayValue && multiSelector ? '' : props.parameterDisplayValue
  );
  const [inputValue, setInputValue] = React.useState(getInitialValue(props.parameterDisplayValue, multiSelector));

  const [paramValueLocal, setParamValueLocal] = React.useState(props.parameterValue);
  const [paramValueDisplayLocal, setParamValueDisplayLocal] = React.useState(props.parameterDisplayValue);

  // Ensure we always have an input parameter by wrapping the queryCallback
  const safeQueryCallback = useCallback((query, parameters, setRecords) => {
    // Always ensure input parameter exists, even if empty
    const safeParameters = { ...parameters };
    if (!safeParameters.hasOwnProperty('input') || safeParameters.input === undefined) {
      safeParameters.input = '';
    }
    return props.queryCallback(query, safeParameters, setRecords);
  }, [props.queryCallback]);

  const debouncedQueryCallback = useCallback(debounce(safeQueryCallback, suggestionsUpdateTimeout), [safeQueryCallback]);
  
  const label = props.settings && props.settings.entityType ? props.settings.entityType : '';
  const multiSelectLimit = props.settings && props.settings.multiSelectLimit ? props.settings.multiSelectLimit : 5;
  const propertyType = props.settings && props.settings.propertyType ? props.settings.propertyType : '';
  const helperText = props.settings && props.settings.helperText ? props.settings.helperText : '';
  const clearParameterOnFieldClear =
    props.settings && props.settings.clearParameterOnFieldClear ? props.settings.clearParameterOnFieldClear : false;
  const autoSelectFirstValue =
    props.settings && props.settings.autoSelectFirstValue ? props.settings.autoSelectFirstValue : false;

  // index of the display value in the resulting extra records retrieved by the component when the user types. equals '1' for NeoDash 2.2.2 and later.
  const displayValueRowIndex = props.compatibilityMode
    ? 0
    : extraRecords[0]?.keys?.findIndex((e) => e.toLowerCase() == 'display') || 0;

  const realValueRowIndex = props.compatibilityMode ? 0 : 1 - displayValueRowIndex;

  const manualHandleParametersUpdate = () => {
    handleParametersUpdate(paramValueLocal, paramValueDisplayLocal, false);
  };
  const handleParametersUpdate = (value, displayValue, manual = false) => {
    setParamValueLocal(value);
    setParamValueDisplayLocal(displayValue);

    if (manual) {
      return;
    }

    props.setParameterValue(value);
    props.setParameterDisplayValue(displayValue);
  };
  const handleCrossClick = (isMulti, value) => {
    if (isMulti) {
      if (value !== null && value.length == 0 && clearParameterOnFieldClear) {
        setInputValue([]);
        handleParametersUpdate(undefined, undefined, manualParameterSave);
        return true;
      }
      if (value !== null && value.length == 0) {
        setInputValue([]);
        handleParametersUpdate([], [], manualParameterSave);
        return true;
      }
    } else {
      if (value && clearParameterOnFieldClear) {
        setInputValue(null);
        handleParametersUpdate(undefined, undefined, manualParameterSave);
        return true;
      }
      if (value == null) {
        setInputValue(null);
        handleParametersUpdate(defaultValue, defaultValue, manualParameterSave);
        return true;
      }
      return false;
    }
  };
  const propagateSelection = (event, newDisplay) => {
    const isMulti = Array.isArray(newDisplay);
    if (handleCrossClick(isMulti, newDisplay)) {
      return;
    }
    let newValue;
    let valReference = manualParameterSave ? paramValueLocal : props.parameterValue;
    let valDisplayReference = manualParameterSave ? paramValueDisplayLocal : props.parameterDisplayValue;
    // Multiple and new entry
    if (isMulti && inputValue !== null && newDisplay !== null && inputValue.length < newDisplay.length) {
      newValue = Array.isArray(valReference)
        ? [...valReference]
        : valReference && valReference !== null
        ? [valReference]
        : [];
      const newDisplayValue = [...newDisplay].slice(-1)[0];
      let val = extraRecords.filter((r) => r._fields[displayValueRowIndex].toString() == newDisplayValue)[0]._fields[
        realValueRowIndex
      ];
      if (newValue.low) {
        newValue.push(toNumber(val));
      } else {
        newValue.push(RenderSubValue(val));
      }
    } else if (!isMulti) {
      // if records are toStringed before comparison, toString the comparing variable
      const newDisplay2 = typeof newDisplay === 'boolean' ? newDisplay.toString() : newDisplay;
      newValue = extraRecords.filter((r) => (r?._fields?.[displayValueRowIndex]?.toString() || null) == newDisplay2)[0]
        ._fields[realValueRowIndex];

      newValue =
        (newValue.low && newValue.low != null) || newValue.low === 0 ? toNumber(newValue) : RenderSubValue(newValue);
    } else {
      let ele = valDisplayReference.filter((x) => !newDisplay.includes(x))[0];
      newValue = [...valReference];
      newValue.splice(valDisplayReference.indexOf(ele), 1);
    }

    newDisplay = newDisplay.low ? toNumber(newDisplay) : RenderSubValue(newDisplay);
    setInputDisplayText(isMulti ? '' : newDisplay);
    setInputValue(newDisplay);
    handleParametersUpdate(newValue, newDisplay, manualParameterSave);
  };

  // If we don't have an error message, render the selector:
  useEffect(() => {
    // Handle external updates of parameter values, with varying value types and parameter selector types.
    // Handles multiple scenarios if an external parameter changes type from value to lists.
    const isArray = Array.isArray(props.parameterDisplayValue);
    if (multiSelector) {
      if (isArray) {
        setInputDisplayText(props.parameterDisplayValue);
        setInputValue(props.parameterDisplayValue);
      } else if (props.parameterDisplayValue !== '') {
        setInputDisplayText([props.parameterDisplayValue]);
        setInputValue([props.parameterDisplayValue]);
      } else {
        setInputDisplayText('');
        setInputValue([]);
      }
    } else {
      setInputDisplayText(props.parameterDisplayValue);
      setInputValue(props.parameterDisplayValue);
    }
  }, [props.parameterDisplayValue]);

  // Initial load of suggestions when component mounts
  useEffect(() => {
    // Load initial suggestions with empty input
    debouncedQueryCallback(props.query, { input: '', ...allParameters }, setExtraRecords);
  }, [props.query]);

  // The query used to populate the selector is invalid.
  if (extraRecords && extraRecords[0] && extraRecords[0].error) {
    return (
      <NeoCodeViewerComponent
        value={`The parameter value retrieval query is invalid: \n${props.query}\n\nError message:\n${extraRecords[0].error}`}
      />
    );
  }

  // "false" will not be mapped to "(no data)"
  let options = extraRecords
    ?.map((r) => r?._fields?.[displayValueRowIndex])
    .map((f) => (f === undefined || f === null ? '(no data)' : f));
  options = props.autoSort ? options.sort() : options;

  return (
    <div className={'n-flex n-flex-row n-flex-wrap n-items-center'}>
      <Autocomplete
        id='autocomplete'
        multiple={multiSelector}
        options={options}
        disabled={disabled}
        limitTags={multiSelectLimit}
        style={{
          maxWidth: 'calc(100% - 40px)',
          minWidth: `calc(100% - ${manualParameterSave ? '60' : '30'}px)`,
          marginLeft: '15px',
          marginTop: '5px',
        }}
        inputValue={inputDisplayText.toString() || ''}
        onInputChange={(event, value) => {
          setInputDisplayText(value);
          // Always ensure input parameter is provided, even if empty
          debouncedQueryCallback(props.query, { input: value || '', ...allParameters }, setExtraRecords);
        }}
        isOptionEqualToValue={(option, value) => {
          return (option && option.toString()) === (value && value.toString());
        }}
        onOpen={() => {
          if (extraRecords && extraRecords.length == 0) {
            // Always ensure input parameter is provided, even if empty
            debouncedQueryCallback(props.query, { input: inputDisplayText || '', ...allParameters }, setExtraRecords);
          }
        }}
        value={inputValue}
        onChange={propagateSelection}
        getOptionLabel={(option) => {
          if (option === undefined || option === null) {
            return '';
          }
          return option.toString();
        }}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder={label ? `${label} ${propertyType}` : 'Start typing...'}
            label={label ? `${label} ${propertyType}` : 'Parameter'}
            helperText={helperText}
          />
        )}
      />
      {manualParameterSave ? (
        <SelectionConfirmationButton
          onClick={manualHandleParametersUpdate}
          disabled={disabled || paramValueLocal === props.parameterValue}
        />
      ) : (
        <></>
      )}
    </div>
  );
};

export default NodePropertyParameterSelectComponent;
