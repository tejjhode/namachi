export interface Trip {
  id: string;
  title: string;
  destination: string;
  start_date?: string;
  end_date?: string;
  price?: number;
  status: string;
  duration?: string;
  image_url?: string;
  accommodation?: string;
  description?: string;
  difficulty?: string;
  age_group?: string;
  meals?: string;
  group_size?: string;
  rating?: number;
  reviews?: number;
  total_seats?: number;
  seats_left?: number;
  brochure_url?: string;
  trip_style?: string;
  best_for?: string;
  highlights?: string[];
  inclusions?: string[];
  exclusions?: string[];
  itinerary?: { day: number; title: string; description: string }[];
  faqs?: { question: string; answer: string }[];
  images?: string[];
  created_at?: string;
  created_by?: string;
}

export interface LeadNote {
  id: string;
  lead_id: string;
  author_id: string;
  created_by?: string | null;
  note_text: string;
  created_at: string;
}

export interface Lead {
  id: string;
  name: string;
  email: string;
  phone?: string;
  status: string;
  source?: string;
  trip_interest?: string;
  trip_id?: string;
  notes?: string;
  group_size?: number;
  created_at?: string;
  enquiry_id?: string;
  assigned_to?: string;
  user_id?: string;
  is_lead?: boolean;
  message?: string;
  preferred_month?: string;
  group_type?: string;
  hope_trip_feels_like?: string;
  dietary_and_accessibility?: string;
  budget_preference?: string;
  preferred_duration?: string;
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  travelerProfile?: {
    id: string;
    full_name: string;
    avatar_url?: string;
    nationality?: string;
    phone?: string;
  };
  nationality?: string;
  trips?: {
    id: string;
    title: string;
    destination?: string;
    status?: string;
    start_date?: string;
    end_date?: string;
    price?: number;
    image_url?: string;
    seats_left?: number;
    total_seats?: number;
    brochure_url?: string;
  };
  lead_notes?: LeadNote[];
}

export interface Departure {
  id: string;
  trip_id: string;
  start_date: string;
  end_date?: string;
  total_seats: number;
  seats_left: number;
  price: number;
  status: string; // Serialized JSON string containing code, leader, meeting, notes
  trips?: {
    title: string;
    destination?: string;
  };
}

export interface Profile {
  id: string;
  full_name: string;
  role: string;
  email?: string;
  avatar_url?: string;
  created_at?: string;
  phone?: string;
}

export interface DashboardStats {
  totalLeads: number;
  newLeadsToday: number;
  activeTrips: number;
  upcomingDepartures: number;
  pendingEnquiries: number;
  confirmedTravelers: number;
  funnel: {
    new: number;
    contacted: number;
    qualified: number;
    negotiating: number;
    converted: number;
    lost: number;
  };
  trends: {
    leads: string;
    leadsUp: boolean;
    newLeads: string;
    newLeadsUp: boolean;
    activeTrips: string;
    activeTripsUp: boolean;
    pendingEnquiries: string;
    pendingEnquiriesUp: boolean;
    confirmedTravelers: string;
    confirmedTravelersUp: boolean;
  };
}

export interface Booking {
  id: string;
  lead_id?: string | null;
  user_id?: string | null;
  trip_id?: string | null;
  departure_id?: string | null;
  price: number;
  payment_status: 'pending' | 'partial' | 'paid' | 'refunded';
  created_at?: string;
  updated_at?: string;
  leads?: Lead;
  profiles?: Profile;
  trips?: Trip;
  trip_departures?: Departure;
  payments?: Payment[];
  travelers?: Traveler[];
}

export interface Payment {
  id: string;
  booking_id: string;
  amount: number;
  payment_method: 'upi' | 'card' | 'bank_transfer' | 'cash' | 'other';
  transaction_reference?: string | null;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  created_at?: string;
}

export interface Traveler {
  id: string;
  booking_id: string;
  user_id?: string | null;
  full_name: string;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  date_of_birth?: string | null;
  nationality?: string | null;
  passport_number?: string | null;
  passport_expiry?: string | null;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  emergency_contact_relation?: string | null;
  visa_status: 'not_required' | 'pending' | 'approved' | 'rejected';
  created_at?: string;
  updated_at?: string;
  bookings?: Booking;
  profiles?: Profile;
}
