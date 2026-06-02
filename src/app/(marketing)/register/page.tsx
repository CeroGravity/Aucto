import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AuthForm } from "@/components/features/auth-form";
import { Container } from "@/components/ui/container";
import { auth } from "@/lib/auth";
import { registerUser } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  const session = await auth();
  if (session?.user) redirect("/account");

  return (
    <Container className="flex min-h-[70vh] max-w-md flex-col justify-center py-16">
      <h1 className="font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Create account
      </h1>
      <p className="mt-2 text-muted-foreground">Join Aucto — move with power.</p>
      <div className="mt-8">
        <AuthForm mode="register" action={registerUser} />
      </div>
    </Container>
  );
}
