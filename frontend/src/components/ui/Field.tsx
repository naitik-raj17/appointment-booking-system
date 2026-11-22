import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

interface FieldShellProps {
  label?: string;
  error?: string;
  hint?: string;
  id: string;
  children: ReactNode;
  className?: string;
}

function FieldShell({ label, error, hint, id, children, className = '' }: FieldShellProps) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={id} className="label">
          {label}
        </label>
      )}
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      ) : null}
    </div>
  );
}

type Common = { label?: string; error?: string; hint?: string; wrapperClassName?: string };

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement> & Common>(function Input(
  { label, error, hint, wrapperClassName, className = '', id, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fieldId} className={wrapperClassName}>
      <input
        ref={ref}
        id={fieldId}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${fieldId}-error` : undefined}
        className={`input ${error ? 'input-error' : ''} ${className}`}
        {...rest}
      />
    </FieldShell>
  );
});

export const Select = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement> & Common>(function Select(
  { label, error, hint, wrapperClassName, className = '', id, children, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fieldId} className={wrapperClassName}>
      <select ref={ref} id={fieldId} aria-invalid={Boolean(error)} className={`input pr-8 ${error ? 'input-error' : ''} ${className}`} {...rest}>
        {children}
      </select>
    </FieldShell>
  );
});

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement> & Common>(function Textarea(
  { label, error, hint, wrapperClassName, className = '', id, ...rest },
  ref
) {
  const autoId = useId();
  const fieldId = id || autoId;
  return (
    <FieldShell label={label} error={error} hint={hint} id={fieldId} className={wrapperClassName}>
      <textarea ref={ref} id={fieldId} aria-invalid={Boolean(error)} className={`input min-h-[80px] ${error ? 'input-error' : ''} ${className}`} {...rest} />
    </FieldShell>
  );
});
