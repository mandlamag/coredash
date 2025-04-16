#!/bin/sh

# This script generates the env.js file with environment variables
# It's designed to be run at container startup

# Path to the env.js file
ENV_FILE=/usr/share/nginx/html/env.js

# Start with an empty window.__ENV__ object
echo "// This file is dynamically generated at container startup" > $ENV_FILE
echo "// It injects environment variables into the browser" >> $ENV_FILE
echo "window.__ENV__ = {" >> $ENV_FILE

# Add all environment variables with the prefix REACT_APP_
# This makes them available to the application
for envvar in $(env | grep -E '^(REACT_APP_|API_URL|GRAPHQL_API_URL|DEFAULT_NEO4J_|ALLOW_QUERIES_WITHOUT_LOGIN)' | sort); do
  # Extract the key and value
  key=$(echo $envvar | cut -d= -f1)
  value=$(echo $envvar | cut -d= -f2-)
  
  # Add the key-value pair to the env.js file
  echo "  \"$key\": \"$value\"," >> $ENV_FILE
done

# Add any specific environment variables needed for LedgerCore
if [ ! -z "$DASHBOARD_HEADER_COLOR" ]; then
  echo "  \"DASHBOARD_HEADER_COLOR\": \"$DASHBOARD_HEADER_COLOR\"," >> $ENV_FILE
fi

if [ ! -z "$DASHBOARD_HEADER_BUTTON_COLOR" ]; then
  echo "  \"DASHBOARD_HEADER_BUTTON_COLOR\": \"$DASHBOARD_HEADER_BUTTON_COLOR\"," >> $ENV_FILE
fi

if [ ! -z "$DASHBOARD_HEADER_TITLE_COLOR" ]; then
  echo "  \"DASHBOARD_HEADER_TITLE_COLOR\": \"$DASHBOARD_HEADER_TITLE_COLOR\"," >> $ENV_FILE
fi

if [ ! -z "$ALLOW_QUERIES_WITHOUT_LOGIN" ]; then
  echo "  \"ALLOW_QUERIES_WITHOUT_LOGIN\": \"$ALLOW_QUERIES_WITHOUT_LOGIN\"," >> $ENV_FILE
fi

if [ ! -z "$DEFAULT_DASHBOARD_TITLE" ]; then
  echo "  \"DEFAULT_DASHBOARD_TITLE\": \"$DEFAULT_DASHBOARD_TITLE\"," >> $ENV_FILE
fi

# Close the object
echo "};" >> $ENV_FILE

echo "Generated environment configuration at $ENV_FILE"
