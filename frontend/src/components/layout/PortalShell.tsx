"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useAccount } from "wagmi";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useIsProfessor } from "@/lib/useIsProfessor";
import { useIsIssuer } from "@/lib/useIsIssuer";
import { useMounted } from "@/lib/useMounted";
import { useNavPrefetch } from "@/lib/navigation/useNavPrefetch";
import { PortalNavLink } from "@/components/layout/PortalNavLink";
import { UnivChainLogo } from "@/components/ui/UnivChainLogo";
import { pages } from "@/lib/navigation/routes";

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const mounted = useMounted();
  const { isConnected } = useAccount();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { isProfessor, isLoading: isProfessorLoading } = useIsProfessor();
  const { isIssuer, isLoading: isIssuerLoading } = useIsIssuer();

  const rolesLoading = isAdminLoading || isProfessorLoading || isIssuerLoading;

  useNavPrefetch({
    isConnected,
    rolesLoading,
    isAdmin,
    isProfessor,
    isIssuer,
  });

  return (
    <div className="portal-shell-bg min-h-screen flex flex-col">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[rgba(6,9,18,0.72)] backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between gap-4">
          <Link href={pages.home} prefetch className="shrink-0 transition-opacity hover:opacity-90">
            <UnivChainLogo size="sm" />
          </Link>

          <div className="flex min-w-0 flex-1 items-center justify-end gap-2 sm:gap-3">
            <nav className="flex flex-wrap items-center justify-end gap-1">
              <PortalNavLink href={pages.home} active={pathname === pages.home}>
                Home
              </PortalNavLink>
              <PortalNavLink href={pages.verify} active={pathname === pages.verify}>
                Verify
              </PortalNavLink>
              {mounted && isConnected && (
                <PortalNavLink href={pages.student} active={pathname === pages.student}>
                  Student
                </PortalNavLink>
              )}
              {mounted && isConnected && !rolesLoading && isProfessor && (
                <PortalNavLink href={pages.professor} active={pathname.startsWith(pages.professor)}>
                  Professor
                </PortalNavLink>
              )}
              {mounted && isConnected && !rolesLoading && isIssuer && (
                <PortalNavLink href={pages.issuer} active={pathname.startsWith(pages.issuer)}>
                  Issuer
                </PortalNavLink>
              )}
              {mounted && isConnected && !rolesLoading && isAdmin && (
                <PortalNavLink href={pages.admin} active={pathname.startsWith(pages.admin)}>
                  Admin
                </PortalNavLink>
              )}
            </nav>

            <div className="header-wallet-connect shrink-0 ml-1">
              <ConnectButton accountStatus="address" chainStatus="none" showBalance={false} />
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t border-white/10 py-8">
        <div className="max-w-6xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-uc-muted">
          <p className="text-center sm:text-left">
            UnivChain — decentralized academic credentials on Ethereum
          </p>
          <p className="flex items-center gap-2">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
            On-chain verification ready
          </p>
        </div>
      </footer>
    </div>
  );
}
