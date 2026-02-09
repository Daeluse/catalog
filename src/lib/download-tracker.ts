import { db } from "@/lib/db-adapter";

/**
 * Record a download by incrementing counters on both the Module and Version.
 * Failures are silently caught — tracking must never break the resolve response.
 */
export async function recordDownload(
  moduleName: string,
  versionId: string,
): Promise<void> {
  try {
    await Promise.all([
      db.modules.updateOne({ name: moduleName }, { $inc: { totalDownloads: 1 } }),
      db.versions.updateOne({ _id: versionId }, { $inc: { downloadCount: 1 } }),
    ]);
  } catch {
    // Intentionally swallowed — download tracking must not affect the resolve response
  }
}
