import React from 'react';

const Input = ({
  label,
  error,
  leftIcon,
  rightIcon,
  className = '',
  type = 'text',
  ...props
}) => {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-textSecondary mb-2">
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-textMuted">
            {leftIcon}
          </div>
        )}
        <input
          type={type}
          className={`
            w-full px-4 py-3 rounded-lg
            bg-surface border border-border
            text-textPrimary placeholder-textMuted
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary
            focus:shadow-[0_0_20px_hsl(var(--color-primary)/0.2)]
            ${leftIcon ? 'pl-10' : ''}
            ${rightIcon ? 'pr-10' : ''}
            ${error ? 'border-error focus:ring-error/50 focus:border-error' : ''}
            ${className}
          `}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-textMuted">
            {rightIcon}
          </div>
        )}
      </div>
      {error && (
        <p className="mt-2 text-sm text-error">{error}</p>
      )}
    </div>
  );
};

export default Input;