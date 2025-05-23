# build stage
FROM node:18-alpine AS build-stage

WORKDIR /usr/local/src/neodash

# Copy package files first for better caching
COPY ./package.json /usr/local/src/neodash/package.json
COPY ./yarn.lock /usr/local/src/neodash/yarn.lock

# Install dependencies with --ignore-engines flag
RUN yarn install --ignore-engines --network-timeout 600000

# Copy the rest of the application
COPY ./ /usr/local/src/neodash

# Add NODE_OPTIONS to increase memory limit and bypass version checks
ENV NODE_OPTIONS="--max-old-space-size=4096 --no-node-snapshot"

# Build the application
RUN yarn run build-minimal

# production stage
FROM nginx:alpine3.18 AS neodash
RUN apk upgrade

ENV NGINX_PORT=5005

COPY --from=build-stage /usr/local/src/neodash/dist /usr/share/nginx/html
# Explicitly copy the config directory with default dashboards
COPY ./public/config /usr/share/nginx/html/config
COPY ./conf/default.conf.template /etc/nginx/templates/
COPY ./scripts/config-entrypoint.sh /docker-entrypoint.d/config-entrypoint.sh
COPY ./scripts/message-entrypoint.sh /docker-entrypoint.d/message-entrypoint.sh
COPY ./scripts/generate-env-config.sh /docker-entrypoint.d/generate-env-config.sh

RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d && \
    chown -R nginx:nginx /etc/nginx/templates && \
    chown -R nginx:nginx /docker-entrypoint.d/config-entrypoint.sh && \
    chown -R nginx:nginx /docker-entrypoint.d/generate-env-config.sh && \
    chmod +x /docker-entrypoint.d/config-entrypoint.sh  && \
    chmod +x /docker-entrypoint.d/message-entrypoint.sh && \
    chmod +x /docker-entrypoint.d/generate-env-config.sh
RUN touch /var/run/nginx.pid && \
    chown -R nginx:nginx /var/run/nginx.pid
RUN chown -R nginx:nginx /usr/share/nginx/html/

## Launch webserver as non-root user.
USER nginx

EXPOSE $NGINX_PORT

HEALTHCHECK cmd curl --fail "http://localhost:$NGINX_PORT" || exit 1
LABEL version="2.4.10"
