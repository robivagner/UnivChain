import { NextResponse } from "next/server";

const INDEXER_URL = process.env.INDEXER_URL ?? "http://127.0.0.1:8787";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const student = searchParams.get("student");

  if (!student) {
    return NextResponse.json({ error: "Missing query parameter: student" }, { status: 400 });
  }

  try {
    const res = await fetch(
      `${INDEXER_URL}/api/student/transcript?student=${encodeURIComponent(student)}`,
      { cache: "no-store" }
    );

    if (!res.ok) {
      const body = await res.text();
      return NextResponse.json(
        { error: `Indexer returned ${res.status}`, detail: body },
        { status: 502 }
      );
    }

    return NextResponse.json(await res.json());
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
