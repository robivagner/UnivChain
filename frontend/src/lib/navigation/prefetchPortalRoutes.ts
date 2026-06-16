import { pages, type PagesRoute } from "@/lib/navigation/routes";

type RouterLike = {
  prefetch: (href: string) => void;
};

/** Warm route chunks so first client navigation feels instant. */
const CHUNK_WARMERS: Record<PagesRoute, () => Promise<unknown>> = {
  [pages.home]: () => import("@/components/home/LandingContent"),
  [pages.verify]: () => import("@/components/verifier/VerifyPortal"),
  [pages.student]: () => import("@/components/student/StudentPortal"),
  [pages.professor]: () => import("@/components/professor/ProfessorPanel"),
  [pages.issuer]: () => import("@/components/issuer/IssuerPanel"),
  [pages.admin]: () => import("@/components/admin/AdminDashboard"),
};

export function prefetchPortalRoute(router: RouterLike, route: PagesRoute) {
  router.prefetch(route);
  void CHUNK_WARMERS[route]?.();
}
