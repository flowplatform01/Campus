import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useLocation } from 'wouter';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  action: () => void;
}

export function useProfileCompletion() {
  const { user, updateUser } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Never show if onboarding was completed and persisted in DB
    if (user?.onboardingCompletedAt) {
      setShowOnboarding(false);
      return;
    }
    if (user && user.profileCompletion < 100) {
      // Check if user has dismissed onboarding recently (local fallback before DB persist)
      const key = `onboarding_dismissed:${user.id}`;
      const lastDismissed = localStorage.getItem(key);
      const now = Date.now();
      const oneWeek = 7 * 24 * 60 * 60 * 1000;
      if (!lastDismissed || (now - parseInt(lastDismissed, 10)) > oneWeek) {
        setShowOnboarding(true);
      }
    }
  }, [user]);

  const steps: OnboardingStep[] = [
    {
      id: 'verify-email',
      title: 'Verify Email',
      description: 'Verify your email address',
      completed: user?.verified || false,
      action: async () => {
        setLocation('/settings');
      }
    },
    {
      id: 'add-phone',
      title: 'Add Phone Number',
      description: 'Add your phone number for notifications',
      completed: !!user?.phone,
      action: async () => {
        setLocation('/profile');
      }
    },
    {
      id: 'link-school',
      title: 'Link School',
      description: 'Connect to your school',
      completed: user?.schoolLinked || false,
      action: async () => {
        setLocation('/settings');
      }
    },
    {
      id: 'add-avatar',
      title: 'Add Profile Picture',
      description: 'Upload a profile picture',
      completed: !!user?.avatar,
      action: async () => {
        setLocation('/profile');
      }
    }
  ];

  const completedSteps = steps.filter(s => s.completed).length;
  const progress = (completedSteps / steps.length) * 100;

  return {
    steps,
    completedSteps,
    progress,
    showOnboarding,
    setShowOnboarding
  };
}
