
import React, { useState, useEffect } from 'react';
import { Loader2, Brain, Sparkles, Volume2 } from 'lucide-react';

interface ProcessingStepsProps {
  isVisible: boolean;
  currentStep?: string;
  chunksRetrieved?: number;
  totalTokens?: number;
  progress?: number;
}

const ProcessingSteps: React.FC<ProcessingStepsProps> = ({ 
  isVisible, 
  currentStep, 
  chunksRetrieved = 0, 
  totalTokens = 0, 
  progress = 0 
}) => {
  const [step, setStep] = useState(0);
  const [displayText, setDisplayText] = useState('');

  const steps = [
    { icon: Brain, text: 'Analyzing your question...', color: 'text-blue-500' },
    { icon: Sparkles, text: 'Searching knowledge base...', color: 'text-orange-500' },
    { icon: Volume2, text: 'Generating thoughtful response...', color: 'text-purple-500' },
  ];

  useEffect(() => {
    if (!isVisible) {
      setStep(0);
      setDisplayText('');
      return;
    }

    // Override with specific step if provided
    if (currentStep) {
      setDisplayText(currentStep);
      return;
    }

    // Auto-cycle through steps
    const interval = setInterval(() => {
      setStep(prev => (prev + 1) % steps.length);
    }, 2000);

    return () => clearInterval(interval);
  }, [isVisible, currentStep]);

  useEffect(() => {
    if (isVisible && !currentStep) {
      setDisplayText(steps[step].text);
    }
  }, [step, isVisible, currentStep]);

  if (!isVisible) return null;

  const CurrentIcon = currentStep ? Brain : steps[step].icon;
  const iconColor = currentStep ? 'text-blue-500' : steps[step].color;

  return (
    <div className="flex items-center justify-center p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800 animate-pulse">
      <div className="flex items-center space-x-3">
        <div className="relative">
          <CurrentIcon className={`h-5 w-5 ${iconColor} animate-spin`} />
          <div className="absolute inset-0 animate-ping">
            <div className={`h-5 w-5 rounded-full ${iconColor.replace('text-', 'bg-')} opacity-20`}></div>
          </div>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {displayText}
          </span>
          {(chunksRetrieved > 0 || totalTokens > 0) && (
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {chunksRetrieved > 0 && `${chunksRetrieved} guidance chunks`}
              {chunksRetrieved > 0 && totalTokens > 0 && ' • '}
              {totalTokens > 0 && `~${totalTokens} tokens`}
              {progress > 0 && ` • ${Math.round(progress)}% complete`}
            </div>
          )}
          <div className="flex space-x-1 mt-2">
            {steps.map((_, index) => (
              <div
                key={index}
                className={`h-1 w-4 rounded-full transition-all duration-300 ${
                  index === step ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          {progress > 0 && (
            <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1 mt-1">
              <div 
                className="bg-gradient-to-r from-blue-500 to-purple-500 h-1 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProcessingSteps;
