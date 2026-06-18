import type { Metadata } from "next";

import { Container } from "@/components/ui/container";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms that govern your use of aucto.shop and any orders you place with us.",
};

const LAST_UPDATED = "12 June 2026";

export default function TermsPage() {
  return (
    <Container className="max-w-3xl py-20 md:py-28">
      <h1 className="font-display font-bold text-4xl text-primary tracking-tight md:text-5xl">
        Terms of Service
      </h1>
      <p className="mt-4 text-muted-foreground text-sm">Last updated: {LAST_UPDATED}</p>

      <div className="mt-10 flex flex-col gap-10 text-base text-muted-foreground leading-relaxed">
        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Acceptance
          </h2>
          <p>
            By using aucto.shop you agree to these Terms of Service. If you do not agree, please do
            not use the store.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Eligibility
          </h2>
          <p>
            You must be of legal age to form a binding contract in Bangladesh in order to use the
            store and place orders.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Accounts</h2>
          <p>
            You are responsible for your account and for keeping your credentials secure. Please
            provide accurate, up-to-date information when you register and when you place an order.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Products &amp; pricing
          </h2>
          <p>
            We sell unisex sportswear. Prices are shown in Bangladeshi Taka (৳). Prices and
            availability may change, and while we aim for accuracy, errors can occur.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Orders</h2>
          <p>
            Placing an order is an offer to buy. We may accept or decline it — for example, if an
            item is out of stock or we suspect fraud. Your order is confirmed once we accept it.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Payment</h2>
          <p>
            We accept Cash on Delivery and manual mobile payment via bKash or Nagad, where you
            submit a transaction ID and a screenshot for us to verify.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Shipping &amp; delivery
          </h2>
          <p>
            We deliver via third-party couriers within Bangladesh. Delivery timelines are estimates
            and may vary.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Returns, exchanges &amp; refunds
          </h2>
          <p>
            If you receive a defective or incorrect item, please contact us. Specific conditions may
            apply and may be detailed separately.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Intellectual property
          </h2>
          <p>
            The Aucto name, logo, and site content belong to the brand and may not be used without
            our permission.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Acceptable use
          </h2>
          <p>
            You agree not to use the store for any unlawful purpose, to commit fraud, or to
            interfere with the operation of the service.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Limitation of liability
          </h2>
          <p>The service is provided "as is" to the fullest extent permitted by law.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">
            Governing law
          </h2>
          <p>These terms are governed by the laws of Bangladesh.</p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Changes</h2>
          <p>
            We may update these terms from time to time. Continued use of the store means you accept
            the updated terms.
          </p>
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="font-display font-bold text-2xl text-primary tracking-tight">Contact</h2>
          <p>
            Questions about these terms? Email us at{" "}
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
