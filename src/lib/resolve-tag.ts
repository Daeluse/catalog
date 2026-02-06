import { db } from "@/lib/db-adapter";
import semver from "semver";

export class ResolveNotFoundError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveNotFoundError";
  }
}

export class ResolveRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ResolveRequestError";
  }
}

export async function resolveTag(
  name: string,
  tag: string,
): Promise<{
  tag: string;
  resolvedVersion: string;
  remoteEntry: string;
  manifestUrl: string;
  buildTool: string;
  metadata: {
    federation: {
      name: string;
      entry: string;
      exposes: string[];
    };
    isPrerelease: boolean;
    publishedAt: Date;
  };
}> {
  // Fetch all versions for the module
  const versions = await db.versions.find({ moduleName: name });

  if (versions.length === 0) {
    throw new ResolveNotFoundError("No versions found for this module");
  }

  let selectedVersion = null;

  // Handle special tags
  if (tag === "latest") {
    // Get the latest stable version (exclude prereleases)
    const stableVersions = versions.filter(
      (v) => !v.isPrerelease && v.version && semver.valid(v.version),
    );
    if (stableVersions.length === 0) {
      throw new ResolveNotFoundError("No stable versions available");
    }
    stableVersions.sort((a, b) => semver.rcompare(a.version, b.version));
    selectedVersion = stableVersions[0];
  } else if (tag === "next") {
    // Get the latest version including prereleases
    const validVersions = versions.filter(
      (v) => v.version && semver.valid(v.version),
    );
    if (validVersions.length === 0) {
      throw new ResolveNotFoundError("No valid versions available");
    }
    validVersions.sort((a, b) => semver.rcompare(a.version, b.version));
    selectedVersion = validVersions[0];
  } else {
    // Try to match against semver range or specific version
    const validVersions = versions.filter(
      (v) => v.version && semver.valid(v.version),
    );

    if (validVersions.length === 0) {
      throw new ResolveNotFoundError("No valid versions available");
    }

    // Check if tag is a specific valid version
    if (semver.valid(tag)) {
      selectedVersion = validVersions.find((v) => v.version === tag) || null;
      if (!selectedVersion) {
        throw new ResolveNotFoundError(`Version ${tag} not found`);
      }
    } else {
      // Try to match as a semver range
      try {
        const versionStrings = validVersions.map((v) => v.version);
        const matchedVersion = semver.maxSatisfying(versionStrings, tag);

        if (matchedVersion == null) {
          throw new ResolveNotFoundError(
            `No version matches the range: ${tag}`,
          );
        }

        selectedVersion =
          validVersions.find((v) => v.version === matchedVersion) || null;
      } catch (e) {
        if (e instanceof ResolveNotFoundError) {
          throw e;
        }
        throw new ResolveRequestError(`Invalid semver range: ${tag}`);
      }
    }
  }

  if (!selectedVersion) {
    throw new ResolveNotFoundError("Unable to resolve version");
  }

  // Return the resolution result
  return {
    tag,
    resolvedVersion: selectedVersion.version,
    remoteEntry: selectedVersion.assets.remoteEntry.url,
    manifestUrl:
      selectedVersion.federation?.manifestUrl ||
      selectedVersion.assets.manifest?.url,
    buildTool: selectedVersion.buildTool,
    metadata: {
      federation: {
        name: selectedVersion.federation?.name,
        entry: selectedVersion.federation?.entry,
        exposes: selectedVersion.federation?.exposes
          ? Object.keys(selectedVersion.federation.exposes)
          : [],
      },
      isPrerelease: selectedVersion.isPrerelease,
      publishedAt: selectedVersion.publishedAt,
    },
  };
}
