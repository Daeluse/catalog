"use client";

import { useState } from "react";
import { X, Plus } from "lucide-react";

interface OriginManagerProps {
  origins: string[];
  onChange: (origins: string[]) => void;
  error?: string;
}

export function OriginManager({
  origins,
  onChange,
  error,
}: OriginManagerProps) {
  const [newOrigin, setNewOrigin] = useState("");
  const [validationError, setValidationError] = useState("");

  const validateOrigin = (origin: string): boolean => {
    try {
      const url = new URL(origin);
      if (!["http:", "https:"].includes(url.protocol)) {
        setValidationError("Origin must use http:// or https://");
        return false;
      }
      if (!url.hostname) {
        setValidationError("Origin must have a valid hostname");
        return false;
      }
      return true;
    } catch {
      setValidationError("Invalid URL format");
      return false;
    }
  };

  const handleAddOrigin = () => {
    const trimmed = newOrigin.trim();

    if (!trimmed) {
      setValidationError("Origin cannot be empty");
      return;
    }

    if (origins.includes(trimmed)) {
      setValidationError("This origin is already added");
      return;
    }

    if (!validateOrigin(trimmed)) {
      return;
    }

    onChange([...origins, trimmed]);
    setNewOrigin("");
    setValidationError("");
  };

  const handleRemoveOrigin = (index: number) => {
    const updated = origins.filter((_, i) => i !== index);
    onChange(updated);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddOrigin();
    }
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-zinc-900">
        Allowed Origins
      </label>
      <p className="text-sm text-zinc-600">
        Enter the URLs where your application will run (e.g.,
        https://app.example.com, http://localhost:3000)
      </p>

      {/* Input for new origin */}
      <div className="flex gap-2">
        <input
          type="url"
          value={newOrigin}
          onChange={(e) => {
            setNewOrigin(e.target.value);
            setValidationError("");
          }}
          onKeyDown={handleKeyDown}
          placeholder="https://example.com"
          className="flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
        />
        <button
          type="button"
          onClick={handleAddOrigin}
          className="flex items-center gap-1 rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 "
        >
          <Plus className="h-4 w-4" />
          Add
        </button>
      </div>

      {/* Validation error */}
      {validationError && (
        <p className="text-sm text-red-600">{validationError}</p>
      )}

      {/* General error from parent */}
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* List of origins */}
      {origins.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-zinc-700">
            Current origins ({origins.length}):
          </p>
          <ul className="space-y-1">
            {origins.map((origin, index) => (
              <li
                key={index}
                className="flex items-center justify-between rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2"
              >
                <span className="text-sm text-zinc-900">{origin}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveOrigin(index)}
                  className="ml-2 rounded p-1 text-zinc-500 hover:bg-zinc-200 hover:text-zinc-900"
                  aria-label="Remove origin"
                >
                  <X className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {origins.length === 0 && (
        <p className="text-sm text-zinc-500">
          No origins added yet. Add at least one origin to continue.
        </p>
      )}
    </div>
  );
}
