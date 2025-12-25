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

// NOTE: useMeetingModeStateMachine is NOT exported here!
// It depends on @mediapipe/tasks-vision which breaks web builds.
// Desktop app imports directly: import { useMeetingModeStateMachine } from '@lumina/ui/hooks/useMeetingModeStateMachine';

// Constants
export * from './constants/privacy';
