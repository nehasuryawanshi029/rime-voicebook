import React from 'react';

export function ClayBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden -z-10 bg-clay-canvas">
      {/* Primary Violet Blob */}
      <div className="absolute h-[60vh] w-[60vh] rounded-full blur-3xl bg-[#7C3AED]/10 -top-[10%] -left-[10%] animate-clay-float" />
      
      {/* Secondary Pink Blob */}
      <div className="absolute h-[60vh] w-[60vh] rounded-full blur-3xl bg-[#DB2777]/10 -right-[10%] top-[20%] animate-clay-float-delayed animation-delay-2000" />
      
      {/* Tertiary Blue Blob */}
      <div className="absolute h-[70vh] w-[70vh] rounded-full blur-3xl bg-[#0EA5E9]/10 left-[20%] -bottom-[20%] animate-clay-float-slow animation-delay-4000" />
    </div>
  );
}
