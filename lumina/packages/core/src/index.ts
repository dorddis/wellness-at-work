/**
 * @lumina/core
 * Core detection and business logic for Lumina wellness platform
 */

// Detection
export * from './detection/constants';
export * from './detection/blink';
export * from './detection/faceLandmarker';

// Alerts
export * from './alerts/rules';
export * from './alerts/engine';

// Baseline
export * from './baseline/calibration';

// Session
export * from './session/manager';
