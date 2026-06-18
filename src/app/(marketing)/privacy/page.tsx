import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "How Aucto collects, uses, and protects your personal information when you shop with us.",
};

const LAST_UPDATED = "12 June 2026";

export default function PrivacyPage() {
  return (
    <Container className="max-w-3xl py-20 md:py-28">
      <h1 className="font-display font-bold text-4xl text-primary tracking-tight md:text-5xl">
        Privacy Policy
      </h1>
      <p className="mt-4 text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 flex flex-col gap-10 text-base text-muted-foreground leading-relaxed">
        <section className="flex flex-col gap-3">
          <p>
            Aucto is a unisex sportswear and fashion brand operating in Bangladesh. This Privacy
            Policy explains what information we collect when you visit aucto.shop, place an order,
            or create an account, how we use that information, and the choices you have over it.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Information we collect
          </h2>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>
              <span className="font-medium text-foreground">Account details</span> — your name,
              email address, and phone number when you register or sign in.
            </li>
            <li>
              <span className="font-medium text-foreground">Order &amp; delivery details</span> —
              the shipping address and phone number you provide so we can deliver your order.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Manual-payment confirmation details
              </span>{" "}
              — the bKash or Nagad transaction ID and the payment screenshot you upload so we can
              verify your payment.
            </li>
            <li>
              <span className="font-medium text-foreground">
                Essential cookies &amp; session data
              </span>{" "}
              — small pieces of data that keep you logged in and remember the contents of your cart.
            </li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            How we use it
          </h2>
          <p>We use the information we collect to:</p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>fulfil and deliver your orders;</li>
            <li>verify manual mobile payments;</li>
            <li>communicate with you about your orders;</li>
            <li>provide, secure, and support your account;</li>
            <li>and improve our store and the way it works.</li>
          </ul>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            How we share it
          </h2>
          <p>We share personal information only where it is needed to run the store:</p>
          <ul className="flex list-disc flex-col gap-2 pl-5">
            <li>with delivery couriers, so they can deliver your order;</li>
            <li>with Google, only if you choose to sign in with Google;</li>
            <li>with our email provider, so we can send you order receipts;</li>
            <li>and with the hosting and infrastructure providers that operate our store.</li>
          </ul>
          <p>We do not sell your personal data.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Cookies &amp; sessions
          </h2>
          <p>
            We use essential cookies and session data only — to keep you logged in and to remember
            your cart. We do not use advertising cookies or trackers.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Data retention
          </h2>
          <p>
            We keep your information for as long as it is needed to process and support your orders,
            and to meet our legal and accounting obligations.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Your choices
          </h2>
          <p>
            You can view and update your details at any time from your account. You may also contact
            us to request access to, or deletion of, your personal information.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Security</h2>
          <p>
            We protect your information with measures including encryption in transit, hashed
            passwords, and optional two-factor authentication. No method of transmission or storage
            is ever 100% secure, but we work to keep your data safe.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Children</h2>
          <p>
            Our store is not directed at children under 13, and we do not knowingly collect personal
            information from them.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Changes</h2>
          <p>
            We may update this policy from time to time. The "Last updated" date at the top reflects
            the most recent version.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Contact</h2>
          <p>
            Questions about this policy? Email us at{" "}
            <a
              href="mailto:orders@aucto.shop"
              className="rounded-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              orders@aucto.shop
            </a>
            .
          </p>
        </section>
      </div>
    </Container>
  );
}
