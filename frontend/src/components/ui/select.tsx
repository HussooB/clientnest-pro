import * as React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.HTMLAttributes<HTMLSelectElement> {
  options: SelectOption[];
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  className?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, value, onChange, className, ...props }, ref) => {
    return (
      <select
        ref={ref}
        className="flex h-9 w-full rounded-md border border-zinc-200 bg-transparent px-3 py-1 text-sm placeholder:text-zinc-500 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-950 disabled:cursor-not-allowed disabled:opacity-50 appearance-none bg-zinc-900 right-3 text-zinc-50"
        {...props}
        onChange={(e) => onChange?.(e)}
      >
        <option value="" disabled>Select option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  }
);
Select.displayName = 'Select';

export { Select };