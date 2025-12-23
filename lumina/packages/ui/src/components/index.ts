// Components
export { StatusIndicator, type StatusIndicatorProps } from './StatusIndicator';
export { AlertToast, AlertToastContainer, type AlertToastProps, type AlertToastContainerProps, type AlertSeverity } from './AlertToast';
export { WellnessScore, type WellnessScoreProps } from './WellnessScore';
export { BlinkRateChart, type BlinkRateChartProps, type BlinkRateDataPoint } from './BlinkRateChart';
export { EarWaveform, type EarWaveformProps, type EarDataPoint } from './EarWaveform';

// Loading Components
export { Spinner, type SpinnerProps } from './Spinner';
export {
  Skeleton,
  SkeletonText,
  SkeletonCard,
  SkeletonChart,
  SkeletonTable,
  SkeletonAvatar,
  SkeletonStats,
  type SkeletonProps,
  type SkeletonTextProps,
  type SkeletonCardProps,
  type SkeletonChartProps,
  type SkeletonTableProps,
  type SkeletonAvatarProps,
  type SkeletonStatsProps,
} from './Skeleton';
export { LoadingButton, type LoadingButtonProps } from './LoadingButton';
export { LoadingOverlay, FullScreenLoader, type LoadingOverlayProps, type FullScreenLoaderProps } from './LoadingOverlay';

// Privacy & Status
export { PrivacyIndicator, type PrivacyIndicatorProps } from './PrivacyIndicator';

// Posture
export { PostureIndicator, type PostureIndicatorProps, type PostureStatus } from './PostureIndicator';
export { PostureStatusCard, type PostureStatusCardProps } from './PostureStatusCard';

// Analytics & Trends
export { WeeklyTrendCard, type WeeklyTrendCardProps, type DayData } from './WeeklyTrendCard';

// Gamification
export { StreakBadge, type StreakBadgeProps } from './StreakBadge';
export { AchievementBadge, ACHIEVEMENTS, type AchievementBadgeProps, type Achievement, type AchievementId } from './AchievementBadge';

// Notifications
export { PreBreakToast, type PreBreakToastProps } from './PreBreakToast';

// Onboarding
export {
  OnboardingFlow,
  WelcomeStep,
  PrivacyStep,
  CameraStep,
  CalibrationStep,
  GoalsStep,
  CompleteStep,
  Stepper,
  type OnboardingFlowProps,
  type WelcomeStepProps,
  type PrivacyStepProps,
  type CameraStepProps,
  type CalibrationStepProps,
  type GoalsStepProps,
  type CompleteStepProps,
  type StepperProps,
  type Step,
} from './onboarding';
