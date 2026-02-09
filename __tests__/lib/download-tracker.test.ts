import { describe, it, expect, beforeEach } from "vitest";
import { recordDownload } from "../../src/lib/download-tracker";
import { resetMockDB, testData } from "../helpers/mock-db";
import { db } from "../../src/lib/db-adapter";

describe("recordDownload", () => {
  beforeEach(async () => {
    await resetMockDB();
    process.env.USE_MOCKS = "true";
  });

  it("should increment totalDownloads on the module", async () => {
    await db.modules.insertOne(
      testData.createModule({ name: "@test/module", totalDownloads: 0 }),
    );
    const version = await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        version: "1.0.0",
        downloadCount: 0,
      }) as any,
    );

    await recordDownload("@test/module", version.insertedId);

    const mod = await db.modules.findOne({ name: "@test/module" });
    expect(mod!.totalDownloads).toBe(1);
  });

  it("should increment downloadCount on the version", async () => {
    await db.modules.insertOne(
      testData.createModule({ name: "@test/module", totalDownloads: 0 }),
    );
    const version = await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        version: "1.0.0",
        downloadCount: 0,
      }) as any,
    );

    await recordDownload("@test/module", version.insertedId);

    const ver = await db.versions.findOne({ _id: version.insertedId });
    expect(ver!.downloadCount).toBe(1);
  });

  it("should increment cumulatively on multiple calls", async () => {
    await db.modules.insertOne(
      testData.createModule({ name: "@test/module", totalDownloads: 0 }),
    );
    const version = await db.versions.insertOne(
      testData.createVersion({
        moduleName: "@test/module",
        version: "1.0.0",
        downloadCount: 0,
      }) as any,
    );

    await recordDownload("@test/module", version.insertedId);
    await recordDownload("@test/module", version.insertedId);
    await recordDownload("@test/module", version.insertedId);

    const mod = await db.modules.findOne({ name: "@test/module" });
    expect(mod!.totalDownloads).toBe(3);

    const ver = await db.versions.findOne({ _id: version.insertedId });
    expect(ver!.downloadCount).toBe(3);
  });

  it("should not throw when module does not exist", async () => {
    await expect(
      recordDownload("@nonexistent/module", "nonexistent-version-id"),
    ).resolves.toBeUndefined();
  });

  it("should not throw when version does not exist", async () => {
    await db.modules.insertOne(
      testData.createModule({ name: "@test/module" }),
    );

    await expect(
      recordDownload("@test/module", "nonexistent-version-id"),
    ).resolves.toBeUndefined();
  });
});
