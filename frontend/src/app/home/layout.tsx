import { PortalShell } from "@/components/layout/PortalShell";

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <PortalShell>{children}</PortalShell>;
}
