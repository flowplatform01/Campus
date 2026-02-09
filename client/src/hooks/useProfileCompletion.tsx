import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

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

  useEffect(() => {
    if (user && user.profileCompletion < 100) {
      setShowOnboarding(true);
    }
  }, [user]);

  const steps: OnboardingStep[] = [
    {
      id: 'verify-email',
      title: 'Verify Email',
      description: 'Verify your email address',
      completed: user?.verified || false,
      action: async () => {
        await updateUser({ verified: true, profileCompletion: Math.min(user!.profileCompletion + 20, 100) });
      }
    },
    {
      id: 'add-phone',
      title: 'Add Phone Number',
      description: 'Add your phone number for notifications',
      completed: !!user?.phone,
      action: async () => {
        await updateUser({ phone: '+1234567890', profileCompletion: Math.min(user!.profileCompletion + 20, 100) });
      }
    },
    {
      id: 'link-school',
      title: 'Link School',
      description: 'Connect to your school',
      completed: user?.schoolLinked || false,
      action: async () => {
        await updateUser({ schoolLinked: true, profileCompletion: Math.min(user!.profileCompletion + 30, 100) });
      }
    },
    {
      id: 'add-avatar',
      title: 'Add Profile Picture',
      description: 'Upload a profile picture',
      completed: !!user?.avatar,
      action: async () => {
        const avatars = ['👨‍🎓', '👩‍🎓', '👨‍🏫', '👩‍🏫', '👨‍💼', '👩‍💼'];
        const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
        await updateUser({ avatar: randomAvatar, profileCompletion: Math.min(user!.profileCompletion + 30, 100) });
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
