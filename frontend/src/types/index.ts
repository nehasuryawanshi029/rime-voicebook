export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'RECONNECTING' | 'DISCONNECTED' | 'ERROR';

export type VoiceState =
  | 'IDLE'
  | 'LISTENING'
  | 'TRANSCRIBING'
  | 'THINKING'
  | 'SEARCHING'
  | 'SPEAKING'
  | 'INTERRUPTING'
  | 'INTERRUPTED'
  | 'COMPLETED'
  | 'ERROR';


export interface Flight {
  id: number;
  flight_number: string;
  airline: string;
  origin: string;
  destination: string;
  date: string;
  departure_time: string;
  arrival_time: string;
  duration: string;
  price: number;
  stops: number;
  seats_available: number;
}

export interface BookingConstraints {
  origin: string | null;
  destination: string | null;
  date: string | null;
  budget: number | null;
  passengers: number;
  selected_flight: Flight | null;
}

export interface ConversationMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  generation: number;
  interrupted?: boolean;
}

export interface VoiceMetrics {
  end_of_speech_to_first_audio: number | null;
  tool_duration: number | null;
  interruption_stop_latency: number | null;
  stale_results_discarded: number;
  stale_results_spoken: number;
}

export interface ServiceStatus {
  rime: 'CONNECTED' | 'ERROR' | 'MOCK_READY';
  gemini: 'CONNECTED' | 'ERROR' | 'RULE_BASED_READY';
  deepgram: 'CONNECTED' | 'ERROR' | 'BROWSER_STT_READY';
  livekit: 'CONNECTED' | 'ERROR' | 'DEV_LOCAL' | 'CONFIGURED';
}

export interface TimelineEvent {
  event: string;
  timestamp: string;
  time_display: string;
  generation: number;
  request_id: string;
  details?: Record<string, any>;
}

export interface BookingRecord {
  booking_id: string;
  flight_id: number;
  passenger_name: string;
  passengers_count: number;
  total_price: number;
  status: string;
  created_at: string;
  airline?: string;
  flight_number?: string;
  origin?: string;
  destination?: string;
  date?: string;
  departure_time?: string;
  arrival_time?: string;
  duration?: string;
  price?: number;
}

