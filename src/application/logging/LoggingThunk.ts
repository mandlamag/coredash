import { createNotificationThunk } from '../../page/PageThunks';
import { runCypherQuery } from '../../report/ReportQueryRunner';
import { setLogErrorNotification } from './LoggingActions';
import { applicationGetLoggingSettings } from './LoggingSelectors';
import { createUUID } from '../../utils/uuid';

// Thunk to handle log events.

// Define the interface for log parameters
interface LogParams {
  driver: any;
  database: string;
  mode: string;
  user: string;
  category?: string;
  action: string;
  dashboardId?: string;
}

export const createLogThunk =
  (params: LogParams) =>
  (dispatch: any, getState: any) => {
    try {
      const uuid = createUUID();
      // Generate a cypher query to save the log.
      const query =
        'CREATE (n:_Neodash_Log) SET n.uuid = $uuid, n.user = $user, n.date = datetime(), n.neodash_mode = $neodashMode, n.action = $action, n.database = $database, n.dashboard = $dashboardId RETURN $uuid as uuid';

      const parameters = {
        uuid: uuid,
        user: params.user,
        action: params.action,
        database: params.database,
        neodashMode: params.mode,
        dashboardId: params.dashboardId || '',
      };
      runCypherQuery(
        params.driver,
        params.database,
        query,
        parameters,
        1,
        () => {},
        (records) => {
          if (records && records[0] && records[0]._fields && records[0]._fields[0] && records[0]._fields[0] == uuid) {
            console.log(`log created: ${uuid}`);
          } else {
            // we only show error notification one time
            const state = getState();
            const loggingSettings = applicationGetLoggingSettings(state);
            let LogErrorNotificationNum = Number(loggingSettings.logErrorNotification);
            console.log(`Error creating log for ${(LogErrorNotificationNum - 4) * -1} times`);
            if (LogErrorNotificationNum > 0) {
              dispatch(
                createNotificationThunk(
                  'Error creating log',
                  LogErrorNotificationNum > 1
                    ? `Please check logging configuration with your Neodash administrator`
                    : `Please check logging configuration with your Neodash administrator - This message will not be displayed anymore in the current session`
                )
              );
            }
            LogErrorNotificationNum -= 1;
            dispatch(setLogErrorNotification(LogErrorNotificationNum.toString()));
          }
        }
      );
    } catch (e) {
      // we only show error notification 3 times
      const state = getState();
      const loggingSettings = applicationGetLoggingSettings(state);
      let LogErrorNotificationNum = Number(loggingSettings.logErrorNotification);
      console.log(`Error creating log for ${(LogErrorNotificationNum - 4) * -1} times`);
      if (LogErrorNotificationNum > 0) {
        dispatch(
          createNotificationThunk(
            'Error creating log',
            LogErrorNotificationNum > 1
              ? `Please check logging configuration with your Neodash administrator`
              : `Please check logging configuration with your Neodash administrator - This message will not be displayed anymore in the current session`
          )
        );
      }
      LogErrorNotificationNum -= 1;
      dispatch(setLogErrorNotification(LogErrorNotificationNum.toString()));
    }
  };
