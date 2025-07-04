import {
  CLEAR_SELECTION,
  HARD_RESET_CARD_SETTINGS,
  TOGGLE_REPORT_SETTINGS,
  UPDATE_ALL_SELECTIONS,
  UPDATE_CYPHER_PARAMETERS, // This will likely be adapted or deprecated in favor of UPDATE_QUERY_CONFIG
  UPDATE_FIELDS,
  UPDATE_SCHEMA,
  UPDATE_REPORT_QUERY, // Will be adapted to modify queryConfig
  UPDATE_REPORT_SETTING,
  UPDATE_QUERY_CONFIG, // New action to handle generic query config updates
  UPDATE_REPORT_SIZE,
  UPDATE_REPORT_TITLE,
  UPDATE_REPORT_TYPE,
  UPDATE_SELECTION,
  UPDATE_REPORT_DATABASE,
} from './CardActions';
import { TOGGLE_CARD_SETTINGS } from './CardActions';
import { createUUID } from '../utils/uuid';
import { DataSourceType, Neo4jQueryConfig, QueryConfig } from '../../core/datasources/types';

const update = (state: any, mutations: any) => Object.assign({}, state, mutations);

/**
 * State reducers for a single card instance as part of a report.
 */

export const CARD_INITIAL_STATE: {
  id: string;
  title: string;
  // query: string; // Deprecated: Replaced by queryConfig
  // parameters?: Record<string, any>; // Deprecated: Moved into queryConfig
  dataSourceType: DataSourceType;
  queryConfig: QueryConfig;
  settingsOpen: boolean;
  advancedSettingsOpen: boolean;
  width: number;
  height: number;
  x: number;
  y: number;
  type: string; // Report type (e.g., 'table', 'bar')
  fields: any[]; // TODO: Define a proper type for fields
  selection: Record<string, any>; // TODO: Define a proper type for selection
  settings: Record<string, any>; // Report-specific settings
  collapseTimeout: string | number;
  database?: string; // Optional: database name for the query
  schema?: any; // Optional: schema information
} = {
  id: createUUID(),
  title: '',
  dataSourceType: DataSourceType.NEO4J_CYPHER,
  queryConfig: {
    dataSourceType: DataSourceType.NEO4J_CYPHER,
    cypherQuery: '\n\n\n',
    parameters: {},
  } as Neo4jQueryConfig,
  settingsOpen: false,
  advancedSettingsOpen: false,
  width: 3,
  height: 3,
  x: 0,
  y: 0,
  type: 'table',
  fields: [],
  selection: {},
  settings: {},
  collapseTimeout: 'auto',
};

export const cardReducer = (state = CARD_INITIAL_STATE, action: { type: any; payload: any }) => {
  const { type, payload } = action;

  if (!action.type.startsWith('PAGE/CARD/')) {
    return state;
  }

  switch (type) {
    case UPDATE_REPORT_TITLE: {
      const { title } = payload;
      return update(state, { title: title });
    }
    case UPDATE_REPORT_SIZE: {
      const { width, height } = payload;
      return update(state, { width: width, height: height });
    }
    case UPDATE_REPORT_QUERY: { // Adapting for Neo4jQueryConfig
      const { query } = payload;
      if (state.queryConfig.dataSourceType === DataSourceType.NEO4J_CYPHER) {
        const newQueryConfig = {
          ...state.queryConfig,
          cypherQuery: query,
        } as Neo4jQueryConfig;
        return update(state, { queryConfig: newQueryConfig });
      }
      return state; // Or handle error/log if type mismatch
    }
    case UPDATE_CYPHER_PARAMETERS: { // Adapting for Neo4jQueryConfig
      const { parameters } = payload;
      if (state.queryConfig.dataSourceType === DataSourceType.NEO4J_CYPHER) {
        const newQueryConfig = {
          ...state.queryConfig,
          parameters: parameters,
        } as Neo4jQueryConfig;
        return update(state, { queryConfig: newQueryConfig });
      }
      return state; // Or handle error/log if type mismatch
    }
    case UPDATE_QUERY_CONFIG: { // Generic way to update the whole queryConfig
      const { queryConfig } = payload;
      // Potentially add validation here to ensure queryConfig matches state.dataSourceType
      return update(state, { queryConfig: queryConfig, dataSourceType: queryConfig.dataSourceType });
    }
    case UPDATE_FIELDS: {
      const { fields } = payload;
      state = update(state, { fields: fields });
      return state;
    }
    case UPDATE_SCHEMA: {
      const { schema } = payload;
      state = update(state, { schema: schema });
      return state;
    }
    case UPDATE_REPORT_TYPE: {
      const { type } = payload;
      state = update(state, { type: type });
      return state;
    }
    case CLEAR_SELECTION: {
      state = update(state, { selection: {} });
      return state;
    }
    case UPDATE_SELECTION: {
      const { selectable, field } = payload;
      const selection = state.selection ? state.selection : {};

      const entry = {};
      entry[selectable] = field;
      state = update(state, { selection: update(selection, entry) });
      return state;
    }

    case UPDATE_ALL_SELECTIONS: {
      const { selections } = payload;
      state = update(state, { selection: selections });
      return state;
    }

    case UPDATE_REPORT_SETTING: {
      const { setting, value } = payload;
      const settings = state.settings ? state.settings : {};
      // Javascript is amazing, so "" == 0. Instead we check if the string length is zero...
      if (value == undefined || value.toString().length == 0) {
        delete settings[setting];
        update(state, { settings: settings });
        return state;
      }

      const entry = {};
      entry[setting] = value;
      state = update(state, { settings: update(settings, entry) });
      return state;
    }
    case TOGGLE_CARD_SETTINGS: {
      const { open } = payload;
      state = update(state, { settingsOpen: open, collapseTimeout: 'auto' });
      return state;
    }
    case HARD_RESET_CARD_SETTINGS: {
      state = update(state, { settingsOpen: false, collapseTimeout: 0 });
      return state;
    }
    case TOGGLE_REPORT_SETTINGS: {
      state = update(state, { advancedSettingsOpen: !state.advancedSettingsOpen });
      return state;
    }
    case UPDATE_REPORT_DATABASE: {
      const { database } = payload;
      state = update(state, { database: database });
      return state;
    }
    default: {
      return state;
    }
  }
};

export default cardReducer;
