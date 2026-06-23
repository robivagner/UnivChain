"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useIsAdmin } from "@/lib/useIsAdmin";
import { useIsProfessor } from "@/lib/useIsProfessor";
import { useIsIssuer } from "@/lib/useIsIssuer";
import { useMounted } from "@/lib/useMounted";
import { badgeGoldClass } from "@/lib/ui/portalClasses";
import { pages } from "@/lib/navigation/routes";

const ROLE_CARDS = [
  {
    title: "For students",
    description:
      "Request enrollment with an on-chain fee, then track your registry status, credits, and grades from your wallet. After graduation, your soulbound diploma NFT is the verifiable credential.",
    accent: "from-uc-violet/20 to-transparent",
    icon: "🎓",
  },
  {
    title: "For professors",
    description:
      "After an admin grants PROFESSOR_ROLE, add subjects (or teach admin-assigned ones), post immutable grades to the Gradebook, and activate or deactivate your courses.",
    accent: "from-indigo-500/20 to-transparent",
    icon: "📚",
  },
  {
    title: "For diploma issuers",
    description:
      "Check on-chain eligibility (credits, weighted average, enrollment status, no outstanding debt), then issue a soulbound diploma NFT with an immutable academic snapshot.",
    accent: "from-teal-400/20 to-transparent",
    icon: "📜",
  },
  {
    title: "For administrators",
    description:
      "Review paid enrollment requests, accept students with a matriculation hash (or reject and refund), grant roles, and assign subjects to faculty wallets.",
    accent: "from-uc-cyan/20 to-transparent",
    icon: "⚙️",
  },
] as const;

function NavCard({
  href,
  title,
  description,
  accentClass,
  disabled,
  badge,
}: {
  href: string;
  title: string;
  description: string;
  accentClass: string;
  disabled?: boolean;
  badge?: string;
}) {
  if (disabled) {
    return (
      <div className={`portal-nav-card portal-nav-card-disabled ${accentClass}`}>
        <div className="flex items-center justify-between gap-2 mb-2">
          <h3 className="font-semibold text-uc-text/80">{title}</h3>
          {badge && <span className={badgeGoldClass}>{badge}</span>}
        </div>
        <p className="text-sm text-uc-muted">{description}</p>
      </div>
    );
  }

  return (
    <Link href={href} className={`portal-nav-card block ${accentClass}`}>
      <h3 className="font-semibold text-uc-text mb-2">{title}</h3>
      <p className="text-sm text-uc-muted leading-relaxed">{description}</p>
    </Link>
  );
}

export function LandingContent() {
  const mounted = useMounted();
  const { isConnected } = useAccount();
  const walletReady = mounted && isConnected;
  const { isAdmin, isLoading: isAdminLoading } = useIsAdmin();
  const { isProfessor, isLoading: isProfessorLoading } = useIsProfessor();
  const { isIssuer, isLoading: isIssuerLoading } = useIsIssuer();

  const rolesLoading = isAdminLoading || isProfessorLoading || isIssuerLoading;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 sm:py-16 flex flex-col gap-14 portal-fade-up">
      <section className="relative text-center flex flex-col gap-6 items-center">
        <div className="portal-float inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-1.5 text-xs text-uc-muted backdrop-blur-sm">
          <span className="h-1.5 w-1.5 rounded-full bg-uc-gold shadow-[0_0_10px_rgba(232,184,109,0.8)]" />
          Ethereum-powered academic credentials
        </div>

        <div className="flex flex-col gap-4 max-w-3xl">
          <p className="portal-kicker">UnivChain Academic Portal</p>
          <h1 className="portal-page-title text-4xl sm:text-5xl">
            Your degree,{" "}
            <span className="bg-gradient-to-r from-uc-gold via-uc-violet to-uc-cyan bg-clip-text text-transparent">
              verified on-chain
            </span>
          </h1>
          <p className="text-uc-muted text-lg leading-relaxed">
            A hub-and-spoke university management system on Ethereum. Students request enrollment by
            paying a registration fee in an approved token; administrators accept or reject each
            request and register the student on-chain with a hashed matriculation number. Grades
            live in the Gradebook, graduation mints a soulbound diploma NFT, and anyone can verify
            credentials through public RPC reads—no central database required.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 sm:gap-6 w-full max-w-xl pt-2">
          {[
            { label: "Student records", value: "On-chain registry" },
            { label: "Verification", value: "Public RPC" },
            { label: "Records", value: "Immutable" },
          ].map((stat) => (
            <div key={stat.label} className="portal-stat-tile text-center">
              <p className="portal-stat-label">{stat.label}</p>
              <p className="text-sm font-semibold text-uc-text">{stat.value}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="grid sm:grid-cols-2 gap-4">
        {ROLE_CARDS.map((card) => (
          <article
            key={card.title}
            className={`portal-card p-5 bg-gradient-to-br ${card.accent}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl" aria-hidden>
                {card.icon}
              </span>
              <div>
                <h2 className="font-semibold text-uc-text mb-2">{card.title}</h2>
                <p className="text-sm text-uc-muted leading-relaxed">{card.description}</p>
              </div>
            </div>
          </article>
        ))}
      </section>

      <section className="flex flex-col gap-4">
        <div className="text-center">
          <p className="portal-section-title">Navigate the portal</p>
          <h2 className="portal-display text-2xl font-semibold text-uc-text mt-1">
            Choose your workspace
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <NavCard
            href={pages.verify}
            title="Verify diploma"
            description="Public read-only check of on-chain diploma records."
            accentClass="portal-nav-card-emerald"
          />
          <NavCard
            href={pages.student}
            title="Student portal"
            description="Enrollment, transcript, credits, and diploma access for your wallet."
            accentClass="portal-nav-card-violet"
            disabled={!walletReady}
            badge={!walletReady ? "Connect wallet" : undefined}
          />
          <NavCard
            href={pages.professor}
            title="Professor portal"
            description="Add subjects, post grades, and manage your courses on-chain."
            accentClass="portal-nav-card-indigo"
            disabled={!walletReady || rolesLoading || !isProfessor}
            badge={
              !walletReady
                ? "Connect wallet"
                : rolesLoading
                  ? "Checking role…"
                  : !isProfessor
                    ? "Professor only"
                    : undefined
            }
          />
          <NavCard
            href={pages.issuer}
            title="Issuer portal"
            description="Check eligibility and graduate students with an on-chain diploma."
            accentClass="portal-nav-card-teal"
            disabled={!walletReady || rolesLoading || !isIssuer}
            badge={
              !walletReady
                ? "Connect wallet"
                : rolesLoading
                  ? "Checking role…"
                  : !isIssuer
                    ? "Issuer only"
                    : undefined
            }
          />
          <NavCard
            href={pages.admin}
            title="Admin dashboard"
            description="Enrollments, grant roles, and assign subjects to professors."
            accentClass="portal-nav-card-blue"
            disabled={!walletReady || rolesLoading || !isAdmin}
            badge={
              !walletReady
                ? "Connect wallet"
                : rolesLoading
                  ? "Checking role…"
                  : !isAdmin
                    ? "Admin only"
                    : undefined
            }
          />
        </div>

        {mounted && !isConnected && (
          <p className="text-center text-sm text-uc-muted">
            Connect your wallet in the header to unlock role-specific portals.
          </p>
        )}
      </section>
    </div>
  );
}
