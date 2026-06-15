/**
 * Client save sync via /api/saves (no server-action page refresh).
 * Location: lib/client/syncSaveListing.ts
 */
export type SaveSyncResult =
  | { ok: true; saved: boolean }
  | { ok: false; error: string };

export async function syncSaveListing(
  listingId: string,
  shouldSave: boolean,
): Promise<SaveSyncResult> {
  try {
    const res = await fetch("/api/saves", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingId, shouldSave }),
    });
    const data = (await res.json()) as SaveSyncResult;
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.ok ? "Could not update saved." : data.error,
      };
    }
    return data;
  } catch {
    return { ok: false, error: "Could not update saved." };
  }
}
