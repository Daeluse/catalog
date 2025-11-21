import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { FormField, Input, TextArea, Select } from '@/components/form'
import { BUILD_TOOLS } from '@/lib/constants'

interface VersionData {
  version: string
  buildTool: string
  buildToolVersion: string
  changelog: string
}

interface StepVersionInfoProps {
  versionData: VersionData
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => void
  onNext: () => void
}

export default function StepVersionInfo({ versionData, onChange, onNext }: StepVersionInfoProps) {
  const isValid = versionData.version && versionData.buildToolVersion

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <h2 className="mb-6 text-xl font-semibold text-zinc-900 dark:text-white">
          Version Information
        </h2>

        <div className="space-y-4">
          <FormField
            label="Version Number"
            required
            htmlFor="version"
            description="Use semantic versioning (e.g., 1.0.0, 1.2.3-beta.1)"
          >
            <Input
              id="version"
              name="version"
              required
              value={versionData.version}
              onChange={onChange}
              placeholder="1.0.0"
            />
          </FormField>

          <FormField label="Build Tool" required htmlFor="buildTool">
            <Select
              id="buildTool"
              name="buildTool"
              value={versionData.buildTool}
              onChange={onChange}
              options={BUILD_TOOLS}
            />
          </FormField>

          <FormField label="Build Tool Version" required htmlFor="buildToolVersion">
            <Input
              id="buildToolVersion"
              name="buildToolVersion"
              required
              value={versionData.buildToolVersion}
              onChange={onChange}
              placeholder="5.88.2"
            />
          </FormField>

          <FormField label="Changelog" htmlFor="changelog">
            <TextArea
              id="changelog"
              name="changelog"
              rows={4}
              value={versionData.changelog}
              onChange={onChange}
              placeholder="What's new in this version?"
            />
          </FormField>
        </div>
      </Card>

      <div className="flex justify-end">
        <Button onClick={onNext} disabled={!isValid}>
          Next: Upload Assets & Config
        </Button>
      </div>
    </div>
  )
}
