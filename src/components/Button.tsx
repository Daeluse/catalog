import { forwardRef, ElementType, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

type ButtonOwnProps = {
  variant?: "primary" | "secondary" | "danger" | "ghost";
  size?: "sm" | "md" | "lg";
  fullWidth?: boolean;
  as?: ElementType;
};

type LinkOwnProps = {
  href?: string;
}

type ButtonProps<T extends ElementType = "button"> = ButtonOwnProps &
  LinkOwnProps & 
  Omit<ComponentPropsWithoutRef<T>, keyof ButtonOwnProps>;

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary" as const,
      size = "md" as const,
      fullWidth = false,
      disabled,
      as: Component = "button",
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      "inline-flex items-center justify-center gap-2 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50";

    const variants = {
      primary:
        "bg-action-primary text-action-reversed hover:bg-action-primary-active",
      secondary:
        "border border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-50",
      danger: "bg-red-600 text-white hover:bg-red-700",
      ghost: "text-zinc-700 hover:bg-zinc-100",
    };

    const sizes = {
      sm: "px-3 py-1.5 text-xs",
      md: "px-4 py-2 text-sm",
      lg: "px-6 py-3 text-base",
    };

    const variantClass =
      variants[variant as keyof typeof variants] || variants.primary;
    const sizeClass = sizes[size as keyof typeof sizes] || sizes.md;

    return (
      <Component
        ref={ref}
        className={cn(
          baseStyles,
          variantClass,
          sizeClass,
          fullWidth && "w-full",
          className,
        )}
        disabled={disabled}
        {...props}
      />
    );
  },
);

Button.displayName = "Button";

export { Button };
