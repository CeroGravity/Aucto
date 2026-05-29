import { Logo } from "@/components/brand/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Logo />
        <ThemeToggle />
      </header>

      <main className="flex flex-1 flex-col items-center justify-center gap-10 px-6 py-24 text-center">
        <div className="flex max-w-2xl flex-col items-center gap-6">
          <h1 className="text-5xl font-bold md:text-7xl">
            Built clean.
            <br />
            Shipped fast.
          </h1>
          <p className="max-w-md text-lg text-muted-foreground">
            Phase 0 foundation. Tooling, tokens, fonts, and database wired and green.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <Button size="lg">Shop now</Button>
          <Button size="lg" variant="accent">
            Featured drop
          </Button>
          <Button size="lg" variant="outline">
            Learn more
          </Button>
        </div>
      </main>

      <footer className="px-6 py-8 text-center text-sm text-muted-foreground md:px-10">
        © {new Date().getFullYear()} Aucto.
      </footer>
    </div>
  );
}
