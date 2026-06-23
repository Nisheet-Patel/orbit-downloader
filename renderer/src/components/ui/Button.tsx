import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'purple';
  size?: 'sm' | 'md';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', size = 'md', className = '', children, ...props }, ref) => {
    const base = 'inline-flex items-center justify-center gap-1.5 font-semibold rounded-md transition-all duration-150 select-none';
    const variants = {
      primary: 'bg-[#E8002A] text-white hover:bg-[#C5001F] hover:-translate-y-px active:translate-y-0',
      secondary: 'bg-[var(--color-surface)] text-[var(--color-text-secondary)] border border-[var(--color-border)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border)]',
      purple: 'bg-[#6B3DEA] text-white hover:bg-[#5530C9] hover:-translate-y-px active:translate-y-0',
    };
    const sizes = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-sm',
    };
    const disabledClasses = props.disabled ? 'opacity-45 cursor-not-allowed pointer-events-none' : '';
    return (
      <button ref={ref} className={`${base} ${variants[variant]} ${sizes[size]} ${disabledClasses} ${className}`} {...props}>
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';
