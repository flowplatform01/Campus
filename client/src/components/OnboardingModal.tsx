import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { useProfileCompletion } from '@/hooks/useProfileCompletion';
import { useAuth } from '@/contexts/AuthContext';
import { api } from '@/lib/api';
import { CheckCircle2, Circle } from 'lucide-react';

export function OnboardingModal() {
  const { steps, progress, showOnboarding, setShowOnboarding } = useProfileCompletion();
  const { updateUser } = useAuth();

  const handleDismiss = async () => {
    setShowOnboarding(false);
    try {
      await api.auth.completeOnboarding();
      updateUser({ onboardingCompletedAt: new Date().toISOString() });
    } catch {
      localStorage.setItem('onboarding_dismissed', Date.now().toString());
    }
  };

  return (
    <Dialog open={showOnboarding} onOpenChange={setShowOnboarding}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Complete Your Profile</DialogTitle>
          <DialogDescription>
            Unlock all features by completing your profile setup
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span>Profile Completion</span>
              <span className="font-semibold">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-start justify-between p-3 border rounded-lg hover:bg-accent transition-colors"
              >
                <div className="flex items-start gap-3 flex-1">
                  {step.completed ? (
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  ) : (
                    <Circle className="w-5 h-5 text-muted-foreground mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className={`font-medium ${step.completed ? 'text-muted-foreground line-through' : ''}`}>
                      {step.title}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {step.description}
                    </p>
                  </div>
                </div>
                {!step.completed && (
                  <Button
                    size="sm"
                    onClick={step.action}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </div>

          <Button
            className="w-full"
            variant="outline"
            onClick={handleDismiss}
          >
            I'll do this later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
