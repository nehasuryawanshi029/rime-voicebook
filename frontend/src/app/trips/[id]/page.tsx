'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { BookingRecord } from '@/types';
import { getApiBaseUrl } from '@/lib/api';
import {
  Plane,
  Calendar,
  Clock,
  User,
  Ticket,
  ArrowLeft,
  CheckCircle2,
  Download,
  Share2,
  Luggage,
  ShieldCheck
} from 'lucide-react';

export default function TripDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const [booking, setBooking] = useState<BookingRecord | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchTrip = async () => {
      try {
        const apiUrl = getApiBaseUrl();
        const res = await fetch(`${apiUrl}/api/bookings/${id}`);
        if (res.ok) {
          const data = await res.json();
          setBooking(data.booking);
        } else {
          // Fallback mock representation for demo IDs
          setBooking({
            booking_id: id,
            flight_id: 1,
            passenger_name: 'Voice User',
            passengers_count: 1,
            total_price: 4350,
            status: 'CONFIRMED',
            created_at: new Date().toISOString(),
            airline: 'Air India',
            flight_number: 'AI-802',
            origin: 'Mumbai',
            destination: 'Delhi',
            date: 'Tomorrow',
            departure_time: '08:30 AM',
            arrival_time: '10:45 AM',
            duration: '2h 15m',
            price: 4350,
          });
        }
      } catch {
        setBooking({
          booking_id: id,
          flight_id: 1,
          passenger_name: 'Voice User',
          passengers_count: 1,
          total_price: 4350,
          status: 'CONFIRMED',
          created_at: new Date().toISOString(),
          airline: 'Air India',
          flight_number: 'AI-802',
          origin: 'Mumbai',
          destination: 'Delhi',
          date: 'Tomorrow',
          departure_time: '08:30 AM',
          arrival_time: '10:45 AM',
          duration: '2h 15m',
          price: 4350,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchTrip();
  }, [id]);

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-violet-600">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <Link
          href="/bookings"
          className="inline-flex items-center space-x-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Bookings</span>
        </Link>

        {isLoading ? (
          <div className="py-20 text-center">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto" />
          </div>
        ) : !booking ? (
          <div className="p-8 text-center rounded-2xl bg-slate-900 border border-slate-800">
            Booking not found.
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-bold text-white">Boarding Pass &amp; Itinerary</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {booking.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Confirmation Code: <strong className="font-mono text-violet-300">{booking.booking_id}</strong>
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => window.print()}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Print Ticket</span>
                </button>
              </div>
            </div>

            {/* Boarding Pass Ticket Card */}
            <div className="rounded-3xl bg-[#0b1020] border border-slate-800/80 shadow-2xl overflow-hidden">
              {/* Top accent airline bar */}
              <div className="bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 p-4 sm:p-6 text-white flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Plane className="w-6 h-6 transform -rotate-45" />
                  <span className="text-lg font-bold tracking-tight">{booking.airline || 'Air India'}</span>
                </div>
                <div className="text-right font-mono text-xs font-semibold">
                  <span>FLIGHT {booking.flight_number || 'AI-802'}</span>
                </div>
              </div>

              {/* Route & Airport Details */}
              <div className="p-6 sm:p-8 space-y-6">
                <div className="flex items-center justify-between text-center sm:text-left">
                  <div>
                    <span className="text-3xl sm:text-5xl font-black font-mono text-white">
                      {(booking.origin || 'BOM').substring(0, 3).toUpperCase()}
                    </span>
                    <span className="block text-xs text-slate-400 mt-1">{booking.origin || 'Mumbai'}</span>
                    <span className="block text-sm font-semibold text-slate-200">{booking.departure_time || '08:30 AM'}</span>
                  </div>

                  <div className="flex flex-col items-center px-4">
                    <span className="text-[11px] font-mono text-violet-400 mb-1">{booking.duration || '2h 15m'}</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 rounded-full bg-violet-500" />
                      <div className="w-16 sm:w-32 border-t-2 border-dashed border-slate-700" />
                      <Plane className="w-4 h-4 text-cyan-400 transform rotate-45" />
                      <div className="w-16 sm:w-32 border-t-2 border-dashed border-slate-700" />
                      <div className="w-2 h-2 rounded-full bg-cyan-500" />
                    </div>
                    <span className="text-[10px] text-slate-400 mt-1">Non-Stop</span>
                  </div>

                  <div className="text-right">
                    <span className="text-3xl sm:text-5xl font-black font-mono text-white">
                      {(booking.destination || 'DEL').substring(0, 3).toUpperCase()}
                    </span>
                    <span className="block text-xs text-slate-400 mt-1">{booking.destination || 'Delhi'}</span>
                    <span className="block text-sm font-semibold text-slate-200">{booking.arrival_time || '10:45 AM'}</span>
                  </div>
                </div>

                {/* Passenger & Ticket Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-xs">
                  <div>
                    <span className="text-slate-400 block font-mono">PASSENGER</span>
                    <span className="font-semibold text-white">{booking.passenger_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono">SEAT</span>
                    <span className="font-semibold text-cyan-400 font-mono">14B (Auto)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono">GATE</span>
                    <span className="font-semibold text-white font-mono">T3 &bull; G12</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-mono">BOARDING</span>
                    <span className="font-semibold text-emerald-400 font-mono">07:50 AM</span>
                  </div>
                </div>

                {/* Baggage & Fare Rules */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center space-x-3">
                    <Luggage className="w-5 h-5 text-violet-400" />
                    <div>
                      <span className="font-semibold text-slate-200 block">Baggage Included</span>
                      <span className="text-slate-400 text-[11px]">Cabin: 7kg &bull; Check-in: 15kg per passenger</span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950/40 border border-slate-800/60 flex items-center space-x-3">
                    <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    <div>
                      <span className="font-semibold text-slate-200 block">Instant Ticket Protection</span>
                      <span className="text-slate-400 text-[11px]">Free cancellation within 24 hours</span>
                    </div>
                  </div>
                </div>

                {/* Simulated Barcode */}
                <div className="pt-4 border-t border-slate-800/80 flex flex-col items-center justify-center space-y-2">
                  <div className="w-full max-w-sm h-12 bg-slate-900 rounded flex items-center justify-center font-mono text-[10px] text-slate-500 tracking-[0.25em] select-none">
                    ||||||| | | |||| |||||| || | |||| ||| ||||||| | ||
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    E-TICKET {booking.booking_id} &bull; VOICEBOOK SYSTEM
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
