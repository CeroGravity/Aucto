// Single source of navigation truth. Feeds both the header and the footer so
// the two never drift. Unisex categories — links carry the catalog filter.

export type NavLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: NavLink[];
};

export const categoryNav: NavLink[] = [
  { label: "Compression", href: "/products?category=compression" },
  { label: "Gym Shorts", href: "/products?category=gym-shorts" },
  { label: "Muay Thai", href: "/products?category=muay-thai-shorts" },
  { label: "MMA Shorts", href: "/products?category=mma-shorts" },
];

export const accountLink: NavLink = { label: "Account", href: "/account" };
export const cartLink: NavLink = { label: "Cart", href: "/cart" };

export const footerColumns: FooterColumn[] = [
  { title: "Shop", links: categoryNav },
  {
    title: "Help",
    links: [
      { label: "Contact", href: "/contact" },
      { label: "Shipping", href: "/shipping" },
      { label: "Returns", href: "/returns" },
    ],
  },
  {
    title: "Company",
    links: [{ label: "About", href: "/about" }],
  },
  {
    title: "Legal",
    links: [
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];
