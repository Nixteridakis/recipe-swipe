"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { AppIcon } from "./AppIcon";
import { useCart } from "./cart-context";
import styles from "./app-shell.module.css";

type AppShellProps = {
  children: ReactNode;
};

type NavItem = {
  label: string;
  href?: string;
  icon: Parameters<typeof AppIcon>[0]["name"];
  match: (pathname: string) => boolean;
};

const primaryNav: NavItem[] = [
  {
    label: "Discover",
    href: "/discover",
    icon: "home",
    match: (pathname) => pathname === "/discover",
  },
  {
    label: "Recipes",
    href: "/",
    icon: "list",
    match: (pathname) => pathname === "/" || pathname.startsWith("/recipe/"),
  },
  {
    label: "Shopping Cart",
    href: "/cart",
    icon: "bag",
    match: (pathname) => pathname.startsWith("/cart"),
  },
];

function NavItemLink({
  item,
  pathname,
  cartCount,
  mobile = false,
}: {
  item: NavItem;
  pathname: string;
  cartCount?: number;
  mobile?: boolean;
}) {
  const isActive = item.match(pathname);
  const className = mobile
    ? `${styles.mobileItem} ${isActive ? styles.mobileItemActive : ""}`.trim()
    : `${styles.railItem} ${isActive ? styles.railItemActive : ""}`.trim();

  const content = (
    <>
      <AppIcon
        name={item.icon}
        className={mobile ? styles.mobileIcon : styles.railIcon}
        filled={isActive}
      />
      <span className={styles.navLabel}>{item.label}</span>
      {item.href === "/cart" && cartCount ? (
        <span className={styles.navCount}>{cartCount}</span>
      ) : null}
    </>
  );

  if (!item.href) {
    return (
      <span className={className} aria-disabled="true">
        {content}
      </span>
    );
  }

  return (
    <Link href={item.href} className={className}>
      {content}
    </Link>
  );
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const { items } = useCart();
  const [headerHidden, setHeaderHidden] = useState(false);

  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;

    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        const currentY = window.scrollY;
        const delta = currentY - lastY;

        // Keep the header visible near the top for orientation.
        if (currentY <= 24) {
          setHeaderHidden(false);
        } else if (delta > 8) {
          setHeaderHidden(true);
        } else if (delta < -8) {
          setHeaderHidden(false);
        }

        lastY = currentY;
        ticking = false;
      });
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (pathname.startsWith("/studio")) {
    return <>{children}</>;
  }

  return (
    <div className={styles.shell}>
      <header className={`${styles.header} ${headerHidden ? styles.headerHidden : ""}`.trim()}>
        <div className={styles.headerInner}>
          <div className={styles.brandBlock}>
            <Link href="/" className={styles.brand}>
              Brasserie
            </Link>
          </div>

          <div className={styles.headerActions}>
            <label className={styles.search}>
              <AppIcon name="search" className={styles.actionIcon} />
              <input type="search" placeholder="Search recipes..." aria-label="Search recipes" />
            </label>
            <Link href="/studio" className={styles.importLink}>
              CREATE
            </Link>
            <Link href="/import" className={styles.importLink}>
              Import
            </Link>
          </div>
        </div>
      </header>

      <aside className={styles.rail}>
        <nav className={styles.railNav} aria-label="Sidebar">
          {primaryNav.map((item) => (
            <NavItemLink key={item.label} item={item} pathname={pathname} cartCount={items.length} />
          ))}
        </nav>
      </aside>

      <div className={styles.content}>
        <div className={styles.pageWrap}>{children}</div>
      </div>

      <nav className={styles.mobileNav} aria-label="Mobile">
        {primaryNav.map((item) => (
          <NavItemLink
            key={item.label}
            item={item}
            pathname={pathname}
            cartCount={items.length}
            mobile
          />
        ))}
      </nav>
    </div>
  );
}
