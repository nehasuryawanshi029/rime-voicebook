import React from 'react';

interface ClayButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
  children: React.ReactNode;
}

export const ClayButton = React.forwardRef<HTMLButtonElement, ClayButtonProps>(
  ({ className = '', variant = 'primary', size = 'default', children, ...props }, ref) => {
    
    const baseStyles = "inline-flex items-center justify-center font-bold tracking-wide transition-all duration-200 rounded-[20px] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-clay-accent/30 focus-visible:ring-offset-2 active:scale-[0.92] active:shadow-clayPressed";
    
    const sizeStyles = {
      sm: "h-11 px-4 text-sm",
      default: "h-14 px-6 text-base",
      lg: "h-16 px-8 text-lg"
    };
    
    const variantStyles = {
      primary: "bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] text-white shadow-clayButton hover:shadow-clayButtonHover hover:-translate-y-1",
      secondary: "bg-white text-clay-foreground shadow-clayButton hover:shadow-clayButtonHover hover:-translate-y-1",
      outline: "border-2 border-clay-accent/20 bg-transparent text-clay-accent hover:border-clay-accent hover:bg-clay-accent/5 hover:-translate-y-1",
      ghost: "text-clay-foreground hover:bg-clay-accent/10 hover:text-clay-accent"
    };

    return (
      <button
        ref={ref}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);

ClayButton.displayName = 'ClayButton';
