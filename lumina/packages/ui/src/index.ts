/**
 * @lumina/ui
 * Shared React components, hooks, and stores for Lumina platform
 */

// Utilities
export * from './lib/utils';

// Components
export * from './components';

// Stores
export * from './stores';

// Hooks (web-safe only)
export * from './hooks';

// Desktop-only hooks - ONLY import these in Electron apps!
// These depend on @mediapipe/tasks-vision which is not available in web builds.
// The web build will fail if any code path tries to use these.
export * from './hooks/useMeetingModeStateMachine';

// Constants
export * from './constants/privacy';
