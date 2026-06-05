import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

type IndexerResponse = {
  grades: Array<{
    student: string;
    subjectId: number;
    subjectName: string;
    credits: number;
    grade: number;
    gradedAt: number | null;
    subjectActive: boolean;
  }>;
  syncedAt?: number;
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const professor = searchParams.get("professor");

  if (!professor) {
    return NextResponse.json({ error: "Missing query parameter: professor" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${INDEXER_URL}/api/professor/grades?professor=${encodeURIComponent(professor)}`,
      { cache: "no-store" }
    );

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
