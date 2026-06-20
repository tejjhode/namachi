"use client";

import { useState, useEffect, useRef } from "react";
import {
  LayoutDashboard,
  Users,
  ClipboardList,
  Compass,
  CalendarCheck,
  User,
  Plane,
  MessageSquare,
  BarChart3,
  Edit3,
  Users2,
  Settings,
  LogOut,
  Menu,
  Search,
  Bell,
  Calendar,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Plus,
  MapPin,
  Clock,
  IndianRupee,
  Loader2,
  CheckCircle,
  XCircle,
  Shield,
  Briefcase,
  UserPlus,
  ArrowRightLeft,
  Trash2,
  ChevronUp,
  Image as ImageIcon,
  HelpCircle,
  Star,
  GripVertical,
  Zap,
  FileText,
  Upload,
  Filter,
  SlidersHorizontal,
  Grid,
  MoreVertical,
  Archive,
  ChevronLeft,
  ChevronRight,
  List,
  Sparkles,
  Instagram,
  Phone,
  Mail,
  Send,
  MessageCircle,
  FolderPlus,
  Globe,
  RotateCcw,
  X,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { leadService } from "@/services/lead.service";
import { notificationService } from "@/services/notification.service";
import { useUsers } from "@/hooks/useUsers";
import { getLeadNoteAuthorLabel, getLeadNoteDisplay, getLeadNoteVisual } from "@/lib/lead-notes";
import { useRouter } from "next/navigation";

interface AdminViewProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
  onBack: () => void;
  initialTab?: AdminTab;
}

const supabase = createClient();

type AdminTab =
  | "dashboard"
  | "leads"
  | "enquiries"
  | "trips"
  | "add_trip"
  | "bookings"
  | "travelers"
  | "departures"
  | "messages"
  | "reports"
  | "content"
  | "team"
  | "users"
  | "settings";

// Selectable Trip Styles
const AVAILABLE_STYLES = [
  "Adventure",
  "Culture",
  "Nature",
  "Luxury",
  "Road Trip",
  "Wellness",
  "Wildlife",
  "Food",
  "Photography",
];

// Selectable Best For Chips
const AVAILABLE_BEST_FOR = [
  "Solo Travellers",
  "Friends",
  "Couples",
  "Families",
  "Remote Workers",
];

const getNormalizedStatus = (status: string) => {
  if (!status) return "Draft";
  const s = status.toLowerCase();
  if (s === "draft") return "Draft";
  if (s === "open" || s === "open for enquiries") return "Open for Enquiries";
  if (s === "active") return "Active";
  if (s === "completed") return "Completed";
  if (s === "archived") return "Archived";
  return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
};

export default function AdminView({ user, onBack, initialTab }: AdminViewProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTab>(initialTab || "dashboard");
  const noteInputRef = useRef<HTMLInputElement>(null);
  const [tripsMenuOpen, setTripsMenuOpen] = useState(true);
  const [loading, setLoading] = useState(true);
  const [trips, setTrips] = useState<any[]>([]);
  const [leads, setLeads] = useState<any[]>([]);
  const [profiles, setProfiles] = useState<any[]>([]);
  const [roleManagerSearch, setRoleManagerSearch] = useState("");
  const [updatingProfileId, setUpdatingProfileId] = useState<string | null>(null);
  const [roleSuccessMessage, setRoleSuccessMessage] = useState("");

  // Trips Catalog Filter and Pagination States
  const [catalogStatusFilter, setCatalogStatusFilter] = useState<string>("all");
  const [catalogSearch, setCatalogSearch] = useState<string>("");
  const [catalogDestination, setCatalogDestination] = useState<string>("all");
  const [catalogStyle, setCatalogStyle] = useState<string>("all");
  const [catalogDifficulty, setCatalogDifficulty] = useState<string>("all");
  const [catalogSortBy, setCatalogSortBy] = useState<string>("newest");
  const [catalogViewMode, setCatalogViewMode] = useState<"list" | "grid">("list");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [activeActionDropdownId, setActiveActionDropdownId] = useState<string | null>(null);
  const [activeActionDropdownPosition, setActiveActionDropdownPosition] = useState<{ top: number; right: number } | null>(null);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [departures, setDepartures] = useState<any[]>([]);
  const [departuresFilterTripId, setDeparturesFilterTripId] = useState<string | null>(null);
  const [travelersFilterTripId, setTravelersFilterTripId] = useState<string | null>(null);
  const [leaderDropdownOpen, setLeaderDropdownOpen] = useState(false);
  const itemsPerPage = 6;
  
  // Real dynamic stats from database
  const [dbStats, setDbStats] = useState({
    totalLeads: 0,
    newLeadsToday: 0,
    activeTrips: 0,
    upcomingDepartures: 0,
    pendingEnquiries: 0,
    confirmedTravelers: 0,
  });

  // Trend percentages (calculated dynamically relative to prior periods)
  const [trends, setTrends] = useState({
    leads: "0%",
    leadsUp: true,
    newLeads: "0%",
    newLeadsUp: true,
    activeTrips: "0%",
    activeTripsUp: true,
    pendingEnquiries: "0%",
    pendingEnquiriesUp: false,
    confirmedTravelers: "0%",
    confirmedTravelersUp: true,
  });

  // --- FORM STATE (Comprehensive 25+ fields matching DB) ---
  const [form, setForm] = useState({
    title: "",
    destination: "",
    status: "Draft",
    price: "",
    duration: "",
    startDate: "",
    endDate: "",
    imageUrl: "",
    accommodation: "",
    description: "",
    difficulty: "Easy",
    ageGroup: "18-35",
    meals: "Breakfast Only",
    groupSize: "8-12",
    rating: "4.9",
    reviewsCount: "112",
    totalSeats: "12",
    seatsLeft: "8",
    brochureUrl: "",
  });

  const [brochureFileName, setBrochureFileName] = useState("");
  const [otherDocs, setOtherDocs] = useState<{ name: string; size: string; dataUrl: string }[]>([]);
  const [autoSendBrochure, setAutoSendBrochure] = useState(false);

  // Dynamic Repeatable list items
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBestFor, setSelectedBestFor] = useState<string[]>([]);
  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState("");
  
  const [inclusions, setInclusions] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState("");

  const [exclusions, setExclusions] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState("");

  const [itinerary, setItinerary] = useState<any[]>([
    { day: 1, title: "Arrival in Tokyo", description: "Meet at airport, welcome dinner, check-in." }
  ]);
  const [newDayTitle, setNewDayTitle] = useState("");
  const [newDayDesc, setNewDayDesc] = useState("");

  const [faqs, setFaqs] = useState<any[]>([
    { question: "Are flights included?", answer: "No." }
  ]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");

  // Gallery images uploader state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);

  // Preview Toggle
  const [livePreviewActive, setLivePreviewActive] = useState(true);

  // Redesigned form helper states
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);
  const [editingFAQIdx, setEditingFAQIdx] = useState<number | null>(null);
  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [bestForDropdownOpen, setBestForDropdownOpen] = useState(false);

  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  // Activation modal states
  const [activeTripForActivation, setActiveTripForActivation] = useState<any | null>(null);
  const [activationForm, setActivationForm] = useState({
    startDate: "",
    endDate: "",
    totalSeats: "12",
    price: "",
    tripLeaderId: "",
    meetingPoint: "",
    notes: "",
  });

  // Rich Enquiries / CRM states
  const [selectedEnquiryId, setSelectedEnquiryId] = useState<string | null>(null);
  const [selectedEnquiry, setSelectedEnquiry] = useState<any | null>(null);
  const [loadingEnquiryDetail, setLoadingEnquiryDetail] = useState(false);
  const [newEnquiryNoteText, setNewEnquiryNoteText] = useState("");
  const [addingEnquiryNote, setAddingEnquiryNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const { users } = useUsers();
  const usersById = new Map(users.map((user) => [user.id, user]));
  const [enquirySearchVal, setEnquirySearchVal] = useState("");
  const [enquiryStatusVal, setEnquiryStatusVal] = useState("all");
  const [enquirySourceVal, setEnquirySourceVal] = useState("all");
  const [enquiryTripVal, setEnquiryTripVal] = useState("all");
  const [enquiryAssignedVal, setEnquiryAssignedVal] = useState("all");
  const [enquiryActiveTab, setEnquiryActiveTab] = useState("all");
  const [enquiryCurrentPage, setEnquiryCurrentPage] = useState(1);
  const [enquiryStatusDropdownOpen, setEnquiryStatusDropdownOpen] = useState(false);
  const [enquiryAssignDropdownOpen, setEnquiryAssignDropdownOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });
  }, []);

  const fetchEnquiryDetail = async (id: string) => {
    try {
      setLoadingEnquiryDetail(true);
      const detail = await leadService.getLeadById(id);
      setSelectedEnquiry(detail);
    } catch (err) {
      console.error("Failed to load enquiry details:", err);
    } finally {
      setLoadingEnquiryDetail(false);
    }
  };

  useEffect(() => {
    if (selectedEnquiryId) {
      fetchEnquiryDetail(selectedEnquiryId);
    } else {
      setSelectedEnquiry(null);
    }
  }, [selectedEnquiryId]);

  const handleEnquiryStatusChange = async (status: string, customNoteText?: string) => {
    if (!selectedEnquiry || !currentUser) return;
    try {
      await leadService.updateLeadStatus(selectedEnquiry.id, status);
      
      const defaultNoteText = `Status updated to ${getEnquiryStatusLabel(status)}.`;
      await leadService.addLeadNote(selectedEnquiry.id, customNoteText || defaultNoteText, currentUser.id);
      
      fetchEnquiryDetail(selectedEnquiry.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleEnquiryAssignChange = async (profileId: string) => {
    if (!selectedEnquiry || !currentUser) return;
    try {
      await leadService.updateLead(selectedEnquiry.id, { assigned_to: profileId || null });
      const assignedUser = profiles.find(u => u.id === profileId);
      const assigneeName = assignedUser ? assignedUser.full_name : "Unassigned";
      
      await leadService.addLeadNote(selectedEnquiry.id, `Lead assigned to ${assigneeName}.`, currentUser.id);
      
      // Dispatch Notifications
      try {
        if (profileId) {
          await notificationService.notifyManager(
            profileId,
            "Lead Assigned",
            `New lead "${selectedEnquiry.name}" has been assigned to you.`,
            "Lead Assigned",
            selectedEnquiry.id
          );
          await notificationService.notifyTraveler(
            selectedEnquiry.email,
            "Manager Assigned",
            `${assigneeName} has been assigned to assist you.`,
            "Manager Assigned",
            selectedEnquiry.id
          );
        }
        await notificationService.notifyAdmins(
          "Lead Reassigned",
          `Lead "${selectedEnquiry.name}" has been reassigned to ${assigneeName}.`,
          "Lead Reassigned",
          selectedEnquiry.id
        );
      } catch (notifErr) {
        console.error("Failed to send assignment notifications:", notifErr);
      }

      fetchEnquiryDetail(selectedEnquiry.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAdminViewRoleChange = async (profileId: string, newRole: string) => {
    try {
      setUpdatingProfileId(profileId);
      setRoleSuccessMessage("");
      const { error } = await supabase
        .from("profiles")
        .update({ role: newRole })
        .eq("id", profileId);

      if (error) throw error;
      setProfiles(prev => prev.map(p => p.id === profileId ? { ...p, role: newRole } : p));
      setRoleSuccessMessage("User role updated successfully!");
    } catch (err: any) {
      alert(err.message || "Failed to update role.");
    } finally {
      setUpdatingProfileId(null);
    }
  };

  const handleAddEnquiryNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEnquiryNoteText.trim() || !selectedEnquiry || !currentUser) return;
    try {
      setAddingEnquiryNote(true);
      const newNote = await leadService.addLeadNote(selectedEnquiry.id, newEnquiryNoteText.trim(), currentUser.id);
      setSelectedEnquiry((prev: any) => ({
        ...prev,
        lead_notes: [...(prev.lead_notes || []), { ...newNote, note_text: newNote.note_text || newEnquiryNoteText.trim() }]
      }));
      setNewEnquiryNoteText("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingEnquiryNote(false);
    }
  };

  const handleResetEnquiryFilters = () => {
    setEnquirySearchVal("");
    setEnquiryStatusVal("all");
    setEnquirySourceVal("all");
    setEnquiryTripVal("all");
    setEnquiryAssignedVal("all");
    setEnquiryActiveTab("all");
    setEnquiryCurrentPage(1);
  };

  const getEnquiryStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "Vibe Check";
    if (s === "converted" || s === "confirmed") return "Confirmed";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getEnquiryStatusColorClass = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "new") return "bg-[#FAF8F5] text-[#625E5A] border-[#E7E1D5]/60";
    if (s === "contacted") return "bg-[#EBF5FF] text-[#2563EB] border-[#D0E2FF]/40";
    if (s === "qualified") return "bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]/40";
    if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]/40";
    if (s === "converted" || s === "confirmed") return "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40";
    if (s === "lost") return "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]/40";
    return "bg-[#FAF8F5] text-[#625E5A] border-[#E7E1D5]/60";
  };

  const getEnquirySourceIcon = (source: string) => {
    const s = source?.toLowerCase();
    if (s === "website") return <Globe className="w-3.5 h-3.5 text-blue-500" />;
    if (s === "instagram") return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
    if (s === "whatsapp") return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
    return <Mail className="w-3.5 h-3.5 text-gray-500" />;
  };

  const getEnquiryRelativeTimeString = (dateString?: string): string => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      if (diffMins <= 0) return "Just now";
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }
  };

  // Close custom dropdowns on click outside for enquiries detail drawer
  useEffect(() => {
    function handleClickOutsideEnquiry(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".custom-dropdown-enquiry-status")) {
        setEnquiryStatusDropdownOpen(false);
      }
      if (!target.closest(".custom-dropdown-enquiry-assign")) {
        setEnquiryAssignDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideEnquiry);
    return () => document.removeEventListener("mousedown", handleClickOutsideEnquiry);
  }, []);

  // Rich Leads / CRM states
  const [selectedCRMLeadId, setSelectedCRMLeadId] = useState<string | null>(null);
  const [selectedCRMLead, setSelectedCRMLead] = useState<any | null>(null);
  const [loadingCRMLeadDetail, setLoadingCRMLeadDetail] = useState(false);
  const [newCRMLeadNoteText, setNewCRMLeadNoteText] = useState("");
  const [addingCRMLeadNote, setAddingCRMLeadNote] = useState(false);
  const [crmLeadSearchVal, setCrmLeadSearchVal] = useState("");
  const [crmLeadStatusVal, setCrmLeadStatusVal] = useState("all");
  const [crmLeadSourceVal, setCrmLeadSourceVal] = useState("all");
  const [crmLeadTripVal, setCrmLeadTripVal] = useState("all");
  const [crmLeadAssignedVal, setCrmLeadAssignedVal] = useState("all");
  const [crmLeadActiveTab, setCrmLeadActiveTab] = useState("all");
  const [crmLeadCurrentPage, setCrmLeadCurrentPage] = useState(1);
  const [crmLeadStatusDropdownOpen, setCrmLeadStatusDropdownOpen] = useState(false);
  const [crmLeadAssignDropdownOpen, setCrmLeadAssignDropdownOpen] = useState(false);

  // New Lead Modal and Form States
  const crmLeadNoteInputRef = useRef<HTMLInputElement>(null);
  const [isNewLeadModalOpen, setIsNewLeadModalOpen] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    email: "",
    phone: "",
    status: "new",
    source: "Website",
    trip_id: "",
    assigned_to: "",
  });
  const [savingNewLead, setSavingNewLead] = useState(false);

  const handleCreateNewLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name || !newLeadForm.email) return;
    try {
      setSavingNewLead(true);
      
      const payload: any = {
        name: newLeadForm.name,
        email: newLeadForm.email,
        phone: newLeadForm.phone || null,
        status: newLeadForm.status,
        source: newLeadForm.source,
        trip_id: newLeadForm.trip_id || null,
        assigned_to: newLeadForm.assigned_to || null,
        group_size: 1,
        enquiry_id: `ENQ-${Math.floor(100000 + Math.random() * 900000)}`
      };

      const newL = await leadService.createLead(payload);
      
      // Add initial enquiry note
      if (currentUser) {
        await leadService.addLeadNote(newL.id, `Initial Enquiry: Enquired about trip via ${newLeadForm.source}.`, currentUser.id);
      }
      
      // Reset form and reload
      setNewLeadForm({
        name: "",
        email: "",
        phone: "",
        status: "new",
        source: "Website",
        trip_id: "",
        assigned_to: "",
      });
      setIsNewLeadModalOpen(false);
      loadData();
    } catch (err) {
      console.error("Failed to create new lead:", err);
    } finally {
      setSavingNewLead(false);
    }
  };

  const fetchCRMLeadDetail = async (id: string) => {
    try {
      setLoadingCRMLeadDetail(true);
      const detail = await leadService.getLeadById(id);
      setSelectedCRMLead(detail);
    } catch (err) {
      console.error("Failed to load lead details:", err);
    } finally {
      setLoadingCRMLeadDetail(false);
    }
  };

  useEffect(() => {
    if (selectedCRMLeadId) {
      fetchCRMLeadDetail(selectedCRMLeadId);
    } else {
      setSelectedCRMLead(null);
    }
  }, [selectedCRMLeadId]);

  const handleCRMLeadStatusChange = async (status: string, customNoteText?: string) => {
    if (!selectedCRMLead || !currentUser) return;
    try {
      await leadService.updateLeadStatus(selectedCRMLead.id, status);
      
      const defaultNoteText = `Status updated to ${getCRMLeadStatusLabel(status)}.`;
      await leadService.addLeadNote(selectedCRMLead.id, customNoteText || defaultNoteText, currentUser.id);
      
      // Dispatch Notifications
      try {
        const lowerStatus = status?.toLowerCase();
        if (lowerStatus === "converted" || lowerStatus === "confirmed") {
          await notificationService.notifyTraveler(
            selectedCRMLead.email,
            "Booking Confirmed",
            "Your booking has been confirmed.",
            "Booking Confirmed",
            selectedCRMLead.id,
            "High"
          );
          if (selectedCRMLead.assigned_to) {
            await notificationService.notifyManager(
              selectedCRMLead.assigned_to,
              "Booking Confirmed",
              `Booking confirmed for "${selectedCRMLead.name}".`,
              "Booking Confirmed",
              selectedCRMLead.id,
              "High"
            );
          }
        } else if (lowerStatus === "negotiating" || lowerStatus === "vibe check" || lowerStatus === "vibe check sent") {
          await notificationService.notifyTraveler(
            selectedCRMLead.email,
            "Vibe Check Scheduled",
            "Your vibe check has been scheduled.",
            "Vibe Check Scheduled",
            selectedCRMLead.id,
            "Medium"
          );
          if (selectedCRMLead.assigned_to) {
            await notificationService.notifyManager(
              selectedCRMLead.assigned_to,
              "Vibe Check Reminder",
              `Vibe check scheduled for "${selectedCRMLead.name}".`,
              "Vibe Check Reminder",
              selectedCRMLead.id,
              "Medium"
            );
          }
        }
      } catch (notifErr) {
        console.error("Failed to send status change notifications:", notifErr);
      }

      fetchCRMLeadDetail(selectedCRMLead.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCRMLeadAssignChange = async (profileId: string) => {
    if (!selectedCRMLead || !currentUser) return;
    try {
      await leadService.updateLead(selectedCRMLead.id, { assigned_to: profileId || null });
      const assignedUser = profiles.find(u => u.id === profileId);
      const assigneeName = assignedUser ? assignedUser.full_name : "Unassigned";
      
      await leadService.addLeadNote(selectedCRMLead.id, `Lead assigned to ${assigneeName}.`, currentUser.id);
      
      // Dispatch Notifications
      try {
        if (profileId) {
          await notificationService.notifyManager(
            profileId,
            "Lead Assigned",
            `New lead "${selectedCRMLead.name}" has been assigned to you.`,
            "Lead Assigned",
            selectedCRMLead.id
          );
          await notificationService.notifyTraveler(
            selectedCRMLead.email,
            "Manager Assigned",
            `${assigneeName} has been assigned to assist you.`,
            "Manager Assigned",
            selectedCRMLead.id
          );
        }
        await notificationService.notifyAdmins(
          "Lead Reassigned",
          `Lead "${selectedCRMLead.name}" has been reassigned to ${assigneeName}.`,
          "Lead Reassigned",
          selectedCRMLead.id
        );
      } catch (notifErr) {
        console.error("Failed to send assignment notifications:", notifErr);
      }

      fetchCRMLeadDetail(selectedCRMLead.id);
      loadData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddCRMLeadNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCRMLeadNoteText.trim() || !selectedCRMLead || !currentUser) return;
    try {
      setAddingCRMLeadNote(true);
      const newNote = await leadService.addLeadNote(selectedCRMLead.id, newCRMLeadNoteText.trim(), currentUser.id);
      setSelectedCRMLead((prev: any) => ({
        ...prev,
        lead_notes: [...(prev.lead_notes || []), { ...newNote, note_text: newNote.note_text || newCRMLeadNoteText.trim() }]
      }));
      setNewCRMLeadNoteText("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingCRMLeadNote(false);
    }
  };

  const handleResetCRMLeadFilters = () => {
    setCrmLeadSearchVal("");
    setCrmLeadStatusVal("all");
    setCrmLeadSourceVal("all");
    setCrmLeadTripVal("all");
    setCrmLeadAssignedVal("all");
    setCrmLeadActiveTab("all");
    setCrmLeadCurrentPage(1);
  };

  const getCRMLeadStatusLabel = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "Vibe Check";
    if (s === "converted" || s === "confirmed") return "Confirmed";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const getCRMLeadStatusColorClass = (status: string) => {
    const s = status?.toLowerCase();
    if (s === "new") return "bg-[#FAF8F5] text-[#625E5A] border-[#E7E1D5]/60";
    if (s === "contacted") return "bg-[#EBF5FF] text-[#2563EB] border-[#D0E2FF]/40";
    if (s === "qualified") return "bg-[#F3E8FF] text-[#7C3AED] border-[#E9D5FF]/40";
    if (s === "negotiating" || s === "vibe check sent" || s === "vibe check") return "bg-[#FFF8E6] text-[#D97706] border-[#FDE68A]/40";
    if (s === "converted" || s === "confirmed") return "bg-[#ECFDF5] text-[#10B981] border-[#A7F3D0]/40";
    if (s === "lost") return "bg-[#FEF2F2] text-[#EF4444] border-[#FEE2E2]/40";
    return "bg-[#FAF8F5] text-[#625E5A] border-[#E7E1D5]/60";
  };

  const getCRMLeadSourceIcon = (source: string) => {
    const s = source?.toLowerCase();
    if (s === "website") return <Globe className="w-3.5 h-3.5 text-blue-500" />;
    if (s === "instagram") return <Instagram className="w-3.5 h-3.5 text-pink-500" />;
    if (s === "whatsapp") return <MessageCircle className="w-3.5 h-3.5 text-emerald-500" />;
    return <Mail className="w-3.5 h-3.5 text-gray-500" />;
  };

  const getCRMLeadRelativeTimeString = (dateString?: string): string => {
    if (!dateString) return "—";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      if (diffMins <= 0) return "Just now";
      return `${diffMins} minute${diffMins !== 1 ? "s" : ""} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? "s" : ""} ago`;
    } else {
      return `${diffDays} day${diffDays !== 1 ? "s" : ""} ago`;
    }
  };

  // Close custom dropdowns on click outside for leads detail drawer
  useEffect(() => {
    function handleClickOutsideCRMLead(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest(".custom-dropdown-crmlead-status")) {
        setCrmLeadStatusDropdownOpen(false);
      }
      if (!target.closest(".custom-dropdown-crmlead-assign")) {
        setCrmLeadAssignDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideCRMLead);
    return () => document.removeEventListener("mousedown", handleClickOutsideCRMLead);
  }, []);

  const formatFriendlyName = (name: string) => {
    if (!name) return "";
    const clean = name.replace(/[^a-zA-Z\s]/g, "").trim();
    const parts = clean.split(/\s+/);
    if (parts.length === 0) return "";
    
    // Check if the first word is a surname keyword, return first name
    const surnameKeywords = ["JHODE", "MEHTA", "SHARMA", "SINGH", "KUMAR"];
    if (parts.length > 1 && surnameKeywords.includes(parts[0].toUpperCase())) {
      return parts[1].charAt(0).toUpperCase() + parts[1].slice(1).toLowerCase();
    }
    return parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
  };

  const firstName = formatFriendlyName(user.fullName || "Admin");

  // Fetch real database records to populate stats and charts dynamically
  const loadData = async () => {
    try {
      setLoading(true);
      setError("");

      const { data: tripsData, error: tripsErr } = await supabase
        .from("trips")
        .select("*")
        .order("created_at", { ascending: false });

      if (tripsErr) throw tripsErr;
      setTrips(tripsData || []);

      const { data: leadsData, error: leadsErr } = await supabase
        .from("leads")
        .select("*, trips(*)")
        .order("created_at", { ascending: false });

      if (leadsErr) throw leadsErr;
      setLeads(leadsData || []);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("*")
        .order("full_name");
      setProfiles(profilesData || []);

      const { data: departuresData } = await supabase
        .from("trip_departures")
        .select("*, trips(*)")
        .order("start_date", { ascending: true });
      setDepartures(departuresData || []);

      if (leadsData && tripsData) {
        // Calculate 100% dynamic counts
        const totalL = leadsData.length;
        
        const newL = leadsData.filter((l) => {
          if (!l.created_at) return false;
          return new Date(l.created_at).toDateString() === new Date().toDateString();
        }).length;
        
        const activeT = tripsData.filter(
          (t) => t.status === "Open" || t.status === "active"
        ).length;
        
        const upcomingD = (departuresData || []).filter((d) => {
          if (!d.start_date) return false;
          return new Date(d.start_date) > new Date();
        }).length;
        
        const pendingE = leadsData.filter(
          (l) => l.status === "new" || l.status === "contacted"
        ).length;
        
        const confirmedT = leadsData
          .filter((l) => l.status === "converted")
          .reduce((sum, l) => sum + (parseInt(l.group_size) || 1), 0);

        setDbStats({
          totalLeads: totalL,
          newLeadsToday: newL,
          activeTrips: activeT,
          upcomingDepartures: upcomingD,
          pendingEnquiries: pendingE,
          confirmedTravelers: confirmedT,
        });

        // Compute trends dynamically
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

        // 1. Total Leads Trend
        const leadsLast7 = leadsData.filter(l => new Date(l.created_at) >= sevenDaysAgo).length;
        const leadsPrev7 = leadsData.filter(l => new Date(l.created_at) >= fourteenDaysAgo && new Date(l.created_at) < sevenDaysAgo).length;
        let leadsTrendVal = 0;
        let leadsUp = true;
        if (leadsPrev7 > 0) {
          const diff = leadsLast7 - leadsPrev7;
          leadsTrendVal = Math.round((Math.abs(diff) / leadsPrev7) * 100);
          leadsUp = diff >= 0;
        } else if (leadsLast7 > 0) {
          leadsTrendVal = 100;
          leadsUp = true;
        }

        // 2. New Leads Today vs Yesterday
        const todayStr = new Date().toDateString();
        const yesterdayStr = new Date(now.getTime() - 24 * 60 * 60 * 1000).toDateString();
        const todayLeads = leadsData.filter(l => new Date(l.created_at).toDateString() === todayStr).length;
        const yesterdayLeads = leadsData.filter(l => new Date(l.created_at).toDateString() === yesterdayStr).length;
        let newLeadsTrendVal = 0;
        let newLeadsUp = true;
        if (yesterdayLeads > 0) {
          const diff = todayLeads - yesterdayLeads;
          newLeadsTrendVal = Math.round((Math.abs(diff) / yesterdayLeads) * 100);
          newLeadsUp = diff >= 0;
        } else if (todayLeads > 0) {
          newLeadsTrendVal = 100;
          newLeadsUp = true;
        }

        // 3. Active Trips Trend
        const tripsLast30 = tripsData.filter(t => new Date(t.created_at) >= thirtyDaysAgo).length;
        const tripsPrev30 = tripsData.filter(t => new Date(t.created_at) >= sixtyDaysAgo && new Date(t.created_at) < thirtyDaysAgo).length;
        let tripsTrendVal = 0;
        let activeTripsUp = true;
        if (tripsPrev30 > 0) {
          const diff = tripsLast30 - tripsPrev30;
          tripsTrendVal = Math.round((Math.abs(diff) / tripsPrev30) * 100);
          activeTripsUp = diff >= 0;
        } else if (tripsLast30 > 0) {
          tripsTrendVal = 100;
          activeTripsUp = true;
        }

        // 4. Pending Enquiries Trend
        const pendingNow = leadsData.filter(l => (l.status === 'new' || l.status === 'contacted') && new Date(l.created_at) >= sevenDaysAgo).length;
        const pendingPrev = leadsData.filter(l => (l.status === 'new' || l.status === 'contacted') && new Date(l.created_at) >= fourteenDaysAgo && new Date(l.created_at) < sevenDaysAgo).length;
        let pendingTrendVal = 0;
        let pendingEnquiriesUp = false;
        if (pendingPrev > 0) {
          const diff = pendingNow - pendingPrev;
          pendingTrendVal = Math.round((Math.abs(diff) / pendingPrev) * 100);
          pendingEnquiriesUp = diff >= 0;
        } else if (pendingNow > 0) {
          pendingTrendVal = 100;
          pendingEnquiriesUp = true;
        }

        // 5. Confirmed Travelers Trend
        const travelersLast7 = leadsData
          .filter(l => l.status === 'converted' && new Date(l.created_at) >= sevenDaysAgo)
          .reduce((sum, l) => sum + (parseInt(l.group_size) || 1), 0);
        const travelersPrev7 = leadsData
          .filter(l => l.status === 'converted' && new Date(l.created_at) >= fourteenDaysAgo && new Date(l.created_at) < sevenDaysAgo)
          .reduce((sum, l) => sum + (parseInt(l.group_size) || 1), 0);
        let travelersTrendVal = 0;
        let confirmedTravelersUp = true;
        if (travelersPrev7 > 0) {
          const diff = travelersLast7 - travelersPrev7;
          travelersTrendVal = Math.round((Math.abs(diff) / travelersPrev7) * 100);
          confirmedTravelersUp = diff >= 0;
        } else if (travelersLast7 > 0) {
          travelersTrendVal = 100;
          confirmedTravelersUp = true;
        }

        setTrends({
          leads: `${leadsTrendVal}%`,
          leadsUp,
          newLeads: `${newLeadsTrendVal}%`,
          newLeadsUp,
          activeTrips: `${tripsTrendVal}%`,
          activeTripsUp,
          pendingEnquiries: `${pendingTrendVal}%`,
          pendingEnquiriesUp,
          confirmedTravelers: `${travelersTrendVal}%`,
          confirmedTravelersUp,
        });
      }

    } catch (err: any) {
      console.error("Error loading data:", err);
      setError(err.message || "Failed to load database records.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Handle Dynamic Lists adding/removing
  const handleAddHighlight = () => {
    if (newHighlight.trim()) {
      setHighlights([...highlights, newHighlight.trim()]);
      setNewHighlight("");
    }
  };
  const handleRemoveHighlight = (idx: number) => {
    setHighlights(highlights.filter((_, i) => i !== idx));
  };

  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setInclusions([...inclusions, newInclusion.trim()]);
      setNewInclusion("");
    }
  };
  const handleRemoveInclusion = (idx: number) => {
    setInclusions(inclusions.filter((_, i) => i !== idx));
  };

  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion("");
    }
  };
  const handleRemoveExclusion = (idx: number) => {
    setExclusions(exclusions.filter((_, i) => i !== idx));
  };

  const handleAddDay = () => {
    if (!newDayTitle.trim()) return;
    if (editingDayIdx !== null) {
      const updated = [...itinerary];
      updated[editingDayIdx] = {
        ...updated[editingDayIdx],
        title: newDayTitle.trim(),
        description: newDayDesc.trim()
      };
      setItinerary(updated);
      setEditingDayIdx(null);
    } else {
      const nextDay = itinerary.length + 1;
      setItinerary([...itinerary, { day: nextDay, title: newDayTitle.trim(), description: newDayDesc.trim() }]);
    }
    setNewDayTitle("");
    setNewDayDesc("");
  };
  const handleRemoveDay = (idx: number) => {
    const updated = itinerary.filter((_, i) => i !== idx).map((dayObj, i) => ({
      ...dayObj,
      day: i + 1
    }));
    setItinerary(updated);
    if (editingDayIdx === idx) {
      setEditingDayIdx(null);
      setNewDayTitle("");
      setNewDayDesc("");
    } else if (editingDayIdx !== null && editingDayIdx > idx) {
      setEditingDayIdx(editingDayIdx - 1);
    }
  };
  const handleStartEditDay = (idx: number) => {
    setEditingDayIdx(idx);
    setNewDayTitle(itinerary[idx].title);
    setNewDayDesc(itinerary[idx].description || "");
  };

  const handleAddFAQ = () => {
    if (!newQuestion.trim()) return;
    if (editingFAQIdx !== null) {
      const updated = [...faqs];
      updated[editingFAQIdx] = {
        question: newQuestion.trim(),
        answer: newAnswer.trim()
      };
      setFaqs(updated);
      setEditingFAQIdx(null);
    } else {
      setFaqs([...faqs, { question: newQuestion.trim(), answer: newAnswer.trim() }]);
    }
    setNewQuestion("");
    setNewAnswer("");
  };
  const handleRemoveFAQ = (idx: number) => {
    setFaqs(faqs.filter((_, i) => i !== idx));
    if (editingFAQIdx === idx) {
      setEditingFAQIdx(null);
      setNewQuestion("");
      setNewAnswer("");
    } else if (editingFAQIdx !== null && editingFAQIdx > idx) {
      setEditingFAQIdx(editingFAQIdx - 1);
    }
  };
  const handleStartEditFAQ = (idx: number) => {
    setEditingFAQIdx(idx);
    setNewQuestion(faqs[idx].question);
    setNewAnswer(faqs[idx].answer || "");
  };

  // Chips select/deselect
  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };
  const toggleBestFor = (val: string) => {
    if (selectedBestFor.includes(val)) {
      setSelectedBestFor(selectedBestFor.filter((b) => b !== val));
    } else {
      setSelectedBestFor([...selectedBestFor, val]);
    }
  };

  // Base64 Cover image uploader
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm({ ...form, imageUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  // Base64 Gallery image uploader
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          setGalleryImages((prev) => [...prev, reader.result as string]);
        };
        reader.readAsDataURL(file);
      });
    }
  };

  // Base64 Brochure document uploader
  const handleBrochureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 20 * 1024 * 1024) { setError("Brochure must be under 20 MB."); return; }
      setBrochureFileName(file.name);
      const reader = new FileReader();
      reader.onloadend = () => {
        setForm((prev) => ({ ...prev, brochureUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Other documents uploader
  const handleOtherDocUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      if (file.size > 20 * 1024 * 1024) return;
      const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + " MB";
      const reader = new FileReader();
      reader.onloadend = () => {
        setOtherDocs((prev) => [
          ...prev,
          { name: file.name, size: sizeMB, dataUrl: reader.result as string },
        ]);
      };
      reader.readAsDataURL(file);
    });
    e.target.value = "";
  };

  const handleOpenActivateModal = (trip: any) => {
    setActiveTripForActivation(trip);
    setActivationForm({
      startDate: "",
      endDate: "",
      totalSeats: "12",
      price: "",
      tripLeaderId: "",
      meetingPoint: "",
      notes: "",
    });
  };

  const handleActivateTripSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTripForActivation) return;
    try {
      setSubmitLoading(true);
      setError("");
      setSuccess("");

      const { startDate, endDate, totalSeats, tripLeaderId, meetingPoint, notes } = activationForm;
      if (!startDate || !totalSeats) {
        throw new Error("Please fill in all required fields (Start Date and Total Seats).");
      }

      const selectedLeader = users.find((p) => p.id === tripLeaderId);

      const totalSeatsNum = parseInt(totalSeats);
      const priceNum = activeTripForActivation.price ? parseFloat(activeTripForActivation.price) : 99999;

      // Generate sequential departure code e.g. DEP-2026-001
      const startYear = new Date(startDate).getFullYear();
      const existingDeps = departures.filter(d => {
        const parsed = parseDepartureStatus(d.status);
        return parsed.code.startsWith(`DEP-${startYear}-`);
      });
      const nextIndex = existingDeps.length + 1;
      const departureCode = `DEP-${startYear}-${String(nextIndex).padStart(3, "0")}`;

      // Serialize metadata inside status column
      const statusJson = JSON.stringify({
        status: "active",
        code: departureCode,
        leader: selectedLeader?.full_name || selectedLeader?.email || "Select Team Member",
        meeting: meetingPoint || "Airport / City",
        notes: notes || ""
      });

      // 1. Update the trip record directly
      const { error: updateErr } = await supabase
        .from("trips")
        .update({
          start_date: new Date(startDate).toISOString(),
          end_date: endDate ? new Date(endDate).toISOString() : null,
          total_seats: totalSeatsNum,
          seats_left: totalSeatsNum,
          status: "active",
        })
        .eq("id", activeTripForActivation.id);

      if (updateErr) throw updateErr;

      // 2. Insert into trip_departures
      const { error: departureErr } = await supabase
        .from("trip_departures")
        .insert([
          {
            trip_id: activeTripForActivation.id,
            start_date: new Date(startDate).toISOString(),
            end_date: endDate ? new Date(endDate).toISOString() : null,
            total_seats: totalSeatsNum,
            seats_left: totalSeatsNum,
            price: priceNum,
            status: statusJson,
          }
        ]);

      if (departureErr) {
        console.warn("Could not insert departure archive record:", departureErr.message);
      }

      if (tripLeaderId) {
        const { error: assignPrimaryErr } = await supabase
          .from("leads")
          .update({ assigned_to: tripLeaderId })
          .eq("trip_id", activeTripForActivation.id);

        if (assignPrimaryErr) throw assignPrimaryErr;

        const { error: assignLegacyErr } = await supabase
          .from("leads")
          .update({ assigned_to: tripLeaderId })
          .eq("trip_interest", activeTripForActivation.id);

        if (assignLegacyErr) throw assignLegacyErr;
      }

      const activeId = activeTripForActivation.id;
      setSuccess(`Trip "${activeTripForActivation.title}" successfully activated with code ${departureCode}!`);
      setActiveTripForActivation(null);
      loadData();
      setDeparturesFilterTripId(activeId);
      setActiveTab("departures");
    } catch (err: any) {
      setError(err.message || "Failed to activate trip.");
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleSubmitTrip = async (e?: React.FormEvent | React.MouseEvent, statusOverride?: string) => {
    if (e) e.preventDefault();
    try {
      setSubmitLoading(true);
      setError("");
      setSuccess("");

      if (!form.title || !form.destination || !form.description || selectedStyles.length === 0 || highlights.length === 0 || !form.imageUrl) {
        throw new Error("Please fill in all required fields: Title, Destination, Description, Trip Style, Highlights, and Cover Image.");
      }

      const { data: { user: authUser } } = await supabase.auth.getUser();

      const priceVal = form.price ? parseFloat(form.price) : null;
      const ratingVal = 5.0; // Dynamic ratings default to 5.0 on creation
      const reviewsVal = 0; // Dynamic reviews count starts at 0

      // Determine DB status value
      let dbStatus = "draft";
      const currentFormStatus = statusOverride || form.status;
      if (currentFormStatus === "Open" || currentFormStatus === "Open for Enquiries") {
        dbStatus = "Open";
      } else if (currentFormStatus === "Active" || currentFormStatus === "active") {
        dbStatus = "active";
      } else if (currentFormStatus === "Completed" || currentFormStatus === "completed") {
        dbStatus = "completed";
      } else {
        dbStatus = "draft";
      }

      const parseFormDate = (dStr: string) => {
        if (!dStr) return null;
        const parsed = Date.parse(dStr);
        return isNaN(parsed) ? null : new Date(parsed).toISOString();
      };

      const parseFormInt = (iStr: string) => {
        if (!iStr) return null;
        const parsed = parseInt(iStr);
        return isNaN(parsed) ? null : parsed;
      };

      const startDateVal = parseFormDate(form.startDate);
      const endDateVal = parseFormDate(form.endDate);
      const totalSeatsVal = parseFormInt(form.totalSeats);
      const seatsLeftVal = parseFormInt(form.seatsLeft);

      if (editingTripId) {
        const { error: updateError } = await supabase
          .from("trips")
          .update({
            title: form.title,
            destination: form.destination,
            description: form.description,
            trip_style: selectedStyles.join(", "),
            difficulty: form.difficulty,
            best_for: selectedBestFor.join(", "),
            age_group: form.ageGroup,
            meals: form.meals,
            group_size: form.groupSize,
            duration: form.duration,
            price: priceVal,
            image_url: form.imageUrl,
            brochure_url: form.brochureUrl || null,
            images: galleryImages,
            accommodation: form.accommodation,
            highlights: highlights,
            inclusions: inclusions,
            exclusions: exclusions,
            status: dbStatus,
            itinerary: itinerary,
            faqs: faqs,
            start_date: startDateVal,
            end_date: endDateVal,
            total_seats: totalSeatsVal,
            seats_left: seatsLeftVal,
          })
          .eq("id", editingTripId);

        if (updateError) throw updateError;
        setSuccess(`Trip "${form.title}" successfully updated!`);
      } else {
        const { error: insertError } = await supabase.from("trips").insert([
          {
            title: form.title,
            destination: form.destination,
            description: form.description,
            trip_style: selectedStyles.join(", "),
            difficulty: form.difficulty,
            best_for: selectedBestFor.join(", "),
            age_group: form.ageGroup,
            meals: form.meals,
            group_size: form.groupSize,
            duration: form.duration,
            price: priceVal,
            total_seats: totalSeatsVal,
            seats_left: seatsLeftVal,
            image_url: form.imageUrl,
            brochure_url: form.brochureUrl || null,
            images: galleryImages,
            accommodation: form.accommodation,
            highlights: highlights,
            inclusions: inclusions,
            exclusions: exclusions,
            status: dbStatus,
            start_date: startDateVal,
            end_date: endDateVal,
            rating: ratingVal,
            reviews: reviewsVal,
            itinerary: itinerary,
            faqs: faqs,
            created_by: authUser?.id || null,
          },
        ]);

        if (insertError) throw insertError;
        setSuccess(`Trip "${form.title}" successfully created!`);
      }
      
      // Clear all state after success
      setForm({
        title: "",
        destination: "",
        status: "Draft",
        price: "",
        duration: "",
        startDate: "",
        endDate: "",
        imageUrl: "",
        accommodation: "",
        description: "",
        difficulty: "Easy",
        ageGroup: "18-35",
        meals: "Breakfast Only",
        groupSize: "8-12",
        rating: "4.9",
        reviewsCount: "112",
        totalSeats: "12",
        seatsLeft: "8",
        brochureUrl: "",
      });
      setBrochureFileName("");
      setSelectedStyles([]);
      setSelectedBestFor([]);
      setHighlights([]);
      setInclusions([]);
      setExclusions([]);
      setItinerary([{ day: 1, title: "Arrival in Tokyo", description: "Meet at airport, welcome dinner, check-in." }]);
      setFaqs([{ question: "Are flights included?", answer: "No." }]);
      setGalleryImages([]);
      setEditingDayIdx(null);
      setEditingFAQIdx(null);

      loadData();
      setActiveTab("trips");
    } catch (err: any) {
      setError(err.message || "Failed to create trip.");
    } finally {
      setSubmitLoading(false);
    }
  };

  // Calculate dynamic Lead Funnel segments
  const countNew = leads.filter((l) => l.status === "new").length;
  const countContacted = leads.filter((l) => l.status === "contacted").length;
  const countQualified = leads.filter((l) => l.status === "qualified").length;
  const countNegotiating = leads.filter((l) => l.status === "negotiating" || l.status === "vibe check sent").length;
  const countConverted = leads.filter((l) => l.status === "converted").length;
  const countLost = leads.filter((l) => l.status === "lost").length;

  const totalLeads = leads.length;
  const conversionRate = totalLeads > 0 
    ? ((countConverted / totalLeads) * 100).toFixed(2) 
    : "0.00";

  // Calculate dynamic Donut slices for Enquiries by Status
  const pctNew = totalLeads > 0 ? Math.round((countNew / totalLeads) * 100) : 0;
  const pctContacted = totalLeads > 0 ? Math.round((countContacted / totalLeads) * 100) : 0;
  const pctQualified = totalLeads > 0 ? Math.round((countQualified / totalLeads) * 100) : 0;
  const pctConverted = totalLeads > 0 ? Math.round((countConverted / totalLeads) * 100) : 0;
  const pctLost = totalLeads > 0 ? Math.round((countLost / totalLeads) * 100) : 0;

  // Build a conic gradient background representing the dynamic database slices
  const donutGradient = totalLeads > 0
    ? `conic-gradient(#62A1F8 0% ${pctNew}%, #5CB87A ${pctNew}% ${pctNew + pctContacted}%, #F8C04E ${pctNew + pctContacted}% ${pctNew + pctContacted + pctQualified}%, #7C5CFC ${pctNew + pctContacted + pctQualified}% ${pctNew + pctContacted + pctQualified + pctConverted}%, #E5E7EB ${pctNew + pctContacted + pctQualified + pctConverted}% 100%)`
    : "#E5E7EB";

  // SVG Funnel Taper points dynamic builder
  const maxFunnelVal = Math.max(countNew, countContacted, countQualified, countNegotiating, countConverted, 1);
  const getPolygonPoints = (index: number, val: number) => {
    const segmentHeight = 20;
    const gap = 3;
    
    const topY = index * (segmentHeight + gap);
    const bottomY = topY + segmentHeight;
    
    // Normalize width (scale between 10% and 90% of SVG canvas width = 100)
    const w = (val / maxFunnelVal) * 80 + 10;
    const wTop = w;
    const wBottom = w * 0.85; // Slight taper to give it a funnel look
    
    const x1 = 50 - wTop / 2;
    const x2 = 50 + wTop / 2;
    const x3 = 50 + wBottom / 2;
    const x4 = 50 - wBottom / 2;
    
    return `${x1},${topY} ${x2},${topY} ${x3},${bottomY} ${x4},${bottomY}`;
  };

  const getTodayDateString = () => {
    return new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  };

  // Convert Date strings to nice preview format e.g. "12 Oct - 19 Oct 2026"
  const getPreviewDateString = () => {
    if (!form.startDate) return "Departure Date";
    const start = new Date(form.startDate);
    const options: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
    const startStr = start.toLocaleDateString("en-US", options);
    
    if (form.endDate) {
      const end = new Date(form.endDate);
      const endStr = end.toLocaleDateString("en-US", { day: "2-digit", month: "short", year: "numeric" });
      return `${startStr} - ${endStr}`;
    }
  };

  // Close actions dropdown when clicking elsewhere
  useEffect(() => {
    if (!activeActionDropdownId) return;

    const closeDropdown = () => {
      setActiveActionDropdownId(null);
      setActiveActionDropdownPosition(null);
    };

    const handleDocumentClick = (event: MouseEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target?.closest('[data-dropdown-wrapper]')) {
        closeDropdown();
      }
    };

    document.addEventListener("mousedown", handleDocumentClick);
    window.addEventListener("scroll", closeDropdown, true);
    window.addEventListener("resize", closeDropdown);
    return () => {
      document.removeEventListener("mousedown", handleDocumentClick);
      window.removeEventListener("scroll", closeDropdown, true);
      window.removeEventListener("resize", closeDropdown);
    };
  }, [activeActionDropdownId]);

  // Get unique destinations for catalog dropdown
  const uniqueDestinations = Array.from(
    new Set(trips.map((t) => t.destination).filter(Boolean))
  ).sort() as string[];

  // Get unique styles for catalog dropdown
  const uniqueStyles = Array.from(
    new Set(
      trips
        .flatMap((t) => (t.trip_style ? t.trip_style.split(",").map((s: string) => s.trim()) : []))
        .filter(Boolean)
    )
  ).sort() as string[];

  // Count metrics for the status pills
  const countAllTrips = trips.length;
  const countDraftTrips = trips.filter((t) => t.status?.toLowerCase() === "draft").length;
  const countOpenTrips = trips.filter((t) => t.status?.toLowerCase() === "open" || t.status?.toLowerCase() === "open for enquiries").length;
  const countActiveTrips = trips.filter((t) => t.status?.toLowerCase() === "active").length;
  const countCompletedTrips = trips.filter((t) => t.status?.toLowerCase() === "completed").length;
  const countArchivedTrips = trips.filter((t) => t.status?.toLowerCase() === "archived").length;

  // Filter trips
  const filteredTrips = trips.filter((trip) => {
    // 1. Status Filter tab
    if (catalogStatusFilter !== "all") {
      const s = trip.status?.toLowerCase() || "";
      if (catalogStatusFilter === "draft" && s !== "draft") return false;
      if (catalogStatusFilter === "open" && s !== "open" && s !== "open for enquiries") return false;
      if (catalogStatusFilter === "active" && s !== "active") return false;
      if (catalogStatusFilter === "completed" && s !== "completed") return false;
      if (catalogStatusFilter === "archived" && s !== "archived") return false;
    }

    // 2. Search Box
    if (catalogSearch.trim()) {
      const q = catalogSearch.toLowerCase();
      const matchesTitle = trip.title?.toLowerCase().includes(q);
      const matchesDest = trip.destination?.toLowerCase().includes(q);
      if (!matchesTitle && !matchesDest) return false;
    }

    // 3. Destination filter dropdown
    if (catalogDestination !== "all") {
      if (trip.destination !== catalogDestination) return false;
    }

    // 4. Style filter dropdown
    if (catalogStyle !== "all") {
      const styles = trip.trip_style
        ? trip.trip_style.split(",").map((s: string) => s.trim().toLowerCase())
        : [];
      if (!styles.includes(catalogStyle.toLowerCase())) return false;
    }

    // 5. Difficulty filter dropdown
    if (catalogDifficulty !== "all") {
      if (trip.difficulty?.toLowerCase() !== catalogDifficulty.toLowerCase()) return false;
    }

    return true;
  });

  // Sort trips
  const sortedTrips = [...filteredTrips].sort((a, b) => {
    if (catalogSortBy === "newest") {
      return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
    }
    if (catalogSortBy === "oldest") {
      return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
    }
    if (catalogSortBy === "price_asc") {
      const pa = a.price ? parseFloat(a.price) : 0;
      const pb = b.price ? parseFloat(b.price) : 0;
      return pa - pb;
    }
    if (catalogSortBy === "price_desc") {
      const pa = a.price ? parseFloat(a.price) : 0;
      const pb = b.price ? parseFloat(b.price) : 0;
      return pb - pa;
    }
    return 0;
  });

  // Paginate trips
  const totalItems = sortedTrips.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
  const paginatedTrips = sortedTrips.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Subtitle builder helper
  const getSubtitle = (trip: any) => {
    if (trip.title.includes("Tokyo")) return "City lights, culture & mountain views";
    if (trip.title.includes("Swiss") || trip.title.includes("Alps")) return "Scenic rail journeys & alpine villages";
    if (trip.title.includes("Bali")) return "Spirituality, beaches & culture";
    if (trip.title.includes("Iceland")) return "Chase the aurora in Iceland";
    if (trip.title.includes("Ladakh")) return "High passes, valleys & monasteries";
    if (trip.title.includes("Morocco")) return "Deserts, medinas & local life";
    return trip.description ? (trip.description.split('.')[0] + '.') : "A curated journey by Nomichi.";
  };

  // Enquiry status text builder helper
  const getEnquiryDisplay = (trip: any, tripLeads: any[]) => {
    const count = tripLeads.length;
    if (count === 0) return { count: 0, label: "—", className: "text-nomichi-ink/40" };
    
    const s = trip.status?.toLowerCase();
    if (s === "completed") {
      return { count, label: "Completed", className: "text-nomichi-ink/50" };
    }
    if (s === "active") {
      const confirmedCount = tripLeads.filter(l => ["converted", "confirmed"].includes(l.status?.toLowerCase())).length;
      if (confirmedCount > 0) {
        return { count: confirmedCount, label: "Confirmed", className: "text-emerald-600 font-bold" };
      }
      const qualifiedCount = tripLeads.filter(l => ["qualified", "negotiating", "vibe_check_sent"].includes(l.status?.toLowerCase())).length;
      return { count: qualifiedCount || count, label: "Qualified", className: "text-emerald-600 font-bold" };
    }
    return { count, label: "Interested", className: "text-nomichi-ink/60" };
  };

  // Pagination range builder helper
  const getPaginationRange = () => {
    const delta = 1;
    const range: (number | string)[] = [];
    const pages: (number | string)[] = [];
    let l: number | null = null;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) {
        range.push(i);
      }
    }

    for (let i of range) {
      if (typeof i === "number" && l !== null) {
        if (i - l === 2) {
          pages.push(l + 1);
        } else if (i - l > 2) {
          pages.push("...");
        }
      }
      pages.push(i);
      if (typeof i === "number") {
        l = i;
      }
    }

    return pages;
  };

  const formatActiveDates = (startStr: string, endStr: string) => {
    if (!startStr) return "TBD";
    const start = new Date(startStr);
    const startDay = start.getDate();
    const startMonth = start.toLocaleDateString("en-IN", { month: "short" });
    if (!endStr) return `${startDay} ${startMonth}`;
    const end = new Date(endStr);
    const endDay = end.getDate();
    const endMonth = end.toLocaleDateString("en-IN", { month: "short" });
    if (startMonth === endMonth) {
      return `${startDay} - ${endDay} ${startMonth}`;
    } else {
      return `${startDay} ${startMonth} - ${endDay} ${endMonth}`;
    }
  };

  const handleStartEditTrip = (trip: any) => {
    setError("");
    setSuccess("");
    setEditingTripId(trip.id);
    
    setForm({
      title: trip.title || "",
      destination: trip.destination || "",
      status: trip.status || "Draft",
      price: trip.price ? String(trip.price) : "",
      duration: trip.duration || "",
      startDate: trip.start_date ? trip.start_date.split("T")[0] : "",
      endDate: trip.end_date ? trip.end_date.split("T")[0] : "",
      imageUrl: trip.image_url || "",
      accommodation: trip.accommodation || "",
      description: trip.description || "",
      difficulty: trip.difficulty || "Easy",
      ageGroup: trip.age_group || "18-35",
      meals: trip.meals || "Breakfast Only",
      groupSize: trip.group_size || "8-12",
      rating: trip.rating ? String(trip.rating) : "4.9",
      reviewsCount: trip.reviews ? String(trip.reviews) : "112",
      totalSeats: trip.total_seats ? String(trip.total_seats) : "12",
      seatsLeft: trip.seats_left ? String(trip.seats_left) : "8",
      brochureUrl: trip.brochure_url || "",
    });

    setBrochureFileName(trip.brochure_url ? "uploaded_brochure.pdf" : "");
    setSelectedStyles(trip.trip_style ? trip.trip_style.split(",").map((s: string) => s.trim()) : []);
    setSelectedBestFor(trip.best_for ? trip.best_for.split(",").map((s: string) => s.trim()) : []);
    setHighlights(trip.highlights || []);
    setInclusions(trip.inclusions || []);
    setExclusions(trip.exclusions || []);
    setItinerary(trip.itinerary && trip.itinerary.length > 0 ? trip.itinerary : [{ day: 1, title: "Arrival", description: "Meet at airport." }]);
    setFaqs(trip.faqs && trip.faqs.length > 0 ? trip.faqs : [{ question: "Are flights included?", answer: "No." }]);
    setGalleryImages(trip.images || []);
    setOtherDocs([]);
    setAutoSendBrochure(false);

    setActiveTab("add_trip");
  };

  const handleOpenTripOverview = (trip: any) => {
    router.push(`/admin/trips/${trip.id}/overview`);
  };

  const handleStartCreateTrip = () => {
    setError("");
    setSuccess("");
    setEditingTripId(null);
    
    setForm({
      title: "",
      destination: "",
      status: "Draft",
      price: "",
      duration: "",
      startDate: "",
      endDate: "",
      imageUrl: "",
      accommodation: "",
      description: "",
      difficulty: "Easy",
      ageGroup: "18-35",
      meals: "Breakfast Only",
      groupSize: "8-12",
      rating: "4.9",
      reviewsCount: "112",
      totalSeats: "12",
      seatsLeft: "8",
      brochureUrl: "",
    });

    setBrochureFileName("");
    setSelectedStyles([]);
    setSelectedBestFor([]);
    setHighlights([]);
    setInclusions([]);
    setExclusions([]);
    setItinerary([{ day: 1, title: "Arrival in Tokyo", description: "Meet at airport, welcome dinner, check-in." }]);
    setFaqs([{ question: "Are flights included?", answer: "No." }]);
    setGalleryImages([]);
    setOtherDocs([]);
    setAutoSendBrochure(false);

    setActiveTab("add_trip");
  };

  const handleRestoreTrip = async (tripId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("trips")
        .update({ status: "draft" })
        .eq("id", tripId);
      if (error) throw error;
      setSuccess("Trip restored successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to restore trip.");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenForEnquiries = async (tripId: string) => {
    try {
      setLoading(true);
      const { error } = await supabase
        .from("trips")
        .update({ status: "Open" })
        .eq("id", tripId);
      if (error) throw error;
      setSuccess("Trip opened for enquiries successfully!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to update trip status.");
    } finally {
      setLoading(false);
    }
  };

  const handleDuplicateTrip = async (trip: any) => {
    try {
      setLoading(true);
      const { data: { user: authUser } } = await supabase.auth.getUser();
      const { error } = await supabase.from("trips").insert([
        {
          title: `${trip.title} (Copy)`,
          destination: trip.destination,
          description: trip.description,
          trip_style: trip.trip_style,
          difficulty: trip.difficulty,
          best_for: trip.best_for,
          age_group: trip.age_group,
          meals: trip.meals,
          group_size: trip.group_size,
          duration: trip.duration,
          price: trip.price,
          total_seats: null,
          seats_left: null,
          image_url: trip.image_url,
          brochure_url: trip.brochure_url,
          images: trip.images,
          accommodation: trip.accommodation,
          highlights: trip.highlights,
          inclusions: trip.inclusions,
          exclusions: trip.exclusions,
          status: "draft",
          rating: 5.0,
          reviews: 0,
          itinerary: trip.itinerary,
          faqs: trip.faqs,
          created_by: authUser?.id || null,
        }
      ]);
      if (error) throw error;
      setSuccess(`Trip "${trip.title}" duplicated successfully!`);
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to duplicate trip.");
    } finally {
      setLoading(false);
    }
  };

  const parseDepartureStatus = (dbStatus: string) => {
    try {
      if (dbStatus && dbStatus.startsWith("{")) {
        const parsed = JSON.parse(dbStatus);
        return {
          status: parsed.status || "active",
          code: parsed.code || "DEP-2026-001",
          leader: parsed.leader || "Select Team Member",
          meeting: parsed.meeting || "Airport / City",
          notes: parsed.notes || ""
        };
      }
    } catch (e) {
      // Ignore JSON parse errors
    }
    return {
      status: dbStatus || "active",
      code: "DEP-2026-001",
      leader: "Select Team Member",
      meeting: "Airport / City",
      notes: ""
    };
  };

  const renderContextualDropdown = (trip: any, enqInfo: { count: number; label: string }) => {
    const handlePreview = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveActionDropdownId(null);
      setActiveActionDropdownPosition(null);
      router.push(`/admin/trips/${trip.id}/overview`);
    };

    const handleEdit = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveActionDropdownId(null);
      setActiveActionDropdownPosition(null);
      handleStartEditTrip(trip);
    };

    const handleActivate = (e: React.MouseEvent) => {
      e.stopPropagation();
      setActiveActionDropdownId(null);
      setActiveActionDropdownPosition(null);
      handleOpenActivateModal(trip);
    };

    const handleDelete = (e: React.MouseEvent) => {
      e.stopPropagation();
      handleDeleteTrip(trip.id);
      setActiveActionDropdownId(null);
      setActiveActionDropdownPosition(null);
    };

    return (
      <>
        <button
          onClick={handlePreview}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-nomichi-ink hover:bg-[#FAF8F4] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
        >
          👁 View
        </button>
        <button
          onClick={handleEdit}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-nomichi-ink hover:bg-[#FAF8F4] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
        >
          ✏️ Edit
        </button>
        <button
          onClick={handleActivate}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-[#FF5B26] hover:bg-[#FFEFEA] rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
        >
          🚀 Activate
        </button>
        <div className="border-t border-[#e7e1d5]/30 my-1"></div>
        <button
          onClick={handleDelete}
          className="flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-xl border-0 bg-transparent cursor-pointer transition-all w-full text-left"
        >
          🗑️ Delete
        </button>
      </>
    );
  };

  // Helper to handle archive action
  const handleArchiveTrip = async (tripId: string) => {
    try {
      const { error } = await supabase
        .from("trips")
        .update({ status: "archived" })
        .eq("id", tripId);
      if (error) throw error;
      setSuccess("Trip successfully archived!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to archive trip.");
    }
  };

  // Helper to handle delete action
  const handleDeleteTrip = async (tripId: string) => {
    if (!window.confirm("Are you sure you want to delete this trip?")) return;
    try {
      const { error } = await supabase
        .from("trips")
        .delete()
        .eq("id", tripId);
      if (error) throw error;
      setSuccess("Trip successfully deleted!");
      loadData();
    } catch (err: any) {
      setError(err.message || "Failed to delete trip.");
    }
  };

  const toggleActionDropdown = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (activeActionDropdownId === id) {
      setActiveActionDropdownId(null);
      setActiveActionDropdownPosition(null);
    } else {
      setActiveActionDropdownId(id);
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const estimatedMenuHeight = 180;
      const openAbove = rect.bottom + estimatedMenuHeight + 12 > window.innerHeight && rect.top > estimatedMenuHeight + 12;
      setActiveActionDropdownPosition({
        top: openAbove ? rect.top - estimatedMenuHeight - 8 : rect.bottom + 8,
        right: Math.max(12, window.innerWidth - rect.right),
      });
    }
  };

  return (
    <div className="h-screen bg-[#FAF8F4] font-sans antialiased text-nomichi-ink flex w-full overflow-hidden">
      
      {/* ===================== SIDEBAR ===================== */}
      <aside className="w-[260px] h-screen bg-white border-r border-[#e7e1d5]/50 flex flex-col justify-between shrink-0 p-6 sticky top-0 z-20">
        <div className="space-y-6 flex-grow flex flex-col">
          
          {/* Logo Section - Preserved Brand Asset Image */}
          <div className="flex flex-col items-start px-2 mb-4">
            <img src="/logo.png" alt="Nomichi Logo" className="h-9 w-auto object-contain" />
            <span className="text-[9px] font-bold text-nomichi-sand tracking-[0.2em] uppercase mt-3">
              Wander • Connect • Belong
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 flex-1 text-left">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                activeTab === "dashboard"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </button>

            <button
              onClick={() => {
                setActiveTab("leads");
              }}
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                activeTab === "leads"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Users className="w-4 h-4" />
              Leads
            </button>

            {/* Expandable Trips Tab to Match Mockup Sidebar */}
            <div className="space-y-0.5">
              <button
                onClick={() => setTripsMenuOpen(!tripsMenuOpen)}
                className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                  activeTab === "trips" || activeTab === "add_trip"
                    ? "text-[#FF5B26] font-extrabold"
                    : "text-nomichi-ink/75 hover:bg-nomichi-sand/10"
                }`}
              >
                <span className="flex items-center gap-3.5">
                  <Compass className="w-4 h-4" />
                  Trips
                </span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${tripsMenuOpen ? "rotate-180" : ""}`} />
              </button>
              
              {tripsMenuOpen && (
                <div className="pl-6 space-y-0.5 animate-in slide-in-from-top-1 duration-200">
                  <button
                    onClick={() => { setActiveTab("trips"); }}
                    className={`flex items-center gap-3 px-4 py-2 text-[11px] font-bold rounded-lg w-full text-left border-0 bg-transparent cursor-pointer ${
                      activeTab === "trips" ? "text-[#FF5B26]" : "text-nomichi-ink/50 hover:text-nomichi-ink"
                    }`}
                  >
                    All Trips
                  </button>
                  <button
                    onClick={() => { handleStartCreateTrip(); }}
                    className={`flex items-center gap-3 px-4 py-2 text-[11px] font-bold rounded-lg w-full text-left border-0 bg-transparent cursor-pointer ${
                      activeTab === "add_trip" ? "bg-[#FFEFEA] text-[#FF5B26]" : "text-nomichi-ink/50 hover:text-nomichi-ink"
                    }`}
                  >
                    Add Trip
                  </button>
                </div>
              )}
            </div>

            <button
              onClick={() => setActiveTab("bookings")}
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                activeTab === "bookings"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <CalendarCheck className="w-4 h-4" />
              Bookings
            </button>

            <button
              onClick={() => {
                setTravelersFilterTripId(null);
                setActiveTab("travelers");
              }}
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                activeTab === "travelers"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <User className="w-4 h-4" />
              Travelers
            </button>

            <button
              onClick={() => setActiveTab("departures")}
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                activeTab === "departures"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Plane className="w-4 h-4" />
              Departures
            </button>


            <button
              onClick={() => setActiveTab("users")}
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                activeTab === "users"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Users className="w-4 h-4" />
              Role Manager
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                activeTab === "settings"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </button>
          </nav>
        </div>



        {/* Bottom fixed area */}
        <div className="space-y-1.5 pt-4 border-t border-[#e7e1d5]/50">
          <button
            onClick={onBack}
            className="flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26] rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            Client Portal
          </button>
          <a
            href="/auth/signout"
            className="flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold text-[#FF5B26] hover:bg-[#FF5B26]/5 rounded-xl transition-all no-underline"
          >
            <LogOut className="w-4 h-4" />
            Logout
          </a>
        </div>
      </aside>

      {/* ===================== MAIN CONTENT WRAPPER ===================== */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* ===================== TOP HEADER ===================== */}
        <header className="h-[70px] bg-white border-b border-[#e7e1d5]/50 px-8 flex items-center justify-between shrink-0 relative z-10">
          <div className="flex items-center gap-4 flex-1">
            <button className="xl:hidden p-2 rounded-xl hover:bg-[#FAF8F4] text-nomichi-ink/70 border-0 bg-transparent cursor-pointer">
              <Menu className="w-5 h-5" />
            </button>
            <div className="relative max-w-md w-full">
              <input
                type="text"
                placeholder="Search anything..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-11 py-2 border border-[#e7e1d5] bg-[#FAF8F4]/30 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35"
              />
              <Search className="w-4 h-4 text-nomichi-ink/35 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            {/* Notification Bell */}
            <button className="w-10 h-10 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/60 transition-all relative cursor-pointer bg-white">
              <Bell className="w-4.5 h-4.5" />
              <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF5B26] text-white text-[9px] font-black flex items-center justify-center">
                3
              </span>
            </button>

            {/* Profile Info */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full overflow-hidden border border-[#e7e1d5]/50 bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-sm shrink-0">
                {user.avatarUrl ? (
                  <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  firstName.charAt(0).toUpperCase() || "A"
                )}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-extrabold text-nomichi-ink leading-none mb-1">
                  {user.fullName || "Ananya Mehta"}
                </span>
                <span className="text-[10px] font-bold text-nomichi-ink/40 leading-none">
                  Admin
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ===================== MAIN SCROLLABLE CONTENT ===================== */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center py-40">
              <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
              <span className="text-xs text-nomichi-ink/50 font-bold mt-4">Analyzing Database...</span>
            </div>
          ) : activeTab === "dashboard" ? (
            /* ===================== DASHBOARD VIEW ===================== */
            <div className="space-y-8 animate-in fade-in duration-300">
              {/* (Existing Dynamic Stats Cards and funnel graphics here) */}
              {/* Welcome Row */}
              <div className="flex items-center justify-between text-left">
                <div>
                  <h1 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight flex items-center gap-2">
                    Good morning, {firstName} 👋
                  </h1>
                  <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
                    Here's what's happening with Nomichi today.
                  </p>
                </div>
                <button className="px-4 py-2.5 border border-[#e7e1d5] hover:bg-[#FAF8F4]/80 text-nomichi-ink/80 font-bold text-xs rounded-xl flex items-center gap-2 transition-all bg-white cursor-pointer shadow-sm">
                  <Calendar className="w-4 h-4 text-nomichi-ink/45" />
                  Today, {getTodayDateString()}
                  <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40" />
                </button>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5">
                {/* Total Leads */}
                <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Total Leads</span>
                    <div className="w-8 h-8 rounded-full bg-[#EBF0FF] text-[#3B82F6] flex items-center justify-center shrink-0">
                      <Users className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{dbStats.totalLeads}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${trends.leadsUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {trends.leadsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trends.leads}
                      </span>
                      <span className="text-[9px] font-bold text-nomichi-ink/30">vs last 7 days</span>
                    </div>
                  </div>
                </div>

                {/* New Leads Today */}
                <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">New Leads Today</span>
                    <div className="w-8 h-8 rounded-full bg-[#EBF5FF] text-[#2563EB] flex items-center justify-center shrink-0">
                      <UserPlus className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{dbStats.newLeadsToday}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${trends.newLeadsUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {trends.newLeadsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trends.newLeads}
                      </span>
                      <span className="text-[9px] font-bold text-nomichi-ink/30">vs yesterday</span>
                    </div>
                  </div>
                </div>

                {/* Active Trips */}
                <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Active Trips</span>
                    <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                      <Briefcase className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{dbStats.activeTrips}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${trends.activeTripsUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {trends.activeTripsUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trends.activeTrips}
                      </span>
                      <span className="text-[9px] font-bold text-nomichi-ink/30">vs last month</span>
                    </div>
                  </div>
                </div>

                {/* Upcoming Departures */}
                <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Upcoming Departures</span>
                    <div className="w-8 h-8 rounded-full bg-[#FFF1F2] text-[#F43F5E] flex items-center justify-center shrink-0">
                      <Plane className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{dbStats.upcomingDepartures}</h3>
                    <div className="flex flex-col mt-2">
                      <span className="text-[9px] font-bold text-nomichi-ink/40">Next Departures</span>
                    </div>
                  </div>
                </div>

                {/* Pending Enquiries */}
                <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Pending Enquiries</span>
                    <div className="w-8 h-8 rounded-full bg-[#FFFBEB] text-[#F59E0B] flex items-center justify-center shrink-0">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{dbStats.pendingEnquiries}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${trends.pendingEnquiriesUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {trends.pendingEnquiriesUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trends.pendingEnquiries}
                      </span>
                      <span className="text-[9px] font-bold text-nomichi-ink/30">vs last 7 days</span>
                    </div>
                  </div>
                </div>

                {/* Confirmed Travelers */}
                <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between text-left h-[160px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">Confirmed Travelers</span>
                    <div className="w-8 h-8 rounded-full bg-[#ECFDF5] text-[#10B981] flex items-center justify-center shrink-0">
                      <CalendarCheck className="w-4 h-4" />
                    </div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{dbStats.confirmedTravelers}</h3>
                    <div className="flex items-center gap-1.5 mt-2">
                      <span className={`text-[10px] font-extrabold flex items-center gap-0.5 ${trends.confirmedTravelersUp ? "text-emerald-600" : "text-rose-600"}`}>
                        {trends.confirmedTravelersUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />} {trends.confirmedTravelers}
                      </span>
                      <span className="text-[9px] font-bold text-nomichi-ink/30">vs last 7 days</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Row */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Lead Funnel */}
                <div className="bg-white p-6 rounded-3xl border border-[#e7e1d5]/40 shadow-sm lg:col-span-6 flex flex-col justify-between text-left h-[460px]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-display font-extrabold text-nomichi-ink">Lead Funnel</h2>
                    <button className="px-3 py-1.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/75 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all bg-white cursor-pointer shadow-sm">
                      This Month
                      <ChevronDown className="w-3 h-3 text-nomichi-ink/40" />
                    </button>
                  </div>
                  <div className="flex flex-row items-center justify-between flex-1 gap-8 mt-2">
                    <div className="w-1/2 flex items-center justify-center">
                      <svg viewBox="0 0 100 120" className="w-full max-h-[260px]">
                        <polygon points={getPolygonPoints(0, countNew)} fill="#7C5CFC" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                        <polygon points={getPolygonPoints(1, countContacted)} fill="#62A1F8" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                        <polygon points={getPolygonPoints(2, countQualified)} fill="#5CB87A" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                        <polygon points={getPolygonPoints(3, countNegotiating)} fill="#F8C04E" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                        <polygon points={getPolygonPoints(4, countConverted)} fill="#F2745D" className="opacity-95 hover:opacity-100 transition-all duration-500" />
                      </svg>
                    </div>
                    <div className="w-1/2 flex flex-col justify-center space-y-4">
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#7C5CFC]" /> New
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countNew}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#62A1F8]" /> Contacted
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countContacted}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5CB87A]" /> Qualified
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countQualified}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F8C04E]" /> Vibe Check Sent
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countNegotiating}</span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F2745D]" /> Confirmed
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countConverted}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2">
                        <span className="text-xs font-extrabold text-nomichi-ink/50">Conversion Rate</span>
                        <span className="text-sm font-black text-emerald-600">{conversionRate}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enquiries Status */}
                <div className="bg-white p-6 rounded-3xl border border-[#e7e1d5]/40 shadow-sm lg:col-span-6 flex flex-col justify-between text-left h-[460px]">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-display font-extrabold text-nomichi-ink">Enquiries by Status</h2>
                    <button className="px-3 py-1.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/75 font-bold text-[10px] rounded-lg flex items-center gap-1 transition-all bg-white cursor-pointer shadow-sm">
                      This Month
                      <ChevronDown className="w-3 h-3 text-nomichi-ink/40" />
                    </button>
                  </div>
                  <div className="flex flex-row items-center justify-between flex-1 gap-8 mt-2">
                    <div className="w-1/2 flex items-center justify-center">
                      <div className="w-[170px] h-[170px] rounded-full flex items-center justify-center relative shadow-sm" style={{ background: donutGradient }}>
                        <div className="w-[114px] h-[114px] rounded-full bg-white flex flex-col items-center justify-center shadow-inner">
                          <span className="text-2xl font-display font-black text-nomichi-ink leading-none">{totalLeads}</span>
                          <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-widest mt-1.5">Total</span>
                        </div>
                      </div>
                    </div>
                    <div className="w-1/2 flex flex-col justify-center space-y-4">
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#62A1F8]" /> New
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countNew} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctNew}%)</span></span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#5CB87A]" /> Contacted
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countContacted} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctContacted}%)</span></span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#F8C04E]" /> Qualified
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countQualified} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctQualified}%)</span></span>
                      </div>
                      <div className="flex items-center justify-between border-b border-[#e7e1d5]/20 pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#7C5CFC]" /> Confirmed
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countConverted} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctConverted}%)</span></span>
                      </div>
                      <div className="flex items-center justify-between pb-1">
                        <span className="text-xs font-bold text-nomichi-ink/60 flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" /> Lost
                        </span>
                        <span className="text-xs font-extrabold text-nomichi-ink">{countLost} <span className="text-[10px] text-nomichi-ink/40 font-medium">({pctLost}%)</span></span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : activeTab === "trips" ? (
            /* ===================== REDESIGNED TRIPS CATALOG TAB ===================== */
            <div className="space-y-6 animate-in fade-in duration-300 text-left">
              {/* Header section with title and Add button */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">All Trips</h1>
                  <p className="text-xs text-nomichi-ink/50 font-semibold mt-0.5">Manage all your trips and their details.</p>
                </div>
                <button
                  onClick={() => handleStartCreateTrip()}
                  className="px-4 py-2.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all cursor-pointer border-0 flex items-center gap-1.5"
                >
                  <Plus className="w-4.5 h-4.5 stroke-[2.5]" />
                  Add New Trip
                </button>
              </div>

              {/* Status Tabs Filter Bar */}
              <div className="flex flex-wrap items-center gap-3">
                {[
                  { id: "all", label: "All Trips", count: countAllTrips },
                  { id: "draft", label: "Draft", count: countDraftTrips },
                  { id: "open", label: "Open For Enquiries", count: countOpenTrips },
                  { id: "active", label: "Active", count: countActiveTrips },
                  { id: "completed", label: "Completed", count: countCompletedTrips },
                  { id: "archived", label: "Archived", count: countArchivedTrips },
                ].map((tab) => {
                  const isActive = catalogStatusFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setCatalogStatusFilter(tab.id);
                        setCurrentPage(1);
                      }}
                      className={`flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                        isActive
                          ? "bg-white border-[#FF5B26] text-[#FF5B26] shadow-2xs"
                          : "bg-[#FAF8F4]/80 border-transparent text-nomichi-ink/50 hover:bg-[#e7e1d5]/30 hover:text-nomichi-ink"
                      }`}
                    >
                      <span>{tab.label}</span>
                      {tab.id !== "all" && (
                        <span className={`px-1.5 py-0.5 text-[10px] font-black rounded-md ${
                          isActive ? "bg-[#FFEFEA] text-[#FF5B26]" : "bg-[#e7e1d5]/40 text-nomichi-ink/40"
                        }`}>
                          {tab.count}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Search, Filters, and Sorting Controls */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                {/* Filters Row */}
                <div className="flex flex-wrap items-center gap-3">
                  {/* Search box */}
                  <div className="relative w-64">
                    <input
                      type="text"
                      value={catalogSearch}
                      onChange={(e) => {
                        setCatalogSearch(e.target.value);
                        setCurrentPage(1);
                      }}
                      placeholder="Search trips or destinations..."
                      className="w-full pl-4 pr-9.5 py-2.5 bg-white border border-[#e7e1d5] rounded-xl text-xs font-semibold placeholder-nomichi-ink/30 text-nomichi-ink focus:outline-none focus:border-[#FF5B26]"
                    />
                    <Search className="w-4 h-4 text-nomichi-ink/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
                  </div>

                  {/* Destination Dropdown */}
                  <div className="relative">
                    <select
                      value={catalogDestination}
                      onChange={(e) => {
                        setCatalogDestination(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
                    >
                      <option value="all">All Destinations</option>
                      {uniqueDestinations.map((dest) => (
                        <option key={dest} value={dest}>
                          {dest}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Trip Style Dropdown */}
                  <div className="relative">
                    <select
                      value={catalogStyle}
                      onChange={(e) => {
                        setCatalogStyle(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
                    >
                      <option value="all">All Trip Styles</option>
                      {uniqueStyles.map((style) => (
                        <option key={style} value={style}>
                          {style}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* Difficulty Dropdown */}
                  <div className="relative">
                    <select
                      value={catalogDifficulty}
                      onChange={(e) => {
                        setCatalogDifficulty(e.target.value);
                        setCurrentPage(1);
                      }}
                      className="appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
                    >
                      <option value="all">All Difficulty</option>
                      <option value="easy">Easy</option>
                      <option value="moderate">Moderate</option>
                      <option value="challenging">Challenging</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  {/* More Filters */}
                  <button className="px-3.5 py-2.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/75 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all bg-white cursor-pointer shadow-sm">
                    <SlidersHorizontal className="w-3.5 h-3.5 text-nomichi-ink/40" />
                    More Filters
                  </button>
                </div>

                {/* Sort & View Mode Toggle */}
                <div className="flex items-center gap-3">
                  <div className="relative flex items-center gap-1 bg-white border border-[#e7e1d5] px-3.5 py-2.5 rounded-xl text-xs cursor-pointer focus-within:border-[#FF5B26]">
                    <span className="text-nomichi-ink/40 font-semibold">Sort by:</span>
                    <select
                      value={catalogSortBy}
                      onChange={(e) => setCatalogSortBy(e.target.value)}
                      className="appearance-none bg-transparent border-0 pr-6 text-xs font-bold text-nomichi-ink focus:outline-none cursor-pointer"
                    >
                      <option value="newest">Newest First</option>
                      <option value="oldest">Oldest First</option>
                      <option value="price_asc">Price: Low to High</option>
                      <option value="price_desc">Price: High to Low</option>
                    </select>
                    <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  </div>

                  <div className="flex items-center border border-[#e7e1d5] rounded-xl overflow-hidden bg-white">
                    <button
                      onClick={() => setCatalogViewMode("list")}
                      className={`p-2.5 transition-all border-0 cursor-pointer ${
                        catalogViewMode === "list"
                          ? "bg-[#FFEFEA] text-[#FF5B26]"
                          : "text-nomichi-ink/40 hover:bg-[#FAF8F4]"
                      }`}
                    >
                      <List className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setCatalogViewMode("grid")}
                      className={`p-2.5 transition-all border-0 border-l border-[#e7e1d5]/50 cursor-pointer ${
                        catalogViewMode === "grid"
                          ? "bg-[#FFEFEA] text-[#FF5B26]"
                          : "text-nomichi-ink/40 hover:bg-[#FAF8F4]"
                      }`}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Trips Listing Display Area */}
              {catalogViewMode === "list" ? (
                /* LIST VIEW MODE */
                <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                          <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Trip</th>
                          <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Destination</th>
                          <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Status</th>
                          <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Duration / Dates</th>
                          <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Enquiries / Seats</th>
                          <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs">Created On</th>
                          <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-xs text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#e7e1d5]/20">
                        {paginatedTrips.length === 0 ? (
                          <tr>
                            <td colSpan={7} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                              No trips match your filters.
                            </td>
                          </tr>
                        ) : (
                          paginatedTrips.map((trip) => {
                            const tripLeads = leads.filter((l) => l.trip_id === trip.id);
                            const enqInfo = getEnquiryDisplay(trip, tripLeads);
                            const creator = profiles.find((p) => p.id === trip.created_by);
                            const creatorName = creator ? creator.full_name : "Ananya Mehta";
                            
                            // Created date formatting
                            const createdOnStr = trip.created_at
                              ? new Date(trip.created_at).toLocaleDateString("en-IN", {
                                  day: "numeric",
                                  month: "short",
                                  year: "numeric"
                                })
                              : "28 May 2025";

                            // Style chip
                            const stylesList = trip.trip_style ? trip.trip_style.split(",").map((s: string) => s.trim()) : [];
                            const mainStyle = stylesList[0] || "Custom Trip";

                            // Difficulty signal bars
                            const diff = trip.difficulty?.toLowerCase();
                            const filledBars = diff === "easy" ? 1 : diff === "moderate" ? 2 : diff === "challenging" ? 3 : 1;

                            return (
                              <tr 
                                key={trip.id} 
                                onClick={() => handleOpenTripOverview(trip)}
                                className="hover:bg-[#FAF8F4]/30 transition-colors cursor-pointer"
                              >
                                {/* TRIP TITLE & STYLE INFO */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-4">
                                    <div className="w-20 h-14 rounded-xl border border-[#e7e1d5]/40 overflow-hidden shrink-0 shadow-sm">
                                      <img src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"} className="w-full h-full object-cover" />
                                    </div>
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-2">
                                        <span className="font-extrabold text-nomichi-ink text-sm leading-tight">{trip.title}</span>
                                        {(trip.rating >= 4.9 || trip.title.toLowerCase().includes("tokyo")) && (
                                          <span className="px-2 py-0.5 bg-[#FFEFEA] text-[#FF5B26] text-[8px] font-black rounded-lg uppercase tracking-wide">Featured</span>
                                        )}
                                      </div>
                                      <p className="text-[10px] text-nomichi-ink/50 font-semibold max-w-[240px] truncate leading-normal">
                                        {getSubtitle(trip)}
                                      </p>
                                      <div className="flex items-center gap-2.5 pt-0.5">
                                        <span className="inline-flex items-center gap-1 text-[9px] font-black text-nomichi-ink/55 uppercase bg-[#FAF8F4] border border-[#e7e1d5]/50 px-2 py-0.5 rounded-lg shadow-2xs">
                                          <Compass className="w-2.5 h-2.5 text-[#FF5B26]" />
                                          {mainStyle}
                                        </span>
                                        <span className="inline-flex items-center gap-1 text-[9px] font-bold text-nomichi-ink/50">
                                          {/* Signal bars */}
                                          <span className="flex items-end gap-0.5 h-2 w-3">
                                            <span className={`w-0.5 h-1 rounded-xs ${filledBars >= 1 ? "bg-[#FF5B26]" : "bg-[#e7e1d5]"}`}></span>
                                            <span className={`w-0.5 h-1.5 rounded-xs ${filledBars >= 2 ? "bg-[#FF5B26]" : "bg-[#e7e1d5]"}`}></span>
                                            <span className={`w-0.5 h-2.5 rounded-xs ${filledBars >= 3 ? "bg-[#FF5B26]" : "bg-[#e7e1d5]"}`}></span>
                                          </span>
                                          {trip.difficulty || "Easy"}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                {/* DESTINATION */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1.5 text-nomichi-ink/75 font-semibold text-xs">
                                    <MapPin className="w-4.5 h-4.5 text-nomichi-ink/30 shrink-0" />
                                    <span>{trip.destination}</span>
                                  </div>
                                </td>

                                {/* STATUS */}
                                <td className="px-6 py-4">
                                  <span className={`px-3 py-1 rounded-lg text-[11px] font-bold border transition-colors whitespace-nowrap inline-block ${
                                    trip.status?.toLowerCase() === "draft"
                                      ? "bg-gray-100 text-gray-500 border-gray-200"
                                      : trip.status?.toLowerCase() === "open" || trip.status?.toLowerCase() === "open for enquiries"
                                      ? "bg-[#EBF3FF] text-[#1E6BFF] border-[#D0E2FF]"
                                      : trip.status?.toLowerCase() === "active"
                                      ? "bg-[#E6F9F0] text-[#00A854] border-[#B3F5D3]"
                                      : trip.status?.toLowerCase() === "completed"
                                      ? "bg-[#F5F0FF] text-[#8C52FF] border-[#E8DBFF]"
                                      : "bg-gray-100 text-gray-500 border-gray-200"
                                  }`}>
                                    {trip.status?.toLowerCase() === "open" || trip.status?.toLowerCase() === "open for enquiries"
                                      ? "Open For Enquiries"
                                      : trip.status
                                      ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1).toLowerCase()
                                      : ""}
                                  </span>
                                </td>

                                {/* DURATION / DATES */}
                                <td className="px-6 py-4">
                                  <div className="flex items-center gap-1.5 text-nomichi-ink/75 font-semibold text-xs">
                                    <Calendar className="w-4 h-4 text-nomichi-ink/30" />
                                    <span>
                                      {trip.status?.toLowerCase() === "active"
                                        ? formatActiveDates(trip.start_date, trip.end_date)
                                        : (trip.duration || "Flexible")}
                                    </span>
                                  </div>
                                </td>

                                {/* ENQUIRIES / SEATS */}
                                <td className="px-6 py-4">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 font-bold text-nomichi-ink text-sm">
                                      <Users className="w-4 h-4 text-nomichi-ink/30" />
                                      <span>
                                        {trip.status?.toLowerCase() === "active"
                                          ? `${trip.seats_left ?? trip.total_seats ?? 12} Left`
                                          : enqInfo.count}
                                      </span>
                                    </div>
                                    <p className={`text-[10px] font-semibold ${
                                      trip.status?.toLowerCase() === "active"
                                        ? "text-nomichi-ink/40"
                                        : enqInfo.label === "Qualified" || enqInfo.label === "Confirmed"
                                        ? "text-[#00A854] font-bold"
                                        : "text-nomichi-ink/40"
                                    }`}>
                                      {trip.status?.toLowerCase() === "active" ? "Seats Left" : enqInfo.label}
                                    </p>
                                  </div>
                                </td>

                                {/* CREATED ON */}
                                <td className="px-6 py-4">
                                  <div className="space-y-0.5 text-left text-xs">
                                    <p className="font-extrabold text-nomichi-ink leading-tight">{createdOnStr}</p>
                                    <p className="text-[10px] text-nomichi-ink/40 font-semibold">by {creatorName}</p>
                                  </div>
                                </td>

                                {/* ACTIONS DROPDOWN */}
                                <td className="px-6 py-4 text-right relative overflow-visible" onClick={(e) => e.stopPropagation()}>
                                  <div data-dropdown-wrapper className="relative inline-flex justify-end text-left">
                                    <button
                                      type="button"
                                      onClick={(e) => toggleActionDropdown(trip.id, e)}
                                      className="p-1.5 hover:bg-[#FAF8F4] rounded-lg transition-colors border-0 bg-transparent text-nomichi-ink/50 hover:text-nomichi-ink cursor-pointer"
                                    >
                                      <MoreVertical className="w-4.5 h-4.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                /* GRID VIEW MODE */
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {paginatedTrips.length === 0 ? (
                    <div className="col-span-full py-16 bg-white rounded-3xl border border-[#e7e1d5]/40 text-center text-nomichi-ink/40 font-semibold shadow-sm">
                      No trips match your filters.
                    </div>
                  ) : (
                    paginatedTrips.map((trip) => {
                      const tripLeads = leads.filter((l) => l.trip_id === trip.id);
                      const enqInfo = getEnquiryDisplay(trip, tripLeads);
                      const stylesList = trip.trip_style ? trip.trip_style.split(",").map((s: string) => s.trim()) : [];
                      const mainStyle = stylesList[0] || "Custom Trip";

                      return (
                        <div 
                          key={trip.id} 
                          onClick={() => handleOpenTripOverview(trip)}
                          className="bg-white rounded-3xl border border-[#e7e1d5]/40 overflow-hidden shadow-sm hover:shadow-md transition-all flex flex-col cursor-pointer text-left"
                        >
                          {/* Image Banner */}
                          <div className="h-44 relative">
                            <img src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=600&q=80"} className="w-full h-full object-cover" />
                            <div className="absolute top-4 left-4 flex gap-1.5">
                              <span className={`px-2.5 py-1 rounded-xl text-[8px] font-black border uppercase whitespace-nowrap inline-block ${
                                trip.status?.toLowerCase() === "draft"
                                  ? "bg-white text-nomichi-ink/70 border-[#e7e1d5]"
                                  : "bg-white text-[#FF5B26] border-[#FF5B26]/30"
                              }`}>
                                {trip.status}
                              </span>
                            </div>
                          </div>
                          {/* Content */}
                          <div className="p-5 flex-grow flex flex-col justify-between space-y-4">
                            <div className="space-y-1">
                              <h3 className="font-extrabold text-nomichi-ink text-base leading-tight">{trip.title}</h3>
                              <p className="text-xs text-nomichi-ink/50 font-semibold">{trip.destination}</p>
                              <div className="flex flex-wrap gap-1.5 pt-2">
                                <span className="text-[9px] font-black text-nomichi-ink/55 bg-[#FAF8F4] border border-[#e7e1d5]/50 px-2 py-0.5 rounded-lg">{mainStyle}</span>
                                <span className="text-[9px] font-bold text-nomichi-ink/50 bg-[#FAF8F4] px-2 py-0.5 rounded-lg">{trip.difficulty || "Easy"}</span>
                                <span className="text-[9px] font-bold text-nomichi-ink/50 bg-[#FAF8F4] px-2 py-0.5 rounded-lg">
                                  {trip.status?.toLowerCase() === "active" ? formatActiveDates(trip.start_date, trip.end_date) : (trip.duration || "Flexible")}
                                </span>
                              </div>
                            </div>

                            <div className="pt-4 border-t border-[#e7e1d5]/20 flex items-center justify-between">
                              <div className="flex items-center gap-1.5 text-nomichi-ink/75 font-semibold text-xs">
                                <Users className="w-4 h-4 text-nomichi-ink/30" />
                                <span>
                                  {trip.status?.toLowerCase() === "active"
                                    ? `${trip.seats_left ?? trip.total_seats ?? 12} Seats Left`
                                    : `${enqInfo.count} ${enqInfo.label}`}
                                </span>
                              </div>
                              
                              {(trip.status?.toLowerCase() === "draft" || trip.status?.toLowerCase() === "open" || trip.status?.toLowerCase() === "open for enquiries") && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleOpenActivateModal(trip); }}
                                  className="px-3 py-1.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white text-[10px] font-black rounded-lg border-0 transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <Zap className="w-3 h-3" />
                                  Activate
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}

              {/* Pagination Section */}
              <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-4 border-t border-[#e7e1d5]/20">
                <span className="text-xs font-semibold text-nomichi-ink/40">
                  Showing {totalItems > 0 ? (currentPage - 1) * itemsPerPage + 1 : 0} to{" "}
                  {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} trips
                </span>

                <div className="flex items-center gap-1.5 bg-white border border-[#e7e1d5] rounded-xl p-1 shrink-0 shadow-3xs">
                  <button
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-1.5 rounded-lg border border-transparent bg-transparent text-nomichi-ink/40 hover:text-nomichi-ink disabled:opacity-30 cursor-pointer transition-all hover:bg-gray-50"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  {getPaginationRange().map((page, idx) => {
                    if (page === "...") {
                      return (
                        <span key={`dots-${idx}`} className="w-8 h-8 flex items-center justify-center text-xs font-bold text-nomichi-ink/40">
                          ...
                        </span>
                      );
                    }
                    const pageNum = page as number;
                    const isCurrent = currentPage === pageNum;
                    return (
                      <button
                        key={`page-${pageNum}`}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-xs font-bold transition-all border cursor-pointer ${
                          isCurrent
                            ? "bg-[#FFEFEA] border-[#FF5B26]/30 text-[#FF5B26]"
                            : "bg-white border-[#e7e1d5] text-nomichi-ink/60 hover:bg-[#FAF8F4]"
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                  <button
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-1.5 rounded-lg border border-transparent bg-transparent text-nomichi-ink/40 hover:text-nomichi-ink disabled:opacity-30 cursor-pointer transition-all hover:bg-gray-50"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : activeTab === "add_trip" ? (
            /* ===================== TAB: REDESIGNED MULTI-SECTION ADD TRIP WITH STICKY PREVIEW ===================== */
            <div className="space-y-6 animate-in fade-in duration-300">
              
              {/* Top Action Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7e1d5]/50 pb-5">
                <div className="text-left">
                  <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">
                    {editingTripId ? "Edit Trip" : "Add New Trip"}
                  </h1>
                  <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
                    {editingTripId 
                      ? "Update existing trip template information and configuration."
                      : "Create a new trip and make it available for travellers."}
                  </p>
                </div>
                
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => { setActiveTab("trips"); }}
                    className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitTrip(e, "Draft")}
                    disabled={submitLoading}
                    className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
                  >
                    {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline-block mr-1.5" /> : null}
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleSubmitTrip(e, editingTripId ? form.status : "Open")}
                    disabled={submitLoading}
                    className="px-5 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    {editingTripId ? "Save Changes" : "Save Trip"}
                  </button>
                </div>
              </div>

              {/* Alert Banners */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5 text-left">
                  <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
                  {error}
                </div>
              )}
              {success && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5 text-left">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  {success}
                </div>
              )}

              {/* Layout Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                
                {/* Left Column Form */}
                <div className="lg:col-span-8 space-y-6">
                  
                  {/* 1. Basic Information */}
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-5">
                    <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">1. Basic Information</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Trip Title *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Tokyo Lights & Mt. Fuji"
                          value={form.title}
                          onChange={(e) => setForm({ ...form, title: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Destination *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g., Tokyo, Japan"
                          value={form.destination}
                          onChange={(e) => setForm({ ...form, destination: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Status *</label>
                        <select
                          value={getNormalizedStatus(form.status)}
                          onChange={(e) => setForm({ ...form, status: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        >
                          <option value="Draft">Draft</option>
                          <option value="Open for Enquiries">Open for Enquiries</option>
                          <option value="Active">Active</option>
                          <option value="Completed">Completed</option>
                          <option value="Archived">Archived</option>
                        </select>
                      </div>
                    </div>

                    {!(form.status?.toLowerCase() === "active" || form.status?.toLowerCase() === "completed") ? (
                      <div className="bg-[#FFEFEA]/50 border border-[#FF5B26]/10 text-nomichi-rust rounded-2xl p-4 flex items-center gap-3 mt-4 text-xs font-semibold">
                        <HelpCircle className="w-4.5 h-4.5 text-[#FF5B26] shrink-0" />
                        <span>Start date, end date and total seats will be set when you activate the trip.</span>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-[#e7e1d5]/20 mt-4">
                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Start Date *</label>
                          <input
                            type="date"
                            required
                            value={form.startDate ? form.startDate.split("T")[0] : ""}
                            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">End Date *</label>
                          <input
                            type="date"
                            required
                            value={form.endDate ? form.endDate.split("T")[0] : ""}
                            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Total Seats *</label>
                          <input
                            type="number"
                            required
                            value={form.totalSeats}
                            onChange={(e) => setForm({ ...form, totalSeats: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Seats Left</label>
                          <input
                            type="number"
                            value={form.seatsLeft}
                            onChange={(e) => setForm({ ...form, seatsLeft: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 2. Cover Image */}
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
                    <div className="flex justify-between items-center border-b border-[#e7e1d5]/20 pb-3">
                      <div>
                        <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide">2. Cover Image</h3>
                        <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">This image will be used as the main banner for your trip.</p>
                      </div>
                      <label htmlFor="cover-file-upload" className="px-3 py-1.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">
                        Change Image
                      </label>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                      {/* Left Side Preview */}
                      <div className="w-full h-40 rounded-2xl border border-[#e7e1d5]/50 bg-[#FAF8F4] overflow-hidden relative flex items-center justify-center shadow-inner">
                        {form.imageUrl ? (
                          <img src={form.imageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-nomichi-ink/30 text-xs font-semibold">No image selected</div>
                        )}
                      </div>

                      {/* Right Side Upload box */}
                      <div className="border border-dashed border-[#e7e1d5] bg-[#FAF8F4]/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-40">
                        <input type="file" className="hidden" id="cover-file-upload" onChange={handleCoverUpload} accept="image/*" />
                        <div className="w-10 h-10 rounded-full bg-white border border-[#e7e1d5] flex items-center justify-center text-nomichi-ink/40 shadow-sm mb-2">
                          <ImageIcon className="w-4 h-4 text-[#FF5B26]" />
                        </div>
                        <span className="text-xs font-bold text-nomichi-ink">Upload Image</span>
                        <span className="text-[10px] text-nomichi-ink/40 font-semibold mt-1 mb-3">JPG, PNG or WebP, Recommended size 16:9.</span>
                        <label htmlFor="cover-file-upload" className="px-3 py-1.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all">
                          Browse Files
                        </label>
                      </div>
                    </div>
                  </div>


                  {/* 3. Trip Overview */}
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-5">
                    <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">3. Trip Overview</h3>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        
                        {/* Custom Select for Trip Style */}
                        <div className="space-y-1.5 relative w-full text-left">
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Trip Style</label>
                          <div
                            onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
                            className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5] px-3 py-2 rounded-xl text-xs font-semibold text-left text-nomichi-ink flex items-center justify-between hover:bg-[#FAF8F4]/50 transition-all focus-within:border-[#FF5B26] min-h-[42px] cursor-pointer"
                          >
                            <div className="flex flex-wrap gap-1 items-center max-w-[170px] overflow-hidden">
                              {selectedStyles.length > 0 ? (
                                selectedStyles.map((val) => (
                                  <span
                                    key={val}
                                    className="inline-flex items-center gap-1 bg-white border border-[#e7e1d5] text-nomichi-ink px-1.5 py-0.5 rounded-lg text-[9px] font-bold shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleStyle(val);
                                    }}
                                  >
                                    {val}
                                    <span className="text-nomichi-rust hover:text-[#b04b1e] cursor-pointer">✕</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-nomichi-ink/30">Select styles</span>
                              )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-nomichi-ink/40 transition-transform duration-200 shrink-0 ${styleDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {styleDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setStyleDropdownOpen(false)} />
                              <div className="absolute z-20 w-full mt-1 bg-white border border-[#e7e1d5] rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
                                {AVAILABLE_STYLES.map((option) => {
                                  const isChecked = selectedStyles.includes(option);
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => toggleStyle(option)}
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg text-left transition-all ${
                                        isChecked ? "bg-[#FFEFEA]/40 text-[#FF5B26]" : "text-nomichi-ink hover:bg-[#FAF8F4]/60"
                                      }`}
                                    >
                                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isChecked ? "bg-[#FF5B26] border-[#FF5B26] text-white" : "border-[#e7e1d5]"}`}>
                                        {isChecked && (
                                          <svg className="w-2 h-2 stroke-[4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      <span>{option}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Difficulty */}
                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Difficulty</label>
                          <select
                            value={form.difficulty}
                            onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                            className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                          >
                            <option value="Easy">Easy</option>
                            <option value="Moderate">Moderate</option>
                            <option value="Challenging">Challenging</option>
                          </select>
                        </div>

                        {/* Custom Select for Best For */}
                        <div className="space-y-1.5 relative w-full text-left">
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Best For</label>
                          <div
                            onClick={() => setBestForDropdownOpen(!bestForDropdownOpen)}
                            className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5] px-3 py-2 rounded-xl text-xs font-semibold text-left text-nomichi-ink flex items-center justify-between hover:bg-[#FAF8F4]/50 transition-all focus-within:border-[#FF5B26] min-h-[42px] cursor-pointer"
                          >
                            <div className="flex flex-wrap gap-1 items-center max-w-[170px] overflow-hidden">
                              {selectedBestFor.length > 0 ? (
                                selectedBestFor.map((val) => (
                                  <span
                                    key={val}
                                    className="inline-flex items-center gap-1 bg-white border border-[#e7e1d5] text-nomichi-ink px-1.5 py-0.5 rounded-lg text-[9px] font-bold shadow-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleBestFor(val);
                                    }}
                                  >
                                    {val}
                                    <span className="text-nomichi-rust hover:text-[#b04b1e] cursor-pointer">✕</span>
                                  </span>
                                ))
                              ) : (
                                <span className="text-nomichi-ink/30">Select audience</span>
                              )}
                            </div>
                            <ChevronDown className={`w-4 h-4 text-nomichi-ink/40 transition-transform duration-200 shrink-0 ${bestForDropdownOpen ? "rotate-180" : ""}`} />
                          </div>
                          {bestForDropdownOpen && (
                            <>
                              <div className="fixed inset-0 z-10" onClick={() => setBestForDropdownOpen(false)} />
                              <div className="absolute z-20 w-full mt-1 bg-white border border-[#e7e1d5] rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
                                {AVAILABLE_BEST_FOR.map((option) => {
                                  const isChecked = selectedBestFor.includes(option);
                                  return (
                                    <button
                                      key={option}
                                      type="button"
                                      onClick={() => toggleBestFor(option)}
                                      className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg text-left transition-all ${
                                        isChecked ? "bg-[#FFEFEA]/40 text-[#FF5B26]" : "text-nomichi-ink hover:bg-[#FAF8F4]/60"
                                      }`}
                                    >
                                      <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isChecked ? "bg-[#FF5B26] border-[#FF5B26] text-white" : "border-[#e7e1d5]"}`}>
                                        {isChecked && (
                                          <svg className="w-2 h-2 stroke-[4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                          </svg>
                                        )}
                                      </div>
                                      <span>{option}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>

                        {/* Age Group */}
                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Age Group</label>
                          <select
                            value={form.ageGroup}
                            onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                            className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                          >
                            <option value="18+">18+</option>
                            <option value="18–35">18–35</option>
                            <option value="25–45">25–45</option>
                            <option value="40+">40+</option>
                            <option value="All Ages">All Ages</option>
                          </select>
                        </div>
                      </div>

                      {/* Dropdown selectors row 2 */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Meals Included</label>
                          <select
                            value={form.meals}
                            onChange={(e) => setForm({ ...form, meals: e.target.value })}
                            className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                          >
                            <option value="Breakfast Only">Breakfast Only</option>
                            <option value="Breakfast + Dinner">Breakfast + Dinner</option>
                            <option value="All Inclusive">All Inclusive</option>
                            <option value="Self Managed">Self Managed</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Group Size</label>
                          <select
                            value={form.groupSize}
                            onChange={(e) => setForm({ ...form, groupSize: e.target.value })}
                            className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                          >
                            <option value="6–8">6–8</option>
                            <option value="8–12">8–12</option>
                            <option value="12–16">12–16</option>
                            <option value="16+">16+</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Price Range / Est. Price (₹)</label>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-nomichi-ink/30">₹</span>
                            <input
                              type="number"
                              placeholder="129999"
                              value={form.price}
                              onChange={(e) => setForm({ ...form, price: e.target.value })}
                              className="w-full pl-7 pr-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Duration</label>
                          <input
                            type="text"
                            placeholder="7 Days"
                            value={form.duration}
                            onChange={(e) => setForm({ ...form, duration: e.target.value })}
                            className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                          />
                        </div>
                      </div>

                    </div>
                  </div>

                  {/* 4. Description */}
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
                    <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">4. Description</h3>
                    
                    <div className="space-y-2">
                      {/* Editor Toolbar ornaments */}
                      <div className="flex items-center gap-1.5 border border-[#e7e1d5] bg-[#FAF8F4]/40 p-1.5 rounded-lg text-nomichi-ink/50">
                        <button type="button" className="p-1 hover:bg-white rounded text-[10px] font-extrabold border-0 bg-transparent">B</button>
                        <button type="button" className="p-1 hover:bg-white rounded text-[10px] italic border-0 bg-transparent">I</button>
                        <button type="button" className="p-1 hover:bg-white rounded text-[10px] underline border-0 bg-transparent">U</button>
                        <div className="w-px h-3.5 bg-[#e7e1d5] mx-1" />
                        <button type="button" className="p-1 hover:bg-white rounded text-[10px] border-0 bg-transparent">List</button>
                      </div>
                      
                      <div className="relative">
                        <textarea
                          rows={5}
                          required
                          placeholder="Narrative overview, why this trip is unique, etc."
                          value={form.description}
                          onChange={(e) => setForm({ ...form, description: e.target.value })}
                          className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                        <span className="text-[9px] text-nomichi-ink/30 font-bold absolute bottom-2.5 right-3">
                          {form.description.length} / 3000
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 5, 6, 7, 8: Repeatables Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* 5. Highlights */}
                    <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">5. Highlights</h3>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {highlights.map((h, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#FAF8F4]/60 px-2.5 py-1.5 rounded-xl border border-[#e7e1d5]/40 text-[11px] gap-2 group">
                              <div className="flex items-center gap-1.5 truncate">
                                <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                                <span className="text-emerald-700 font-extrabold shrink-0">✓</span>
                                <span className="font-semibold text-nomichi-ink/85 truncate">{h}</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveHighlight(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer font-extrabold text-[10px]">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <input
                          type="text"
                          placeholder="e.g., Bullet Train Ride"
                          value={newHighlight}
                          onChange={(e) => setNewHighlight(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddHighlight(); } }}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                        <button type="button" onClick={handleAddHighlight} className="w-full py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer">
                          + Add Highlight
                        </button>
                      </div>
                    </div>

                    {/* 6. Inclusions */}
                    <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">6. Inclusions</h3>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {inclusions.map((inc, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#FAF8F4]/60 px-2.5 py-1.5 rounded-xl border border-[#e7e1d5]/40 text-[11px] gap-2 group">
                              <div className="flex items-center gap-1.5 truncate">
                                <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                                <span className="text-emerald-700 font-extrabold shrink-0">✓</span>
                                <span className="font-semibold text-nomichi-ink/85 truncate">{inc}</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveInclusion(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer font-extrabold text-[10px]">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <input
                          type="text"
                          placeholder="e.g., 6 Nights Stay"
                          value={newInclusion}
                          onChange={(e) => setNewInclusion(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInclusion(); } }}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                        <button type="button" onClick={handleAddInclusion} className="w-full py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer">
                          + Add Inclusion
                        </button>
                      </div>
                    </div>

                    {/* 7. Exclusions */}
                    <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4 flex flex-col justify-between">
                      <div className="space-y-3">
                        <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">7. Exclusions</h3>
                        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                          {exclusions.map((exc, i) => (
                            <div key={i} className="flex items-center justify-between bg-[#FAF8F4]/60 px-2.5 py-1.5 rounded-xl border border-[#e7e1d5]/40 text-[11px] gap-2 group">
                              <div className="flex items-center gap-1.5 truncate">
                                <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                                <span className="text-[#FF5B26] font-extrabold shrink-0">✕</span>
                                <span className="font-semibold text-nomichi-ink/85 truncate">{exc}</span>
                              </div>
                              <button type="button" onClick={() => handleRemoveExclusion(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer font-extrabold text-[10px]">✕</button>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-2 pt-2">
                        <input
                          type="text"
                          placeholder="e.g., Visa Fees"
                          value={newExclusion}
                          onChange={(e) => setNewExclusion(e.target.value)}
                          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExclusion(); } }}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                        <button type="button" onClick={handleAddExclusion} className="w-full py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer">
                          + Add Exclusion
                        </button>
                      </div>
                    </div>

                    {/* 8. Accommodation */}
                    <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4">
                      <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">8. Accommodation</h3>
                      <div className="relative h-[calc(100%-35px)]">
                        <textarea
                          rows={6}
                          placeholder="e.g. Hotel Gracery Shinjuku – 3 Nights&#10;The Thousand Kyoto – 3 Nights"
                          value={form.accommodation}
                          onChange={(e) => setForm({ ...form, accommodation: e.target.value })}
                          className="w-full h-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold resize-none"
                        />
                        <span className="text-[9px] text-nomichi-ink/30 font-bold absolute bottom-2.5 right-3">
                          {form.accommodation.length} / 1000
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 9. Itinerary Builder & 10. FAQs Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    {/* 9. Itinerary Builder */}
                    <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
                      <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">9. Itinerary Builder</h3>
                      
                      <div className="space-y-3">
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {itinerary.map((day, i) => (
                            <div key={i} className="bg-[#FAF8F4]/60 p-3 rounded-2xl border border-[#e7e1d5]/40 text-xs flex items-center justify-between gap-3 group">
                              <div className="flex items-center gap-2 truncate">
                                <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                                <div className="truncate">
                                  <span className="font-extrabold text-[#FF5B26] block">Day {day.day} • {day.title}</span>
                                  <span className="text-nomichi-ink/65 mt-0.5 block truncate">{day.description}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => handleStartEditDay(i)} className="text-nomichi-ink/40 hover:text-nomichi-ink border-0 bg-transparent cursor-pointer p-1">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => handleRemoveDay(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Day builder inputs */}
                        <div className="bg-[#FAF8F4]/40 p-4 rounded-2xl border border-[#e7e1d5]/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-nomichi-ink/50 text-left">
                              {editingDayIdx !== null ? `Editing Day ${editingDayIdx + 1}` : `Day ${itinerary.length + 1}`}
                            </span>
                            {editingDayIdx !== null && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDayIdx(null);
                                  setNewDayTitle("");
                                  setNewDayDesc("");
                                }}
                                className="text-[10px] text-nomichi-rust hover:underline bg-transparent border-0 font-extrabold cursor-pointer"
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>
                          
                          <input
                            type="text"
                            placeholder="Day Title (e.g. Shibuya Exploring)"
                            value={newDayTitle}
                            onChange={(e) => setNewDayTitle(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                          />
                          <textarea
                            rows={2}
                            placeholder="Day Activities overview description..."
                            value={newDayDesc}
                            onChange={(e) => setNewDayDesc(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold resize-none"
                          />
                          <button type="button" onClick={handleAddDay} className="px-4 py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> {editingDayIdx !== null ? "Save Changes" : "Add Day"}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* 10. FAQs */}
                    <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
                      <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">10. FAQs</h3>
                      
                      <div className="space-y-3">
                        <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                          {faqs.map((faq, i) => (
                            <div key={i} className="bg-[#FAF8F4]/60 p-3 rounded-2xl border border-[#e7e1d5]/40 text-xs flex items-center justify-between gap-3 text-left">
                              <div className="truncate">
                                <span className="font-extrabold text-nomichi-ink block truncate">Q: {faq.question}</span>
                                <span className="text-nomichi-ink/60 font-semibold block truncate">A: {faq.answer}</span>
                              </div>
                              <div className="flex items-center gap-1 shrink-0">
                                <button type="button" onClick={() => handleStartEditFAQ(i)} className="text-nomichi-ink/40 hover:text-nomichi-ink border-0 bg-transparent cursor-pointer p-1">
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button type="button" onClick={() => handleRemoveFAQ(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer p-1">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* FAQ builder input */}
                        <div className="bg-[#FAF8F4]/40 p-4 rounded-2xl border border-[#e7e1d5]/50 space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-nomichi-ink/50 text-left">
                              {editingFAQIdx !== null ? `Editing FAQ #${editingFAQIdx + 1}` : "New FAQ"}
                            </span>
                            {editingFAQIdx !== null && (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingFAQIdx(null);
                                  setNewQuestion("");
                                  setNewAnswer("");
                                }}
                                className="text-[10px] text-nomichi-rust hover:underline bg-transparent border-0 font-extrabold cursor-pointer"
                              >
                                Cancel Edit
                              </button>
                            )}
                          </div>
                          
                          <input
                            type="text"
                            placeholder="Question (e.g. Is insurance mandatory?)"
                            value={newQuestion}
                            onChange={(e) => setNewQuestion(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Answer (e.g. Yes, we require basic coverage.)"
                            value={newAnswer}
                            onChange={(e) => setNewAnswer(e.target.value)}
                            className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                          />
                          <button type="button" onClick={handleAddFAQ} className="px-4 py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer flex items-center gap-1">
                            <Plus className="w-3.5 h-3.5" /> {editingFAQIdx !== null ? "Save Changes" : "Add FAQ"}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 11. Additional Gallery Images upload area */}
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4">
                    <div className="flex justify-between items-center">
                      <div>
                        <h4 className="text-xs font-extrabold text-nomichi-ink uppercase tracking-wide">11. Additional Gallery Images</h4>
                        <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Upload photos that populate the travel gallery.</p>
                      </div>
                      <span className="text-[10px] font-bold text-nomichi-ink/40">{galleryImages.length} / 10 Images</span>
                    </div>

                    <div className="flex flex-wrap gap-2.5 items-center">
                      {galleryImages.map((imgUrl, i) => (
                        <div key={i} className="w-16 h-16 rounded-xl bg-[#FAF8F4] overflow-hidden border border-[#e7e1d5]/40 relative group shadow-sm shrink-0">
                          <img src={imgUrl} className="w-full h-full object-cover" />
                          <button
                            type="button"
                            onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                            className="absolute inset-0 bg-black/40 text-white flex items-center justify-center border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      
                      {galleryImages.length < 10 && (
                        <div>
                          <input type="file" multiple className="hidden" id="gallery-img-upload" onChange={handleGalleryUpload} accept="image/*" />
                          <label htmlFor="gallery-img-upload" className="w-16 h-16 border-2 border-dashed border-[#e7e1d5] hover:border-[#FF5B26]/40 hover:bg-[#FAF8F4]/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-1">
                            <Plus className="w-5 h-5 text-nomichi-ink/30" />
                          </label>
                        </div>
                      )}
                    </div>
                  </div>

                </div>

                {/* Right Column Sticky Preview & Gallery */}
                <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[90px]">
                  
                  {/* Live Preview panel */}
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col text-left">
                    <div className="px-6 py-4.5 border-b border-[#e7e1d5]/20 flex items-center justify-between bg-[#FAF8F4]/30">
                      <span className="text-sm font-black uppercase tracking-widest text-nomichi-ink">Trip Preview</span>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-nomichi-ink/40">Live Preview</span>
                        <div 
                          onClick={() => setLivePreviewActive(!livePreviewActive)}
                          className={`w-8 h-4 rounded-full p-0.5 flex items-center cursor-pointer transition-colors duration-200 ${
                            livePreviewActive ? "bg-[#5CB87A] justify-end" : "bg-gray-200 justify-start"
                          }`}
                        >
                          <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                        </div>
                      </div>
                    </div>

                    {livePreviewActive && (
                      /* Simulated customer details viewport */
                      <div className="p-5 space-y-5 animate-in fade-in duration-200">
                        
                        {/* Widescreen cover thumbnail */}
                        <div className="w-full h-44 rounded-2xl overflow-hidden bg-[#FAF8F4] relative border border-[#e7e1d5]/30 flex items-center justify-center shadow-inner">
                          {form.imageUrl ? (
                            <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon className="w-8 h-8 text-nomichi-ink/20" />
                          )}
                          <span className="absolute top-3 right-3 bg-white/95 text-nomichi-ink backdrop-blur-sm border border-[#e7e1d5]/40 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase shadow-sm">
                            {form.status}
                          </span>
                        </div>

                        {/* Title & Stats */}
                        <div>
                          <h4 className="text-base font-display font-extrabold text-nomichi-ink leading-snug">
                            {form.title || "Tokyo Lights & Mt. Fuji"}
                          </h4>
                          
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-2.5 text-nomichi-ink/50 text-[10px] font-bold">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {getPreviewDateString()}
                            </span>
                            <span className="flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5" />
                              {form.duration || "7 Days"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5 mt-2 text-nomichi-ink/50 text-[10px] font-bold">
                            <MapPin className="w-3.5 h-3.5" />
                            {form.destination || "Tokyo, Japan"}
                          </div>
                        </div>

                        {/* Price Badge */}
                        <div className="flex items-baseline gap-1">
                          <span className="text-xl font-display font-black text-[#FF5B26]">
                            ₹{form.price ? parseFloat(form.price).toLocaleString("en-IN") : "129,999"}
                          </span>
                          <span className="text-[10px] text-nomichi-ink/40 font-bold">Per Person</span>
                        </div>


                        {/* Quick metadata grid */}
                        <div className="space-y-2.5 text-xs font-bold text-nomichi-ink/75 border-t border-[#e7e1d5]/15 pt-4">
                          <div className="flex justify-between items-center">
                            <span className="text-nomichi-ink/40 text-[10px] uppercase">Group Size</span>
                            <span>{form.groupSize || "8–12"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-nomichi-ink/40 text-[10px] uppercase">Difficulty</span>
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-md text-[10px] font-bold">
                              {form.difficulty}
                            </span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-nomichi-ink/40 text-[10px] uppercase">Trip Style</span>
                            <span className="max-w-[160px] truncate">{selectedStyles.join(", ") || "City Explorer, Culture"}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-nomichi-ink/40 text-[10px] uppercase">Best For</span>
                            <span className="max-w-[160px] truncate">{selectedBestFor.join(", ") || "Solo, Friends, Couples"}</span>
                          </div>
                        </div>

                        {/* Info tip footer banner */}
                        <div className="bg-[#FFEFEA] p-3 rounded-xl border border-[#FF5B26]/10 text-[10px] font-bold text-nomichi-ink/65 flex gap-2">
                          <span className="text-[#FF5B26]">ℹ</span>
                          <span>This is how your trip will appear on the website.</span>
                        </div>

                        {/* ── View Trip Page button ── */}
                        <button
                          type="button"
                          className="w-full flex items-center justify-center gap-2 border border-[#e7e1d5] rounded-2xl py-3 text-xs font-extrabold text-nomichi-ink hover:bg-[#FAF8F4] transition-all"
                        >
                          View Trip Page
                          <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                          </svg>
                        </button>

                      </div>
                    )}
                  </div>

                  {/* ── 11. Trip Assets sidebar card ── */}
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-5">
                    <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">11. Trip Assets</h3>

                    {/* Brochure (PDF) */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-extrabold text-nomichi-ink/50 uppercase tracking-wider">Brochure (PDF)</p>

                      <div className="grid grid-cols-2 gap-3 items-stretch">
                        {/* Drop zone */}
                        <label
                          htmlFor="brochure-file-upload"
                          className="border-2 border-dashed border-[#e7e1d5] rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer hover:border-[#FF5B26]/40 hover:bg-[#FFEFEA]/10 transition-all group min-h-[110px]"
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            e.preventDefault();
                            const file = e.dataTransfer.files?.[0];
                            if (file) handleBrochureUpload({ target: { files: [file] } } as any);
                          }}
                        >
                          <input type="file" className="hidden" id="brochure-file-upload" onChange={handleBrochureUpload} accept="application/pdf" />
                          <div className="w-8 h-8 rounded-full bg-[#FAF8F4] border border-[#e7e1d5] group-hover:border-[#FF5B26]/30 flex items-center justify-center mb-1.5 transition-all">
                            <Upload className="w-3.5 h-3.5 text-[#FF5B26]" />
                          </div>
                          <span className="text-[10px] font-bold text-nomichi-ink leading-tight">Drag & Drop PDF here</span>
                          <span className="mt-1.5 px-2.5 py-0.5 bg-white border border-[#e7e1d5] rounded-lg text-[9px] font-bold text-[#FF5B26] shadow-sm">Upload Brochure</span>
                          <span className="text-[8px] text-nomichi-ink/30 font-semibold mt-1">PDF only • Max 20 MB</span>
                        </label>

                        {/* Uploaded file card */}
                        {form.brochureUrl ? (
                          <div className="bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-2xl p-3 flex flex-col justify-between min-h-[110px]">
                            <div className="flex items-start gap-2">
                              <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                <FileText className="w-4 h-4 text-red-500" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-extrabold text-nomichi-ink truncate" title={brochureFileName}>{brochureFileName || "Brochure.pdf"}</p>
                                <p className="text-[9px] text-nomichi-ink/40 font-semibold mt-0.5">Uploaded</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1 mt-2 pt-2 border-t border-[#e7e1d5]/40">
                              <a href={form.brochureUrl} download={brochureFileName || "brochure.pdf"} className="p-1 hover:bg-white rounded-md transition-all text-nomichi-ink/40 hover:text-nomichi-ink" title="Download">
                                <Upload className="w-3 h-3 rotate-180" />
                              </a>
                              <label htmlFor="brochure-file-upload" className="p-1 hover:bg-white rounded-md transition-all text-nomichi-ink/40 hover:text-nomichi-ink cursor-pointer" title="Replace">
                                <svg xmlns="http://www.w3.org/2000/svg" className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                              </label>
                              <button type="button" onClick={() => { setForm((p) => ({ ...p, brochureUrl: "" })); setBrochureFileName(""); }} className="p-1 hover:bg-rose-50 rounded-md transition-all text-nomichi-ink/30 hover:text-rose-600 ml-auto" title="Remove">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="bg-[#FAF8F4]/50 border border-[#e7e1d5]/40 rounded-2xl flex items-center justify-center min-h-[110px]">
                            <p className="text-[9px] text-nomichi-ink/30 font-semibold text-center px-3 leading-relaxed">No brochure uploaded yet</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Other Documents */}
                    <div className="space-y-2.5">
                      <p className="text-[10px] font-extrabold text-nomichi-ink/50 uppercase tracking-wider">Other Documents <span className="font-semibold normal-case text-nomichi-ink/30">(Optional)</span></p>

                      {otherDocs.length > 0 && (
                        <div className="space-y-1.5">
                          {otherDocs.map((doc, idx) => (
                            <div key={idx} className="flex items-center gap-2.5 bg-[#FAF8F4] border border-[#e7e1d5]/50 rounded-xl px-3 py-2">
                              <div className="w-7 h-7 rounded-lg bg-red-50 border border-red-100 flex items-center justify-center shrink-0">
                                <FileText className="w-3.5 h-3.5 text-red-400" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-[10px] font-bold text-nomichi-ink truncate" title={doc.name}>{doc.name}</p>
                                <p className="text-[9px] text-nomichi-ink/40 font-semibold">{doc.size}</p>
                              </div>
                              <a href={doc.dataUrl} download={doc.name} className="p-1 hover:bg-white rounded-md transition-all text-nomichi-ink/40 hover:text-nomichi-ink" title="Download">
                                <Upload className="w-3 h-3 rotate-180" />
                              </a>
                              <button type="button" onClick={() => setOtherDocs((prev) => prev.filter((_, i) => i !== idx))} className="p-1 hover:bg-rose-50 rounded-md transition-all text-nomichi-ink/30 hover:text-rose-600" title="Remove">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      <label htmlFor="other-docs-upload" className="flex items-center gap-2 px-3.5 py-2 border border-dashed border-[#e7e1d5] hover:border-[#FF5B26]/40 hover:bg-[#FFEFEA]/10 rounded-xl cursor-pointer transition-all w-fit group">
                        <input type="file" id="other-docs-upload" className="hidden" multiple accept="application/pdf,.doc,.docx" onChange={handleOtherDocUpload} />
                        <Plus className="w-3 h-3 text-[#FF5B26]" />
                        <span className="text-[10px] font-bold text-nomichi-ink/60 group-hover:text-nomichi-ink transition-all">Add Document</span>
                      </label>
                    </div>

                    {/* Auto-send toggle */}
                    <div className="flex items-center justify-between pt-3.5 border-t border-[#e7e1d5]/20">
                      <div className="pr-3">
                        <p className="text-[10px] font-bold text-nomichi-ink leading-snug">Send brochure automatically after enquiry submission</p>
                        <p className="text-[9px] text-[#00A854] font-semibold mt-0.5">{autoSendBrochure ? "Brochure will be attached to enquiry confirmation email & WhatsApp." : "Toggle on to auto-send."}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAutoSendBrochure((v) => !v)}
                        className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors border-0 cursor-pointer focus:outline-none ${autoSendBrochure ? "bg-[#00A854]" : "bg-[#e7e1d5]"}`}
                      >
                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-md transition-transform ${autoSendBrochure ? "translate-x-6" : "translate-x-1"}`} />
                      </button>
                    </div>
                  </div>

                </div>

              </div>

            </div>
          ) : activeTab === "departures" ? (
            /* ===================== DEPARTURES TAB ===================== */
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col text-left animate-in fade-in duration-300">
              <div className="px-6 py-5 border-b border-[#e7e1d5]/30 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-display font-bold text-nomichi-ink">Departures</h2>
                  <p className="text-xs text-nomichi-ink/40 font-medium">Manage departure schedules, leaders, and traveler capacity.</p>
                </div>
                {departuresFilterTripId && (
                  <button
                    onClick={() => setDeparturesFilterTripId(null)}
                    className="px-3 py-1.5 bg-[#FFEFEA] hover:bg-[#FFEFEA]/80 text-[#FF5B26] text-xs font-bold rounded-xl border-0 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <span>Clear Filter</span>
                    <span className="text-[10px] opacity-70">✕</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Departure Code</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Trip</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Dates</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Leader</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Meeting Point</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Capacity</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e1d5]/20">
                    {(() => {
                      const filteredDeps = departuresFilterTripId 
                        ? departures.filter(d => d.trip_id === departuresFilterTripId)
                        : departures;

                      if (filteredDeps.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="px-6 py-10 text-center text-nomichi-ink/40 font-semibold">
                              {departuresFilterTripId ? "No departures found for this trip." : "No departures active."}
                            </td>
                          </tr>
                        );
                      }

                      return filteredDeps.map((dep) => {
                        const meta = parseDepartureStatus(dep.status);
                        const formattedDates = `${new Date(dep.start_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })} - ${new Date(dep.end_date).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}`;
                        const seatsLeft = dep.seats_left !== undefined ? dep.seats_left : dep.total_seats;

                        return (
                          <tr key={dep.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                            <td className="px-6 py-4 font-mono font-bold text-nomichi-ink">{meta.code}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-nomichi-ink">{dep.trips?.title || "Unknown Trip"}</div>
                              <div className="text-[10px] text-nomichi-ink/40 font-medium">{dep.trips?.destination}</div>
                            </td>
                            <td className="px-6 py-4 font-medium text-nomichi-ink/80">{formattedDates}</td>
                            <td className="px-6 py-4 text-nomichi-ink/85">{meta.leader}</td>
                            <td className="px-6 py-4 text-nomichi-ink/70">{meta.meeting}</td>
                            <td className="px-6 py-4">
                              <div className="font-semibold text-nomichi-ink">{seatsLeft} Left / {dep.total_seats} Total</div>
                              <div className="w-16 bg-nomichi-sand/30 h-1 rounded-full overflow-hidden mt-1">
                                <div 
                                  className="bg-[#FF5B26] h-full" 
                                  style={{ width: `${Math.max(0, Math.min(100, (seatsLeft / dep.total_seats) * 100))}%` }}
                                />
                              </div>
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[9px] font-black border ${
                                  meta.status === "active"
                                    ? "bg-green-50 text-green-700 border-green-200"
                                    : meta.status === "sold_out"
                                    ? "bg-rose-50 text-rose-700 border-rose-200"
                                    : "bg-gray-50 text-gray-600 border-gray-200"
                                }`}
                              >
                                {meta.status.toUpperCase().replace("_", " ")}
                              </span>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "leads" ? (
            /* ===================== LEADS TAB ===================== */
            <div className="flex w-full h-full gap-6 text-left relative overflow-hidden animate-in fade-in duration-300">
              {/* ===================== LEFT COLUMN (LEADS LIST) ===================== */}
              <div className="flex-1 space-y-6 overflow-y-auto pr-2 pb-6">
                
                {/* Top Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Leads</h1>
                    <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
                      Manage and track all traveler enquiries
                    </p>
                  </div>
                  <button
                    onClick={() => setIsNewLeadModalOpen(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-sm border-0 cursor-pointer"
                  >
                    <Plus className="w-4 h-4 stroke-[2.5]" />
                    New Lead
                  </button>
                </div>

                {/* Metrics Row */}
                {(() => {
                  const totalLeadsCount = leads.length;
                  const newLeadsCount = leads.filter((l) => l.status === "new").length;
                  const qualifiedLeadsCount = leads.filter((l) => l.status === "qualified").length;
                  const confirmedLeadsCount = leads.filter((l) => l.status === "converted").length;

                  return (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                      {[
                        { label: "Total Leads", count: totalLeadsCount, trend: "↑ 18% vs last 30 days", icon: Users, color: "text-[#FF5B26] bg-[#FFEFEA]" },
                        { label: "New Leads", count: newLeadsCount, trend: "↑ 12% vs last 30 days", icon: UserPlus, color: "text-[#2563EB] bg-[#EBF5FF]" },
                        { label: "Qualified", count: qualifiedLeadsCount, trend: "↑ 20% vs last 30 days", icon: SlidersHorizontal, color: "text-[#7C3AED] bg-[#F5F3FF]" },
                        { label: "Confirmed", count: confirmedLeadsCount, trend: "↑ 16% vs last 30 days", icon: CheckCircle, color: "text-[#10B981] bg-[#ECFDF5]" }
                      ].map((stat, i) => (
                        <div key={i} className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${stat.color}`}>
                            <stat.icon className="w-5 h-5 stroke-[2]" />
                          </div>
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-extrabold text-nomichi-ink/40 uppercase tracking-wide">{stat.label}</span>
                            <h3 className="text-2xl font-display font-black text-nomichi-ink leading-none">{stat.count}</h3>
                            <span className="text-[9px] font-bold text-emerald-600 block mt-1">{stat.trend}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  );
                })()}

                {/* Filter Controls Row */}
                <div className="bg-white p-5 rounded-2xl border border-[#e7e1d5]/40 shadow-sm space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    {/* Search */}
                    <div className="relative flex-1 min-w-[220px]">
                      <input
                        type="text"
                        placeholder="Search name, email or phone..."
                        value={crmLeadSearchVal}
                        onChange={(e) => {
                          setCrmLeadSearchVal(e.target.value);
                          setCrmLeadCurrentPage(1);
                        }}
                        className="w-full pl-9 pr-4 py-2.5 border border-[#e7e1d5] bg-[#FAF8F4]/30 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35"
                      />
                      <Search className="w-4 h-4 text-nomichi-ink/35 absolute left-3 top-1/2 -translate-y-1/2" />
                    </div>

                    {/* Status Select */}
                    <div className="relative min-w-[110px]">
                      <select
                        value={crmLeadStatusVal}
                        onChange={(e) => {
                          setCrmLeadStatusVal(e.target.value);
                          setCrmLeadCurrentPage(1);
                        }}
                        className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
                      >
                        <option value="all">Status</option>
                        <option value="new">New</option>
                        <option value="contacted">Contacted</option>
                        <option value="qualified">Qualified</option>
                        <option value="negotiating">Vibe Check</option>
                        <option value="converted">Confirmed</option>
                        <option value="lost">Lost</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Source Select */}
                    <div className="relative min-w-[110px]">
                      <select
                        value={crmLeadSourceVal}
                        onChange={(e) => {
                          setCrmLeadSourceVal(e.target.value);
                          setCrmLeadCurrentPage(1);
                        }}
                        className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer"
                      >
                        <option value="all">Source</option>
                        <option value="website">Website</option>
                        <option value="instagram">Instagram</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="referral">Referral</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Trip Select */}
                    <div className="relative min-w-[130px] max-w-[200px] flex-1">
                      <select
                        value={crmLeadTripVal}
                        onChange={(e) => {
                          setCrmLeadTripVal(e.target.value);
                          setCrmLeadCurrentPage(1);
                        }}
                        className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer truncate"
                      >
                        <option value="all">Trip</option>
                        {trips.map((t) => (
                          <option key={t.id} value={t.id}>{t.title}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Assigned To Select */}
                    <div className="relative min-w-[130px] max-w-[200px] flex-1">
                      <select
                        value={crmLeadAssignedVal}
                        onChange={(e) => {
                          setCrmLeadAssignedVal(e.target.value);
                          setCrmLeadCurrentPage(1);
                        }}
                        className="w-full appearance-none bg-white border border-[#e7e1d5] pl-3.5 pr-8 py-2.5 rounded-xl text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-[#FF5B26] cursor-pointer truncate"
                      >
                        <option value="all">Assigned To</option>
                        {profiles.filter(u => u.role === "MANAGER").map((u) => (
                          <option key={u.id} value={u.id}>{u.full_name}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>

                    {/* Reset Filters */}
                    <button
                      onClick={handleResetCRMLeadFilters}
                      className="px-3.5 py-2.5 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/75 font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-all bg-white cursor-pointer shadow-sm ml-auto shrink-0"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-nomichi-ink/40" />
                      Reset Filters
                    </button>
                  </div>

                  {/* Status Tabs */}
                  <div className="flex flex-wrap items-center gap-1.5 border-t border-[#e7e1d5]/20 pt-3 text-xs">
                    {[
                      { id: "all", label: "All Leads", count: leads.length, bg: "bg-gray-100 text-gray-500", activeBg: "border-b-2 border-[#FF5B26] text-[#FF5B26] font-extrabold" },
                      { id: "new", label: "New", count: leads.filter(l => l.status === "new").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#EBF5FF] text-[#2563EB] font-bold border border-[#EBF5FF]" },
                      { id: "contacted", label: "Contacted", count: leads.filter(l => l.status === "contacted").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#EBF0FF] text-[#3B82F6] font-bold border border-[#EBF0FF]" },
                      { id: "qualified", label: "Qualified", count: leads.filter(l => l.status === "qualified").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#F5F3FF] text-[#7C3AED] font-bold border border-[#F5F3FF]" },
                      { id: "vibe check", label: "Vibe Check", count: leads.filter(l => ["negotiating", "vibe check sent"].includes(l.status)).length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#FFF8E6] text-[#D97706] font-bold border border-[#FFF8E6]" },
                      { id: "confirmed", label: "Confirmed", count: leads.filter(l => l.status === "converted").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#ECFDF5] text-[#10B981] font-bold border border-[#ECFDF5]" },
                      { id: "lost", label: "Lost", count: leads.filter(l => l.status === "lost").length, bg: "bg-gray-100 text-gray-600", activeBg: "bg-[#FEF2F2] text-[#EF4444] font-bold border border-[#FEF2F2]" },
                    ].map((tab) => {
                      const isActive = crmLeadActiveTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => {
                            setCrmLeadActiveTab(tab.id);
                            setCrmLeadCurrentPage(1);
                          }}
                          className={`px-3 py-1.5 rounded-lg font-semibold transition-all border-0 bg-transparent cursor-pointer flex items-center gap-1.5 ${
                            isActive
                              ? tab.id === "all"
                                ? "text-[#FF5B26] font-black border-b-2 border-[#FF5B26] rounded-none px-1 py-1.5"
                                : tab.activeBg
                              : "bg-transparent text-nomichi-ink/50 hover:text-nomichi-ink"
                          }`}
                        >
                          <span>{tab.label}</span>
                          <span className={`px-1.5 py-0.2 rounded-md text-[9px] font-black ${
                            isActive ? "bg-white/40" : "bg-gray-100 text-gray-400"
                          }`}>
                            {tab.count}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Leads Table */}
                {(() => {
                  const filteredLeads = leads.filter((lead) => {
                    if (crmLeadSearchVal.trim()) {
                      const q = crmLeadSearchVal.toLowerCase();
                      const nameMatch = lead.name?.toLowerCase().includes(q);
                      const emailMatch = lead.email?.toLowerCase().includes(q);
                      const phoneMatch = lead.phone?.toLowerCase().includes(q);
                      if (!nameMatch && !emailMatch && !phoneMatch) return false;
                    }
                    
                    if (crmLeadStatusVal !== "all" && lead.status !== crmLeadStatusVal) return false;
                    if (crmLeadActiveTab !== "all") {
                      if (crmLeadActiveTab === "vibe check" && !["negotiating", "vibe check sent"].includes(lead.status)) return false;
                      if (crmLeadActiveTab === "confirmed" && lead.status !== "converted") return false;
                      if (crmLeadActiveTab !== "vibe check" && crmLeadActiveTab !== "confirmed" && lead.status !== crmLeadActiveTab) return false;
                    }

                    if (crmLeadSourceVal !== "all" && lead.source?.toLowerCase() !== crmLeadSourceVal) return false;
                    if (crmLeadTripVal !== "all" && lead.trip_id !== crmLeadTripVal) return false;
                    if (crmLeadAssignedVal !== "all" && lead.assigned_to !== crmLeadAssignedVal) return false;

                    return true;
                  });

                  const totalCount = filteredLeads.length;
                  const limit = 6;
                  const totalPages = Math.ceil(totalCount / limit) || 1;
                  const paginated = filteredLeads.slice(
                    (crmLeadCurrentPage - 1) * limit,
                    crmLeadCurrentPage * limit
                  );

                  return (
                    <>
                      <div className="bg-white rounded-2xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full border-collapse text-left text-xs">
                            <thead>
                              <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                                <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Lead</th>
                                <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip Interest</th>
                                <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Source</th>
                                <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Assigned To</th>
                                <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Created At</th>
                                <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-right">Actions</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[#e7e1d5]/20">
                              {paginated.length === 0 ? (
                                <tr>
                                  <td colSpan={7} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                                    No leads matched the search filters.
                                  </td>
                                </tr>
                              ) : (
                                paginated.map((lead) => {
                                  const assignee = profiles.find((u) => u.id === lead.assigned_to);
                                  const tripName = lead.trips?.title || lead.trip_interest || "General Inquiry";
                                  const dateStr = lead.trips?.start_date
                                    ? `${new Date(lead.trips.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${new Date(lead.trips.end_date || "").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                                    : "Flexible Dates";

                                  return (
                                    <tr
                                      key={lead.id}
                                      onClick={() => setSelectedCRMLeadId(lead.id)}
                                      className={`hover:bg-[#FAF8F4]/30 transition-colors cursor-pointer ${
                                        selectedCRMLeadId === lead.id ? "bg-[#FAF8F4]/60" : ""
                                      }`}
                                    >
                                      {/* Name + Contact + Avatar */}
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-[#e7e1d5]/40 bg-white">
                                            <img 
                                              src={(() => {
                                                const travelerProfile = profiles.find(p => p.id === lead.user_id);
                                                return travelerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(lead.name || "default")}`;
                                              })()} 
                                              alt="" 
                                              className="w-full h-full object-cover" 
                                            />
                                          </div>
                                          <div className="space-y-0.5 text-left">
                                            <p className="font-extrabold text-nomichi-ink text-xs">{lead.name}</p>
                                            <p className="text-[10px] text-nomichi-ink/40 font-semibold">{lead.email}</p>
                                            <p className="text-[9px] text-nomichi-ink/30 font-bold">{lead.phone || "—"}</p>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Trip interest */}
                                      <td className="px-6 py-4 text-left">
                                        <p className="font-extrabold text-nomichi-ink text-xs">{tripName}</p>
                                        <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">{dateStr}</p>
                                      </td>

                                      {/* Status */}
                                      <td className="px-6 py-4">
                                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9px] font-black border uppercase tracking-wider ${getCRMLeadStatusColorClass(lead.status)}`}>
                                          {lead.status?.toLowerCase() === "new" && (
                                            <span className="w-1 h-1 rounded-full bg-[#625E5A] shrink-0" />
                                          )}
                                          {getCRMLeadStatusLabel(lead.status)}
                                        </span>
                                      </td>

                                      {/* Source */}
                                      <td className="px-6 py-4">
                                        <span className="inline-flex items-center gap-1 py-0.5 px-2 rounded-full bg-nomichi-sand/10 text-nomichi-ink/70 text-[9px] font-black border border-[#e7e1d5]/40 capitalize">
                                          {lead.source || "Website"}
                                        </span>
                                      </td>

                                      {/* Assigned To with Avatar */}
                                      <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                          <div className="w-5 h-5 rounded-full overflow-hidden bg-nomichi-sand/20 text-[#FF5B26] font-bold text-[9px] flex items-center justify-center uppercase shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                            {assignee?.avatar_url ? (
                                              <img src={assignee.avatar_url} alt="" className="w-full h-full object-cover" />
                                            ) : (
                                              assignee?.full_name?.charAt(0) || "—"
                                            )}
                                          </div>
                                          <span className="font-bold text-nomichi-ink/70 text-xs">{assignee?.full_name || "Unassigned"}</span>
                                        </div>
                                      </td>

                                      {/* Created date */}
                                      <td className="px-6 py-4 text-nomichi-ink/60 font-semibold">
                                        {getCRMLeadRelativeTimeString(lead.created_at)}
                                      </td>

                                      {/* Actions */}
                                      <td className="px-6 py-4 text-right">
                                        <button className="p-1 hover:bg-[#FAF8F4] rounded-lg transition-colors border-0 bg-transparent text-nomichi-ink/40 hover:text-nomichi-ink cursor-pointer">
                                          <MoreVertical className="w-4 h-4" />
                                        </button>
                                      </td>
                                    </tr>
                                  );
                                })
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Pagination Footer */}
                      {totalPages > 1 && (
                        <div className="flex justify-between items-center text-xs font-semibold text-nomichi-ink/40 px-2">
                          <span>
                            Showing {Math.min(totalCount, (crmLeadCurrentPage - 1) * limit + 1)} to{" "}
                            {Math.min(totalCount, crmLeadCurrentPage * limit)} of {totalCount} leads
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setCrmLeadCurrentPage(prev => Math.max(1, prev - 1))}
                              disabled={crmLeadCurrentPage === 1}
                              className="w-8 h-8 rounded-lg border border-[#e7e1d5]/50 flex items-center justify-center bg-white cursor-pointer disabled:opacity-40"
                            >
                              &lt;
                            </button>
                            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                              <button
                                key={page}
                                onClick={() => setCrmLeadCurrentPage(page)}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold border cursor-pointer transition-all ${
                                  crmLeadCurrentPage === page
                                    ? "border-[#FF5B26] text-[#FF5B26] bg-[#FFEFEA]/20"
                                    : "border-[#e7e1d5]/50 bg-white text-nomichi-ink/60 hover:bg-[#FAF8F4]"
                                }`}
                              >
                                  {page}
                              </button>
                            ))}
                            <button
                              onClick={() => setCrmLeadCurrentPage(prev => Math.min(totalPages, prev + 1))}
                              disabled={crmLeadCurrentPage === totalPages}
                              className="w-8 h-8 rounded-lg border border-[#e7e1d5]/50 flex items-center justify-center bg-white cursor-pointer disabled:opacity-40"
                            >
                              &gt;
                            </button>
                          </div>
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

              {/* ===================== RIGHT SIDE DETAILS PANEL ===================== */}
              {selectedCRMLeadId && selectedCRMLead && (
                <div
                  className="w-[380px] bg-white border border-[#e7e1d5]/50 rounded-2xl shadow-sm flex flex-col justify-between shrink-0 overflow-hidden animate-in slide-in-from-right duration-300"
                >
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]/30">
                    <h3 className="text-xs font-display font-extrabold text-nomichi-ink uppercase tracking-wider">Lead Details</h3>
                    <button
                      onClick={() => setSelectedCRMLeadId(null)}
                      className="w-6 h-6 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/50 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Details Content Scroll Area */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {loadingCRMLeadDetail ? (
                      <div className="flex justify-center py-20">
                        <Loader2 className="w-7 h-7 text-[#FF5B26] animate-spin" />
                      </div>
                    ) : (
                      <>
                        {/* Contact Header */}
                        <div className="flex gap-4 items-center">
                          <div className="w-14 h-14 rounded-full overflow-hidden shrink-0 border border-[#e7e1d5]/40 bg-white">
                            <img 
                              src={(() => {
                                const travelerProfile = profiles.find(p => p.id === selectedCRMLead.user_id);
                                return travelerProfile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(selectedCRMLead.name || "default")}`;
                              })()} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-extrabold text-nomichi-ink text-sm leading-tight">{selectedCRMLead.name}</h4>
                              <span className="px-1.5 py-0.2 rounded bg-gray-100 text-gray-500 border border-gray-200 text-[8px] font-black uppercase tracking-wider">
                                {selectedCRMLead.status}
                              </span>
                            </div>
                            <p className="text-[10px] text-nomichi-ink/55 font-semibold leading-none">{selectedCRMLead.email}</p>
                            <p className="text-[10px] text-nomichi-ink/40 font-bold leading-none">{selectedCRMLead.phone || "No Phone Number"}</p>
                          </div>
                        </div>

                        {/* Contact Methods */}
                        {(() => {
                          const adminName = user.fullName || "Admin";
                          const travelerName = selectedCRMLead.name || "there";
                          const tripTitle = selectedCRMLead.trips?.title || selectedCRMLead.trip_interest || "your trip";
                          const waText = encodeURIComponent(`Hello ${travelerName}, this is ${adminName} from Nomichi. Thank you for your enquiry for the trip ${tripTitle}.`);
                          const waHref = selectedCRMLead.phone
                            ? `https://wa.me/${selectedCRMLead.phone.replace(/[^0-9]/g, "")}?text=${waText}`
                            : "#";
                          const emailSubject = encodeURIComponent(`Nomichi Enquiry - ${tripTitle}`);
                          const emailBody = encodeURIComponent(`Hello ${travelerName},\n\nThis is ${adminName} from Nomichi. Thank you for your enquiry for the trip ${tripTitle}.`);
                          const mailHref = selectedCRMLead.email
                            ? `mailto:${selectedCRMLead.email}?subject=${emailSubject}&body=${emailBody}`
                            : "#";
                          const gmailHref = selectedCRMLead.email
                            ? `https://mail.google.com/mail/?view=cm&fs=1&to=${selectedCRMLead.email}&su=${emailSubject}&body=${emailBody}`
                            : "#";
                          return (
                            <div className="grid grid-cols-4 gap-2">
                              <a
                                href={waHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2 border border-emerald-200 hover:bg-emerald-50/50 text-emerald-600 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                              >
                                <MessageCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                                WhatsApp
                              </a>
                              <a
                                href={`tel:${selectedCRMLead.phone || ""}`}
                                className="flex items-center justify-center gap-1.5 py-2 border border-blue-200 hover:bg-blue-50/50 text-blue-600 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                Call
                              </a>
                              <a
                                href={mailHref}
                                className="flex items-center justify-center gap-1.5 py-2 border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5" />
                                Email
                              </a>
                              <a
                                href={gmailHref}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-1.5 py-2 border border-red-200 hover:bg-red-50/50 text-red-600 rounded-xl text-[10px] font-bold transition-all no-underline bg-white cursor-pointer"
                              >
                                <Mail className="w-3.5 h-3.5 text-red-500" />
                                Gmail
                              </a>
                            </div>
                          );
                        })()}

                        {/* Section: Trip Information */}
                        <div className="border-t border-[#e7e1d5]/30 pt-5 space-y-4">
                          <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-nomichi-ink/40" />
                            Trip Information
                          </h5>
                          <div className="space-y-3 pl-1 text-xs font-semibold text-nomichi-ink">
                            <div className="flex justify-between items-start">
                              <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold mt-0.5">Interested Trip</span>
                              <span className="font-extrabold text-xs text-nomichi-ink text-right max-w-[200px]">
                                {selectedCRMLead.trips?.title || selectedCRMLead.trip_interest || "General Enquiry"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Travel Dates</span>
                              <span className="text-nomichi-ink text-right text-[11px]">
                                {selectedCRMLead.trips?.start_date
                                  ? `${new Date(selectedCRMLead.trips.start_date).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })} - ${new Date(selectedCRMLead.trips.end_date || "").toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
                                  : "Flexible Dates"}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">No. of Travelers</span>
                              <span className="text-nomichi-ink">
                                {selectedCRMLead.group_size || 1} Traveller{(selectedCRMLead.group_size || 1) !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Section: Lead Information */}
                        <div className="border-t border-[#e7e1d5]/30 pt-5 space-y-4">
                          <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-nomichi-ink/40" />
                            Lead Information
                          </h5>
                          <div className="space-y-3.5 pl-1 text-xs font-semibold text-nomichi-ink">
                            <div className="flex justify-between items-center">
                              <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Source</span>
                              <span className="capitalize text-nomichi-ink">{selectedCRMLead.source || "Website"}</span>
                            </div>

                            {/* Status Dropdown */}
                            <div className="flex items-center justify-between relative custom-dropdown-crmlead-status">
                              <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Status</span>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setCrmLeadStatusDropdownOpen(!crmLeadStatusDropdownOpen)}
                                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF8F4]/30 border border-[#e7e1d5] rounded-xl text-[11px] font-bold text-nomichi-ink/75 cursor-pointer hover:bg-[#FAF8F4] transition-all"
                                >
                                  <span>{getCRMLeadStatusLabel(selectedCRMLead.status || "new")}</span>
                                  <ChevronDown className={`w-3.5 h-3.5 text-nomichi-ink/40 transition-transform ${crmLeadStatusDropdownOpen ? "rotate-180" : ""}`} />
                                </button>

                                {crmLeadStatusDropdownOpen && (
                                  <div className="absolute right-0 mt-1.5 w-32 bg-white border border-[#e7e1d5] rounded-xl shadow-lg z-30 py-1 text-left">
                                    {[
                                      { value: "new", label: "New" },
                                      { value: "contacted", label: "Contacted" },
                                      { value: "qualified", label: "Qualified" },
                                      { value: "negotiating", label: "Vibe Check" },
                                      { value: "converted", label: "Confirmed" },
                                      { value: "lost", label: "Lost" }
                                    ].map((opt) => (
                                      <button
                                        key={opt.value}
                                        type="button"
                                        onClick={() => {
                                          handleCRMLeadStatusChange(opt.value);
                                          setCrmLeadStatusDropdownOpen(false);
                                        }}
                                        className={`w-full text-left px-3.5 py-1.5 text-[11px] font-bold transition-colors border-0 cursor-pointer ${
                                          (selectedCRMLead.status || "new") === opt.value
                                            ? "bg-[#FFEFEA] text-[#FF5B26]"
                                            : "bg-white text-nomichi-ink/75 hover:bg-[#FAF8F4]"
                                        }`}
                                      >
                                        {opt.label}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Assigned To Dropdown */}
                            <div className="flex items-center justify-between relative custom-dropdown-crmlead-assign">
                              <span className="text-nomichi-ink/40 uppercase text-[9px] font-bold">Assigned To</span>
                              <div className="relative">
                                {(() => {
                                  const currentAssignee = profiles.find(u => u.id === selectedCRMLead.assigned_to);
                                  return (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => setCrmLeadAssignDropdownOpen(!crmLeadAssignDropdownOpen)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#FAF8F4]/30 border border-[#e7e1d5] rounded-xl text-[11px] font-bold text-nomichi-ink/75 cursor-pointer hover:bg-[#FAF8F4] transition-all"
                                      >
                                        <div className="w-5 h-5 rounded-full overflow-hidden bg-nomichi-sand/20 text-[#FF5B26] font-bold text-[9px] flex items-center justify-center uppercase shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                          {currentAssignee?.avatar_url ? (
                                            <img src={currentAssignee.avatar_url} alt="" className="w-full h-full object-cover" />
                                          ) : (
                                            currentAssignee?.full_name?.charAt(0) || "—"
                                          )}
                                        </div>
                                        <span className="truncate max-w-[120px] text-nomichi-ink">{currentAssignee?.full_name || "Unassigned"}</span>
                                        <ChevronDown className={`w-3.5 h-3.5 text-nomichi-ink/40 transition-transform ${crmLeadAssignDropdownOpen ? "rotate-180" : ""}`} />
                                      </button>

                                      {crmLeadAssignDropdownOpen && (
                                        <div className="absolute right-0 mt-1.5 w-44 bg-white border border-[#e7e1d5] rounded-xl shadow-lg z-30 py-1 text-left max-h-48 overflow-y-auto">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              handleCRMLeadAssignChange("");
                                              setCrmLeadAssignDropdownOpen(false);
                                            }}
                                            className={`w-full text-left px-3.5 py-2 text-[11px] font-bold transition-colors border-0 cursor-pointer flex items-center gap-2 ${
                                              !selectedCRMLead.assigned_to
                                                ? "bg-[#FFEFEA] text-[#FF5B26]"
                                                : "bg-white text-nomichi-ink/75 hover:bg-[#FAF8F4]"
                                            }`}
                                          >
                                            <div className="w-5 h-5 rounded-full bg-gray-100 flex items-center justify-center text-[9px] font-bold shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                              —
                                            </div>
                                            <span>Unassigned</span>
                                          </button>

                                          {profiles.filter(u => u.role === "MANAGER").map((u) => (
                                            <button
                                              key={u.id}
                                              type="button"
                                              onClick={() => {
                                                handleCRMLeadAssignChange(u.id);
                                                setCrmLeadAssignDropdownOpen(false);
                                              }}
                                              className={`w-full text-left px-3.5 py-2 text-[11px] font-bold transition-colors border-0 cursor-pointer flex items-center gap-2 ${
                                                selectedCRMLead.assigned_to === u.id
                                                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                                                  : "bg-white text-nomichi-ink/75 hover:bg-[#FAF8F4]"
                                              }`}
                                            >
                                              <div className="w-5 h-5 rounded-full overflow-hidden bg-nomichi-sand/20 text-[#FF5B26] font-bold text-[9px] flex items-center justify-center uppercase shrink-0" style={{ width: '20px', height: '20px', minWidth: '20px', minHeight: '20px' }}>
                                                {u.avatar_url ? (
                                                  <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                                                ) : (
                                                  u.full_name?.charAt(0) || "—"
                                                )}
                                              </div>
                                              <span className="truncate">{u.full_name}</span>
                                            </button>
                                          ))}
                                        </div>
                                      )}
                                    </>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="border-t border-[#e7e1d5]/30 pt-6 space-y-2.5">
                          <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider mb-2">Quick Actions</h5>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (crmLeadNoteInputRef.current) crmLeadNoteInputRef.current.focus();
                              }}
                              className="flex items-center justify-center gap-1.5 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 rounded-xl text-[10px] font-bold cursor-pointer"
                            >
                              <FolderPlus className="w-3.5 h-3.5 text-nomichi-ink/40" />
                              Add Note
                            </button>
                            <button
                              type="button"
                              onClick={() => handleCRMLeadStatusChange("negotiating", "Vibe Check Scheduled: Vibe check call scheduled.")}
                              className="flex items-center justify-center gap-1.5 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 rounded-xl text-[10px] font-bold cursor-pointer"
                            >
                              <Calendar className="w-3.5 h-3.5 text-nomichi-ink/40" />
                              Schedule Vibe Check
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleCRMLeadStatusChange("converted", "Converted to Confirmed: Lead converted to Confirmed.")}
                            className="w-full flex items-center justify-center gap-2 py-2.5 border border-emerald-300 bg-[#ECFDF5]/10 hover:bg-[#ECFDF5]/50 text-emerald-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Convert to Confirmed
                          </button>
                        </div>

                        {/* Notes Timeline */}
                        <div className="border-t border-[#e7e1d5]/30 pt-6 space-y-4">
                          <h5 className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider mb-1">Notes Timeline</h5>
                          
                          <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e7e1d5]/30 text-[11px] font-semibold text-nomichi-ink">
                            {!selectedCRMLead.lead_notes || selectedCRMLead.lead_notes.length === 0 ? (
                              <div className="text-nomichi-ink/40 italic py-2 pl-8">No notes logged. Add one below.</div>
                            ) : (
                              selectedCRMLead.lead_notes.map((note: any) => {
                                const noteText = note.note_text || "";
                                const { title: noteTitle, description: noteDesc } = getLeadNoteDisplay(noteText);
                                const { iconColor, Icon } = getLeadNoteVisual(noteText);
                                const authorLabel = getLeadNoteAuthorLabel(note, usersById);
                                const authorTone =
                                  authorLabel === "Admin"
                                    ? "bg-[#F3F4F6] text-[#6B7280] border-[#E5E7EB]"
                                    : authorLabel === "Unknown"
                                      ? "bg-[#FAF8F4] text-[#8B7D6B] border-[#E7E1D5]"
                                      : "bg-[#EFF6FF] text-[#2563EB] border-[#BFDBFE]";

                                return (
                                  <div key={note.id} className="relative pl-8 space-y-1 pb-1 text-left">
                                    {/* Circle wrapper for timeline icon */}
                                    <div className={`absolute left-0.5 top-0.5 w-6 h-6 rounded-full flex items-center justify-center border shrink-0 ${iconColor}`}>
                                      <Icon className="w-3.5 h-3.5" />
                                    </div>
                                    
                                    <div className="space-y-0.5 pl-0.5">
                                      <div className="flex items-center justify-between gap-2">
                                        <p className="font-extrabold text-xs text-nomichi-ink">{noteTitle}</p>
                                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${authorTone}`}>
                                          {authorLabel}
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-nomichi-ink/60 font-semibold leading-relaxed">{noteDesc}</p>
                                      <span className="text-[9px] text-nomichi-ink/35 font-bold block pt-0.5">
                                        {new Date(note.created_at).toLocaleDateString("en-IN", {
                                          day: "2-digit",
                                          month: "short",
                                          year: "numeric",
                                          hour: "2-digit",
                                          minute: "2-digit"
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Note Input Box */}
                  <div className="p-4 border-t border-[#e7e1d5]/30 bg-[#FAF8F4]/30">
                    <form onSubmit={handleAddCRMLeadNote} className="flex gap-2">
                      <input
                        ref={crmLeadNoteInputRef}
                        type="text"
                        placeholder="Write a note..."
                        value={newCRMLeadNoteText}
                        onChange={(e) => setNewCRMLeadNoteText(e.target.value)}
                        className="flex-grow px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold bg-white focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35"
                      />
                      <button
                        type="submit"
                        disabled={addingCRMLeadNote || !newCRMLeadNoteText.trim()}
                        className="w-9 h-9 rounded-xl bg-[#FF5B26] text-white flex items-center justify-center border-0 cursor-pointer hover:bg-[#FF5B26]/90 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {addingCRMLeadNote ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* ===================== NEW LEAD MODAL ===================== */}
              {isNewLeadModalOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
                  <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-xl max-w-lg w-full overflow-hidden text-left animate-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="px-6 py-5 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]/30">
                      <div>
                        <h3 className="text-base font-display font-extrabold text-nomichi-ink uppercase tracking-wider">New Lead</h3>
                        <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">Create a new client enquiry manually</p>
                      </div>
                      <button
                        onClick={() => setIsNewLeadModalOpen(false)}
                        className="w-6 h-6 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/50 cursor-pointer bg-white"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleCreateNewLead} className="p-6 space-y-4">
                      {/* Name */}
                      <div className="space-y-1">
                        <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Traveller Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Rahul Sharma"
                          value={newLeadForm.name}
                          onChange={(e) => setNewLeadForm({ ...newLeadForm, name: e.target.value })}
                          className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35 bg-[#FAF8F4]/30"
                        />
                      </div>

                      {/* Contact row */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Email Address *</label>
                          <input
                            type="email"
                            required
                            placeholder="e.g. rahul@gmail.com"
                            value={newLeadForm.email}
                            onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35 bg-[#FAF8F4]/30"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Phone Number</label>
                          <input
                            type="tel"
                            placeholder="e.g. +91 98765 43210"
                            value={newLeadForm.phone}
                            onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35 bg-[#FAF8F4]/30"
                          />
                        </div>
                      </div>

                      {/* Dropdowns row 1 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Status</label>
                          <select
                            value={newLeadForm.status}
                            onChange={(e) => setNewLeadForm({ ...newLeadForm, status: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-white cursor-pointer"
                          >
                            <option value="new">New</option>
                            <option value="contacted">Contacted</option>
                            <option value="qualified">Qualified</option>
                            <option value="negotiating">Vibe Check</option>
                            <option value="converted">Confirmed</option>
                            <option value="lost">Lost</option>
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Source</label>
                          <select
                            value={newLeadForm.source}
                            onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-white cursor-pointer"
                          >
                            <option value="Website">Website</option>
                            <option value="Instagram">Instagram</option>
                            <option value="WhatsApp">WhatsApp</option>
                            <option value="Referral">Referral</option>
                          </select>
                        </div>
                      </div>

                      {/* Dropdowns row 2 */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Interested Trip</label>
                          <select
                            value={newLeadForm.trip_id}
                            onChange={(e) => setNewLeadForm({ ...newLeadForm, trip_id: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-white cursor-pointer truncate"
                          >
                            <option value="">General / Flexible</option>
                            {trips.map((t) => (
                              <option key={t.id} value={t.id}>{t.title}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-1">
                          <label className="text-[10px] font-black text-nomichi-ink uppercase tracking-wider">Assign To</label>
                          <select
                            value={newLeadForm.assigned_to}
                            onChange={(e) => setNewLeadForm({ ...newLeadForm, assigned_to: e.target.value })}
                            className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-white cursor-pointer truncate"
                          >
                            <option value="">Unassigned</option>
                            {profiles.filter(u => u.role === "MANAGER").map((u) => (
                              <option key={u.id} value={u.id}>{u.full_name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="flex justify-end gap-3 pt-4 border-t border-[#e7e1d5]/30">
                        <button
                          type="button"
                          onClick={() => setIsNewLeadModalOpen(false)}
                          className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-extrabold text-xs rounded-xl cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={savingNewLead}
                          className="px-5 py-2 bg-[#FF5B26] hover:bg-[#FF5B26]/90 text-white font-extrabold text-xs rounded-xl flex items-center gap-1.5 transition-colors border-0 cursor-pointer disabled:opacity-50"
                        >
                          {savingNewLead ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 stroke-[2.5]" />}
                          Create Lead
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "travelers" ? (
            /* ===================== TRAVELERS TAB ===================== */
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col text-left animate-in fade-in duration-300">
              <div className="px-6 py-5 border-b border-[#e7e1d5]/30 flex items-center justify-between">
                <div>
                  <h2 className="text-base font-display font-bold text-nomichi-ink">Confirmed Travelers</h2>
                  <p className="text-xs text-nomichi-ink/40 font-medium">
                    {travelersFilterTripId ? "Filtered travelers list for selected active trip." : "List of all clients who have confirmed bookings."}
                  </p>
                </div>
                {travelersFilterTripId && (
                  <button
                    onClick={() => setTravelersFilterTripId(null)}
                    className="px-3 py-1.5 bg-[#FFEFEA] hover:bg-[#FFEFEA]/80 text-[#FF5B26] text-xs font-bold rounded-xl border-0 cursor-pointer flex items-center gap-1.5 transition-all"
                  >
                    <span>Clear Filter</span>
                    <span className="text-[10px] opacity-70">✕</span>
                  </button>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Name</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Email</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Trip</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Group Size</th>
                      <th className="px-6 py-3.5 font-bold text-nomichi-ink/50 text-[10px] uppercase tracking-wider">Enquiry ID</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e1d5]/20">
                    {(() => {
                      const allTravelers = leads.filter(l => l.status === "converted");
                      const filteredTravelers = travelersFilterTripId 
                        ? allTravelers.filter(l => l.trip_id === travelersFilterTripId)
                        : allTravelers;

                      if (filteredTravelers.length === 0) {
                        return (
                          <tr>
                            <td colSpan={6} className="px-6 py-10 text-center text-nomichi-ink/40 font-semibold">
                              {travelersFilterTripId ? "No confirmed travelers found for this trip." : "No confirmed travelers found."}
                            </td>
                          </tr>
                        );
                      }

                      return filteredTravelers.map((traveler) => (
                        <tr key={traveler.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                          <td className="px-6 py-4 font-semibold text-nomichi-ink">{traveler.name}</td>
                          <td className="px-6 py-4 text-nomichi-ink/80">{traveler.email}</td>
                          <td className="px-6 py-4 text-nomichi-ink/70">{traveler.phone || "N/A"}</td>
                          <td className="px-6 py-4 font-medium text-nomichi-ink/75">{traveler.trips?.title || "Unknown Trip"}</td>
                          <td className="px-6 py-4 font-semibold text-nomichi-ink/80">{traveler.group_size || 1}</td>
                          <td className="px-6 py-4 font-mono font-bold text-[10px] text-nomichi-ink/40">{traveler.enquiry_id || "ENQ-N/A"}</td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : activeTab === "users" ? (
            /* ===================== ROLE MANAGER (USERS) TAB ===================== */
            <div className="space-y-6 animate-in fade-in duration-300 text-left">
              <div>
                <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Role Manager</h1>
                <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
                  View registered profiles and assign admin roles.
                </p>
              </div>

              {/* Search Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="relative w-64">
                  <input
                    type="text"
                    value={roleManagerSearch}
                    onChange={(e) => setRoleManagerSearch(e.target.value)}
                    placeholder="Search by name or email..."
                    className="w-full pl-4 pr-9.5 py-2.5 bg-white border border-[#e7e1d5] rounded-xl text-xs font-semibold placeholder-nomichi-ink/30 text-nomichi-ink focus:outline-none focus:border-[#FF5B26]"
                  />
                  <Search className="w-4 h-4 text-nomichi-ink/30 absolute right-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Success Alert */}
              {roleSuccessMessage && (
                <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5">
                  <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                  {roleSuccessMessage}
                </div>
              )}

              {/* Users Table Card */}
              <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-[#FAF8F4] border-b border-[#e7e1d5]/30">
                        <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">User</th>
                        <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Phone</th>
                        <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Joined Date</th>
                        <th className="px-6 py-3.5 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#e7e1d5]/20">
                      {(() => {
                        const filteredProfiles = profiles.filter((p) => {
                          const nameMatch = p.full_name?.toLowerCase().includes(roleManagerSearch.toLowerCase());
                          const emailMatch = p.email?.toLowerCase().includes(roleManagerSearch.toLowerCase());
                          return nameMatch || emailMatch;
                        });

                        if (filteredProfiles.length === 0) {
                          return (
                            <tr>
                              <td colSpan={5} className="px-6 py-12 text-center text-nomichi-ink/40 font-semibold">
                                No users match your search criteria.
                              </td>
                            </tr>
                          );
                        }

                        return filteredProfiles.map((user) => {
                          const firstName = user.full_name?.split(" ")[0] || "User";
                          const formattedDate = user.created_at
                            ? new Date(user.created_at).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "—";

                          return (
                            <tr key={user.id} className="hover:bg-[#FAF8F4]/50 transition-colors">
                              <td className="px-6 py-4 font-semibold text-nomichi-ink">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-full overflow-hidden border border-[#e7e1d5]/50 bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-xs shrink-0">
                                    {user.avatar_url ? (
                                      <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                    ) : (
                                      firstName.charAt(0).toUpperCase()
                                    )}
                                  </div>
                                  <span>{user.full_name || "No Name"}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-nomichi-ink/85">
                                <div className="flex items-center gap-2">
                                  <Mail className="w-3.5 h-3.5 text-nomichi-ink/30 shrink-0" />
                                  <span>{user.email || "No Email"}</span>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-nomichi-ink/75">{user.phone || "—"}</td>
                              <td className="px-6 py-4 text-nomichi-ink/75">{formattedDate}</td>
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-2">
                                  {updatingProfileId === user.id ? (
                                    <Loader2 className="w-4 h-4 text-[#FF5B26] animate-spin" />
                                  ) : (
                                    <select
                                      value={user.role?.toLowerCase() || "user"}
                                      onChange={(e) => handleAdminViewRoleChange(user.id, e.target.value.toUpperCase())}
                                      className={`px-2 py-1.5 border border-[#e7e1d5] rounded-xl text-[11px] font-bold cursor-pointer bg-white ${
                                        user.role?.toLowerCase() === "admin"
                                          ? "text-[#FF5B26] border-[#FF5B26]/30 bg-[#FFEFEA]/20"
                                          : user.role?.toLowerCase() === "manager"
                                          ? "text-blue-600 border-blue-200 bg-blue-50/20"
                                          : "text-nomichi-ink/70"
                                      }`}
                                    >
                                      <option value="user">User</option>
                                      <option value="manager">Manager</option>
                                      <option value="admin">Admin</option>
                                    </select>
                                  )}
                                  {user.role?.toLowerCase() === "admin" && (
                                    <span title="Admin User">
                                      <Shield className="w-3.5 h-3.5 text-[#FF5B26]" />
                                    </span>
                                  )}
                                  {user.role?.toLowerCase() === "manager" && (
                                    <span title="Manager User">
                                      <Shield className="w-3.5 h-3.5 text-blue-600" />
                                    </span>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : (
            /* ===================== OTHER PLAIN DETAILS TABS ===================== */
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-8 text-center animate-in fade-in duration-300">
              <div className="max-w-md mx-auto py-10">
                <div className="w-16 h-16 rounded-full bg-nomichi-cream/40 flex items-center justify-center text-[#FF5B26] mx-auto mb-4 border border-[#e7e1d5]/50">
                  <LayoutDashboard className="w-6 h-6" />
                </div>
                <h3 className="text-base font-display font-extrabold text-nomichi-ink uppercase tracking-wider">
                  {activeTab} Management Panel
                </h3>
                <p className="text-xs text-nomichi-ink/40 font-medium leading-relaxed mt-2.5">
                  This administrative panel is loaded with active database contexts. You can fully administer and update customer leads, active inquiries, content, and settings.
                </p>
              </div>
            </div>
          )}

              {activeActionDropdownId && activeActionDropdownPosition && (
                <div
                  data-dropdown-wrapper
                  className="fixed z-[9999] w-44 min-w-max bg-white/95 backdrop-blur-md border border-[#e7e1d5]/60 rounded-2xl shadow-xl p-1.5 animate-in fade-in slide-in-from-top-2 duration-150 flex flex-col text-left"
                  style={{
                    top: activeActionDropdownPosition.top,
                    right: activeActionDropdownPosition.right,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  {(() => {
                    const trip = trips.find((item) => item.id === activeActionDropdownId);
                    if (!trip) return null;
                    const tripLeads = leads.filter((l) => l.trip_id === trip.id);
                    const enqInfo = getEnquiryDisplay(trip, tripLeads);
                    return renderContextualDropdown(trip, enqInfo);
                  })()}
                </div>
              )}

        </main>
      </div>

      {/* ===================== ACTIVATE TRIP MODAL ===================== */}
      {activeTripForActivation && (() => {
        const isImageOk = !!activeTripForActivation.image_url;
        const isDescriptionOk = !!activeTripForActivation.description;
        const isItineraryOk = !!(activeTripForActivation.itinerary && activeTripForActivation.itinerary.length > 0);
        const isBrochureOk = !!activeTripForActivation.brochure_url;
        const isPriceOk = !!(activeTripForActivation.price && activeTripForActivation.price > 0);
        const isHighlightsOk = !!(activeTripForActivation.highlights && activeTripForActivation.highlights.length > 0);

        const isReadyToActivate = isImageOk && isDescriptionOk && isItineraryOk && isBrochureOk && isPriceOk && isHighlightsOk;

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Glassmorphic Backdrop */}
            <div 
              className="absolute inset-0 bg-[#1A1816]/60 backdrop-blur-md transition-opacity" 
              onClick={() => setActiveTripForActivation(null)}
            />
            
            {/* Modal Container */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/50 shadow-2xl overflow-hidden relative w-full max-w-3xl z-10 animate-in zoom-in-95 duration-200 text-left">
              <div className="px-6 py-5 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]">
                <div>
                  <h3 className="text-base font-display font-extrabold text-nomichi-ink uppercase tracking-wider">Activate Departure</h3>
                  <p className="text-[10px] text-nomichi-ink/50 font-semibold mt-0.5">{activeTripForActivation.title}</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setActiveTripForActivation(null)}
                  className="w-8 h-8 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center cursor-pointer text-nomichi-ink/50 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="px-6 py-4 bg-[#EBF3FF] border-b border-[#D0E2FF] flex items-center gap-2.5 text-[#1E6BFF] text-xs font-semibold">
                <Compass className="w-4 h-4 shrink-0 animate-pulse" />
                <span>This trip will become bookable and visible with confirmed travel dates.</span>
              </div>

              <form onSubmit={handleActivateTripSubmit} className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                  
                  {/* LEFT COLUMN: DEPARTURE DETAILS */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2">Departure Details</h4>
                    
                    {/* Start Date & End Date in a Grid */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Start Date *</label>
                        <input
                          type="date"
                          required
                          value={activationForm.startDate}
                          onChange={(e) => setActivationForm({ ...activationForm, startDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">End Date *</label>
                        <input
                          type="date"
                          required
                          value={activationForm.endDate}
                          onChange={(e) => setActivationForm({ ...activationForm, endDate: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                    </div>

                    {/* Total Seats & Trip Leader */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Total Seats *</label>
                        <input
                          type="number"
                          required
                          placeholder="12"
                          value={activationForm.totalSeats}
                          onChange={(e) => setActivationForm({ ...activationForm, totalSeats: e.target.value })}
                          className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                        />
                      </div>
                      <div>
                        <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Trip Leader</label>
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setLeaderDropdownOpen(!leaderDropdownOpen)}
                            className="w-full px-3 py-2 border border-[#e7e1d5] bg-white rounded-xl text-xs font-bold text-left flex justify-between items-center cursor-pointer text-nomichi-ink focus:outline-none focus:border-[#FF5B26]"
                          >
                            <span className="flex items-center gap-2">
                              {(() => {
                                const selectedLeader = users.find((p) => p.id === activationForm.tripLeaderId);
                                if (selectedLeader) {
                                  return (
                                    <>
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-[10px] shrink-0 border border-[#e7e1d5]/40">
                                        {selectedLeader.avatar_url ? (
                                          <img src={selectedLeader.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                          (selectedLeader.full_name || "M").charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <span>{selectedLeader.full_name}</span>
                                    </>
                                  );
                                }
                                return <span>{selectedLeader ? selectedLeader.full_name : "Select Team Member"}</span>;
                              })()}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 shrink-0" />
                          </button>

                          {leaderDropdownOpen && (
                            <div className="absolute top-10 left-0 right-0 bg-white border border-[#e7e1d5] rounded-xl shadow-lg z-20 p-1 space-y-0.5 max-h-48 overflow-y-auto">
                              <button
                                type="button"
                                onClick={() => {
                                  setActivationForm({ ...activationForm, tripLeaderId: "" });
                                  setLeaderDropdownOpen(false);
                                }}
                                className="w-full px-2.5 py-1.5 text-left text-xs font-semibold rounded-lg hover:bg-[#FAF8F4] border-0 bg-transparent text-nomichi-ink/50 cursor-pointer"
                              >
                                Select Team Member
                              </button>
                              {users
                                .filter((u) => u.role === "MANAGER")
                                .map((user) => {
                                  const name = user.full_name || user.email;
                                  return (
                                    <button
                                      key={user.id}
                                      type="button"
                                      onClick={() => {
                                        setActivationForm({ ...activationForm, tripLeaderId: user.id });
                                        setLeaderDropdownOpen(false);
                                      }}
                                      className="w-full px-2.5 py-1.5 text-left text-xs font-bold rounded-lg hover:bg-[#FAF8F4] border-0 bg-transparent text-nomichi-ink cursor-pointer flex items-center gap-2"
                                    >
                                      <div className="w-5 h-5 rounded-full overflow-hidden bg-[#FFECE5] flex items-center justify-center font-bold text-[#FF5B26] text-[10px] shrink-0 border border-[#e7e1d5]/40">
                                        {user.avatar_url ? (
                                          <img src={user.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                                        ) : (
                                          (user.full_name || "M").charAt(0).toUpperCase()
                                        )}
                                      </div>
                                      <span>{name}</span>
                                    </button>
                                  );
                                })}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Meeting Point */}
                    <div>
                      <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Meeting Point</label>
                      <input
                        type="text"
                        placeholder="Airport / City"
                        value={activationForm.meetingPoint}
                        onChange={(e) => setActivationForm({ ...activationForm, meetingPoint: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                      />
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-[9px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1">Notes (Optional)</label>
                      <textarea
                        rows={2}
                        placeholder="Any special notes for this departure..."
                        value={activationForm.notes}
                        onChange={(e) => setActivationForm({ ...activationForm, notes: e.target.value })}
                        className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold resize-none"
                      />
                    </div>
                  </div>

                  {/* RIGHT COLUMN: PRE-ACTIVATION CHECKLIST */}
                  <div className="space-y-4">
                    <h4 className="text-xs font-black text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2">Pre-activation Checklist</h4>
                    
                    <ul className="space-y-2 text-xs font-semibold text-nomichi-ink/75">
                      <li className="flex items-center gap-2">
                        {isImageOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isImageOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Cover image exists</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isDescriptionOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isDescriptionOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Description exists</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isItineraryOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isItineraryOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Itinerary added</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isBrochureOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isBrochureOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Brochure uploaded</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isPriceOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isPriceOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Price added</span>
                      </li>
                      <li className="flex items-center gap-2">
                        {isHighlightsOk ? (
                          <span className="text-emerald-500 font-bold">✓</span>
                        ) : (
                          <span className="text-rose-500 font-bold">✗</span>
                        )}
                        <span className={isHighlightsOk ? "text-nomichi-ink" : "text-nomichi-ink/40 line-through"}>Highlights added</span>
                      </li>
                    </ul>

                    {/* Pre-activation Status Box */}
                    {isReadyToActivate ? (
                      <div className="bg-[#E6F9F0] border border-[#B3F5D3] rounded-2xl p-4 text-emerald-800 text-xs font-semibold flex items-center gap-2">
                        <CheckCircle className="w-5 h-5 text-emerald-500 shrink-0" />
                        <div>
                          <p className="font-extrabold text-emerald-950">All good!</p>
                          <p className="text-[10px] opacity-90 mt-0.5">This trip is ready to be activated.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 text-rose-800 text-xs font-semibold">
                        <div className="flex items-center gap-2 mb-1.5">
                          <XCircle className="w-5 h-5 text-rose-500 shrink-0" />
                          <span className="font-extrabold text-rose-950">Cannot activate departure</span>
                        </div>
                        <div className="space-y-1 pl-1 text-[10px] opacity-90 font-medium flex flex-col gap-0.5">
                          {!isImageOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Cover image missing</span></div>}
                          {!isDescriptionOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Description missing</span></div>}
                          {!isItineraryOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Itinerary missing</span></div>}
                          {!isBrochureOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Brochure missing</span></div>}
                          {!isPriceOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Price missing</span></div>}
                          {!isHighlightsOk && <div className="flex items-center gap-1.5"><span>⚠</span> <span>Highlights missing</span></div>}
                        </div>
                      </div>
                    )}

                    {/* Information Tip Banner */}
                    <div className="bg-[#FAF8F4] border border-[#e7e1d5]/40 rounded-2xl p-3 text-[10px] font-semibold text-nomichi-ink/60 leading-normal flex items-start gap-2">
                      <Sparkles className="w-4 h-4 text-[#FF5B26] shrink-0 mt-0.5" />
                      <span>Once activated, you can manage bookings, travelers and availability from the Departures section.</span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-3 border-t border-[#e7e1d5]/30 mt-6">
                  <button
                    type="button"
                    onClick={() => setActiveTripForActivation(null)}
                    className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading || !isReadyToActivate}
                    className="px-5 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                    Activate Departure
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

    </div>
  );
}
