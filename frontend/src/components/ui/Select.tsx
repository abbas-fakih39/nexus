import { forwardRef, type SelectHTMLAttributes } from 'react';

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, id, className = '', children, ...rest }, ref) => (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          {label}
        </label>
      )}
      <div className="relative">
        <select
          ref={ref}
          id={id}
          className={`h-11 w-full appearance-none rounded-xl border bg-canvas pl-3 pr-10 text-[15px] font-medium text-ink outline-none transition hover:border-border-strong focus:bg-surface focus:ring-4 ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/15'
              : 'border-border focus:border-accent focus:ring-accent/15'
          } ${className}`}
          {...rest}
        >
          {children}
        </select>
        <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-faint">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </span>
      </div>
      {error && <p className="mt-1 text-[12px] font-medium text-danger">{error}</p>}
    </div>
  ),
);

Select.displayName = 'Select';
export default Select;
