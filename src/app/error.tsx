"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorBoundary({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Surface the error for diagnostics; never render raw details to users.
    console.error(error);
  }, [error]);

  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <h1 className="font-display font-bold text-4xl tracking-tight">Something went wrong</h1>
      <p className="max-w-md text-muted-foreground">
        An unexpected error occurred. Please try again.
      </p>
      <Button onClick={() => reset()}>Try again</Button>
    </Container>
  );
}
