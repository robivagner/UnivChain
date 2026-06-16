"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { prefetchPortalRoute } from "@/lib/navigation/prefetchPortalRoutes";
import { pages } from "@/lib/navigation/routes";

type Options = {
  isConnected: boolean;
  rolesLoading: boolean;
  isAdmin: boolean;
  isProfessor: boolean;
  isIssuer: boolean;
};

export function useNavPrefetch({
  isConnected,
  rolesLoading,
  isAdmin,
  isProfessor,
  isIssuer,
}: Options) {
  const router = useRouter();

  useEffect(() => {
    prefetchPortalRoute(router, pages.verify);
  }, [router]);

  useEffect(() => {
    if (!isConnected) return;

    prefetchPortalRoute(router, pages.student);

    if (rolesLoading) return;

    if (isProfessor) prefetchPortalRoute(router, pages.professor);
    if (isIssuer) prefetchPortalRoute(router, pages.issuer);
    if (isAdmin) prefetchPortalRoute(router, pages.admin);
  }, [router, isConnected, rolesLoading, isAdmin, isProfessor, isIssuer]);
}
