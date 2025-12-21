// Components
export { StatusIndicator, type StatusIndicatorProps } from './StatusIndicator';
export { AlertToast, AlertToastContainer, type AlertToastProps, type AlertToastContainerProps, type AlertSeverity } from './AlertToast';
export { WellnessScore, type WellnessScoreProps } from './WellnessScore';
export { BlinkRateChart, type BlinkRateChartProps, type BlinkRateDataPoint } from './BlinkRateChart';

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
  type OnboardingFlowProps,
  type WelcomeStepProps,
  type PrivacyStepProps,
  type CameraStepProps,
  type CalibrationStepProps,
  type GoalsStepProps,
  type CompleteStepProps,
} from './onboarding';
