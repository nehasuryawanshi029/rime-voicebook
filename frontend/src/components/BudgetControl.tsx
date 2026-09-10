import React from 'react';
import { IndianRupee } from 'lucide-react';

interface BudgetControlProps {
  currentBudget: number | null;
  onUpdateBudget: (budget: number | null) => void;
}

const PRESETS = [
  { label: 'Any', value: null },
  { label: '₹3k', value: 3000 },
  { label: '₹5k', value: 5000 },
  { label: '₹7.5k', value: 7500 },
  { label: '₹10k', value: 10000 },
  { label: '₹15k', value: 15000 },
];

export function BudgetControl({ currentBudget, onUpdateBudget }: BudgetControlProps) {
  const [customValue, setCustomValue] = React.useState('');

  const handleCustomApply = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(customValue.replace(/\D/g, ''), 10);
    if (!isNaN(val) && val > 0) {
      onUpdateBudget(val);
      setCustomValue('');
    }
  };

  return (
    <div className="p-4 rounded-2xl bg-slate-900/50 border border-slate-800/80 backdrop-blur-sm space-y-3">
      <div className="flex items-center space-x-2">
        <IndianRupee className="w-4 h-4 text-violet-400" />
        <span className="text-xs font-mono uppercase tracking-wider text-violet-400 font-semibold">
          Budget
        </span>
      </div>
      
      <div className="flex flex-wrap gap-2">
        {PRESETS.map((preset) => {
          const isActive = currentBudget === preset.value;
          return (
            <button
              key={preset.label}
              onClick={() => onUpdateBudget(preset.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-violet-600 text-white shadow-md shadow-violet-500/20'
                  : 'bg-slate-950/60 border border-slate-800 text-slate-300 hover:bg-slate-800'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleCustomApply} className="flex items-center space-x-2 pt-1">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs">₹</span>
          <input
            type="text"
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            placeholder="Custom budget"
            className="w-32 bg-slate-950/60 border border-slate-800 rounded-lg pl-7 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <button
          type="submit"
          disabled={!customValue}
          className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-500 text-white disabled:opacity-40 transition-colors"
        >
          Apply
        </button>
      </form>
    </div>
  );
}
