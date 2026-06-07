import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  icon?: ReactNode;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, id, className = '', ...rest }, ref) => (
    <div>
      {label && (
        <label htmlFor={id} className="mb-1.5 block text-[13px] font-semibold text-ink-soft">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-faint [&_svg]:h-[18px] [&_svg]:w-[18px]">
            {icon}
          </span>
        )}
        <input
          ref={ref}
          id={id}
          className={`h-11 w-full rounded-xl border bg-canvas px-3 text-[15px] font-medium text-ink outline-none transition placeholder:font-normal placeholder:text-ink-faint hover:border-border-strong focus:bg-surface focus:ring-4 ${
            icon ? 'pl-11' : ''
          } ${
            error
              ? 'border-danger focus:border-danger focus:ring-danger/15'
              : 'border-border focus:border-accent focus:ring-accent/15'
          } ${className}`}
          {...rest}
        />
      </div>
      {error && <p className="mt-1 text-[12px] font-medium text-danger">{error}</p>}
    </div>
  ),
);

Input.displayName = 'Input';
export default Input;
