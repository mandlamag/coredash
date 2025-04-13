import { getGraphQLApiService } from '../../services/GraphQLApiService';
import React from 'react';
import isEqual from 'lodash.isequal';
/**
 * Updates the GraphQL API connection when noticing an update in the global connection state.
 */
const NeoDashboardConnectionUpdateHandler = ({ pagenumber, connection, onConnectionUpdate }) => {
  const [existingConnection, setExistingConnection] = React.useState(null);
  if (!isEqual(connection, existingConnection)) {
    // Only trigger connection settings refreshes if the connection was once set before.
    if (existingConnection != null) {
      // Get the GraphQLApiService singleton instance
      const apiService = getGraphQLApiService();
      // The connection state is already updated by the createConnectionThunk
      onConnectionUpdate(pagenumber);
    }
    setExistingConnection(connection);
  }
  return <div></div>;
};

export default NeoDashboardConnectionUpdateHandler;
