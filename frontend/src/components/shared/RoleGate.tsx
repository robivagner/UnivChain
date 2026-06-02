import {
  alertInfoClass,
  alertWarningClass,
  portalCardClass,
} from "@/lib/ui/portalClasses";

export function RoleGateConnect({ title }: { title: string }) {
  return (
    <div className={`${portalCardClass} max-w-lg mx-auto text-center`}>
      <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-xl">
        🔗
      </div>
      <p className="text-uc-text font-medium mb-1">Wallet required</p>
      <p className="text-sm text-uc-muted">Connect your wallet to access {title}.</p>
    </div>
  );
}

export function RoleGateLoading() {
  return (
    <div className={`${portalCardClass} max-w-lg mx-auto text-center`}>
      <div className="mx-auto mb-4 h-10 w-10 rounded-full border-2 border-uc-gold/30 border-t-uc-gold animate-spin" />
      <p className="text-sm text-uc-muted">Checking role…</p>
    </div>
  );
}

export function RoleGateDenied({
  title,
  roleLabel,
  connected,
  hint,
}: {
  title: string;
  roleLabel: string;
  connected?: string;
  hint?: string;
}) {
  return (
    <div className={`${alertWarningClass} max-w-lg mx-auto`}>
      <p className="font-semibold mb-2 text-amber-100">{title}</p>
      <p className="mb-2 text-amber-50/90">
        Connected account does not have <span className="font-mono">{roleLabel}</span> on
        UniversityCore.
      </p>
      {connected && (
        <p className="font-mono text-xs break-all text-amber-100/80">Connected: {connected}</p>
      )}
      {hint && <p className="text-xs mt-2 text-amber-100/75">{hint}</p>}
    </div>
  );
}

export function RoleGateMissingDeployment() {
  return (
    <div className={`${alertInfoClass} max-w-lg mx-auto`}>
      This network is not configured. Use Anvil chain <span className="font-mono">31337</span> and
      run <span className="font-mono">make local</span>.
    </div>
  );
}
