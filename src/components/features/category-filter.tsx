import Link from "next/link";

import type { Category } from "@/lib/db/schema";
import { cn } from "@/lib/utils";

const chipClass =
  "rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";

function chipStyle(active: boolean) {
  return cn(
    chipClass,
    active
      ? "border-foreground bg-foreground text-background"
      : "border-border text-muted-foreground hover:border-foreground/40 hover:text-foreground",
  );
}

type CategoryFilterProps = {
  categories: Category[];
  active?: string;
};

export function CategoryFilter({ categories, active }: CategoryFilterProps) {
  return (
    <nav aria-label="Filter by category" className="flex flex-wrap gap-2">
      <Link
        href="/products"
        aria-current={active ? undefined : "page"}
        className={chipStyle(!active)}
      >
        All
      </Link>
      {categories.map((category) => {
        const isActive = active === category.slug;
        return (
          <Link
            key={category.slug}
            href={`/products?category=${category.slug}`}
            aria-current={isActive ? "page" : undefined}
            className={chipStyle(isActive)}
          >
            {category.name}
          </Link>
        );
      })}
    </nav>
  );
}
