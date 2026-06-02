import { portalCardClass } from "@/lib/ui/portalClasses";

export function PortalPageSkeleton() {
  return (
    <div className="max-w-2xl mx-auto w-full px-4 py-10 flex flex-col gap-6">
      <div className="h-9 w-52 rounded-lg portal-skeleton" />
      <div className="h-4 w-full max-w-md rounded portal-skeleton" />
      <div className={`${portalCardClass} flex flex-col gap-3`}>
        <div className="h-4 w-32 rounded portal-skeleton" />
        <div className="h-10 w-full rounded-lg portal-skeleton" />
        <div className="h-10 w-full rounded-lg portal-skeleton" />
      </div>
    </div>
  );
}
