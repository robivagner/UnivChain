import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

type IndexerResponse = {
  pending: Array<{ student: string; requestedAtBlock: number | null }>;
  syncedAt?: number;
};

export async function GET() {
  try {
    const res = await fetch(`${INDEXER_URL}/api/pending-enrollments`, {
      cache: "no-store",
    });

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        {
          error: `Indexer returned ${res.status}`,
          detail: body,
        },
        { status: 502 }
      );
    }

    const data = (await res.json()) as IndexerResponse;
    return NextResponse.json(data);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Indexer unavailable",
        detail: message,
        hint: "Run: make indexer-dev (after make local)",
      },
      { status: 503 }
    );
  }
}
