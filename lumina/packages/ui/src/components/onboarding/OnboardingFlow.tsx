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

export interface OnboardingFlowProps {
  /** Callback when onboarding is completed */
  onComplete: () => void;
  /** Callback when user requests to skip */
  onSkip?: () => void;
  /** Whether camera permission is already granted */
  hasCameraPermission?: boolean;
  /** Callback to request camera permission */
  onRequestCameraPermission?: () => Promise<boolean>;
  /** Callback when calibration data is captured */
  onCalibrationComplete?: (data: { baselineEar: number }) => void;
  /** Callback when goals are selected */
  onGoalsSelected?: (goals: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
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

export function OnboardingFlow({
  onComplete,
  onSkip,
  hasCameraPermission = false,
  onRequestCameraPermission,
  onCalibrationComplete,
  onGoalsSelected,
  logoSrc,
}: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<OnboardingStep>('welcome');
  const [cameraGranted, setCameraGranted] = useState(hasCameraPermission);
  const [goals, setGoals] = useState({
    reduceEyeStrain: true,
    improvePosture: true,
    takeRegularBreaks: true,
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

  const handleCameraPermission = async () => {
    if (onRequestCameraPermission) {
      const granted = await onRequestCameraPermission();
      setCameraGranted(granted);
      if (granted) {
        goToNextStep();
      }
    } else {
      // Simulate permission granted
      setCameraGranted(true);
      goToNextStep();
    }
  };

  const handleCalibrationComplete = (data: { baselineEar: number }) => {
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
            onNext={handleCameraPermission}
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

  return (
    <div className="fixed inset-0 bg-white z-50 flex flex-col">
      {/* Progress bar */}
      <div className="h-1 bg-gray-100">
        <motion.div
          className="h-full bg-black"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Step counter */}
      <div className="px-6 py-4 text-sm text-gray-500">
        Step {currentStepIndex + 1} of {STEP_ORDER.length}
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
