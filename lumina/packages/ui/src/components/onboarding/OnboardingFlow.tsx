'use client';

/**
 * OnboardingFlow Component
 * Guides new users through setup (2-3 minutes)
 * "38% drop-off during onboarding - make it quick and valuable"
 */

import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { WelcomeStep } from './WelcomeStep';
import { PrivacyStep } from './PrivacyStep';
import { CameraStep } from './CameraStep';
import { CalibrationStep } from './CalibrationStep';
import { GoalsStep } from './GoalsStep';
import { CompleteStep } from './CompleteStep';
import { Stepper, type Step } from './Stepper';

/** EAR calibration data from calibration step */
export interface EARCalibrationData {
  threshold: number;
  openEAR: number;
  closedEAR: number;
  calibratedAt: number;
  samplesCount: number;
}

export interface OnboardingFlowProps {
  /** Callback when onboarding is completed */
  onComplete: () => void;
  /** Callback when user requests to skip */
  onSkip?: () => void;
  /** Whether camera permission is already granted */
  hasCameraPermission?: boolean;
  /** Callback to request camera permission (deprecated - CameraStep handles this now) */
  onRequestCameraPermission?: () => Promise<boolean>;
  /** Callback when camera is selected */
  onCameraSelected?: (cameraId: string) => void;
  /** Callback when calibration data is captured */
  onCalibrationComplete?: (data: {
    baselineEar: number;
    earCalibration: EARCalibrationData | null;
  }) => void;
  /** Callback when goals are selected */
  onGoalsSelected?: (goals: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
    preventDryEyes: boolean;
    reduceHeadaches: boolean;
    stayFocused: boolean;
  }) => void;
  /** Optional logo image source for welcome screen */
  logoSrc?: string;
}

type OnboardingStep = 'welcome' | 'privacy' | 'camera' | 'calibration' | 'goals' | 'complete';

const STEP_ORDER: OnboardingStep[] = [
  'welcome',
  'privacy',
  'camera',
  'calibration',
  'goals',
  'complete',
];

const STEP_CONFIG: Step[] = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'privacy', label: 'Privacy' },
  { id: 'camera', label: 'Camera' },
  { id: 'calibration', label: 'Calibrate' },
  { id: 'goals', label: 'Goals' },
  { id: 'complete', label: 'Ready!' },
];

export function OnboardingFlow({
  onComplete,
  onSkip,
  hasCameraPermission = false,
  onCameraSelected,
  onCalibrationComplete,
  onGoalsSelected,
  logoSrc,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [cameraGranted, setCameraGranted] = useState(hasCameraPermission);
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const [goals, setGoals] = useState({
    reduceEyeStrain: false,
    improvePosture: false,
    takeRegularBreaks: false,
    preventDryEyes: false,
    reduceHeadaches: false,
    stayFocused: false,
  });

  const currentStepIndex = STEP_ORDER.indexOf(currentStep);
  const progress = ((currentStepIndex + 1) / STEP_ORDER.length) * 100;

  const goToNextStep = useCallback(() => {
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEP_ORDER.length) {
      setCurrentStep(STEP_ORDER[nextIndex]);
    }
  }, [currentStepIndex]);

  const goToPrevStep = useCallback(() => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(STEP_ORDER[prevIndex]);
    }
  }, [currentStepIndex]);

  const handleCameraSelected = (cameraId: string) => {
    setCameraGranted(true);
    setSelectedCameraId(cameraId);
    onCameraSelected?.(cameraId);
    goToNextStep();
  };

  const handleCalibrationComplete = (data: {
    baselineEar: number;
    earCalibration: EARCalibrationData | null;
  }) => {
    onCalibrationComplete?.(data);
    goToNextStep();
  };

  const handleGoalsSelected = (selectedGoals: typeof goals) => {
    setGoals(selectedGoals);
    onGoalsSelected?.(selectedGoals);
    goToNextStep();
  };

  const handleComplete = () => {
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 'welcome':
        return <WelcomeStep onNext={goToNextStep} onSkip={onSkip} logoSrc={logoSrc} />;
      case 'privacy':
        return <PrivacyStep onNext={goToNextStep} onBack={goToPrevStep} />;
      case 'camera':
        return (
          <CameraStep
            onNext={handleCameraSelected}
            onBack={goToPrevStep}
            hasPermission={cameraGranted}
          />
        );
      case 'calibration':
        return (
          <CalibrationStep
            onNext={handleCalibrationComplete}
            onBack={goToPrevStep}
            onSkip={goToNextStep}
            selectedCameraId={selectedCameraId}
          />
        );
      case 'goals':
        return (
          <GoalsStep
            onNext={handleGoalsSelected}
            onBack={goToPrevStep}
            initialGoals={goals}
          />
        );
      case 'complete':
        return <CompleteStep onComplete={handleComplete} />;
      default:
        return null;
    }
  };

  // Don't show stepper on welcome or complete screens
  const showStepper = currentStep !== 'welcome' && currentStep !== 'complete';

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Header with stepper */}
      <div className="shrink-0">
        {/* Progress bar (thin line at very top) */}
        <div className="h-1 bg-gray-100">
          <motion.div
            className="h-full bg-gray-800"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>

        {/* Stepper navigation */}
        {showStepper && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="py-6 border-b border-gray-100"
          >
            <Stepper
              steps={STEP_CONFIG}
              currentStep={currentStepIndex}
              showLabels
              compact={false}
            />
          </motion.div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderStep()}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

export default OnboardingFlow;
