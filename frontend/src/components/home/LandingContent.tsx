"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useIsAdmin } from "@/lib/useIsAdmin";

function NavCard({
  href,
  title,
  description,
  accent,
  disabled,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  accent: string;
  disabled?: boolean;
  badge?: string;
}) {
  if (disabled) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 opacity-70">
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-slate-700">{title}</h3>
          {badge && (
            <span className="text-[10px] uppercase tracking-wide text-slate-500">{badge}</span>
          )}
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </div>
    );
  }

  return (
    <Link
      href={href}
      className={`rounded-xl border p-5 transition shadow-sm hover:shadow-md ${accent}`}
    >
      <h3 className="font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </Link>
  );
}

export function LandingContent() {
  const { isConnected } = useAccount();
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 flex flex-col gap-10">
      <section className="text-center flex flex-col gap-4">
        <h1 className="text-4xl font-bold text-slate-900 tracking-tight">
          UnivChain Academic Portal
        </h1>
        <p className="text-slate-600 text-lg leading-relaxed max-w-2xl mx-auto">
          A hub-and-spoke university management system on Ethereum. Students request enrollment
          with an on-chain fee payment; administrators issue soulbound identity tokens. Grades and
          diplomas are recorded transparently and can be verified without trusting a central
          database.
        </p>
      </section>

      <section className="grid sm:grid-cols-2 gap-4 text-sm text-slate-700">
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-2">For students</h2>
          <p>
            Pay the registration fee in Mock USDC (local dev), then wait for an admin to accept your
            wallet address with a matriculation number. Your identity is minted as a non-transferable
            SBT.
          </p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-4">
          <h2 className="font-semibold text-slate-900 mb-2">For verifiers</h2>
          <p>
            Anyone can read diploma validity on-chain — no wallet required. Check by student address
            or diploma token ID.
          </p>
        </div>
        <div className="rounded-lg bg-white border border-slate-200 p-4 sm:col-span-2">
          <h2 className="font-semibold text-slate-900 mb-2">For administrators</h2>
          <p>
            Pending enrollment requests are indexed off-chain (event scan + SQLite) and reconciled
            with contract state. Connect the deployer wallet to review and accept requests.
          </p>
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500 text-center">
          Navigate
        </h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <NavCard
            href="/verify"
            title="Verify diploma"
            description="Public read-only check of on-chain diploma records."
            accent="border-emerald-200 bg-emerald-50/50 hover:border-emerald-300"
          />
          <NavCard
            href="/enroll"
            title="Request enrollment"
            description="Student flow: mint test USDC, approve, and call requestEnrollment."
            accent="border-violet-200 bg-violet-50/50 hover:border-violet-300"
            disabled={!isConnected || isAdminLoading || isAdmin}
            badge={!isConnected ? "Connect wallet" : isAdmin ? "Admin account" : undefined}
          />
          <NavCard
            href="/admin/enrollments"
            title="Admin — enrollment queue"
            description="List pending requests from chain events and accept with a matriculation number."
            accent="border-blue-200 bg-blue-50/50 hover:border-blue-300"
            disabled={!isConnected || isAdminLoading || !isAdmin}
            badge={
              !isConnected
                ? "Connect wallet"
                : isAdminLoading
                  ? "Checking role…"
                  : !isAdmin
                    ? "Admin only"
                    : undefined
            }
          />
        </div>
        {!isConnected && (
          <p className="text-center text-sm text-slate-500">
            Connect your wallet in the header to unlock student or admin actions.
          </p>
        )}
      </section>
    </div>
  );
}
