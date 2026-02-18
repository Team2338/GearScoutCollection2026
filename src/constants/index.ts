/**
 * Application-wide constants
 */

/**
 * Timing constants (in milliseconds)
 */
export const TIMING = {
  /** Interval for checking pending matches count (5 seconds) */
  PENDING_MATCHES_UPDATE_INTERVAL: 5000,
  /** Delay before redirecting after auth error (2 seconds) */
  AUTH_ERROR_REDIRECT_DELAY: 2000,
  /** Delay before loading schedule UI (600ms) */
  SCHEDULE_LOAD_DELAY: 600,
  /** Debounce delay for schedule fetch (500ms) */
  SCHEDULE_FETCH_DEBOUNCE: 500,
  /** Default notification display duration (3 seconds) */
  NOTIFICATION_DURATION_DEFAULT: 3000,
  /** Error notification display duration (5 seconds) */
  NOTIFICATION_DURATION_ERROR: 5000,
  /** Notification fade out animation duration (300ms) */
  NOTIFICATION_FADE_OUT: 300,
  /** API request timeout (10 seconds) */
  API_TIMEOUT: 10000,
} as const;

/**
 * Storage keys for localStorage and sessionStorage
 */
export const STORAGE_KEYS = {
  MULTI_MATCH_DATA: 'multiMatchData',
  CURRENT_USER: 'currentUser',
  TEAM_NUMBER: 'teamNumber',
  SCOUTER_NAME: 'scouterName',
  EVENT_CODE: 'eventCode',
  SECRET_CODE: 'secretCode',
  TBA_CODE: 'tbaCode',
  SCHEDULE: 'schedule',
} as const;

/**
 * Form field storage keys
 */
export const FORM_DATA_KEYS = [
  'matchNumber',
  'scoutedTeamNumber',
  'allianceColor',
  'leaveValue',
  'leftCounter',
  'rightCounter',
  'leftBumpCounter',
  'rightBumpCounter',
  'accuracyValue',
  'estimateSizeAuto',
  'leaveValueTeleop',
  'accuracyValueTeleop',
  'cycles',
  'estimateSize',
] as const;

/**
 * API configuration constants
 */
export const API = {
  DEFAULT_BASE_URL: 'https://gearitforward.com/api',
  CURRENT_GAME_YEAR: 2026,
} as const;

/**
 * Validation constraints for form inputs
 */
export const VALIDATION = {
  MAX_TEAM_NUMBER: 99999,
  MIN_TEAM_NUMBER: 0,
  MAX_MATCH_NUMBER: 999,
  MIN_MATCH_NUMBER: 0,
  MAX_SCOUTER_NAME_LENGTH: 32,
  MAX_EVENT_CODE_LENGTH: 32,
  MAX_SECRET_CODE_LENGTH: 32,
  MAX_TBA_CODE_LENGTH: 6,
} as const;
