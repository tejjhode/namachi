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
  profiles?: {
    id: string;
    full_name: string;
    avatar_url?: string;
  };
  trips?: {
    id: string;
    title: string;
    destination?: string;
    start_date?: string;
    end_date?: string;
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
