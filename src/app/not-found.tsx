import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";

export default function NotFound() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-center justify-center gap-6 py-24 text-center">
      <p className="font-display font-bold text-6xl text-muted-foreground tracking-tight">404</p>
      <h1 className="font-display font-bold text-3xl tracking-tight">Page not found</h1>
      <p className="max-w-md text-muted-foreground">
        The page you're looking for doesn't exist or has moved.
      </p>
      <Button asChild>
        <Link href="/">Back home</Link>
      </Button>
    </Container>
  );
}
