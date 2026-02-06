import { ElementType, ComponentPropsWithoutRef } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "outlined";
  as?: ElementType;
}

export function Card({
  children,
  className,
  variant = "default",
  as: Component = "div",
  ...props
}: CardProps & Omit<ComponentPropsWithoutRef<ElementType>, keyof CardProps>) {
  return (
    <Component
      className={cn(
        "p-4",
        "rounded-lg",
        variant === "default" && "bg-white shadow-sm",
        variant === "outlined" && "border border-zinc-200 bg-white",
        className,
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
