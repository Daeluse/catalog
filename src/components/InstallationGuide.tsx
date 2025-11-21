"use client"

import { useState } from "react"
import { RuntimeInstallation } from "./InstallationGuide/RuntimeInstallation"
import { BuildtimeInstallation } from "./InstallationGuide/BuildtimeInstallation"
import type { Version, BuildTool } from "./InstallationGuide/types"

interface InstallationGuideProps {
  moduleName: string
  versions: Version[]
  defaultVersion?: string
}

type ApproachTab = 'runtime' | 'buildtime'

export function InstallationGuide({ moduleName, versions, defaultVersion }: InstallationGuideProps) {
  const [selectedVersionId, setSelectedVersionId] = useState(
    defaultVersion || versions[0]?._id
  )
  const [approachTab, setApproachTab] = useState<ApproachTab>('runtime')

  const selectedVersion = versions.find(v => v._id === selectedVersionId)
  const [buildTool, setBuildTool] = useState<BuildTool>(selectedVersion?.buildTool || 'webpack')
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Update build tool when version changes
  const handleVersionChange = (versionId: string) => {
    setSelectedVersionId(versionId)
    const version = versions.find(v => v._id === versionId)
    if (version) {
      setBuildTool(version.buildTool)
    }
  }

  if (!selectedVersion) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
          Installation
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          No versions available for installation instructions.
        </p>
      </div>
    )
  }

  // Check if version data is complete
  if (!selectedVersion.assets?.remoteEntry?.url || !selectedVersion.federation?.exposes) {
    return (
      <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
        <h2 className="mb-4 text-xl font-semibold text-zinc-900 dark:text-white">
          Installation
        </h2>
        <p className="text-zinc-600 dark:text-zinc-400">
          Version data is incomplete. Please ensure the version has been fully published with all required assets and federation metadata.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow-sm dark:bg-zinc-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-white">
          Installation
        </h2>
        <select
          value={selectedVersionId}
          onChange={(e) => handleVersionChange(e.target.value)}
          className="rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-900 shadow-sm hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-900 dark:border-zinc-700 dark:bg-zinc-800 dark:text-white dark:hover:bg-zinc-700"
        >
          {versions.map((v) => (
            <option key={v._id} value={v._id}>
              v{v.version}
            </option>
          ))}
        </select>
      </div>

      {/* Approach Tabs */}
      <div className="mb-6 flex gap-2 border-b border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setApproachTab('runtime')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            approachTab === 'runtime'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
        >
          Runtime Approach
        </button>
        <button
          onClick={() => setApproachTab('buildtime')}
          className={`px-4 py-2 text-sm font-medium transition-colors ${
            approachTab === 'buildtime'
              ? 'border-b-2 border-zinc-900 text-zinc-900 dark:border-zinc-50 dark:text-white'
              : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'
          }`}
        >
          Build-Time Approach
        </button>
      </div>

      {/* Runtime Approach */}
      {approachTab === 'runtime' && (
        <RuntimeInstallation
          moduleName={moduleName}
          selectedVersion={selectedVersion}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        />
      )}

      {/* Build-Time Approach */}
      {approachTab === 'buildtime' && (
        <BuildtimeInstallation
          moduleName={moduleName}
          selectedVersion={selectedVersion}
          buildTool={buildTool}
          onBuildToolChange={setBuildTool}
        />
      )}
    </div>
  )
}
