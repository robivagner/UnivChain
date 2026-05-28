/** Ask the indexer to scan new blocks and reconcile pending rows immediately. */
export async function triggerIndexerSync(): Promise<void> {
  const res = await fetch("/api/admin/sync-indexer", { method: "POST" });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string; hint?: string };
    const parts = [body.error, body.hint].filter(Boolean).join(" — ");
    throw new Error(parts || `Indexer sync failed (${res.status})`);
  }
}
