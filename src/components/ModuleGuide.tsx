"use client";

import { useState } from "react";
import { RuntimeInstallation } from "./InstallationGuide/RuntimeInstallation";
import { BuildtimeInstallation } from "./InstallationGuide/BuildtimeInstallation";
import { IVersion } from "@/models";
import { BuildTool } from "@/lib/constants";
import MarkdownComponent from "./MarkDown";

interface ModuleGuideProps {
  moduleName: string;
  versions: IVersion[];
  defaultVersion?: string;
}

type GettingStartedTab = "runtime" | "buildtime" | "readme";

export function ModuleGuide({
  moduleName,
  versions,
  defaultVersion,
}: ModuleGuideProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(
    defaultVersion || versions[0]?._id,
  );
  const [gettingStartedTab, setGettingStartedTab] =
    useState<GettingStartedTab>("readme");

  const selectedVersion = versions.find((v) => v._id === selectedVersionId);
  const [buildTool, setBuildTool] = useState<BuildTool>(
    selectedVersion?.buildTool || "webpack",
  );
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update build tool when version changes
  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId);
    const version = versions.find((v) => v._id.toString() === versionId);
    if (version) {
      setBuildTool(version.buildTool);
    }
  };

  if (!selectedVersion) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Installation
        </h2>
        <p className="text-zinc-600">
          No versions available for installation instructions.
        </p>
      </div>
    );
  }

  // Check if version data is complete
  if (
    !selectedVersion.assets?.remoteEntry?.url ||
    !selectedVersion.federation?.exposes
  ) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900">
          Installation
        </h2>
        <p className="text-zinc-600">
          Version data is incomplete. Please ensure the version has been fully
          published with all required assets and federation metadata.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900">Getting Started</h2>
        <select
          value={selectedVersionId.toString()}
          onChange={(e) => handleVersionChange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900"
        >
          {versions.map((v) => (
            <option key={v._id.toString()} value={v._id.toString()}>
              v{v.version}
            </option>
          ))}
        </select>
      </div>

      {/* Approach Tabs */}
      <div className="mb-6 flex gap-2 border-b border-zinc-200">
        <button
          onClick={() => setGettingStartedTab("readme")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            gettingStartedTab === "readme"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Build-Time Approach
        </button>
        <button
          onClick={() => setGettingStartedTab("runtime")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            gettingStartedTab === "runtime"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Runtime Approach
        </button>
        <button
          onClick={() => setGettingStartedTab("buildtime")}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            gettingStartedTab === "buildtime"
              ? "border-b-2 border-zinc-900 text-zinc-900"
              : "text-zinc-600 hover:text-zinc-900"
          }`}
        >
          Build-Time Approach
        </button>
      </div>

      {/* Readme */}
      {gettingStartedTab === "readme" && (
        <MarkdownComponent
          content={selectedVersion.readme || "No readme found."}
        />
      )}

      {/* Runtime Approach */}
      {gettingStartedTab === "runtime" && (
        <RuntimeInstallation
          moduleName={moduleName}
          selectedVersion={selectedVersion}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        />
      )}

      {/* Build-Time Approach */}
      {gettingStartedTab === "buildtime" && (
        <BuildtimeInstallation
          moduleName={moduleName}
          selectedVersion={selectedVersion}
          buildTool={buildTool}
          onBuildToolChange={setBuildTool}
        />
      )}
    </div>
  );
}
