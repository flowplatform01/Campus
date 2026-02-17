import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Construction } from 'lucide-react';

interface PlaceholderPageProps {
  title: string;
  description: string;
}

export function PlaceholderPage({ title, description }: PlaceholderPageProps) {
  return (
    <DashboardLayout>
      <div className="flex items-center justify-center min-h-[50vh]">
        <Card className="max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <img src="/brand-icon.svg" alt="Campus" className="h-12 w-12" />
            </div>
            <div className="mx-auto mb-4 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Construction className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl">{title}</CardTitle>
            <CardDescription className="text-base">{description}</CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>This feature is coming soon as part of the full Campus platform.</p>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
