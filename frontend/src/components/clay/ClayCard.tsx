import React from 'react';

interface ClayCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  variant?: 'glass' | 'solid';
  hoverEffect?: boolean;
}

export function ClayCard({
  children,
  className = '',
  variant = 'glass',
  hoverEffect = true,
  ...props
}: ClayCardProps) {
  const baseClasses = "relative overflow-hidden rounded-[32px] text-clay-foreground shadow-clayCard transition-all duration-500";
  const bgClasses = variant === 'glass' ? "bg-white/70 backdrop-blur-xl" : "bg-white";
  const hoverClasses = hoverEffect ? "hover:-translate-y-2 hover:shadow-clayDeep" : "";

  return (
    <div 
      className={`${baseClasses} ${bgClasses} ${hoverClasses} ${className}`}
      {...props}
    >
      <div className="relative z-10 flex h-full flex-col">
        {children}
      </div>
    </div>
  );
}
