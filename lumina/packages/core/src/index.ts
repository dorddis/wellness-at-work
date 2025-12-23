/**
 * @lumina/core
 * Core detection and business logic for Lumina wellness platform
 */

// Detection
export * from './detection/constants';
export * from './detection/blink';
export * from './detection/faceLandmarker';
export * from './detection/kalman';
export * from './detection/spike-detector';
export * from './detection/eye-quality';
export * from './detection/ear-calibrator';
export * from './detection/posture';
export * from './detection/yawn';
export * from './detection/drowsiness';

// Robust blink detection (slope-based)
export * from './detection/slope-detector';
export * from './detection/head-motion';
export * from './detection/bilateral';
export * from './detection/blink-state-machine';
export * from './detection/gaze-tracker';
export * from './detection/robust-blink-detector';

// Meeting mode
export * from './detection/meetingModeCrop';
export * from './meeting-mode';

// Alerts
export * from './alerts/rules';
export * from './alerts/engine';

// Baseline
export * from './baseline/calibration';

// Session
export * from './session/manager';
