import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { Card } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-sm py-12">
      <Card>
        <h1 className="text-xl font-semibold">Sign in</h1>
        <p className="mt-1 mb-5 text-sm text-foreground/70">
          Enter the app password to continue.
        </p>
        <Suspense fallback={null}>
          <LoginForm />
        </Suspense>
      </Card>
    </div>
  );
}
