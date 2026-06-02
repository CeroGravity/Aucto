import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { auth } from "@/lib/auth";
import { logoutUser } from "@/server/actions/auth";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <Container className="max-w-2xl py-16">
      <h1 className="font-display font-bold text-3xl text-primary tracking-tight md:text-4xl">
        Account
      </h1>

      <div className="mt-8 flex flex-col gap-1">
        <span className="text-muted-foreground text-sm">Signed in as</span>
        <span className="font-medium">{session.user.email}</span>
      </div>

      <Separator className="my-8" />

      <h2 className="font-display font-bold text-primary text-xl">Order history</h2>
      <p className="mt-3 text-muted-foreground">No orders yet.</p>

      <Separator className="my-8" />

      <form action={logoutUser}>
        <Button type="submit" variant="outline">
          Log out
        </Button>
      </form>
    </Container>
  );
}
