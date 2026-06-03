import { describe, expect, it } from "vitest";

import { canCancel, canTransitionOrder, canTransitionPayment } from "@/lib/order-transitions";

describe("order transitions", () => {
  it("allows the happy path pending→confirmed→shipped→delivered", () => {
    expect(canTransitionOrder("pending", "confirmed")).toBe(true);
    expect(canTransitionOrder("confirmed", "shipped")).toBe(true);
    expect(canTransitionOrder("shipped", "delivered")).toBe(true);
  });

  it("rejects skips and backward moves", () => {
    expect(canTransitionOrder("pending", "shipped")).toBe(false);
    expect(canTransitionOrder("pending", "delivered")).toBe(false);
    expect(canTransitionOrder("delivered", "shipped")).toBe(false);
    expect(canTransitionOrder("shipped", "cancelled")).toBe(false);
  });

  it("allows cancel only before shipping", () => {
    expect(canCancel("pending")).toBe(true);
    expect(canCancel("confirmed")).toBe(true);
    expect(canCancel("shipped")).toBe(false);
    expect(canCancel("delivered")).toBe(false);
  });
});

describe("payment transitions", () => {
  it("MFS awaiting → paid or rejected", () => {
    expect(canTransitionPayment("awaiting_verification", "paid")).toBe(true);
    expect(canTransitionPayment("awaiting_verification", "rejected")).toBe(true);
  });

  it("COD unpaid → paid", () => {
    expect(canTransitionPayment("unpaid", "paid")).toBe(true);
  });

  it("rejects terminal/invalid payment moves", () => {
    expect(canTransitionPayment("paid", "rejected")).toBe(false);
    expect(canTransitionPayment("rejected", "paid")).toBe(false);
    expect(canTransitionPayment("unpaid", "rejected")).toBe(false);
  });
});
