import React from 'react';
import { Flight } from '@/types';
import { Plane, Clock, Check, ArrowRight } from 'lucide-react';

interface FlightCardProps {
  flight: Flight;
  isSelected: boolean;
  onSelect: (flight: Flight) => void;
  onBook: (flight: Flight) => void;
}

export const FlightCard: React.FC<FlightCardProps> = ({
  flight,
  isSelected,
  onSelect,
  onBook,
}) => {
  return (
    <div
      className={`rounded-xl p-4 transition-all duration-200 border ${
        isSelected
          ? 'bg-violet-950/40 border-violet-500 shadow-lg shadow-violet-500/10'
          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700'
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="font-semibold text-slate-100 text-sm">{flight.airline}</span>
          <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
            {flight.flight_number}
          </span>
        </div>
        <div className="text-right">
          <span className="text-base font-bold text-violet-300 font-mono">
            ₹{flight.price.toLocaleString()}
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between my-3 text-xs">
        <div>
          <p className="text-base font-semibold text-slate-100 font-mono">{flight.departure_time}</p>
          <p className="text-slate-400">{flight.origin}</p>
        </div>

        <div className="flex flex-col items-center px-4">
          <div className="flex items-center space-x-1 text-[10px] text-slate-400 font-mono">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>{flight.duration}</span>
          </div>
          <div className="relative w-24 my-1">
            <div className="border-t border-dashed border-slate-700 w-full" />
            <Plane className="w-3 h-3 text-violet-400 absolute left-1/2 -top-1.5 -translate-x-1/2 transform rotate-90" />
          </div>
          <span className="text-[10px] text-slate-400">
            {flight.stops === 0 ? (
              <span className="text-emerald-400">Non-stop</span>
            ) : (
              <span className="text-amber-400">1 Stop</span>
            )}
          </span>
        </div>

        <div className="text-right">
          <p className="text-base font-semibold text-slate-100 font-mono">{flight.arrival_time}</p>
          <p className="text-slate-400">{flight.destination}</p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80 mt-2">
        <span className="text-[11px] text-slate-400">
          {flight.seats_available} seats left
        </span>
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onSelect(flight)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              isSelected
                ? 'bg-violet-600 text-white font-semibold'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {isSelected ? 'Selected' : 'Select'}
          </button>
          {isSelected && (
            <button
              onClick={() => onBook(flight)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center space-x-1"
            >
              <span>Book</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
