import { Suspense } from "react";
import { AuthPageSkeleton } from "@/components/ui/Skeleton";
import LoginClient from "./login-client";

export default function LoginPage() {
  return (
    <Suspense
      fallback={<AuthPageSkeleton />}
    >
      <LoginClient />
    </Suspense>
  );
}
