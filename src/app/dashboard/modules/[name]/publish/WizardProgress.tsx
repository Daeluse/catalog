interface WizardProgressProps {
  currentStep: number;
  steps: Array<{ num: number; label: string }>;
}

export default function WizardProgress({
  currentStep,
  steps,
}: WizardProgressProps) {
  return (
    <div className="mb-8 flex items-center justify-center gap-4">
      {steps.map((s, idx, arr) => (
        <div key={s.num} className="flex items-center gap-2">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
              currentStep >= s.num
                ? "bg-zinc-900 text-white"
                : "bg-zinc-200 text-zinc-600"
            }`}
          >
            {s.num}
          </div>
          <span
            className={`text-sm ${
              currentStep >= s.num ? "text-zinc-900" : "text-zinc-600"
            }`}
          >
            {s.label}
          </span>
          {idx < arr.length - 1 && (
            <svg
              className="ml-2 h-4 w-4 text-zinc-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
          )}
        </div>
      ))}
    </div>
  );
}
