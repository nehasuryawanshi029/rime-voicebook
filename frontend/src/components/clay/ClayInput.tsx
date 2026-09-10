import React from 'react';

interface ClayInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  // Add any custom props here if needed
}

export const ClayInput = React.forwardRef<HTMLInputElement, ClayInputProps>(
  ({ className = '', ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={`flex w-full border-0 bg-[#EFEBF5] px-6 py-4 text-clay-foreground text-lg shadow-clayPressed rounded-[20px] transition-all duration-200 placeholder:text-clay-muted focus:bg-white focus:outline-none focus:ring-4 focus:ring-clay-accent/20 focus:shadow-clayCard ${className}`}
        {...props}
      />
    );
  }
);

ClayInput.displayName = 'ClayInput';
