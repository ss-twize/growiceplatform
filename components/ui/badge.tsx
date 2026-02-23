import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva("inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium", {
  variants: {
    variant: {
      default: "border-border bg-black text-white",
      success: "border-transparent bg-success text-black",
      warning: "border-transparent bg-warning text-black",
      danger: "border-transparent bg-danger text-black"
    }
  },
  defaultVariants: {
    variant: "default"
  }
});

function Badge({ className, variant, ...props }: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
