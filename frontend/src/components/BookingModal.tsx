'use client';

import React, { useState } from 'react';
import { Flight, BookingRecord } from '@/types';
import { X, Plane, User, Phone, Mail, CheckCircle2, ShieldCheck, Ticket } from 'lucide-react';
import Link from 'next/link';

interface BookingModalProps {
  flight: Flight | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmBooking: (flightId: number, passengerName: string, passengerCount: number) => Promise<any>;
}

export const BookingModal: React.FC<BookingModalProps> = ({
  flight,
  isOpen,
  onClose,
  onConfirmBooking,
}) => {
  const [step, setStep] = useState<'details' | 'confirming' | 'success'>('details');
  const [name, setName] = useState('Voice User');
  const [email, setEmail] = useState('traveler@example.com');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [passengers, setPassengers] = useState(1);
  const [createdBooking, setCreatedBooking] = useState<any>(null);

  if (!isOpen || !flight) return null;

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setStep('confirming');
    try {
      const res = await onConfirmBooking(flight.id, name, passengers);
      setCreatedBooking(res?.booking || {
        booking_id: `VBK-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
        total_price: flight.price * passengers,
        passenger_name: name,
        passengers_count: passengers,
      });
      setStep('success');
    } catch {
      setStep('details');
    }
  };

  const handleReset = () => {
    setStep('details');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#0c1222] border border-slate-800 rounded-2xl shadow-2xl p-6 text-slate-200 overflow-hidden">
        {/* Close Button */}
        <button
          onClick={handleReset}
          className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
        >
          <X className="w-4 h-4" />
        </button>

        {step === 'details' && (
          <form onSubmit={handleBook} className="space-y-5">
            <div>
              <div className="flex items-center space-x-2 text-violet-400 mb-1">
                <Ticket className="w-4 h-4" />
                <span className="text-xs font-semibold uppercase tracking-wider">Confirm Flight Booking</span>
              </div>
              <h3 className="text-lg font-bold text-white">Passenger Details</h3>
            </div>

            {/* Flight Summary Card */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white text-sm">{flight.airline} &bull; {flight.flight_number}</span>
                <span className="text-sm font-bold text-emerald-400">₹{flight.price} / pax</span>
              </div>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>{flight.origin} ({flight.departure_time})</span>
                <span className="text-slate-400">&rarr; {flight.duration} &rarr;</span>
                <span>{flight.destination} ({flight.arrival_time})</span>
              </div>
            </div>

            {/* Inputs */}
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-violet-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Email</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-9 pr-3 py-2 text-slate-200 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-400 mb-1">Passengers</label>
                  <select
                    value={passengers}
                    onChange={(e) => setPassengers(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-violet-500"
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>{n} {n === 1 ? 'Adult' : 'Adults'}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Total price */}
            <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
              <div>
                <span className="text-xs text-slate-400 block">Total Amount</span>
                <span className="text-xl font-bold text-white">₹{flight.price * passengers}</span>
              </div>
              <button
                type="submit"
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-600/30 transition-all"
              >
                Confirm &amp; Book
              </button>
            </div>
          </form>
        )}

        {step === 'confirming' && (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <div className="w-10 h-10 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm font-medium text-slate-300">Processing booking with VoiceBook Engine...</p>
          </div>
        )}

        {step === 'success' && (
          <div className="space-y-5 text-center py-4">
            <div className="w-12 h-12 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Booking Confirmed!</h3>
              <p className="text-xs text-slate-400 mt-1">
                Your reservation has been recorded in VoiceBook SQLite database.
              </p>
            </div>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-left space-y-1.5 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Booking ID:</span>
                <span className="font-mono font-bold text-violet-300">{createdBooking?.booking_id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Flight:</span>
                <span className="text-slate-200">{flight.airline} {flight.flight_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Passenger:</span>
                <span className="text-slate-200">{name} ({passengers} pax)</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Total Price:</span>
                <span className="font-semibold text-emerald-400">₹{flight.price * passengers}</span>
              </div>
            </div>

            <div className="flex items-center justify-center space-x-3 pt-2">
              <Link
                href={`/trips/${createdBooking?.booking_id || 'VBK-DEMO'}`}
                className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold transition-all shadow-md shadow-violet-600/20"
                onClick={handleReset}
              >
                View Boarding Pass
              </Link>
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-all"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
