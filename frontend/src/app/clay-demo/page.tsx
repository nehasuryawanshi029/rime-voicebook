import React from 'react';
import { ClayBackground } from '@/components/clay/ClayBackground';
import { ClayCard } from '@/components/clay/ClayCard';
import { ClayButton } from '@/components/clay/ClayButton';
import { ClayInput } from '@/components/clay/ClayInput';

export default function ClayDemoPage() {
  return (
    <main className="relative min-h-screen p-6 sm:p-12 md:p-24 overflow-hidden font-sans">
      <ClayBackground />
      
      <div className="mx-auto max-w-7xl relative z-10 space-y-24">
        {/* Hero Section */}
        <section className="text-center space-y-8 max-w-4xl mx-auto">
          <div className="inline-flex items-center justify-center px-4 py-2 rounded-full bg-white/50 backdrop-blur-md shadow-clayCard mb-4 hover:-translate-y-1 transition-transform">
            <span className="w-2 h-2 rounded-full bg-clay-success mr-2 animate-clay-breathe" />
            <span className="text-sm font-bold tracking-wide text-clay-foreground uppercase" style={{ fontFamily: 'var(--font-nunito)' }}>
              Design System v2.0
            </span>
          </div>
          
          <h1 
            className="text-5xl sm:text-6xl md:text-7xl font-black tracking-tight leading-[1.1] text-clay-foreground"
            style={{ fontFamily: 'var(--font-nunito)' }}
          >
            Welcome to the <br />
            <span className="clay-text-gradient">Digital Clay</span> Universe
          </h1>
          
          <p className="text-lg md:text-xl text-clay-muted leading-relaxed max-w-2xl mx-auto font-medium">
            This high-fidelity claymorphism system uses advanced multi-layer shadow stacks to simulate physical weight, buoyancy, and tactility.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
            <ClayButton size="lg" className="w-full sm:w-auto">
              Start Exploring
            </ClayButton>
            <ClayButton variant="secondary" size="lg" className="w-full sm:w-auto">
              Read the Docs
            </ClayButton>
          </div>
        </section>

        {/* Components Grid */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          
          {/* Bento Box: Interactive Elements */}
          <ClayCard className="md:col-span-2 md:row-span-2 p-8 sm:p-12">
            <h2 className="text-3xl font-extrabold mb-8" style={{ fontFamily: 'var(--font-nunito)' }}>Interactive Physics</h2>
            <p className="text-clay-muted mb-12 max-w-lg text-lg leading-relaxed">
              Every element in this universe responds to your touch. Buttons don't just change color; they actively compress and squish into the surface.
            </p>
            
            <div className="space-y-8 max-w-md">
              <div>
                <label className="block text-sm font-bold mb-3 text-clay-muted uppercase tracking-wider" style={{ fontFamily: 'var(--font-nunito)' }}>Email Address</label>
                <ClayInput type="email" placeholder="hello@digitalclay.com" />
              </div>
              
              <div className="flex flex-wrap gap-4 pt-4">
                <ClayButton variant="primary">Primary Action</ClayButton>
                <ClayButton variant="outline">Outline</ClayButton>
                <ClayButton variant="ghost">Ghost Link</ClayButton>
              </div>
            </div>
          </ClayCard>

          {/* Stat Orb */}
          <ClayCard variant="solid" className="flex flex-col items-center justify-center p-12 text-center hover:scale-[1.02] hover:-translate-y-4">
            <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#A78BFA] to-[#7C3AED] shadow-clayButton flex items-center justify-center animate-clay-breathe mb-8">
              <span className="text-4xl font-black text-white" style={{ fontFamily: 'var(--font-nunito)' }}>99%</span>
            </div>
            <h3 className="text-xl font-bold mb-2" style={{ fontFamily: 'var(--font-nunito)' }}>User Joy</h3>
            <p className="text-clay-muted text-sm font-medium">Measured objectively through physics.</p>
          </ClayCard>

          {/* Simple Information Card */}
          <ClayCard className="p-8">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#FCD34D] to-[#F59E0B] shadow-clayButton flex items-center justify-center mb-6">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold mb-4" style={{ fontFamily: 'var(--font-nunito)' }}>Lightning Fast</h3>
            <p className="text-clay-muted leading-relaxed">
              Zero gravity physics means elements float effortlessly across the screen without lag.
            </p>
          </ClayCard>

        </section>
      </div>
    </main>
  );
}
