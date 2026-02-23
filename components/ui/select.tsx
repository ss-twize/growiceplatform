import * as React from "react";
import { cn } from "@/lib/utils";

export type SelectOption = {
  value: string;
  label: string;
};

type Props = React.SelectHTMLAttributes<HTMLSelectElement> & {
  options: SelectOption[];
};

const Select = React.forwardRef<HTMLSelectElement, Props>(({ className, options, ...props }, ref) => {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-md border border-border bg-black px-3 text-sm text-white focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent",
        className
      )}
      {...props}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
Select.displayName = "Select";

export { Select };
