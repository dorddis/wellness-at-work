'use client';

/**
 * GoalsStep Component
 * Let users select their wellness goals
 */

import React, { useState } from 'react';
import { motion } from 'motion/react';

export interface GoalsStepProps {
  onNext: (goals: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
    preventDryEyes: boolean;
    reduceHeadaches: boolean;
    stayFocused: boolean;
  }) => void;
  onBack: () => void;
  initialGoals?: {
    reduceEyeStrain: boolean;
    improvePosture: boolean;
    takeRegularBreaks: boolean;
    preventDryEyes: boolean;
    reduceHeadaches: boolean;
    stayFocused: boolean;
  };
}

interface Goal {
  id: 'reduceEyeStrain' | 'improvePosture' | 'takeRegularBreaks' | 'preventDryEyes' | 'reduceHeadaches' | 'stayFocused';
  title: string;
  description: string;
  icon: 'eye' | 'posture' | 'clock' | 'droplet' | 'brain' | 'focus';
}

const GOALS: Goal[] = [
  {
    id: 'reduceEyeStrain',
    title: 'Reduce Eye Strain',
    description: 'Get reminders when your blink rate drops too low',
    icon: 'eye',
  },
  {
    id: 'preventDryEyes',
    title: 'Prevent Dry Eyes',
    description: 'Smart blink tracking keeps your eyes naturally lubricated',
    icon: 'droplet',
  },
  {
    id: 'reduceHeadaches',
    title: 'Prevent Migraines',
    description: 'Break reminders and posture alerts reduce screen-related headaches',
    icon: 'brain',
  },
  {
    id: 'improvePosture',
    title: 'Improve Posture',
    description: 'Get alerts when you slouch or lean too close',
    icon: 'posture',
  },
  {
    id: 'takeRegularBreaks',
    title: 'Take Regular Breaks',
    description: 'Follow the 20-20-20 rule for healthier screen time',
    icon: 'clock',
  },
  {
    id: 'stayFocused',
    title: 'Stay Focused',
    description: 'Flow detection protects your deep work from interruptions',
    icon: 'focus',
  },
];

export function GoalsStep({ onNext, onBack, initialGoals }: GoalsStepProps) {
  // Start with nothing selected - let user choose
  const [selectedGoals, setSelectedGoals] = useState({
    reduceEyeStrain: initialGoals?.reduceEyeStrain ?? false,
    improvePosture: initialGoals?.improvePosture ?? false,
    takeRegularBreaks: initialGoals?.takeRegularBreaks ?? false,
    preventDryEyes: initialGoals?.preventDryEyes ?? false,
    reduceHeadaches: initialGoals?.reduceHeadaches ?? false,
    stayFocused: initialGoals?.stayFocused ?? false,
  });

  const toggleGoal = (goalId: Goal['id']) => {
    setSelectedGoals((prev) => ({
      ...prev,
      [goalId]: !prev[goalId],
    }));
  };

  const handleContinue = () => {
    onNext(selectedGoals);
  };

  const hasAnyGoal = Object.values(selectedGoals).some(Boolean);

  return (
    <div className="h-full flex flex-col px-8 py-6">
      {/* Header - fixed */}
      <div className="flex-shrink-0 flex flex-col items-center text-center mb-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', duration: 0.8, bounce: 0.3 }}
          className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4"
        >
          <svg className="w-8 h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
            />
          </svg>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }}
          className="text-xl font-bold text-gray-900 mb-1"
        >
          Set Your Goals
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="text-gray-600 text-sm"
        >
          What would you like to focus on?
        </motion.p>
      </div>

      {/* Scrollable goals list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="space-y-3 max-w-md w-full mx-auto pb-4">
          {GOALS.map((goal, index) => (
            <motion.button
              key={goal.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 + index * 0.15, duration: 0.4 }}
              onClick={() => toggleGoal(goal.id)}
              className={`w-full flex items-start gap-4 text-left p-4 rounded-xl border-2 transition-all ${
                selectedGoals[goal.id]
                  ? 'border-gray-800 bg-gray-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                  selectedGoals[goal.id] ? 'bg-gray-800' : 'bg-gray-100'
                }`}
              >
                <GoalIcon type={goal.icon} selected={selectedGoals[goal.id]} />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900">{goal.title}</h3>
                <p className="text-sm text-gray-600">{goal.description}</p>
              </div>
              <div
                className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                  selectedGoals[goal.id] ? 'border-gray-800 bg-gray-800' : 'border-gray-300'
                }`}
              >
                {selectedGoals[goal.id] && (
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Footer - fixed */}
      <div className="flex-shrink-0 pt-4">
        {!hasAnyGoal && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mb-3 text-sm text-gray-500 text-center"
          >
            Select at least one goal to continue
          </motion.p>
        )}

        {/* Navigation */}
        <div className="flex gap-3">
        <button
          onClick={onBack}
          className="flex-1 py-3 px-6 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          Back
        </button>
        <button
          onClick={handleContinue}
          disabled={!hasAnyGoal}
          className={`flex-1 py-3 px-6 rounded-lg font-medium transition-colors ${
            hasAnyGoal
              ? 'bg-gray-800 text-white hover:bg-gray-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          Continue
        </button>
        </div>
      </div>
    </div>
  );
}

function GoalIcon({ type, selected }: { type: string; selected: boolean }) {
  const className = `w-5 h-5 ${selected ? 'text-white' : 'text-gray-600'}`;

  switch (type) {
    case 'eye':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
          />
        </svg>
      );
    case 'droplet':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 21c-4.418 0-8-3.134-8-7 0-4.418 8-12 8-12s8 7.582 8 12c0 3.866-3.582 7-8 7z"
          />
        </svg>
      );
    case 'brain':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      );
    case 'posture':
      return (
        <svg className={className} viewBox="0 0 24 24" fill="currentColor">
          <ellipse cx="12" cy="4" rx="3" ry="2" />
          <ellipse cx="12" cy="9" rx="3.5" ry="2" />
          <ellipse cx="12" cy="14" rx="3.5" ry="2" />
          <ellipse cx="12" cy="19" rx="3" ry="2" />
        </svg>
      );
    case 'clock':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      );
    case 'focus':
      return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
          />
        </svg>
      );
    default:
      return null;
  }
}

export default GoalsStep;
