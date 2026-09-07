import React, { useEffect, useState } from 'react';
import { BookingConstraints } from '@/types';
import { MapPin, Calendar, IndianRupee, Users, Compass, CheckCircle2 } from 'lucide-react';

interface BookingStateProps {
  constraints: BookingConstraints;
}

export const BookingState: React.FC<BookingStateProps> = ({ constraints }) => {
  const [prevOrigin, setPrevOrigin] = useState<string | null>(null);
  const [highlightOrigin, setHighlightOrigin] = useState(false);

  useEffect(() => {
    if (constraints.origin && constraints.origin !== prevOrigin) {
      setHighlightOrigin(true);
      const timer = setTimeout(() => setHighlightOrigin(false), 2000);
      setPrevOrigin(constraints.origin);
      return () => clearTimeout(timer);
    }
  }, [constraints.origin, prevOrigin]);

  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 backdrop-blur-sm shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/80 mb-3">
        <div className="flex items-center space-x-2">
          <Compass className="w-4 h-4 text-violet-400" />
          <h2 className="text-sm font-semibold tracking-wide text-slate-200">Active Booking State</h2>
        </div>
        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-violet-500/10 text-violet-400 border border-violet-500/20">
          Context Preserved
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 text-xs">
        {/* Origin */}
        <div className={`p-2.5 rounded-xl border transition-all duration-500 ${
          highlightOrigin
            ? 'bg-violet-950/60 border-violet-500 shadow-md shadow-violet-500/20'
            : 'bg-slate-950/60 border-slate-800/80'
        }`}>
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-mono uppercase text-[10px]">Origin</span>
          </div>
          <p className="font-semibold text-slate-100 text-sm truncate">
            {constraints.origin ? (
              <span className={highlightOrigin ? 'text-violet-300 font-bold' : ''}>
                {constraints.origin}
              </span>
            ) : (
              <span className="text-slate-500 font-normal italic">Not set</span>
            )}
          </p>
        </div>

        {/* Destination */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-mono uppercase text-[10px]">Destination</span>
          </div>
          <p className="font-semibold text-slate-100 text-sm truncate">
            {constraints.destination || <span className="text-slate-500 font-normal italic">Not set</span>}
          </p>
        </div>

        {/* Date */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <Calendar className="w-3.5 h-3.5 text-sky-400" />
            <span className="font-mono uppercase text-[10px]">Date</span>
          </div>
          <p className="font-semibold text-slate-100 text-sm truncate">
            {constraints.date || <span className="text-slate-500 font-normal italic">Tomorrow</span>}
          </p>
        </div>

        {/* Budget */}
        <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center space-x-1.5 text-slate-400 mb-1">
            <IndianRupee className="w-3.5 h-3.5 text-amber-400" />
            <span className="font-mono uppercase text-[10px]">Budget</span>
          </div>
          <p className="font-semibold text-slate-100 text-sm truncate">
            {constraints.budget ? (
              <span className="text-amber-300 font-mono">₹{constraints.budget.toLocaleString()}</span>
            ) : (
              <span className="text-slate-500 font-normal italic">Any</span>
            )}
          </p>
        </div>

        {/* Passengers */}
        <div className="col-span-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-400">
            <Users className="w-3.5 h-3.5 text-indigo-400" />
            <span className="font-mono uppercase text-[10px]">Passengers</span>
          </div>
          <span className="font-semibold text-slate-100 font-mono">
            {constraints.passengers} Adult(s)
          </span>
        </div>

        {/* Selected Flight */}
        <div className="col-span-2 p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <div className="flex items-center space-x-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-mono uppercase text-[10px]">Selected Flight</span>
            </div>
          </div>
          {constraints.selected_flight ? (
            <div className="flex items-center justify-between text-xs text-slate-200 mt-1">
              <span className="font-semibold text-emerald-300">
                {constraints.selected_flight.airline} ({constraints.selected_flight.flight_number})
              </span>
              <span className="font-mono text-emerald-400 font-bold">
                ₹{constraints.selected_flight.price.toLocaleString()}
              </span>
            </div>
          ) : (
            <p className="text-slate-500 text-xs italic mt-0.5">No flight selected yet</p>
          )}
        </div>
      </div>
    </div>
  );
};
