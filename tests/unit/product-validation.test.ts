import { describe, expect, it } from "vitest";

import { productFormSchema, productSlug, variantSchema } from "@/lib/products";

describe("productFormSchema", () => {
  const valid = {
    name: "Compression Top",
    description: "Second-skin top.",
    categoryId: "1",
    price: "2500",
    published: "on",
  };

  it("accepts a valid product (coercing categoryId + published)", () => {
    const r = productFormSchema.safeParse(valid);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.categoryId).toBe(1);
      expect(r.data.published).toBe(true);
    }
  });

  it("rejects an empty name and a non-positive category", () => {
    expect(productFormSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
    expect(productFormSchema.safeParse({ ...valid, categoryId: "0" }).success).toBe(false);
  });
});

describe("variantSchema", () => {
  it("accepts a valid size + stock", () => {
    expect(variantSchema.safeParse({ size: "M", stock: "5" }).success).toBe(true);
  });
  it("rejects an unknown size and negative stock", () => {
    expect(variantSchema.safeParse({ size: "XXXL", stock: "1" }).success).toBe(false);
    expect(variantSchema.safeParse({ size: "M", stock: "-1" }).success).toBe(false);
  });
});

describe("productSlug", () => {
  it("slugifies names", () => {
    expect(productSlug("Muay Thai Shorts — Pro")).toBe("muay-thai-shorts-pro");
    expect(productSlug('Training Shorts 5"')).toBe("training-shorts-5");
  });
});
