"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ConnectKitButton } from "connectkit";
import { useAccount } from "wagmi";
import { useIsAdmin } from "@/lib/useIsAdmin";

const navLinkClass = (active: boolean) =>
  `text-sm font-medium transition-colors ${
    active ? "text-slate-900" : "text-slate-600 hover:text-slate-900"
  }`;

export function PortalShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isConnected } = useAccount();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex flex-wrap items-center justify-between gap-4">
          <Link href="/" className="flex flex-col">
            <span className="text-lg font-bold text-slate-900 tracking-tight">UnivChain</span>
            <span className="text-[10px] text-slate-500 uppercase tracking-widest">
              University portal
            </span>
          </Link>

          <nav className="flex flex-wrap items-center gap-4">
            <Link href="/" className={navLinkClass(pathname === "/")}>
              Home
            </Link>
            <Link href="/verify" className={navLinkClass(pathname === "/verify")}>
              Verify diploma
            </Link>
            {isConnected && !isAdminLoading && !isAdmin && (
              <Link href="/enroll" className={navLinkClass(pathname === "/enroll")}>
                Request enrollment
              </Link>
            )}
            {isConnected && !isAdminLoading && isAdmin && (
              <Link
                href="/admin/enrollments"
                className={navLinkClass(pathname.startsWith("/admin"))}
              >
                Admin enrollments
              </Link>
            )}
          </nav>

          <ConnectKitButton />
        </div>
      </header>

      <main className="flex-1 w-full">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
        UnivChain — decentralized academic credentials on Ethereum
      </footer>
    </div>
  );
}
