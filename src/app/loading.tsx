import { Container } from "@/components/ui/container";

export default function Loading() {
  return (
    <Container className="flex min-h-[60vh] items-center justify-center py-24">
      <output aria-label="Loading" className="flex items-center justify-center">
        <span
          aria-hidden="true"
          className="size-8 animate-spin rounded-full border-2 border-muted border-t-foreground"
        />
        <span className="sr-only">Loading…</span>
      </output>
    </Container>
  );
}
