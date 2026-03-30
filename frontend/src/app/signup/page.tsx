import { Suspense } from "react";
import { AuthPageSkeleton } from "@/components/ui/Skeleton";
import SignupClient from "./signup-client";

export default function SignupPage() {
  return (
    <Suspense
      fallback={<AuthPageSkeleton />}
    >
      <SignupClient />
    </Suspense>
  );
}

