import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/features/auth-form";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { loginUser } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Log in" };

export default async function LoginPage() {
  const session = await auth();
  if (session?.user) redirect("/account");

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <h1 className="font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Log in
      </h1>
      <p className="mt-2 text-muted-foreground">Welcome back.</p>
      <div className="mt-8">
        <AuthForm mode="login" action={loginUser} />
      </div>
    </Container>
  );
}
