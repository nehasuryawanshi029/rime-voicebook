'use client';

import React, { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { FlightCard } from '@/components/FlightCard';
import { BookingModal } from '@/components/BookingModal';
import { Flight } from '@/types';
import { Search, Plane, SlidersHorizontal, ArrowUpDown, RefreshCw, Calendar, IndianRupee } from 'lucide-react';

export default function SearchPage() {
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [budget, setBudget] = useState<string>('');
  const [flights, setFlights] = useState<Flight[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'price' | 'duration'>('price');
  const [selectedFlight, setSelectedFlight] = useState<Flight | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchFlights = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (origin.trim()) params.append('origin', origin.trim());
      if (destination.trim()) params.append('destination', destination.trim());
      if (budget.trim() && Number(budget) > 0) params.append('budget', budget.trim());

      const res = await fetch(`http://localhost:8000/api/flights?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        let list = data.flights || [];
        if (sortBy === 'price') {
          list.sort((a: Flight, b: Flight) => a.price - b.price);
        }
        setFlights(list);
      }
    } catch (err) {
      console.error('Error fetching flights:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFlights();
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchFlights();
  };

  const handleBook = (flight: Flight) => {
    setSelectedFlight(flight);
    setIsModalOpen(true);
  };

  const handleConfirmBooking = async (flightId: number, name: string, count: number) => {
    return {
      success: true,
      booking: {
        booking_id: `VBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        total_price: (selectedFlight?.price || 4000) * count,
        passenger_name: name,
        passengers_count: count,
      }
    };
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Page Title */}
        <div className="space-y-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Flight Search &amp; Explorer
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Query VoiceBook SQLite inventory with real-time seat availability &amp; fare pricing.
          </p>
        </div>

        {/* Search Bar Filter */}
        <form onSubmit={handleSearchSubmit} className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 backdrop-blur-md grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Origin City
            </label>
            <input
              type="text"
              placeholder="e.g. Pune, Mumbai"
              value={origin}
              onChange={(e) => setOrigin(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Destination City
            </label>
            <input
              type="text"
              placeholder="e.g. Delhi, Bangalore"
              value={destination}
              onChange={(e) => setDestination(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Max Budget (₹)
            </label>
            <input
              type="number"
              placeholder="e.g. 5000"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
              Sort By
            </label>
            <select
              value={sortBy}
              onChange={(e: any) => {
                setSortBy(e.target.value);
                if (e.target.value === 'price') {
                  setFlights([...flights].sort((a, b) => a.price - b.price));
                }
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-violet-500"
            >
              <option value="price">Price: Low to High</option>
              <option value="duration">Duration</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center space-x-2 py-2 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/20 transition-all"
            >
              <Search className="w-3.5 h-3.5" />
              <span>{isLoading ? 'Searching...' : 'Search Flights'}</span>
            </button>
          </div>
        </form>

        {/* Results grid */}
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>Found <strong className="text-white">{flights.length}</strong> available flights</span>
            <button onClick={fetchFlights} className="flex items-center space-x-1 hover:text-violet-400 transition-colors">
              <RefreshCw className="w-3 h-3" />
              <span>Refresh</span>
            </button>
          </div>

          {flights.length === 0 ? (
            <div className="p-16 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-3">
              <Plane className="w-8 h-8 text-slate-600 mx-auto transform -rotate-45" />
              <h3 className="text-sm font-semibold text-slate-300">No flights matched your filter</h3>
              <p className="text-xs text-slate-400">Try removing budget caps or searching for Pune, Mumbai, Delhi, Bangalore.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {flights.map((flight) => (
                <FlightCard
                  key={flight.id}
                  flight={flight}
                  isSelected={selectedFlight?.id === flight.id}
                  onSelect={() => setSelectedFlight(flight)}
                  onBook={() => handleBook(flight)}
                />
              ))}
            </div>
          )}
        </div>
      </main>

      <BookingModal
        flight={selectedFlight}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onConfirmBooking={handleConfirmBooking}
      />

      <Footer />
    </div>
  );
}
