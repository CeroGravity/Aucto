// Single source of navigation truth. Feeds both the header and the footer so
// the two never drift. Category links point to /products until Phase 2 wires
// real filtering.

export type NavLink = {
  label: string;
  href: string;
};

export type FooterColumn = {
  title: string;
  links: NavLink[];
};

export const categoryNav: NavLink[] = [
  { label: "New", href: "/products" },
  { label: "Men", href: "/products" },
  { label: "Women", href: "/products" },
  { label: "Sale", href: "/products" },
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
