"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { prefetchPortalRoute } from "@/lib/navigation/prefetchPortalRoutes";

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
    prefetchPortalRoute(router, "/verify");
  }, [router]);

  useEffect(() => {
    if (!isConnected) return;

    prefetchPortalRoute(router, "/enroll");

    if (rolesLoading) return;

    if (isProfessor) prefetchPortalRoute(router, "/professor");
    if (isIssuer) prefetchPortalRoute(router, "/issuer");
    if (isAdmin) prefetchPortalRoute(router, "/admin");
  }, [router, isConnected, rolesLoading, isAdmin, isProfessor, isIssuer]);
}
