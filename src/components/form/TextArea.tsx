import { forwardRef, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          "w-full rounded-md border bg-white px-3 py-2 text-sm text-zinc-900 placeholder-zinc-400 transition-colors focus:outline-none focus:ring-1",
          error
            ? "border-red-300 focus:border-red-900 focus:ring-red-900"
            : "border-zinc-300 focus:border-zinc-900 focus:ring-zinc-900",
          props.disabled && "cursor-not-allowed opacity-50",
          className,
        )}
        {...props}
      />
    );
  },
);

TextArea.displayName = "TextArea";

export { TextArea };
