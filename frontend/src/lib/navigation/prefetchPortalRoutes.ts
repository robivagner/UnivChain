type RouterLike = {
  prefetch: (href: string) => void;
};

/** Warm route chunks so first client navigation feels instant. */
const CHUNK_WARMERS: Record<string, () => Promise<unknown>> = {
  "/": () => import("@/components/home/LandingContent"),
  "/verify": () => import("@/components/verifier/VerifyPortal"),
  "/enroll": () => import("@/components/student/StudentPortal"),
  "/professor": () => import("@/components/professor/ProfessorPanel"),
  "/issuer": () => import("@/components/issuer/IssuerPanel"),
  "/admin": () => import("@/components/admin/AdminDashboard"),
};

export function prefetchPortalRoute(router: RouterLike, route: string) {
  router.prefetch(route);
  void CHUNK_WARMERS[route]?.();
}
