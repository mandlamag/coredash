import StyleConfig from './StyleConfig';
import {
  DEFAULT_NEO4J_URL,
  DEFAULT_DASHBOARD_TITLE,
  DASHBOARD_HEADER_COLOR as ENV_HEADER_COLOR,
  DASHBOARD_HEADER_BUTTON_COLOR as ENV_BUTTON_COLOR,
  DASHBOARD_HEADER_TITLE_COLOR as ENV_TITLE_COLOR,
  ALLOW_QUERIES_WITHOUT_LOGIN as ENV_ALLOW_QUERIES_WITHOUT_LOGIN,
} from './EnvConfig';

export const enum Screens {
  WELCOME_SCREEN,
  CONNECTION_MODAL,
}

const styleConfig = await StyleConfig.getInstance();

export const DEFAULT_SCREEN = Screens.WELCOME_SCREEN;

// Use environment variables with fallbacks to style config and then hardcoded defaults
export { DEFAULT_NEO4J_URL };
export { DEFAULT_DASHBOARD_TITLE };

export const DASHBOARD_HEADER_COLOR = styleConfig?.getStyle()?.DASHBOARD_HEADER_COLOR || ENV_HEADER_COLOR;

export const DASHBOARD_HEADER_BUTTON_COLOR = styleConfig?.getStyle()?.DASHBOARD_HEADER_BUTTON_COLOR || ENV_BUTTON_COLOR || null;

export const DASHBOARD_HEADER_TITLE_COLOR = styleConfig?.getStyle()?.DASHBOARD_HEADER_TITLE_COLOR || ENV_TITLE_COLOR;

export const DASHBOARD_HEADER_BRAND_LOGO =
  styleConfig?.getStyle()?.DASHBOARD_HEADER_BRAND_LOGO || 'neo4j-icon-color-full.png';

export const IS_CUSTOM_LOGO = Boolean(styleConfig?.getStyle()?.DASHBOARD_HEADER_BRAND_LOGO);

export const CUSTOM_CONNECTION_FOOTER_TEXT = ''; 

// If true, users can run queries without logging in
export const ALLOW_QUERIES_WITHOUT_LOGIN = ENV_ALLOW_QUERIES_WITHOUT_LOGIN;
