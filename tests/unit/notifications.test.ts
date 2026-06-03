import { describe, expect, it } from "vitest";

import type { NotifyOrder } from "@/lib/notifications";
import { orderReceiptEmail, paymentLine, telegramMessage } from "@/lib/notifications/format";

function order(overrides: Partial<NotifyOrder> = {}): NotifyOrder {
  return {
    id: 42,
    totalMinor: 196000,
    subtotalMinor: 190000,
    shippingMinor: 6000,
    paymentMethod: "cod",
    paymentStatus: "unpaid",
    orderStatus: "pending",
    trxId: null,
    fullName: "Test Buyer",
    area: "Gulshan",
    city: "Dhaka",
    phone: "01700000000",
    customerEmail: null,
    items: [{ productName: "Compression Top", size: "S", quantity: 2, unitPriceMinor: 95000 }],
    ...overrides,
  };
}

describe("paymentLine", () => {
  it("COD → pay on delivery with ৳ total", () => {
    expect(paymentLine(order({ paymentMethod: "cod" }))).toBe("Pay ৳1,960 on delivery.");
  });
  it("MFS awaiting → under verification with TrxID", () => {
    const line = paymentLine(
      order({
        paymentMethod: "bkash",
        paymentStatus: "awaiting_verification",
        trxId: "ABC1D2E3F4",
      }),
    );
    expect(line).toMatch(/under verification/i);
    expect(line).toContain("ABC1D2E3F4");
  });
});

describe("telegramMessage", () => {
  it("includes order #, total ৳, name, area, and the admin link", () => {
    const msg = telegramMessage(order());
    expect(msg).toContain("#42");
    expect(msg).toContain("৳1,960");
    expect(msg).toContain("Test Buyer");
    expect(msg).toContain("Gulshan");
    expect(msg).toContain("/admin/orders/42");
  });
});

describe("orderReceiptEmail", () => {
  it("renders subject, items, totals (৳) and COD copy in both html + text", () => {
    const { subject, html, text } = orderReceiptEmail(order());
    expect(subject).toContain("#42");
    for (const out of [html, text]) {
      expect(out).toContain("Compression Top");
      expect(out).toContain("৳1,960"); // total
      expect(out).toContain("Pay ৳1,960 on delivery.");
    }
  });
  it("renders MFS verification copy", () => {
    const { text } = orderReceiptEmail(
      order({ paymentMethod: "nagad", paymentStatus: "awaiting_verification", trxId: "ZZ9" }),
    );
    expect(text).toMatch(/under verification/i);
    expect(text).toContain("ZZ9");
  });
});
