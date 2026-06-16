"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { prefetchPortalRoute } from "@/lib/navigation/prefetchPortalRoutes";
import type { PagesRoute } from "@/lib/navigation/routes";

type Props = {
  href: PagesRoute;
  active: boolean;
  children: React.ReactNode;
};

export function PortalNavLink({ href, active, children }: Props) {
  const router = useRouter();

  return (
    <Link
      href={href}
      prefetch
      onMouseEnter={() => prefetchPortalRoute(router, href)}
      onFocus={() => prefetchPortalRoute(router, href)}
      className={`portal-nav-link ${active ? "portal-nav-link-active" : ""}`}
    >
      {children}
    </Link>
  );
}
