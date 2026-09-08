'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingRecord } from '@/types';
import { Ticket, Plane, Calendar, User, ArrowRight, XCircle, CheckCircle2, RefreshCw } from 'lucide-react';

export default function BookingsPage() {
  const [bookings, setBookings] = useState<BookingRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchBookings = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('https://rime-voicebook-backend.onrender.com/api/bookings');
      if (res.ok) {
        const data = await res.json();
        setBookings(data.bookings || []);
      }
    } catch (e) {
      console.error('Failed to fetch bookings:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const handleCancel = async (bookingId: string) => {
    if (!confirm(`Are you sure you want to cancel booking ${bookingId}?`)) return;
    try {
      const res = await fetch(`https://rime-voicebook-backend.onrender.com/api/bookings/${bookingId}/cancel`, {
        method: 'POST',
      });
      if (res.ok) {
        fetchBookings();
      }
    } catch (e) {
      console.error('Cancel booking error:', e);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              My Bookings
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage your confirmed and completed VoiceBook reservations.
            </p>
          </div>
          <button
            onClick={fetchBookings}
            className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-all self-start sm:self-auto"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Refresh</span>
          </button>
        </div>

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading bookings from SQLite database...</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-16 text-center rounded-2xl bg-slate-900/30 border border-slate-800/80 space-y-4 max-w-md mx-auto">
            <Ticket className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-base font-semibold text-white">No Bookings Yet</h3>
            <p className="text-xs text-slate-400">
              You haven't booked any flights yet. Use the Voice Assistant to book your first flight effortlessly.
            </p>
            <Link
              href="/assistant"
              className="inline-flex items-center space-x-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold shadow-md shadow-violet-600/25 transition-all"
            >
              <span>Start Voice Booking</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div
                key={booking.booking_id}
                className="p-5 rounded-2xl bg-slate-900/50 border border-slate-800 hover:border-slate-700/80 transition-all backdrop-blur-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                {/* Left flight info */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-3">
                    <span className="font-mono text-sm font-bold text-violet-300">
                      {booking.booking_id}
                    </span>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider ${
                        booking.status === 'CONFIRMED'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {booking.status}
                    </span>
                  </div>

                  <div className="flex items-center space-x-3 text-sm text-white font-semibold">
                    <span>{booking.airline || 'IndiGo'} {booking.flight_number || '6E-204'}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span>{booking.origin || 'Pune'} &rarr; {booking.destination || 'Delhi'}</span>
                  </div>

                  <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                    <span className="flex items-center space-x-1">
                      <User className="w-3.5 h-3.5" />
                      <span>{booking.passenger_name} ({booking.passengers_count} pax)</span>
                    </span>
                    <span className="flex items-center space-x-1">
                      <Calendar className="w-3.5 h-3.5" />
                      <span>{booking.created_at ? new Date(booking.created_at).toLocaleDateString() : 'Today'}</span>
                    </span>
                  </div>
                </div>

                {/* Right actions & price */}
                <div className="flex items-center space-x-4 self-end md:self-auto">
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 block font-mono">Total Fare</span>
                    <span className="text-lg font-bold text-emerald-400">₹{booking.total_price}</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Link
                      href={`/trips/${booking.booking_id}`}
                      className="px-3.5 py-2 rounded-xl bg-violet-600/20 hover:bg-violet-600/30 text-violet-300 border border-violet-500/30 text-xs font-semibold transition-all"
                    >
                      View Trip
                    </Link>

                    {booking.status === 'CONFIRMED' && (
                      <button
                        onClick={() => handleCancel(booking.booking_id)}
                        className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-rose-400 hover:border-rose-500/40 transition-all"
                        title="Cancel Booking"
                      >
                        <XCircle className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
