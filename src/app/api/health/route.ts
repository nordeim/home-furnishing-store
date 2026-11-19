import { db } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

// Task 123 F-9: the probe now speaks the same envelope as every other route
// ({ ok: true, data } | { ok: false, error }) — AGENTS #4 / CLAUDE / README
// all claim "every route"; the bare { ok: true } shape was the one deviating
// outlier. Consumers only check the HTTP status (the Playwright webServer
// readiness probe), so the body change is additive.
export async function GET() {
  try {
    await db.execute(sql`select 1`);
    return Response.json({ ok: true, data: { db: "up" } });
  } catch {
    return Response.json(
      { ok: false, error: { code: "DB_DOWN", message: "Database unreachable — the storefront degrades to the static catalogue." } },
      { status: 500 },
    );
  }
}
