import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-sm shadow-lg">
        <CardHeader className="text-center pb-2">
          <CardTitle className="text-2xl font-bold tracking-tight">MedHistory</CardTitle>
          <CardDescription className="text-sm">
            Your personal medical record, organised.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button asChild className="w-full" size="lg">
            <a href="/oauth2/authorization/google">Sign in with Google</a>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
