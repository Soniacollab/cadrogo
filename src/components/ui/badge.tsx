import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-1.5 py-0.5 text-2xs font-semibold tracking-wide",
  {
    variants: {
      variant: {
        default: "border-transparent bg-accent/10 text-accent",
        secondary: "border-line bg-surface-muted text-muted",
        outline: "border-line text-muted",
        success: "border-transparent bg-success/15 text-success",
        warning:
          "border-warning/40 bg-warning/15 text-warning shadow-[inset_0_0_0_1px_rgba(181,71,8,0.12)]",
        danger:
          "border-danger/40 bg-danger/15 text-danger shadow-[inset_0_0_0_1px_rgba(180,35,24,0.12)]",
        critical:
          "border-danger/60 bg-danger text-white shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
