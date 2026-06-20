"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Home, 
  Compass, 
  ClipboardList, 
  Map, 
  Heart, 
  MessageSquare, 
  User as UserIcon, 
  Settings, 
  HelpCircle, 
  LogOut, 
  Bell, 
  ChevronDown, 
  Star,
  Search,
  Menu,
  X,
  Plane,
  Shield,
  ShieldCheck,
  Tag,
  Calendar,
  MapPin,
  Headphones,
  Users,
  Plus,
  Clock,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit,
  Paperclip,
  Phone,
  Mail,
  Camera,
  Gift,
  Lock,
  Mountain,
  Gem,
  Landmark,
  Leaf,
  Palmtree,
  PawPrint,
  Utensils,
  Bed,
  Wallet,
  Globe,
  Send,
  Flower,
  Car,
  Eye,
  EyeOff,
  Video,
  Archive,
  SlidersHorizontal,
  ArrowDownToLine,
  Smile,
  FileText,
  Check
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { notificationService, Notification } from "@/services/notification.service";
import { encryptMessage, decryptMessage } from "@/lib/utils/chat-crypto";
import SettingsView from "@/components/SettingsView";
import AdminView from "@/components/AdminView";

interface DashboardViewProps {
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
  leads?: any[];
  trips?: any[];
  initialChatMessages?: any[]; // Encrypted rows from chat_messages table
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'other';
  senderName: string;
  content: string;
  time: string;
  sortTime?: number;
  isRead?: boolean;
  attachment?: {
    title: string;
    subtitle: string;
    type: string;
    size: string;
    imageUrl?: string;
  };
}

interface ChatThread {
  id: string;
  name: string;
  avatarUrl?: string;
  avatarText?: string;
  isOnline?: boolean;
  unreadCount?: number;
  lastTime: string;
  category: 'team' | 'updates' | 'archived';
  messages: ChatMessage[];
}

// Helper to extract first name and clean IDs
function formatFriendlyName(fullName: string): string {
  if (!fullName) return "Traveler";
  let clean = fullName.replace(/^\d+\s*/, "").trim();
  if (!clean) return "Traveler";
  const words = clean.split(/\s+/);
  const lower = clean.toLowerCase();
  
  if (lower.includes("tejaswa")) return "Tejaswa";
  if (lower.includes("tejswa")) return "Tejswa";
  
  const titleCasedWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  if (titleCasedWords.length > 1 && titleCasedWords[1].length > 2) {
    return titleCasedWords[1];
  }
  return titleCasedWords[0];
}

// Helper to convert full uppercase Indian surname-first format to standard full name
function formatFullName(fullName: string): string {
  if (!fullName) return "Traveler";
  let clean = fullName.replace(/^\d+\s*/, "").trim();
  if (!clean) return "Traveler";
  
  const words = clean.split(/\s+/);
  const titleCasedWords = words.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase());
  
  if (titleCasedWords.length >= 2) {
    const w0 = titleCasedWords[0];
    const w1 = titleCasedWords[1];
    if (w0.toLowerCase().includes("tejaswa") || w0.toLowerCase().includes("tejswa")) {
      return `${w0} ${w1}`;
    }
    if (w1.toLowerCase().includes("tejaswa") || w1.toLowerCase().includes("tejswa")) {
      return `${w1} ${w0}`;
    }
    return `${w1} ${w0}`;
  }
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function getGroupThreadKey(lead: any): string {
  const tripId = lead.trip_id || lead.trip_interest || lead.trips?.id;
  return tripId ? `trip:${tripId}` : `lead:${lead.id}`;
}

function getGroupThreadName(lead: any): string {
  return lead.trips?.title || "General Enquiry";
}

function getGroupAvatarText(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (words.length === 0) return "GRP";
  if (words.length === 1) return words[0].slice(0, 3).toUpperCase();
  return words
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 3);
}

export function DashboardView({ user, leads = [], trips = [], initialChatMessages = [] }: DashboardViewProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const firstName = formatFriendlyName(user.fullName);
  const [currentView, setCurrentView] = useState<"home" | "explore" | "enquiries" | "journeys" | "wishlist" | "enquiry_detail" | "profile" | "messages" | "settings" | "admin">(
    user.role?.toUpperCase() === "ADMIN" ? "admin" : "home"
  );
  const [activeEnquiryId, setActiveEnquiryId] = useState<string | null>(null);
  const [activeJourneyId, setActiveJourneyId] = useState<string | null>(null);
  const [activeJourneyTab, setActiveJourneyTab] = useState<"upcoming" | "completed">("upcoming");

  // Unified routing navigator
  const navigateToView = (view: "home" | "explore" | "enquiries" | "journeys" | "wishlist" | "enquiry_detail" | "profile" | "messages" | "settings" | "admin", id?: string) => {
    setCurrentView(view);
    if (view === "enquiry_detail" && id) {
      setActiveEnquiryId(id);
      router.push(`/?view=enquiry_detail&id=${id}`, { scroll: false });
    } else {
      setActiveEnquiryId(null);
      if (view === "journeys") {
        if (id) {
          setActiveJourneyId(id);
          router.push(`/?view=journeys&id=${id}`, { scroll: false });
          return;
        } else {
          setActiveJourneyId(null);
        }
      } else {
        setActiveJourneyId(null);
      }
      router.push(`/?view=${view}`, { scroll: false });
    }
  };

  // Read view parameter from URL on client mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get("view");
      const idParam = params.get("id");
      if (viewParam === "home" || viewParam === "explore" || viewParam === "enquiries" || viewParam === "journeys" || viewParam === "wishlist" || viewParam === "enquiry_detail" || viewParam === "profile" || viewParam === "messages" || viewParam === "settings" || viewParam === "admin") {
        setCurrentView(viewParam as any);
        if (viewParam === "enquiry_detail" && idParam) {
          setActiveEnquiryId(idParam);
        }
        if (viewParam === "journeys" && idParam) {
          setActiveJourneyId(idParam);
        }
      }
    }
  }, []);
  const [exploreSearch, setExploreSearch] = useState("");

  // Notifications State & Logic for Traveler
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const notificationDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchUserId = async () => {
      const supabase = createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user?.id) {
        setCurrentUserId(data.user.id);
      }
    };
    fetchUserId();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const loadNotifications = async () => {
      try {
        const data = await notificationService.getNotifications(currentUserId);
        setNotifications(data);
      } catch (err) {
        console.error("Failed to load notifications:", err);
      }
    };
    loadNotifications();

    const supabase = createClient();
    const channel = supabase
      .channel(`realtime-notifications-${currentUserId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${currentUserId}`,
        },
        (payload) => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === payload.new.id ? (payload.new as Notification) : n
            )
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentUserId]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationDropdownRef.current && !notificationDropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const notificationUnreadCount = notifications.filter((n) => !n.is_read).length;

  const handleMarkAsRead = async (id: string) => {
    try {
      await notificationService.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    if (!currentUserId) return;
    try {
      await notificationService.markAllAsRead(currentUserId);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };
  
  // My Enquiries Redesign States
  const [enquirySearch, setEnquirySearch] = useState("");
  const [enquiryStatus, setEnquiryStatus] = useState("All Status");
  const [enquiryTrip, setEnquiryTrip] = useState("All Trips");
  const [enquiryFromDate, setEnquiryFromDate] = useState("");
  const [enquiryToDate, setEnquiryToDate] = useState("");
  const [enquiryPage, setEnquiryPage] = useState(1);

  // Enquiry Detail Notes States
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [localNotes, setLocalNotes] = useState<any[]>([]);

  // Editing state for traveller details
  const [isEditingDetails, setIsEditingDetails] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editGroupType, setEditGroupType] = useState("");
  const [editGroupSize, setEditGroupSize] = useState(2);
  const [editPrefMonth, setEditPrefMonth] = useState("");
  const [editHopeFeels, setEditHopeFeels] = useState("");
  const [editAnythingElse, setEditAnythingElse] = useState("");
  const [savingDetails, setSavingDetails] = useState(false);

  // Assigned expert state for traveler detail view
  const [assignedExpert, setAssignedExpert] = useState<any>(null);
  const [loadingExpert, setLoadingExpert] = useState(false);

  // Profile Dashboard States
  const [profileData, setProfileData] = useState<any>(null);
  const [activeProfileTab, setActiveProfileTab] = useState("personal");
  const [profileLoading, setProfileLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    fullName: "",
    gender: "",
    email: "",
    nationality: "",
    phone: "",
    dateOfBirth: ""
  });
  const [travelPrefs, setTravelPrefs] = useState({
    travel_style: [] as string[],
    preferred_destinations: [] as string[],
    preferred_months: [] as string[],
    budget_range: "",
    group_preference: "",
    accommodation_preference: "",
    dietary_preference: "",
    activity_interests: [] as string[]
  });
  const [notificationPrefs, setNotificationPrefs] = useState({
    email: {
      enquiry_updates: true,
      trip_confirmations: true,
      payment_receipts: true,
      itinerary_updates: true,
      marketing_offers: false
    },
    whatsapp: {
      trip_updates: true,
      team_messages: true,
      booking_confirmations: true
    },
    push: {
      new_messages: true,
      upcoming_journey_reminders: true,
      important_travel_alerts: true
    }
  });

  const emailSelectAll = notificationPrefs.email.enquiry_updates &&
                         notificationPrefs.email.trip_confirmations &&
                         notificationPrefs.email.payment_receipts &&
                         notificationPrefs.email.itinerary_updates &&
                         notificationPrefs.email.marketing_offers;

  const toggleEmailSelectAll = () => {
    const nextVal = !emailSelectAll;
    setNotificationPrefs(prev => ({
      ...prev,
      email: {
        enquiry_updates: nextVal,
        trip_confirmations: nextVal,
        payment_receipts: nextVal,
        itinerary_updates: nextVal,
        marketing_offers: nextVal
      }
    }));
  };

  const whatsappSelectAll = notificationPrefs.whatsapp.trip_updates &&
                            notificationPrefs.whatsapp.team_messages &&
                            notificationPrefs.whatsapp.booking_confirmations;

  const toggleWhatsappSelectAll = () => {
    const nextVal = !whatsappSelectAll;
    setNotificationPrefs(prev => ({
      ...prev,
      whatsapp: {
        trip_updates: nextVal,
        team_messages: nextVal,
        booking_confirmations: nextVal
      }
    }));
  };

  const pushSelectAll = notificationPrefs.push.new_messages &&
                        notificationPrefs.push.upcoming_journey_reminders &&
                        notificationPrefs.push.important_travel_alerts;

  const togglePushSelectAll = () => {
    const nextVal = !pushSelectAll;
    setNotificationPrefs(prev => ({
      ...prev,
      push: {
        new_messages: nextVal,
        upcoming_journey_reminders: nextVal,
        important_travel_alerts: nextVal
      }
    }));
  };

  const [securitySettings, setSecuritySettings] = useState({
    privacy: {
      profile_visible_only_me: true,
      receive_travel_recommendations: true,
      share_profile_community: false
    },
    two_factor_enabled: false
  });
  const [emergencyForm, setEmergencyForm] = useState({
    name: "",
    phone: "",
    relation: ""
  });
  const [isEditingEmergency, setIsEditingEmergency] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  const [passwordUpdating, setPasswordUpdating] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: "", text: "" });
  const [isChangePasswordExpanded, setIsChangePasswordExpanded] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [currentSession, setCurrentSession] = useState<{ os: string; browser: string; device: string } | null>(null);

  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [chatActiveTab, setChatActiveTab] = useState<"all" | "team" | "updates" | "archived">("all");
  const [activeThreadId, setActiveThreadId] = useState("");
  const [chatInputText, setChatInputText] = useState("");
  const chatEndRef = useRef<HTMLDivElement>(null);
  const threadCanonicalLeadRef = useRef<globalThis.Map<string, string>>(new globalThis.Map());

  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);

  useEffect(() => {
    if (!leads) return;

    const threadMap = new globalThis.Map<string, ChatThread & { sortTime: number }>();
    const canonicalLeadMap = new globalThis.Map<string, string>();

    leads.forEach((lead: any) => {
      const threadId = getGroupThreadKey(lead);
      const threadName = getGroupThreadName(lead);
      const enquiryDate = new Date(lead.created_at || Date.now());
      const enquiryTime = enquiryDate.getTime();
      const threadLeadName = lead.name || threadName;

      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, {
          id: threadId,
          name: threadName,
          avatarText: getGroupAvatarText(threadName),
          isOnline: true,
          lastTime: enquiryDate.toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          unreadCount: 0,
          category: "updates",
          messages: [],
          sortTime: enquiryTime
        });
      }

      const thread = threadMap.get(threadId)!;
      const existingLeadIds = canonicalLeadMap.get(threadId);
      if (!existingLeadIds) {
        canonicalLeadMap.set(threadId, lead.id);
      }

      thread.messages.push({
        id: `lead-init-${lead.id}`,
        sender: "user",
        senderName: threadLeadName,
        content: `Hi! I submitted an enquiry for "${threadName}". Looking forward to hearing from the team! 🙏`,
        time: enquiryDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
        sortTime: enquiryTime
      });

      if (lead.lead_notes && Array.isArray(lead.lead_notes)) {
        lead.lead_notes.forEach((note: any) => {
          const noteTime = new Date(note.created_at || lead.created_at || Date.now()).getTime();
          thread.messages.push({
            id: note.id,
            sender: "other",
            senderName: "Nomichi Team",
            content: note.content,
            time: new Date(note.created_at || lead.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            sortTime: noteTime
          });
        });
      }

      thread.messages.sort((a, b) => (a.sortTime || 0) - (b.sortTime || 0));
      thread.sortTime = thread.messages[thread.messages.length - 1]?.sortTime || enquiryTime;
      thread.lastTime = new Date(thread.sortTime).toLocaleDateString("en-US", { day: "numeric", month: "short" });
      thread.unreadCount = thread.messages.length > 1 ? 1 : 0;
    });

    threadCanonicalLeadRef.current = canonicalLeadMap;

    const groupedThreads: ChatThread[] = Array.from(threadMap.values())
      .map(({ sortTime, ...thread }) => thread as ChatThread)
      .sort((a, b) => {
        const aTime = a.messages[a.messages.length - 1]?.sortTime || 0;
        const bTime = b.messages[b.messages.length - 1]?.sortTime || 0;
        return bTime - aTime;
      });

    setChatThreads(groupedThreads);
  }, [leads]);

  // Decrypt and load initial messages from DB into threads on mount
  useEffect(() => {
    if (!initialChatMessages || initialChatMessages.length === 0) return;

    async function loadEncryptedMessages() {
      const decrypted: Record<string, ChatMessage[]> = {};

      for (const row of initialChatMessages) {
        const lead = leads.find((item: any) => item.id === row.lead_id);
        if (!lead) continue;

        const threadKey = getGroupThreadKey(lead);
        if (!decrypted[threadKey]) decrypted[threadKey] = [];

        const plaintext = await decryptMessage(row.content_encrypted, row.iv);
        decrypted[threadKey].push({
          id: row.id,
          sender: row.sender_type === "user" ? "user" : "other",
          senderName: row.sender_type === "user" ? (profileForm.fullName || firstName) : "Nomichi Team",
          content: plaintext,
          time: new Date(row.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          sortTime: new Date(row.created_at).getTime(),
          isRead: true
        });
      }

      setChatThreads(prev =>
        prev.map(thread => ({
          ...thread,
          messages: [
            ...(decrypted[thread.id] || []),
            ...thread.messages.filter(
              m => !decrypted[thread.id]?.some(d => d.id === m.id)
            )
          ]
        }))
      );
    }

    loadEncryptedMessages();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialChatMessages]);

  // Supabase Realtime WebSocket subscription for live incoming messages
  useEffect(() => {
    const supabaseClient = createClient();
    const channel = supabaseClient
      .channel("chat_messages_realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "chat_messages" },
        async (payload) => {
          const row = payload.new as any;
          const lead = leads.find((item: any) => item.id === row.lead_id);
          if (!lead) return;

          const threadKey = getGroupThreadKey(lead);

          const plaintext = await decryptMessage(row.content_encrypted, row.iv);
          const incomingMsg: ChatMessage = {
            id: row.id,
            sender: row.sender_type === "user" ? "user" : "other",
            senderName: row.sender_type === "user" ? (profileForm.fullName || firstName) : "Nomichi Team",
            content: plaintext,
            time: new Date(row.created_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
            sortTime: new Date(row.created_at).getTime(),
            isRead: false
          };

          setChatThreads(prev =>
            prev.map(thread => {
              if (thread.id !== threadKey) return thread;
              // Avoid duplicate if we already added optimistically
              if (thread.messages.some(m => m.id === incomingMsg.id)) return thread;
              return {
                ...thread,
                lastTime: incomingMsg.time,
                unreadCount: row.sender_type === "team" ? (thread.unreadCount || 0) + 1 : thread.unreadCount,
                messages: [...thread.messages, incomingMsg]
              };
            })
          );
        }
      )
      .subscribe();

    return () => {
      supabaseClient.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leads]);

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInputText.trim()) return;
    if (!activeThreadId) return;

    const plaintext = chatInputText.trim();
    const now = new Date();
    const timeStr = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    setChatInputText("");

    // Optimistic UI — show immediately before DB write
    const optimisticId = `optimistic-${Date.now()}`;
    const optimisticMsg: ChatMessage = {
      id: optimisticId,
      sender: "user",
      senderName: profileForm.fullName || firstName,
      content: plaintext,
      time: timeStr,
      sortTime: now.getTime(),
      isRead: true
    };

    setChatThreads(prev =>
      prev.map(thread => {
        if (thread.id !== activeThreadId) return thread;
        return { ...thread, lastTime: timeStr, messages: [...thread.messages, optimisticMsg] };
      })
    );

    try {
      // Encrypt then persist to Supabase
      const { ciphertext, iv } = await encryptMessage(plaintext);
      const supabaseClient = createClient();
      const canonicalLeadId = threadCanonicalLeadRef.current.get(activeThreadId);
      if (!canonicalLeadId) {
        throw new Error("No lead found for the selected group.");
      }

      await supabaseClient.from("chat_messages").insert({
        lead_id: canonicalLeadId,
        sender_type: "user",
        content_encrypted: ciphertext,
        iv
      });

      // Notify manager of new message
      try {
        const { data: leadData } = await supabaseClient
          .from("leads")
          .select("name, assigned_to")
          .eq("id", canonicalLeadId)
          .single();

        if (leadData?.assigned_to) {
          await notificationService.notifyManager(
            leadData.assigned_to,
            "New Message",
            `New message from ${leadData.name || "Traveler"}.`,
            "New Message",
            canonicalLeadId,
            "Medium"
          );
        }
      } catch (notifErr) {
        console.error("Failed to notify manager of message:", notifErr);
      }
      // Realtime will broadcast back — the optimistic message stays until deduped
    } catch (err) {
      console.error("Failed to send message:", err);
      // Revert optimistic message on failure
      setChatThreads(prev =>
        prev.map(thread => {
          if (thread.id !== activeThreadId) return thread;
          return { ...thread, messages: thread.messages.filter(m => m.id !== optimisticId) };
        })
      );
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = window.navigator.userAgent;
      let os = 'macOS';
      let device = 'MacBook Pro';
      let browser = 'Chrome';

      if (ua.indexOf('Win') !== -1) {
        os = 'Windows';
        device = 'Windows PC';
      } else if (ua.indexOf('Mac') !== -1) {
        os = 'macOS';
        device = 'MacBook Pro';
      } else if (ua.indexOf('Linux') !== -1) {
        os = 'Linux';
        device = 'Linux PC';
      } else if (ua.indexOf('iPhone') !== -1) {
        os = 'iOS';
        device = 'iPhone';
      } else if (ua.indexOf('Android') !== -1) {
        os = 'Android';
        device = 'Android Device';
      }

      if (ua.indexOf('Firefox') !== -1) {
        browser = 'Firefox';
      } else if (ua.indexOf('Edg') !== -1) {
        browser = 'Edge';
      } else if (ua.indexOf('Chrome') !== -1) {
        browser = 'Chrome';
      } else if (ua.indexOf('Safari') !== -1) {
        browser = 'Safari';
      }

      setCurrentSession({ os, browser, device });
    }
  }, []);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const supabaseClient = createClient();
        const { data: { user: authUser } } = await supabaseClient.auth.getUser();
        if (!authUser) return;

        const { data, error } = await supabaseClient
          .from("profiles")
          .select("*")
          .eq("id", authUser.id)
          .single();

        if (data) {
          setProfileData(data);
          setProfileForm({
            fullName: data.full_name || "",
            gender: data.gender || "",
            email: data.email || "",
            nationality: data.nationality || "",
            phone: data.phone || "",
            dateOfBirth: data.date_of_birth || ""
          });
          setEmergencyForm({
            name: data.emergency_contact_name || "",
            phone: data.emergency_contact_phone || "",
            relation: data.emergency_contact_relation || ""
          });

          if (data.travel_preferences) {
            setTravelPrefs({
              travel_style: data.travel_preferences.travel_style || [],
              preferred_destinations: data.travel_preferences.preferred_destinations || [],
              preferred_months: data.travel_preferences.preferred_months || [],
              budget_range: data.travel_preferences.budget_range || "",
              group_preference: data.travel_preferences.group_preference || "",
              accommodation_preference: data.travel_preferences.accommodation_preference || "",
              dietary_preference: data.travel_preferences.dietary_preference || "",
              activity_interests: data.travel_preferences.activity_interests || []
            });
          }
          if (data.notification_preferences) {
            setNotificationPrefs({
              email: {
                enquiry_updates: data.notification_preferences.email?.enquiry_updates ?? true,
                trip_confirmations: data.notification_preferences.email?.trip_confirmations ?? true,
                payment_receipts: data.notification_preferences.email?.payment_receipts ?? true,
                itinerary_updates: data.notification_preferences.email?.itinerary_updates ?? true,
                marketing_offers: data.notification_preferences.email?.marketing_offers ?? false
              },
              whatsapp: {
                trip_updates: data.notification_preferences.whatsapp?.trip_updates ?? true,
                team_messages: data.notification_preferences.whatsapp?.team_messages ?? true,
                booking_confirmations: data.notification_preferences.whatsapp?.booking_confirmations ?? true
              },
              push: {
                new_messages: data.notification_preferences.push?.new_messages ?? true,
                upcoming_journey_reminders: data.notification_preferences.push?.upcoming_journey_reminders ?? true,
                important_travel_alerts: data.notification_preferences.push?.important_travel_alerts ?? true
              }
            });
          }
          if (data.security_settings) {
            setSecuritySettings({
              privacy: {
                profile_visible_only_me: data.security_settings.privacy?.profile_visible_only_me ?? true,
                receive_travel_recommendations: data.security_settings.privacy?.receive_travel_recommendations ?? true,
                share_profile_community: data.security_settings.privacy?.share_profile_community ?? false
              },
              two_factor_enabled: !!data.security_settings.two_factor_enabled
            });
          }
        }
      } catch (err) {
        console.error("Error loading profile:", err);
      } finally {
        setProfileLoading(false);
      }
    }

    if (currentView === "profile") {
      fetchProfile();
    }
  }, [currentView]);

  const toggleTravelPrefArray = (key: 'travel_style' | 'preferred_destinations' | 'preferred_months' | 'activity_interests', value: string) => {
    const currentArray = travelPrefs[key] || [];
    const updatedArray = currentArray.includes(value)
      ? currentArray.filter(v => v !== value)
      : [...currentArray, value];
    setTravelPrefs({ ...travelPrefs, [key]: updatedArray });
  };

  const handleSaveProfileChanges = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const supabaseClient = createClient();
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");

      const { error } = await supabaseClient
        .from("profiles")
        .update({
          full_name: profileForm.fullName,
          gender: profileForm.gender,
          email: profileForm.email,
          nationality: profileForm.nationality,
          phone: profileForm.phone,
          date_of_birth: profileForm.dateOfBirth
        })
        .eq("id", authUser.id);

      if (error) throw error;
      
      // Update local profileData
      setProfileData((prev: any) => ({
        ...prev,
        full_name: profileForm.fullName,
        gender: profileForm.gender,
        email: profileForm.email,
        nationality: profileForm.nationality,
        phone: profileForm.phone,
        date_of_birth: profileForm.dateOfBirth
      }));
      
      alert("Personal information saved successfully!");
    } catch (err: any) {
      console.error("Error saving profile:", err);
      alert("Failed to save profile: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveTravelPrefs = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const supabaseClient = createClient();
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");

      const { error } = await supabaseClient
        .from("profiles")
        .update({ travel_preferences: travelPrefs })
        .eq("id", authUser.id);

      if (error) throw error;
      alert("Travel preferences saved successfully!");
    } catch (err: any) {
      console.error("Error saving travel preferences:", err);
      alert("Failed to save travel preferences: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveNotifications = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const supabaseClient = createClient();
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");

      const { error } = await supabaseClient
        .from("profiles")
        .update({ notification_preferences: notificationPrefs })
        .eq("id", authUser.id);

      if (error) throw error;
      alert("Notification preferences saved successfully!");
    } catch (err: any) {
      console.error("Error saving notification preferences:", err);
      alert("Failed to save notification preferences: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSecuritySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const supabaseClient = createClient();
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");

      const { error } = await supabaseClient
        .from("profiles")
        .update({ security_settings: securitySettings })
        .eq("id", authUser.id);

      if (error) throw error;
      alert("Security and privacy settings saved successfully!");
    } catch (err: any) {
      console.error("Error saving security settings:", err);
      alert("Failed to save security settings: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleToggle2FA = async () => {
    const nextVal = !securitySettings.two_factor_enabled;
    setSavingProfile(true);
    try {
      const supabaseClient = createClient();
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");

      const updatedSettings = {
        ...securitySettings,
        two_factor_enabled: nextVal
      };

      const { error } = await supabaseClient
        .from("profiles")
        .update({ security_settings: updatedSettings })
        .eq("id", authUser.id);

      if (error) throw error;
      setSecuritySettings(updatedSettings);
    } catch (err: any) {
      console.error("Error updating 2FA:", err);
      alert("Failed to update 2FA: " + err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveEmergencyContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const supabaseClient = createClient();
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (!authUser) throw new Error("No authenticated user");

      const { error } = await supabaseClient
        .from("profiles")
        .update({
          emergency_contact_name: emergencyForm.name,
          emergency_contact_phone: emergencyForm.phone,
          emergency_contact_relation: emergencyForm.relation
        })
        .eq("id", authUser.id);

      if (error) throw error;

      setProfileData((prev: any) => ({
        ...prev,
        emergency_contact_name: emergencyForm.name,
        emergency_contact_phone: emergencyForm.phone,
        emergency_contact_relation: emergencyForm.relation
      }));
      
      setIsEditingEmergency(false);
      alert("Emergency contact updated successfully!");
    } catch (err: any) {
      console.error("Error saving emergency contact:", err);
      alert("Failed to save emergency contact: " + err.message);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordMessage({ type: "error", text: "Passwords do not match." });
      return;
    }
    if (passwordForm.newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Password must be at least 6 characters." });
      return;
    }
    
    setPasswordUpdating(true);
    setPasswordMessage({ type: "", text: "" });
    try {
      const supabaseClient = createClient();
      const { error } = await supabaseClient.auth.updateUser({
        password: passwordForm.newPassword
      });
      
      if (error) throw error;
      
      setPasswordMessage({ type: "success", text: "Password changed successfully!" });
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      setTimeout(() => {
        setIsPasswordModalOpen(false);
        setPasswordMessage({ type: "", text: "" });
      }, 2000);
    } catch (err: any) {
      console.error("Error updating password:", err);
      setPasswordMessage({ type: "error", text: err.message || "Failed to update password." });
    } finally {
      setPasswordUpdating(false);
    }
  };

  const handleLogoutAllDevices = async () => {
    if (confirm("Are you sure you want to log out from all devices?")) {
      try {
        const supabaseClient = createClient();
        const { error } = await supabaseClient.auth.signOut({ scope: 'global' });
        if (error) throw error;
        window.location.href = "/auth/signout";
      } catch (err: any) {
        console.error("Error signing out from all devices:", err);
        alert("Failed to log out: " + err.message);
      }
    }
  };

  const handleDeleteAccount = async () => {
    if (confirm("WARNING: Are you sure you want to delete your account? This action is permanent and cannot be undone.")) {
      const doubleCheck = prompt("Please type 'DELETE' to confirm account deletion:");
      if (doubleCheck === "DELETE") {
        try {
          const response = await fetch("/api/users/delete", {
            method: "POST",
          });
          const result = await response.json();
          if (!response.ok) {
            throw new Error(result.error || "Failed to delete account");
          }
          alert("Your account has been deleted successfully.");
          window.location.href = "/";
        } catch (err: any) {
          console.error("Error deleting account:", err);
          alert("Failed to delete account: " + err.message);
        }
      } else if (doubleCheck !== null) {
        alert("Confirmation code did not match. Account deletion cancelled.");
      }
    }
  };

  const handleAvatarClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert file to Base64
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      
      // Save to Supabase profiles.avatar_url
      try {
        const supabaseClient = createClient();
        const { data: { user: authUser } } = await supabaseClient.auth.getUser();
        if (!authUser) throw new Error("No authenticated user");

        const { error } = await supabaseClient
          .from("profiles")
          .update({ avatar_url: base64String })
          .eq("id", authUser.id);

        if (error) throw error;

        // Update local state
        setProfileData((prev: any) => ({ ...prev, avatar_url: base64String }));
        alert("Profile picture updated successfully!");
      } catch (err: any) {
        console.error("Error updating avatar:", err);
        alert("Failed to update profile picture: " + err.message);
      }
    };
    reader.readAsDataURL(file);
  };

  const selectedLead = leads.find(l => l.id === activeEnquiryId);

  // Synchronize local notes when active lead changes
  useEffect(() => {
    if (selectedLead && selectedLead.lead_notes) {
      setLocalNotes(selectedLead.lead_notes);
    } else {
      setLocalNotes([]);
    }
  }, [activeEnquiryId, selectedLead]);

  // Fetch assigned Trip Expert profile
  useEffect(() => {
    async function fetchAssignedExpert() {
      if (selectedLead?.assigned_to) {
        try {
          setLoadingExpert(true);
          const supabaseClient = createClient();
          const { data, error } = await supabaseClient
            .from("profiles")
            .select("id, full_name, avatar_url, email, phone, role")
            .eq("id", selectedLead.assigned_to)
            .maybeSingle();
          if (error) throw error;
          setAssignedExpert(data || null);
        } catch (err) {
          console.error("Error fetching assigned expert:", err);
          setAssignedExpert(null);
        } finally {
          setLoadingExpert(false);
        }
      } else {
        setAssignedExpert(null);
      }
    }
    fetchAssignedExpert();
  }, [activeEnquiryId, selectedLead?.assigned_to]);

  const startEditingDetails = () => {
    if (!selectedLead) return;
    setEditName(selectedLead.name || "");
    setEditPhone(selectedLead.phone || "");
    setEditGroupType(selectedLead.group_type || "couple");
    setEditGroupSize(selectedLead.group_size || 2);
    setEditPrefMonth(selectedLead.preferred_month || "");
    setEditHopeFeels(selectedLead.hope_trip_feels_like || "");
    setEditAnythingElse(selectedLead.dietary_and_accessibility || "");
    setIsEditingDetails(true);
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !selectedLead) return;

    try {
      setAddingNote(true);
      const supabaseClient = createClient();
      
      const { data, error } = await supabaseClient
        .from("lead_notes")
        .insert({
          lead_id: selectedLead.id,
          content: newNoteText.trim()
        })
        .select();

      if (error) throw error;

      if (data && data[0]) {
        setLocalNotes(prev => [...prev, data[0]]);
        setNewNoteText("");
      }
    } catch (err: any) {
      console.error("Failed to add note:", err.message);
      alert("Error adding note: " + err.message);
    } finally {
      setAddingNote(false);
    }
  };

  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    try {
      setSavingDetails(true);
      const supabaseClient = createClient();
      
      const { error } = await supabaseClient
        .from("leads")
        .update({
          name: editName,
          phone: editPhone,
          group_type: editGroupType,
          group_size: editGroupSize,
          preferred_month: editPrefMonth,
          hope_trip_feels_like: editHopeFeels,
          dietary_and_accessibility: editAnythingElse
        })
        .eq("id", selectedLead.id);

      if (error) throw error;
      
      // Update local state directly
      selectedLead.name = editName;
      selectedLead.phone = editPhone;
      selectedLead.group_type = editGroupType;
      selectedLead.group_size = editGroupSize;
      selectedLead.preferred_month = editPrefMonth;
      selectedLead.hope_trip_feels_like = editHopeFeels;
      selectedLead.dietary_and_accessibility = editAnythingElse;
      
      setIsEditingDetails(false);
    } catch (err: any) {
      console.error("Failed to save details:", err.message);
      alert("Error saving details: " + err.message);
    } finally {
      setSavingDetails(false);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    if (!selectedLead) return;
    try {
      const supabaseClient = createClient();
      
      const { error } = await supabaseClient
        .from("leads")
        .update({ status: newStatus })
        .eq("id", selectedLead.id);

      if (error) throw error;

      // Dispatch status change notifications
      try {
        const lowerStatus = newStatus?.toLowerCase();
        if (lowerStatus === "converted" || lowerStatus === "confirmed") {
          await notificationService.notifyTraveler(
            selectedLead.email,
            "Booking Confirmed",
            "Your booking has been confirmed.",
            "Booking Confirmed",
            selectedLead.id,
            "High"
          );
          if (selectedLead.assigned_to) {
            await notificationService.notifyManager(
              selectedLead.assigned_to,
              "Booking Confirmed",
              `Booking confirmed for "${selectedLead.name}".`,
              "Booking Confirmed",
              selectedLead.id,
              "High"
            );
          }
        } else if (lowerStatus === "negotiating" || lowerStatus === "vibe check" || lowerStatus === "vibe check sent") {
          await notificationService.notifyTraveler(
            selectedLead.email,
            "Vibe Check Scheduled",
            "Your vibe check has been scheduled.",
            "Vibe Check Scheduled",
            selectedLead.id,
            "Medium"
          );
          if (selectedLead.assigned_to) {
            await notificationService.notifyManager(
              selectedLead.assigned_to,
              "Vibe Check Reminder",
              `Vibe check scheduled for "${selectedLead.name}".`,
              "Vibe Check Reminder",
              selectedLead.id,
              "Medium"
            );
          }
        }
      } catch (notifErr) {
        console.error("Failed to send status change notifications:", notifErr);
      }
      
      // Update local state
      selectedLead.status = newStatus;
      
      // Add status update note to database
      const statusLabel = getStatusDetails(newStatus).label;
      const noteContent = `Status updated to ${statusLabel}.`;
      
      const { data: noteData } = await supabaseClient
        .from("lead_notes")
        .insert({
          lead_id: selectedLead.id,
          content: noteContent
        })
        .select();
        
      if (noteData && noteData[0]) {
        setLocalNotes(prev => [...prev, noteData[0]]);
      }
      
      // Force trigger state reload
      const origId = selectedLead.id;
      setActiveEnquiryId(origId + "?reload=" + Date.now());
      setTimeout(() => {
        setActiveEnquiryId(origId);
      }, 50);
    } catch (err: any) {
      console.error("Failed to update status:", err.message);
      alert("Error updating status: " + err.message);
    }
  };

  // Helper: map DB status to Badge info
  const getStatusDetails = (status: string) => {
    switch (status) {
      case "new":
        return {
          label: "New",
          bgColor: "bg-blue-50 text-blue-700 border border-blue-200/50",
          dotColor: "bg-blue-500"
        };
      case "contacted":
        return {
          label: "Contacted",
          bgColor: "bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/10",
          dotColor: "bg-[#FF5B26]"
        };
      case "qualified":
        return {
          label: "Qualified",
          bgColor: "bg-purple-50 text-purple-700 border border-purple-200/50",
          dotColor: "bg-purple-500"
        };
      case "negotiating":
      case "vibe_check_sent":
        return {
          label: "Vibe Check Sent",
          bgColor: "bg-amber-50 text-amber-700 border border-amber-200/50",
          dotColor: "bg-amber-500"
        };
      case "converted":
      case "confirmed":
        return {
          label: "Confirmed",
          bgColor: "bg-emerald-50 text-emerald-700 border border-emerald-200/50",
          dotColor: "bg-emerald-500"
        };
      case "lost":
      case "not_a_fit":
      default:
        return {
          label: "Not a Fit",
          bgColor: "bg-zinc-100 text-zinc-700 border border-zinc-200/50",
          dotColor: "bg-zinc-500"
        };
    }
  };

  // Helper: map expert to lead
  const getExpertForLead = (lead: any) => {
    if (lead.assigned_expert) return lead.assigned_expert;
    
    switch (lead.status) {
      case "contacted":
        return "Priya K. (Your Trip Expert)";
      case "new":
        return "Not Assigned";
      case "qualified":
        return "Rohit S.";
      case "negotiating":
      case "vibe_check_sent":
        return "Ananya M.";
      case "lost":
      case "not_a_fit":
        return "Closed";
      default:
        return "Not Assigned";
    }
  };

  // Helper: relative time
  const getRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date("2026-06-16T10:44:38+05:30");
    const diffMs = now.getTime() - date.getTime();
    
    if (isNaN(diffMs) || diffMs < 0) {
      return "Just now";
    }
    
    const diffMins = Math.floor(diffMs / (1000 * 60));
    if (diffMins < 60) {
      return `${diffMins} ${diffMins === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    if (diffHours < 24) {
      return `${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays < 7) {
      return `${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
    }
    
    const diffWeeks = Math.floor(diffDays / 7);
    if (diffWeeks < 4) {
      return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weeks'} ago`;
    }
    
    const diffMonths = Math.floor(diffDays / 30);
    return `${diffMonths} ${diffMonths === 1 ? 'month' : 'months'} ago`;
  };

  // Helper: absolute date
  const getAbsoluteDate = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return "10 May, 2026";
    
    const day = date.getDate();
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const month = months[date.getMonth()];
    const year = date.getFullYear();
    
    return `${day} ${month}, ${year}`;
  };

  // Helper: trip dates range
  const getTripDatesRange = (trip: any) => {
    if (!trip.start_date) return "Flexible Dates";
    
    const start = new Date(trip.start_date);
    if (isNaN(start.getTime())) return "Flexible Dates";
    
    let durationDays = 7;
    if (trip.duration) {
      const match = trip.duration.match(/(\d+)/);
      if (match) {
        durationDays = parseInt(match[1]);
      }
    }
    
    const end = new Date(start);
    end.setDate(start.getDate() + durationDays);
    
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const startDay = start.getDate();
    const startMonth = months[start.getMonth()];
    const endDay = end.getDate();
    const endMonth = months[end.getMonth()];
    const year = start.getFullYear();
    
    if (start.getMonth() === end.getMonth()) {
      return `${startDay} – ${endDay} ${startMonth}, ${year}`;
    } else {
      return `${startDay} ${startMonth} – ${endDay} ${endMonth}, ${year}`;
    }
  };
  
  const [prefFilter, setPrefFilter] = useState("All Preferences");
  const [monthFilter, setMonthFilter] = useState("Any Month");
  const [typeFilter, setTypeFilter] = useState("All Types");
  const [regionFilter, setRegionFilter] = useState("Any");
  const [budgetFilter, setBudgetFilter] = useState("Any Budget");
  const [isFiltered, setIsFiltered] = useState(false);

  const sliderRef = useRef<HTMLDivElement>(null);

  const scrollSlider = () => {
    if (sliderRef.current) {
      sliderRef.current.scrollBy({ left: 300, behavior: "smooth" });
    }
  };

  // Dynamic statistics calculation
  const uniqueCountries = new Set<string>();
  leads.forEach(lead => {
    if (lead.trips && lead.trips.destination) {
      const parts = lead.trips.destination.split(",");
      const country = parts[parts.length - 1].trim();
      if (country) {
        uniqueCountries.add(country);
      }
    }
  });
  const countriesCount = uniqueCountries.size;

  const enquiriesCount = leads.filter(
    lead => (lead.status === 'new' || lead.status === 'contacted' || lead.status === 'qualified')
  ).length;

  // Wishlist local state
  const [wishlist, setWishlist] = useState<string[]>([]);

  // Load wishlist from database if logged in, else localStorage
  useEffect(() => {
    const loadWishlist = async () => {
      if (currentUserId) {
        const supabaseClient = createClient();
        const { data: profile, error } = await supabaseClient
          .from("profiles")
          .select("wishlist")
          .eq("id", currentUserId)
          .maybeSingle();

        if (!error && profile?.wishlist) {
          setWishlist(profile.wishlist);
          return;
        }
      }

      // Fallback to localStorage
      if (typeof window !== "undefined") {
        const saved = localStorage.getItem("nomichi_wishlist");
        if (saved) {
          try {
            setWishlist(JSON.parse(saved));
          } catch (e) {
            console.error("Failed to parse saved wishlist:", e);
          }
        } else {
          // Pre-populate with some seeded trip IDs to match design on first load
          const defaultWishlist = trips.slice(0, 3).map(t => t.id);
          setWishlist(defaultWishlist);
          localStorage.setItem("nomichi_wishlist", JSON.stringify(defaultWishlist));
        }
      }
    };

    loadWishlist();
  }, [currentUserId, trips]);

  const toggleWishlist = async (tripId: string) => {
    const updated = wishlist.includes(tripId)
      ? wishlist.filter(id => id !== tripId)
      : [...wishlist, tripId];
    
    setWishlist(updated);
    localStorage.setItem("nomichi_wishlist", JSON.stringify(updated));

    if (currentUserId) {
      const supabaseClient = createClient();
      await supabaseClient
        .from("profiles")
        .update({ wishlist: updated })
        .eq("id", currentUserId);
    }
  };

  // 1. Upcoming Adventures (leads with status = 'converted' or 'negotiating')
  const upcomingAdventures = leads
    .filter(lead => (lead.status === 'converted' || lead.status === 'negotiating') && lead.trips)
    .map(lead => {
      const trip = lead.trips;
      
      let statusLabel = "Confirmed";
      let statusColor = "bg-emerald-500";
      if (lead.status === "negotiating") {
        statusLabel = "Enquiry Submitted";
        statusColor = "bg-amber-500";
      }

      return {
        id: lead.id,
        title: trip.title,
        dates: trip.start_date ? new Date(trip.start_date).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "Flexible Dates",
        duration: "7 Days",
        status: statusLabel,
        statusColor: statusColor,
        image: trip.image_url || "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=400&q=80",
      };
    });

  // Journeys list directly mapped from database (no dummy fallbacks)
  const displayAdventures = upcomingAdventures;

  // 2. My Enquiries (leads where status is 'new', 'contacted', or 'qualified')
  const myEnquiries = leads
    .filter(lead => (lead.status === 'new' || lead.status === 'contacted' || lead.status === 'qualified') && lead.trips)
    .map(lead => {
      const trip = lead.trips;
      
      let statusLabel = "New";
      let statusColor = "bg-blue-500";
      
      if (lead.status === "contacted") {
        statusLabel = "Contacted";
        statusColor = "bg-orange-500";
      } else if (lead.status === "qualified") {
        statusLabel = "Qualified";
        statusColor = "bg-purple-500";
      }

      return {
        id: lead.id,
        title: trip.title,
        dates: trip.start_date ? new Date(trip.start_date).toLocaleDateString("en-US", { day: 'numeric', month: 'short', year: 'numeric' }) : "Flexible Dates",
        status: statusLabel,
        statusColor: statusColor,
        image: trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=150&q=80"
      };
    });

  // Enquiries list directly mapped from database (no dummy fallbacks)
  const displayEnquiries = myEnquiries;

  // 3. Recommended trips from actual open trips in the database
  const recommendedTrips = trips.map(trip => {
    let type = "Small Group";
    const titleLower = trip.title.toLowerCase();
    if (titleLower.includes("retreat")) type = "Cultural";
    else if (titleLower.includes("lagoon") || titleLower.includes("getaway")) type = "Relaxed";
    else if (titleLower.includes("sunset") || titleLower.includes("caldera")) type = "Leisurely";
    else if (titleLower.includes("fuji") || titleLower.includes("lights")) type = "Explorer";
    else if (titleLower.includes("skiing") || titleLower.includes("winter") || titleLower.includes("escape")) type = "Adventure";

    return {
      id: trip.id,
      title: trip.title,
      destination: trip.destination,
      type: type,
      duration: trip.duration || "7 Days",
      price: trip.price ? `₹${Number(trip.price).toLocaleString("en-IN")}` : "₹89,999",
      rating: trip.rating ? Number(trip.rating).toFixed(1) : "4.8",
      reviews: trip.reviews || 50,
      image: trip.image_url || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=300&q=80",
      start_date: trip.start_date
    };
  });

  // Trips list directly mapped from database (no dummy fallbacks)
  const displayRecommended = recommendedTrips;

  // Client-side filter functionality
  const activeRecommended = isFiltered 
    ? displayRecommended.filter(trip => {
        // 1. Month filter
        if (monthFilter !== "Any Month") {
          if (!trip.start_date) return false;
          const monthIndex = new Date(trip.start_date).getMonth();
          const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
          if (months[monthIndex] !== monthFilter) return false;
        }
        // 2. Trip Type filter
        if (typeFilter !== "All Types") {
          if (trip.type !== typeFilter) return false;
        }
        // 3. Region filter (In Country / Out Country)
        if (regionFilter !== "Any") {
          const isIndia = trip.destination.toLowerCase().includes("india");
          if (regionFilter === "In Country" && !isIndia) return false;
          if (regionFilter === "Out Country" && isIndia) return false;
        }
        // 4. Budget filter
        if (budgetFilter !== "Any Budget") {
          const priceVal = Number(trip.price?.replace(/[^0-9]/g, "")) || 0;
          if (budgetFilter === "Under ₹80,000" && priceVal >= 80000) return false;
          if (budgetFilter === "₹80,000 - ₹1,20,000" && (priceVal < 80000 || priceVal > 120000)) return false;
          if (budgetFilter === "Over ₹1,20,000" && priceVal <= 120000) return false;
        }
        // 5. Travel Preference filter
        if (prefFilter !== "All Preferences") {
          const titleLower = trip.title.toLowerCase();
          const destLower = trip.destination.toLowerCase();
          const prefLower = prefFilter.toLowerCase();
          
          if (prefLower === "solo traveller") {
            if (!titleLower.includes("retreat") && !titleLower.includes("escape") && !titleLower.includes("lagoon")) return false;
          } else if (prefLower === "adventure") {
            if (trip.type !== "Adventure" && !titleLower.includes("fuji") && !titleLower.includes("trek") && !titleLower.includes("lights")) return false;
          } else if (prefLower === "mountains") {
            if (!titleLower.includes("fuji") && !titleLower.includes("banff") && !destLower.includes("fuji") && !destLower.includes("canada") && !destLower.includes("leh") && !destLower.includes("himachal")) return false;
          } else if (prefLower === "nature") {
            if (!titleLower.includes("lagoon") && !titleLower.includes("retreat") && !titleLower.includes("banff") && !titleLower.includes("fuji")) return false;
          } else if (prefLower === "cultural") {
            if (trip.type !== "Cultural" && !titleLower.includes("temple") && !titleLower.includes("retreat")) return false;
          } else if (prefLower === "relaxed") {
            if (trip.type !== "Relaxed" && !titleLower.includes("sunset") && !titleLower.includes("lagoon")) return false;
          }
        }
        return true;
      })
    : displayRecommended;

  const filteredRecommended = activeRecommended.filter(trip => 
    trip.title.toLowerCase().includes(exploreSearch.toLowerCase()) ||
    (trip.destination && trip.destination.toLowerCase().includes(exploreSearch.toLowerCase()))
  );

  // 4. Saved trips (wishlist matched against database trips)
  const savedTripsList = trips
    .filter(trip => wishlist.includes(trip.id))
    .map(trip => ({
      id: trip.id,
      title: trip.title,
      image: trip.image_url || "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=150&q=80"
    }));

  // Saved list directly mapped from database (no dummy fallbacks)
  const displaySaved = savedTripsList;

  // 5. Messages (grouped by trip so the same enquiry group appears once)
  const displayMessageMap = new globalThis.Map<string, any>();
  leads.forEach((lead: any) => {
    const threadKey = getGroupThreadKey(lead);
    const leadTitle = getGroupThreadName(lead);
    const baseTime = new Date(lead.created_at || Date.now()).getTime();

    const upsertMessage = (message: any, messageTime: number) => {
      const existing = displayMessageMap.get(threadKey);
      if (!existing || messageTime >= existing.sortTime) {
        displayMessageMap.set(threadKey, {
          ...message,
          leadTitle,
          sortTime: messageTime
        });
      }
    };

    if (lead.lead_notes && Array.isArray(lead.lead_notes) && lead.lead_notes.length > 0) {
      lead.lead_notes.forEach((note: any) => {
        const noteTime = new Date(note.created_at || lead.created_at || Date.now()).getTime();
        upsertMessage(
          {
            id: note.id,
            sender: "Nomichi Team",
            time: new Date(note.created_at || lead.created_at).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
            text: note.content,
            avatarType: "team"
          },
          noteTime
        );
      });
    } else {
      upsertMessage(
        {
          id: `lead-init-${lead.id}`,
          sender: lead.name || "Traveler",
          time: new Date(lead.created_at || Date.now()).toLocaleDateString("en-US", { day: "numeric", month: "short" }),
          text: `New enquiry for ${leadTitle}`,
          avatarType: "group"
        },
        baseTime
      );
    }
  });
  const displayMessages = Array.from(displayMessageMap.values() as Iterable<any>)
    .sort((a, b) => (b.sortTime || 0) - (a.sortTime || 0))
    .slice(0, 3);

  const renderTripCard = (rec: any) => {
    return (
      <div 
        key={rec.id} 
        className="group bg-white rounded-[24px] border border-[#e7e1d5]/45 overflow-hidden shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col justify-between h-full cursor-pointer"
        onClick={(e) => {
          // If we clicked inside the wishlist button, do not navigate!
          if ((e.target as HTMLElement).closest("button")) return;
          router.push(`/trips/${rec.id}`);
        }}
      >
        <div className="h-44 relative overflow-hidden">
          <img 
            src={rec.image} 
            alt={rec.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
          {/* Wishlist toggle */}
          <button 
            onClick={() => toggleWishlist(rec.id)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/75 backdrop-blur-sm hover:bg-white text-nomichi-ink/75 hover:text-[#FF5B26] flex items-center justify-center shadow-sm transition-all duration-200 hover:scale-110"
            aria-label="Save Trip"
          >
            <Heart className={`w-4 h-4 ${wishlist.includes(rec.id) ? 'fill-current text-[#FF5B26]' : 'fill-none text-nomichi-white'}`} />
          </button>
        </div>
        <div className="p-5 space-y-3.5 flex-grow flex flex-col justify-between">
          <div>
            <h4 className="font-display font-bold text-sm text-nomichi-ink leading-snug line-clamp-2 min-h-[40px] group-hover:text-[#FF5B26] transition-colors duration-200">{rec.title}</h4>
            
            {/* Middle Row with Icons */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="bg-[#FAF8F4] text-nomichi-ink/60 px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold border border-[#e7e1d5]/30 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-[#FF5B26]/75 shrink-0" />
                <span>{rec.duration}</span>
              </span>
              <span className="bg-[#FAF8F4] text-nomichi-ink/60 px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold border border-[#e7e1d5]/30 shrink-0">
                <Plane className="w-3.5 h-3.5 text-[#FF5B26]/75 shrink-0" />
                <span>{rec.type}</span>
              </span>
              <span className="bg-[#FAF8F4] text-nomichi-ink/60 px-2 py-1 rounded-lg flex items-center gap-1 text-[10px] font-bold border border-[#e7e1d5]/30 max-w-[100px] shrink-0">
                <MapPin className="w-3.5 h-3.5 text-[#FF5B26]/75 shrink-0" />
                <span className="truncate">{rec.destination.split(",")[0]}</span>
              </span>
            </div>
          </div>
          
          {/* Bottom Row */}
          <div className="flex items-center justify-between pt-3 border-t border-[#e7e1d5]/30 mt-2">
            {/* Rating on bottom-left */}
            <div className="flex items-center gap-1 text-[11px] font-bold text-nomichi-ink">
              <Star className="w-3.5 h-3.5 fill-current text-nomichi-sand" />
              <span>{rec.rating} <span className="text-nomichi-ink/40 font-semibold">({rec.reviews})</span></span>
            </div>
            {/* Price on bottom-right */}
            <span className="text-xs font-extrabold text-[#FF5B26] bg-[#FFEFEA] px-2.5 py-1.5 rounded-lg border border-[#FF5B26]/10">{rec.price}</span>
          </div>
        </div>
      </div>
    );
  };
  const filteredThreads = chatThreads.filter(thread => {
    const matchesSearch = thread.name.toLowerCase().includes(chatSearchQuery.toLowerCase()) ||
                          thread.messages.some(m => m.content.toLowerCase().includes(chatSearchQuery.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (chatActiveTab === "all") {
      return thread.category !== "archived";
    }
    return thread.category === chatActiveTab;
  });

  const activeThread = chatThreads.find(t => t.id === activeThreadId);

  useEffect(() => {
    if (chatThreads.length === 0) {
      if (activeThreadId) setActiveThreadId("");
      return;
    }

    if (!activeThreadId || !chatThreads.some((thread) => thread.id === activeThreadId)) {
      setActiveThreadId(chatThreads[0].id);
    }
  }, [chatThreads, activeThreadId]);

  // Auto-scroll to bottom whenever messages update or thread changes
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeThread?.messages.length, activeThreadId]);

  if (currentView === "admin") {
    return <AdminView user={user} onBack={() => navigateToView("home")} />;
  }

  return (
    <div className="h-screen bg-[#FAF8F4] font-sans antialiased text-nomichi-ink flex w-full overflow-hidden">
      
      {/* 1. LEFT SIDEBAR */}
      <aside className="w-[280px] h-screen bg-nomichi-white border-r border-[#e7e1d5]/50 hidden xl:flex flex-col justify-between shrink-0 p-6 sticky top-0">
        <div className="space-y-8 flex-grow">
          {/* Logo Section */}
          <div className="flex flex-col items-start px-2">
            <img src="/logo.png" alt="Nomichi Logo" className="h-10 w-auto object-contain" />
            <span className="text-[10px] font-bold text-nomichi-sand tracking-[0.25em] uppercase mt-2.5">
              Wander • Connect • Belong
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1">
            <button 
              onClick={() => { navigateToView("home"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all ${currentView === 'home' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <Home className="w-5 h-5 stroke-[2px]" />
              Home
            </button>
            <button 
              onClick={() => { navigateToView("explore"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all ${currentView === 'explore' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <Compass className="w-5 h-5 stroke-[2px]" />
              Explore Trips
            </button>
            <button 
              onClick={() => { navigateToView("enquiries"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all ${currentView === 'enquiries' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <ClipboardList className="w-5 h-5 stroke-[2px]" />
              My Enquiries
            </button>
            <button 
              onClick={() => { navigateToView("journeys"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all ${currentView === 'journeys' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <Map className="w-5 h-5 stroke-[2px]" />
              My Journeys
            </button>
            <button 
              onClick={() => { navigateToView("wishlist"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all ${currentView === 'wishlist' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <Heart className="w-5 h-5 stroke-[2px]" />
              Wishlist
            </button>
            <button 
              onClick={() => { navigateToView("messages"); setMobileMenuOpen(false); }}
              className={`flex items-center justify-between px-4 py-3 text-sm font-semibold text-left rounded-2xl w-full transition-all ${currentView === 'messages' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <span className="flex items-center gap-3.5">
                <MessageSquare className="w-5 h-5 stroke-[2px]" />
                Messages
              </span>
              {displayMessages.length > 0 && (
                <span className="w-5 h-5 rounded-full bg-nomichi-rust text-nomichi-white text-[10px] font-bold flex items-center justify-center">
                  {displayMessages.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => { navigateToView("profile"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all ${currentView === 'profile' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <UserIcon className="w-5 h-5 stroke-[2px]" />
              Profile
            </button>
            {user.role?.toUpperCase() === "ADMIN" && (
              <button 
                onClick={() => { navigateToView("admin"); setMobileMenuOpen(false); }}
                className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all text-nomichi-ink/75 hover:bg-[#FAF8F4] hover:text-nomichi-rust"
              >
                <Shield className="w-5 h-5 stroke-[2px]" />
                Admin Panel
              </button>
            )}
            <button 
              onClick={() => { navigateToView("settings"); setMobileMenuOpen(false); }}
              className={`flex items-center gap-3.5 px-4 py-3 text-sm font-semibold rounded-2xl w-full text-left transition-all ${currentView === 'settings' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust'}`}
            >
              <Settings className="w-5 h-5 stroke-[2px]" />
              Settings
            </button>
          </nav>
        </div>

        {/* Bottom fixed area */}
        <div className="space-y-4 pt-6 border-t border-[#e7e1d5]/50 mt-6 animate-in fade-in duration-300">
          <nav className="space-y-1">
            <a href="#" className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-nomichi-rust rounded-2xl transition-all">
              <HelpCircle className="w-5 h-5 stroke-[2px]" />
              Help & Support
            </a>
            <a href="/auth/signout" className="flex items-center gap-3.5 px-4 py-3 text-sm font-semibold text-nomichi-rust hover:bg-nomichi-rust/5 rounded-2xl transition-all">
              <LogOut className="w-5 h-5 stroke-[2.2px]" />
              Logout
            </a>
          </nav>

          {/* Refer Promo Card */}
          <div className="bg-gradient-to-br from-[#FFECE5] to-[#FFF6F4] rounded-2xl p-5 border border-[#FF5B26]/15 relative overflow-hidden flex flex-col justify-between h-[170px] shadow-sm">
            {/* Background Image Overlay */}
            <img 
              src="https://images.unsplash.com/photo-1533105079780-92b9be482077?auto=format&fit=crop&w=250&q=80" 
              alt="Refer promo background" 
              className="absolute inset-0 w-full h-full object-cover brightness-95 opacity-20 mix-blend-overlay pointer-events-none"
            />
            {/* Ambient background blur circles */}
            <div className="absolute top-[-15px] right-[-15px] w-20 h-20 bg-[#FF5B26]/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute bottom-[-20px] left-[-20px] w-16 h-16 bg-nomichi-sand/15 rounded-full blur-lg pointer-events-none" />
            
            <div className="relative z-10 space-y-1">
              <h4 className="text-xs font-extrabold text-[#FF5B26] tracking-tight">Refer & Travel Together</h4>
              <p className="text-[10px] text-nomichi-ink/65 leading-relaxed font-bold">
                Invite friends for rewards.
              </p>
            </div>
            <button className="bg-white hover:bg-nomichi-rust/5 text-[#FF5B26] border border-[#FF5B26]/30 text-[10px] font-extrabold py-2 px-4 rounded-xl transition-all duration-300 flex items-center justify-center gap-1 relative z-10 w-fit shadow-sm hover:scale-102">
              Invite Now →
            </button>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        
        {/* Top Header */}
        <header className="bg-nomichi-white border-b border-nomichi-sand/10 px-6 lg:px-8 py-4 flex items-center justify-between sticky top-0 z-30">
          
          {/* Mobile Menu Button */}
          <div className="flex items-center gap-3 xl:hidden">
            <button 
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 hover:bg-nomichi-sand/10 rounded-lg text-nomichi-ink focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
            <img src="/logo.png" alt="Nomichi Logo" className="h-8 w-auto object-contain" />
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-nomichi-ink/70">
            <button onClick={() => navigateToView("explore")} className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider">Destinations</button>
            <button onClick={() => navigateToView("explore")} className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider">Trips</button>
            <button onClick={() => navigateToView("home")} className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider">About Us</button>
            <button onClick={() => navigateToView("home")} className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider">How It Works</button>
            <button onClick={() => navigateToView("home")} className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider">Community</button>
            <button onClick={() => navigateToView("home")} className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider">Blog</button>
          </nav>

          {/* Header Action Controls */}
          <div className="flex items-center gap-6 ml-auto xl:ml-0">
            {/* Notifications */}
            <div className="relative" ref={notificationDropdownRef}>
              <button
                aria-label="Notifications"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="relative p-2 text-nomichi-ink/70 hover:text-nomichi-rust hover:bg-[#FAF8F4] rounded-full transition-all border border-[#e7e1d5]/60 bg-[#FFFFFF] shrink-0 cursor-pointer"
              >
                <Bell className="w-5 h-5 stroke-[1.8px]" />
                {notificationUnreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-nomichi-rust rounded-full text-[9px] font-black flex items-center justify-center text-nomichi-white shadow-sm animate-pulse">
                    {notificationUnreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-3xl border border-[#e7e1d5]/60 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="p-4.5 border-b border-[#e7e1d5]/30 flex items-center justify-between bg-[#FAF8F4]/30">
                    <span className="text-xs font-black uppercase tracking-wide text-nomichi-ink/50">
                      Notifications
                    </span>
                    {notificationUnreadCount > 0 && (
                      <button
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-bold text-[#FF5B26] hover:underline cursor-pointer border-0 bg-transparent"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-[#e7e1d5]/20">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center text-xs text-nomichi-ink/40 font-semibold">
                        No notifications yet.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => handleMarkAsRead(n.id)}
                          className={`p-4 text-left transition-colors cursor-pointer hover:bg-[#FAF8F4]/40 flex items-start gap-3 ${
                            !n.is_read ? "bg-[#FAF8F4]/70" : ""
                          }`}
                        >
                          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                            n.priority === "Critical" ? "bg-red-500" :
                            n.priority === "High" ? "bg-amber-500" :
                            n.priority === "Medium" ? "bg-blue-500" : "bg-slate-400"
                          }`} />
                          <div className="space-y-0.5 min-w-0 flex-1">
                            <div className="text-xs font-bold text-nomichi-ink flex items-center justify-between gap-2">
                              <span className="truncate">{n.title}</span>
                              <span className="text-[9px] text-nomichi-ink/40 font-bold shrink-0">
                                {new Date(n.created_at).toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit"
                                })}
                              </span>
                            </div>
                            <p className="text-[11px] text-nomichi-ink/70 leading-relaxed font-medium">
                              {n.body}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar / Dropdown */}
            <button 
              onClick={() => navigateToView("profile")}
              className="flex items-center gap-3 text-left hover:opacity-90 transition-opacity bg-transparent border-0 cursor-pointer p-0"
            >
              <div className="w-9 h-9 rounded-full bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/10 flex items-center justify-center font-bold text-sm shrink-0 overflow-hidden">
                {profileData?.avatar_url ? (
                  <img 
                    src={profileData.avatar_url} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  formatFriendlyName(user.fullName).charAt(0).toUpperCase() || "T"
                )}
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-bold text-nomichi-ink leading-none mb-0.5">
                  {formatFullName(user.fullName)}
                </span>
                <span className="text-[10px] font-semibold text-nomichi-ink/50 leading-none">
                  Explorer Member
                </span>
              </div>
              <ChevronDown className="w-4 h-4 text-nomichi-ink/50" />
            </button>
          </div>
        </header>

        {/* Mobile menu panel */}
        {mobileMenuOpen && (
          <div className="xl:hidden bg-nomichi-white border-b border-nomichi-sand/15 p-5 space-y-4 absolute top-[68px] left-0 w-full z-40 shadow-xl transition-all">
            <nav className="flex flex-col gap-3 font-semibold text-sm">
              <button 
                onClick={() => { navigateToView("home"); setMobileMenuOpen(false); }}
                className={`px-3 py-2.5 rounded-xl flex items-center gap-3 text-left w-full ${currentView === 'home' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/70'}`}
              >
                <Home className="w-4.5 h-4.5" /> Home
              </button>
              <button 
                onClick={() => { navigateToView("explore"); setMobileMenuOpen(false); }}
                className={`px-3 py-2.5 rounded-xl flex items-center gap-3 text-left w-full ${currentView === 'explore' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/70'}`}
              >
                <Compass className="w-4.5 h-4.5" /> Explore Trips
              </button>
              <button 
                onClick={() => { navigateToView("enquiries"); setMobileMenuOpen(false); }}
                className={`px-3 py-2.5 rounded-xl flex items-center gap-3 text-left w-full ${currentView === 'enquiries' ? 'bg-nomichi-rust/10 text-nomichi-rust' : 'text-nomichi-ink/70'}`}
              >
                <ClipboardList className="w-4.5 h-4.5" /> My Enquiries
              </button>
              {user.role?.toUpperCase() === "ADMIN" && (
                <button 
                  onClick={() => { navigateToView("admin"); setMobileMenuOpen(false); }}
                  className="px-3 py-2.5 rounded-xl flex items-center gap-3 text-left w-full text-nomichi-ink/70 hover:bg-[#FAF8F4] hover:text-[#FF5B26]"
                >
                  <Shield className="w-4.5 h-4.5" /> Admin Panel
                </button>
              )}
              <a href="/auth/signout" className="px-3 py-2.5 rounded-xl text-nomichi-rust flex items-center gap-3 font-bold text-left">
                <LogOut className="w-4.5 h-4.5" /> Logout
              </a>
              <div className="h-px bg-[#e7e1d5]/40 my-2" />
              <div className="flex flex-col gap-3.5 pl-3 pt-1">
                <button 
                  onClick={() => { navigateToView("explore"); setMobileMenuOpen(false); }}
                  className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70"
                >
                  Destinations
                </button>
                <button 
                  onClick={() => { navigateToView("explore"); setMobileMenuOpen(false); }}
                  className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70"
                >
                  Trips
                </button>
                <button 
                  onClick={() => { navigateToView("home"); setMobileMenuOpen(false); }}
                  className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70"
                >
                  About Us
                </button>
                <button 
                  onClick={() => { navigateToView("home"); setMobileMenuOpen(false); }}
                  className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70"
                >
                  How It Works
                </button>
                <button 
                  onClick={() => { navigateToView("home"); setMobileMenuOpen(false); }}
                  className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70"
                >
                  Community
                </button>
                <button 
                  onClick={() => { navigateToView("home"); setMobileMenuOpen(false); }}
                  className="hover:text-[#FF5B26] transition-colors cursor-pointer bg-transparent border-0 font-bold text-xs uppercase tracking-wider text-left text-nomichi-ink/70"
                >
                  Blog
                </button>
              </div>
            </nav>
          </div>
        )}

        {/* Main Content Dashboard Layout */}
        <div className="p-6 lg:p-8 space-y-8 max-w-[1300px] w-full mx-auto">

          {currentView === "home" ? (
            <>
              {/* 1. HERO BANNER */}
              <div className="relative rounded-[28px] overflow-hidden h-[240px] md:h-[280px] flex items-center px-6 sm:px-12 text-nomichi-white shadow-md">
                {/* Background */}
                <div className="absolute inset-0 z-0">
                  <img 
                    src="/nomichi-hero.png" 
                    alt="Banner Background" 
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-nomichi-ink/75 via-nomichi-ink/40 to-transparent" />
                </div>
                {/* Content text */}
                <div className="relative z-10 space-y-3 max-w-lg">
                  <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-nomichi-cream">
                    Welcome back, {firstName}! 👋
                  </h1>
                  <p className="text-sm sm:text-base text-nomichi-cream/85 font-light leading-relaxed">
                    Where will your next adventure take you?
                  </p>
                  <button 
                    onClick={() => navigateToView("explore")}
                    className="bg-nomichi-rust hover:bg-nomichi-rust/95 text-nomichi-white font-semibold text-xs py-2.5 px-5 rounded-full transition-colors shadow-lg"
                  >
                    Explore Trips
                  </button>
                </div>
              </div>

              {/* 2. FIND YOUR PERFECT TRIP (FILTER WIDGET CARD) */}
              <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-nomichi-ink">Find your perfect trip</h3>
                  {isFiltered && (
                    <button 
                      onClick={() => {
                        setPrefFilter("All Preferences");
                        setMonthFilter("Any Month");
                        setTypeFilter("All Types");
                        setRegionFilter("Any");
                        setBudgetFilter("Any Budget");
                        setIsFiltered(false);
                      }}
                      className="text-xs font-bold text-nomichi-rust hover:underline bg-transparent border-0 cursor-pointer"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 items-end">
                  {/* Preference dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-nomichi-ink/55 uppercase tracking-wider">Travel Preference</label>
                    <div className="relative flex items-center">
                      <select 
                        value={prefFilter}
                        onChange={(e) => setPrefFilter(e.target.value)}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-nomichi-rust cursor-pointer appearance-none"
                      >
                        <option value="All Preferences">All Preferences</option>
                        <option value="Solo Traveller">Solo Traveller</option>
                        <option value="Adventure">Adventure</option>
                        <option value="Mountains">Mountains</option>
                        <option value="Nature">Nature</option>
                        <option value="Small Groups">Small Groups</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Month dropdown with calendar icon */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-nomichi-ink/55 uppercase tracking-wider">Preferred Month</label>
                    <div className="relative flex items-center">
                      <Calendar className="w-3.5 h-3.5 text-nomichi-ink/40 absolute left-3 pointer-events-none" />
                      <select 
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-9 pr-8 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-nomichi-rust cursor-pointer appearance-none"
                      >
                        <option value="Any Month">Any Month</option>
                        <option value="January">January</option>
                        <option value="February">February</option>
                        <option value="March">March</option>
                        <option value="April">April</option>
                        <option value="May">May</option>
                        <option value="June">June</option>
                        <option value="July">July</option>
                        <option value="August">August</option>
                        <option value="September">September</option>
                        <option value="October">October</option>
                        <option value="November">November</option>
                        <option value="December">December</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Trip Type dropdown */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-nomichi-ink/55 uppercase tracking-wider">Trip Type</label>
                    <div className="relative flex items-center">
                      <select 
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-nomichi-rust cursor-pointer appearance-none"
                      >
                        <option value="All Types">All Types</option>
                        <option value="Cultural">Cultural</option>
                        <option value="Relaxed">Relaxed</option>
                        <option value="Leisurely">Leisurely</option>
                        <option value="Explorer">Explorer</option>
                        <option value="Adventure">Adventure</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* In Country / Out Country */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-nomichi-ink/55 uppercase tracking-wider">Location</label>
                    <div className="relative flex items-center">
                      <select 
                        value={regionFilter}
                        onChange={(e) => setRegionFilter(e.target.value)}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-nomichi-rust cursor-pointer appearance-none"
                      >
                        <option value="Any">Any Location</option>
                        <option value="In Country">In Country</option>
                        <option value="Out Country">Out Country</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Budget Range */}
                  <div className="space-y-1.5">
                    <label className="block text-[10px] font-bold text-nomichi-ink/55 uppercase tracking-wider">Budget Range</label>
                    <div className="relative flex items-center">
                      <select 
                        value={budgetFilter}
                        onChange={(e) => setBudgetFilter(e.target.value)}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-3 pr-8 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none focus:border-nomichi-rust cursor-pointer appearance-none"
                      >
                        <option value="Any Budget">Any Budget</option>
                        <option value="Under ₹80,000">Under ₹80,000</option>
                        <option value="₹80,000 - ₹1,20,000">₹80,000 - ₹1,20,000</option>
                        <option value="Over ₹1,20,000">Over ₹1,20,000</option>
                      </select>
                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40 absolute right-3 pointer-events-none" />
                    </div>
                  </div>

                  {/* Search Button */}
                  <button 
                    onClick={() => setIsFiltered(true)}
                    className="w-full bg-nomichi-rust hover:bg-[#b04b1e] text-nomichi-white text-xs font-bold py-2.5 rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 h-[38px] cursor-pointer"
                  >
                    Search Trips
                  </button>
                </div>
              </div>


              {/* 3. RECOMMENDED FOR YOU (Only show the first 6 trips in horizontal slider) */}
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <h3 className="text-lg font-bold text-nomichi-ink tracking-tight">Recommended For You</h3>
                  <button 
                    onClick={() => navigateToView("explore")}
                    className="text-xs font-semibold text-nomichi-rust hover:underline flex items-center gap-1 bg-transparent border-0 cursor-pointer"
                  >
                    View all <ChevronDown className="w-3.5 h-3.5 -rotate-90" />
                  </button>
                </div>

                 {/* Horizontal Scroll Slider of recommended cards */}
                <div className="relative group/slider">
                  {filteredRecommended.length > 0 ? (
                    <>
                      <div 
                        ref={sliderRef}
                        className="flex gap-6 overflow-x-auto snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] pb-2 scroll-smooth"
                      >
                        {filteredRecommended.slice(0, 6).map((rec) => (
                          <div 
                            key={rec.id} 
                            className="w-[280px] sm:w-[310px] shrink-0 snap-start"
                          >
                            {renderTripCard(rec)}
                          </div>
                        ))}
                      </div>

                      {/* Slider Scroll Right Chevron */}
                      <button 
                        onClick={scrollSlider}
                        className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white shadow-lg border border-[#e7e1d5]/50 flex items-center justify-center hover:bg-[#FAF8F4] transition-all cursor-pointer text-nomichi-rust hidden sm:flex hover:scale-105"
                        aria-label="Scroll right"
                      >
                        <ChevronDown className="w-4 h-4 -rotate-90 stroke-[2.5px]" />
                      </button>
                    </>
                  ) : (
                    <div className="border border-dashed border-[#e7e1d5]/60 rounded-3xl p-12 text-center bg-white shadow-sm">
                      <Compass className="w-8 h-8 text-nomichi-ink/30 mx-auto mb-3" />
                      <h4 className="font-bold text-sm text-nomichi-ink mb-1">No trips available</h4>
                      <p className="text-xs text-nomichi-ink/50 leading-relaxed max-w-xs mx-auto font-medium">
                        Check back later or adjust your filters to explore new destinations.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* 4. BEIGE TRUST FOOTER (4 columns of trust benefits) */}
              <div className="bg-[#F5F1E8] rounded-[24px] border border-[#e7e1d5]/50 p-6 lg:p-8 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  {/* Trust Column 1 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                      <Compass className="w-5 h-5 stroke-[2px]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-nomichi-ink">Expertly Curated</h4>
                      <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                        Hand-crafted journeys designed by local experts.
                      </p>
                    </div>
                  </div>

                  {/* Trust Column 2 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                      <ShieldCheck className="w-5 h-5 stroke-[2px]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-nomichi-ink">Trusted & Secure</h4>
                      <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                        100% verified experiences and secure booking guarantee.
                      </p>
                    </div>
                  </div>

                  {/* Trust Column 3 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                      <Headphones className="w-5 h-5 stroke-[2px]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-nomichi-ink">24/7 Support</h4>
                      <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                        Travel support team always by your side, anywhere.
                      </p>
                    </div>
                  </div>

                  {/* Trust Column 4 */}
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-nomichi-rust/10 flex items-center justify-center text-nomichi-rust shrink-0">
                      <Tag className="w-5 h-5 stroke-[2px]" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-xs font-bold text-nomichi-ink">Best Price Promise</h4>
                      <p className="text-[10px] text-nomichi-ink/50 leading-relaxed font-semibold">
                        Premium experiences at guaranteed transparent pricing.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          ) : currentView === "explore" ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Explore Destinations</h2>
                <p className="text-xs text-nomichi-ink/50 font-medium">Browse our full catalog of hand-crafted group journeys.</p>
              </div>
              
              <div className="flex items-center gap-2.5 bg-nomichi-white border border-[#e7e1d5]/60 rounded-2xl px-4 py-3 max-w-md shadow-sm">
                <Search className="w-5 h-5 text-nomichi-rust" />
                <input 
                  type="text" 
                  placeholder="Search by country, city or trip name..." 
                  className="bg-transparent text-sm font-semibold text-nomichi-ink placeholder-nomichi-ink/40 focus:outline-none w-full"
                  value={exploreSearch}
                  onChange={(e) => setExploreSearch(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                {filteredRecommended.map((rec) => renderTripCard(rec))}
              </div>
              {filteredRecommended.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-sm font-medium text-nomichi-ink/50">
                    {exploreSearch ? `No trips matching "${exploreSearch}" found.` : "No trips found."}
                  </p>
                </div>
              )}
            </div>
          ) : currentView === "enquiries" ? (
            <div className="space-y-6 animate-in fade-in duration-300 pb-12">
              
              {/* Breadcrumbs */}
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-nomichi-ink/40 tracking-wider uppercase">
                <button onClick={() => navigateToView("home")} className="hover:text-[#FF5B26] transition-colors">Home</button>
                <span>&gt;</span>
                <span className="text-nomichi-ink/75">My Enquiries</span>
              </div>

              {/* Header section with Title and New Enquiry button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <h2 className="text-3xl font-display font-extrabold text-nomichi-ink tracking-tight">My Enquiries</h2>
                  <p className="text-xs text-nomichi-ink/50 font-medium">Track all your trip enquiries and their current status.</p>
                </div>
                <button 
                  onClick={() => navigateToView("explore")}
                  className="bg-[#FF5B26] hover:bg-[#E04B1B] text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-1.5 transition-all shadow-md active:scale-[0.98] w-fit shrink-0 tracking-wider"
                >
                  New Enquiry
                  <Plus className="w-4.5 h-4.5 stroke-[2.5px]" />
                </button>
              </div>

              {/* Filters Box */}
              <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-5 items-end">
                  
                  {/* Search */}
                  <div className="lg:col-span-3 space-y-1.5">
                    <label className="text-[11px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Search</label>
                    <div className="relative">
                      <Search className="w-4 h-4 text-nomichi-ink/35 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Search by trip or destination..."
                        value={enquirySearch}
                        onChange={(e) => {
                          setEnquirySearch(e.target.value);
                          setEnquiryPage(1);
                        }}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-10 pr-4 py-2.5 text-xs font-semibold text-nomichi-ink placeholder-nomichi-ink/35 focus:outline-none focus:ring-1 focus:ring-[#FF5B26]/50 focus:border-[#FF5B26]/50 transition-all"
                      />
                    </div>
                  </div>

                  {/* Status Dropdown */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Status</label>
                    <div className="relative">
                      <select 
                        value={enquiryStatus}
                        onChange={(e) => {
                          setEnquiryStatus(e.target.value);
                          setEnquiryPage(1);
                        }}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none focus:ring-1 focus:ring-[#FF5B26]/50 focus:border-[#FF5B26]/50 transition-all cursor-pointer appearance-none"
                      >
                        <option value="All Status">All Status</option>
                        <option value="New">New</option>
                        <option value="Contacted">Contacted</option>
                        <option value="Qualified">Qualified</option>
                        <option value="Vibe Check Sent">Vibe Check Sent</option>
                        <option value="Not a Fit">Not a Fit</option>
                      </select>
                      <ChevronDown className="w-4 h-4 text-nomichi-ink/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* Trip Dropdown */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Trip</label>
                    <div className="relative">
                      <select 
                        value={enquiryTrip}
                        onChange={(e) => {
                          setEnquiryTrip(e.target.value);
                          setEnquiryPage(1);
                        }}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none focus:ring-1 focus:ring-[#FF5B26]/50 focus:border-[#FF5B26]/50 transition-all cursor-pointer appearance-none"
                      >
                        <option value="All Trips">All Trips</option>
                        {Array.from(new Set(leads.map(l => l.trips?.title).filter(Boolean))).map((title: any) => (
                          <option key={title} value={title}>{title}</option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-nomichi-ink/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>

                  {/* From Date */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">From Date</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-nomichi-ink/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="date"
                        value={enquiryFromDate}
                        onChange={(e) => {
                          setEnquiryFromDate(e.target.value);
                          setEnquiryPage(1);
                        }}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-10 pr-3 py-2 text-xs font-semibold text-nomichi-ink focus:outline-none focus:ring-1 focus:ring-[#FF5B26]/50 focus:border-[#FF5B26]/50 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* To Date */}
                  <div className="lg:col-span-2 space-y-1.5">
                    <label className="text-[11px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">To Date</label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-nomichi-ink/35 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      <input 
                        type="date"
                        value={enquiryToDate}
                        onChange={(e) => {
                          setEnquiryToDate(e.target.value);
                          setEnquiryPage(1);
                        }}
                        className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl pl-10 pr-3 py-2 text-xs font-semibold text-nomichi-ink focus:outline-none focus:ring-1 focus:ring-[#FF5B26]/50 focus:border-[#FF5B26]/50 transition-all cursor-pointer"
                      />
                    </div>
                  </div>

                  {/* Clear Filters */}
                  <div className="lg:col-span-1 flex flex-col justify-end items-center lg:items-end h-full">
                    <span className="text-[10px] font-bold text-nomichi-ink/30 uppercase tracking-wider mb-2.5 hidden lg:block">Reset</span>
                    <button 
                      onClick={() => {
                        setEnquirySearch("");
                        setEnquiryStatus("All Status");
                        setEnquiryTrip("All Trips");
                        setEnquiryFromDate("");
                        setEnquiryToDate("");
                        setEnquiryPage(1);
                      }}
                      className="text-nomichi-rust hover:text-[#b04b1e] text-xs font-bold flex items-center gap-1 hover:underline transition-all py-2.5"
                    >
                      <span>Clear filters</span>
                      <X className="w-3.5 h-3.5 stroke-[2.5px]" />
                    </button>
                  </div>

                </div>
              </div>

              {/* Table / List Container */}
              <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] overflow-hidden shadow-sm">
                
                {/* Desktop View Table wrapper with scroll support for smaller devices */}
                <div className="w-full overflow-x-auto">
                  <div className="min-w-[850px]">
                    
                    {/* Table Header */}
                    <div className="grid grid-cols-12 gap-4 bg-[#FAF8F4] px-6 py-4 border-b border-[#e7e1d5]/40 text-[11px] font-bold text-nomichi-ink/40 uppercase tracking-wider">
                      <div className="col-span-4">Trip</div>
                      <div className="col-span-2">Enquiry Details</div>
                      <div className="col-span-2">Status</div>
                      <div className="col-span-2">Last Updated</div>
                      <div className="col-span-2 text-right">Action</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-[#e7e1d5]/30">
                      {(() => {
                        // Filters calculations
                        const filtered = leads.filter((lead) => {
                          const trip = lead.trips;
                          if (!trip) return false;

                          if (enquirySearch) {
                            const q = enquirySearch.toLowerCase();
                            const matchTitle = trip.title?.toLowerCase().includes(q);
                            const matchDest = trip.destination?.toLowerCase().includes(q);
                            if (!matchTitle && !matchDest) return false;
                          }

                          if (enquiryStatus !== "All Status") {
                            const badgeDetails = getStatusDetails(lead.status);
                            if (badgeDetails.label.toLowerCase() !== enquiryStatus.toLowerCase()) {
                              return false;
                            }
                          }

                          if (enquiryTrip !== "All Trips") {
                            if (trip.title !== enquiryTrip) return false;
                          }

                          if (enquiryFromDate) {
                            const fromDate = new Date(enquiryFromDate);
                            const leadDate = new Date(lead.created_at);
                            fromDate.setHours(0, 0, 0, 0);
                            leadDate.setHours(0, 0, 0, 0);
                            if (leadDate < fromDate) return false;
                          }

                          if (enquiryToDate) {
                            const toDate = new Date(enquiryToDate);
                            const leadDate = new Date(lead.created_at);
                            toDate.setHours(23, 59, 59, 999);
                            leadDate.setHours(0, 0, 0, 0);
                            if (leadDate > toDate) return false;
                          }

                          return true;
                        });

                        const totalCount = filtered.length;
                        const totalPgs = Math.ceil(totalCount / 5);
                        const currPage = Math.max(1, Math.min(enquiryPage, totalPgs || 1));
                        const startIdx = (currPage - 1) * 5;
                        const endIdx = startIdx + 5;
                        const paginated = filtered.slice(startIdx, endIdx);

                        return (
                          <>
                            {paginated.map((lead) => {
                              const trip = lead.trips;
                              if (!trip) return null;
                              
                              const statusObj = getStatusDetails(lead.status);
                              const expertName = getExpertForLead(lead);

                              // Formatted group details: e.g. "2 Adults • Couple"
                              const adultsStr = lead.group_size ? `${lead.group_size} ${lead.group_size === 1 ? 'Adult' : 'Adults'}` : '2 Adults';
                              const typeStr = lead.group_type ? (lead.group_type.charAt(0).toUpperCase() + lead.group_type.slice(1)) : 'Couple';
                              const groupDetails = `${adultsStr} • ${typeStr}`;

                              // Unique Enquiry ID representation: e.g. ENQ10001
                              const displayEnqId = lead.enquiry_id || `ENQ${lead.id ? String(lead.id).replace(/[^0-9]/g, '').slice(0, 5) || String(lead.id).slice(0, 5).toUpperCase() : '12345'}`;

                              return (
                                <div key={lead.id} className="grid grid-cols-12 gap-4 px-6 py-5 items-center hover:bg-[#FAF8F4]/30 transition-colors">
                                  
                                  {/* Trip Info */}
                                  <div className="col-span-4 flex items-center gap-4">
                                    <img 
                                      src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=150&q=80"} 
                                      alt={trip.title} 
                                      className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#e7e1d5]/30"
                                    />
                                    <div className="space-y-1 min-w-0">
                                      <h4 className="font-display font-bold text-sm text-nomichi-ink truncate leading-tight">{trip.title}</h4>
                                      <div className="flex items-center gap-1 text-[11px] text-nomichi-ink/50 font-medium">
                                        <MapPin className="w-3.5 h-3.5 text-[#FF5B26]/65 shrink-0" />
                                        <span className="truncate">{trip.destination}</span>
                                      </div>
                                      <div className="flex items-center gap-1 text-[11px] text-nomichi-ink/50 font-medium">
                                        <Calendar className="w-3.5 h-3.5 text-[#FF5B26]/65 shrink-0" />
                                        <span>{getTripDatesRange(trip)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Enquiry Details */}
                                  <div className="col-span-2 space-y-1 min-w-0">
                                    <span className="text-[10px] font-bold text-nomichi-ink/45 uppercase tracking-wider block">Enquiry ID</span>
                                    <span className="font-display font-extrabold text-sm text-nomichi-ink block leading-none">{displayEnqId}</span>
                                    <span className="text-[11px] text-nomichi-ink/60 font-semibold block">{groupDetails}</span>
                                  </div>

                                  {/* Status */}
                                  <div className="col-span-2 space-y-2">
                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusObj.bgColor}`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dotColor}`} />
                                      {statusObj.label}
                                    </div>
                                    <span className="text-[11px] text-nomichi-ink/50 font-bold block pl-1">{expertName}</span>
                                  </div>

                                  {/* Last Updated */}
                                  <div className="col-span-2 space-y-1 min-w-0">
                                    <span className="text-xs font-bold text-nomichi-ink block">{getRelativeTime(lead.created_at)}</span>
                                    <span className="text-[11px] text-nomichi-ink/40 font-semibold block">{getAbsoluteDate(lead.created_at)}</span>
                                  </div>

                                  {/* Action */}
                                  <div className="col-span-2 text-right">
                                    <button 
                                      onClick={() => navigateToView("enquiry_detail", lead.id)}
                                      className="inline-flex items-center justify-center border border-[#FF5B26]/30 hover:bg-[#FF5B26]/5 text-[#FF5B26] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm shrink-0 whitespace-nowrap active:scale-[0.97]"
                                    >
                                      View Details →
                                    </button>
                                  </div>

                                </div>
                              );
                            })}

                            {paginated.length === 0 && (
                              <div className="text-center py-16 px-6">
                                <ClipboardList className="w-12 h-12 text-[#FF5B26]/50 mx-auto mb-3" />
                                <h4 className="font-display font-bold text-base text-nomichi-ink">No enquiries found</h4>
                                <p className="text-xs text-nomichi-ink/50 mt-1 max-w-sm mx-auto leading-relaxed">
                                  No trip enquiries match your active filter settings. Try adjusting or clearing your filters to see more results!
                                </p>
                              </div>
                            )}

                            {/* Pagination Footer */}
                            {totalCount > 0 && (
                              <div className="bg-[#FAF8F4]/50 border-t border-[#e7e1d5]/40 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                                
                                {/* Item indicator */}
                                <span className="text-xs font-semibold text-nomichi-ink/50">
                                  Showing <span className="text-nomichi-ink font-bold">{startIdx + 1}</span> to <span className="text-nomichi-ink font-bold">{Math.min(endIdx, totalCount)}</span> of <span className="text-nomichi-ink font-bold">{totalCount}</span> {totalCount === 1 ? 'enquiry' : 'enquiries'}
                                </span>

                                {/* Page Numbers */}
                                {totalPgs > 1 && (
                                  <div className="flex items-center gap-1">
                                    
                                    {/* Prev */}
                                    <button 
                                      disabled={currPage === 1}
                                      onClick={() => setEnquiryPage(currPage - 1)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-nomichi-ink/50 hover:text-[#FF5B26] hover:bg-[#FF5B26]/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-nomichi-ink/50 transition-all"
                                    >
                                      <ChevronLeft className="w-4.5 h-4.5" />
                                    </button>

                                    {/* Page Links */}
                                    {Array.from({ length: totalPgs }).map((_, idx) => {
                                      const pg = idx + 1;
                                      const isActive = pg === currPage;
                                      return (
                                        <button
                                          key={pg}
                                          onClick={() => setEnquiryPage(pg)}
                                          className={`w-8 h-8 rounded-lg text-xs font-bold transition-all ${isActive ? 'bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/20' : 'text-nomichi-ink/60 hover:bg-[#FAF8F4] hover:text-nomichi-ink'}`}
                                        >
                                          {pg}
                                        </button>
                                      );
                                    })}

                                    {/* Next */}
                                    <button 
                                      disabled={currPage === totalPgs}
                                      onClick={() => setEnquiryPage(currPage + 1)}
                                      className="w-8 h-8 rounded-lg flex items-center justify-center text-nomichi-ink/50 hover:text-[#FF5B26] hover:bg-[#FF5B26]/5 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-nomichi-ink/50 transition-all"
                                    >
                                      <ChevronRight className="w-4.5 h-4.5" />
                                    </button>

                                  </div>
                                )}

                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

          ) : currentView === "enquiry_detail" ? (
            <div className="space-y-6 animate-in fade-in duration-300 pb-16">
              {(() => {
                const lead = selectedLead;
                if (!lead) {
                  return (
                    <div className="text-center py-16 bg-white rounded-[24px] border border-[#e7e1d5]/40 p-6 flex flex-col items-center">
                      <ClipboardList className="w-12 h-12 text-[#FF5B26]/50 mx-auto mb-3" />
                      <h4 className="font-display font-bold text-base text-nomichi-ink">Enquiry not found</h4>
                      <p className="text-xs text-nomichi-ink/50 mt-1 max-w-sm mx-auto leading-relaxed">
                        The requested enquiry details could not be loaded.
                      </p>
                      <button 
                        onClick={() => navigateToView("enquiries")}
                        className="mt-4 bg-[#FF5B26] hover:bg-[#E04B1B] text-white font-bold text-xs px-4 py-2 rounded-xl transition-all"
                      >
                        Back to Enquiries
                      </button>
                    </div>
                  );
                }

                const trip = lead.trips;
                if (!trip) return null;

                const statusObj = getStatusDetails(lead.status);
                const expertName = getExpertForLead(lead);

                // Enquiry ID representation
                const displayEnqId = lead.enquiry_id || `ENQ${lead.id ? String(lead.id).replace(/[^0-9]/g, '').slice(0, 5) || String(lead.id).slice(0, 5).toUpperCase() : '12345'}`;

                // Timeline step configuration
                const steps = [
                  { label: "New", statusKey: "new" },
                  { label: "Contacted", statusKey: "contacted" },
                  { label: "Qualified", statusKey: "qualified" },
                  { label: "Vibe Check Sent", statusKey: "negotiating" }, // mapped from negotiating
                  { label: "Confirmed", statusKey: "converted" }, // mapped from converted
                  { label: "Not a Fit", statusKey: "lost" } // mapped from lost
                ];

                const getStatusIndex = (status: string) => {
                  if (status === "new") return 0;
                  if (status === "contacted") return 1;
                  if (status === "qualified") return 2;
                  if (status === "negotiating" || status === "vibe_check_sent") return 3;
                  if (status === "converted" || status === "confirmed") return 4;
                  if (status === "lost" || status === "not_a_fit") return 5;
                  return 0;
                };

                const currentStatusIdx = getStatusIndex(lead.status);

                // Generate timeline log notes
                const formatLogTime = (dateStr: string, minutesOffset = 0) => {
                  const d = new Date(new Date(dateStr).getTime() + minutesOffset * 60 * 1000);
                  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                  const datePart = `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()}`;
                  const timePart = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
                  return `${datePart} at ${timePart}`;
                };

                const dbLogs = localNotes.map(n => ({
                  id: n.id,
                  sender: n.content.includes("Status updated to") ? "Admin" : "You",
                  avatarType: n.content.includes("Status updated to") ? "admin" : "traveler",
                  absoluteTime: formatLogTime(n.created_at),
                  text: n.content,
                  badge: n.content.includes("Status updated to") ? {
                    label: n.content.replace("Status updated to ", ""),
                    colorClass: "bg-orange-50 text-orange-700 border border-orange-200/50"
                  } : null,
                  timestamp: new Date(n.created_at).getTime()
                }));

                const fallbackLogs: any[] = [];

                // Merge and sort timeline items: newest first
                const allLogs = [...dbLogs, ...fallbackLogs].sort((a, b) => b.timestamp - a.timestamp);

                // Group details summary
                const adultsStr = lead.group_size ? `${lead.group_size} ${lead.group_size === 1 ? 'Adult' : 'Adults'}` : '2 Adults';
                const typeStr = lead.group_type ? (lead.group_type.charAt(0).toUpperCase() + lead.group_type.slice(1)) : 'Couple';
                const groupDetails = `${adultsStr} • ${typeStr}`;

                return (
                  <div className="space-y-6">
                    
                    {/* Breadcrumbs */}
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-nomichi-ink/40 tracking-wider uppercase">
                      <button onClick={() => navigateToView("home")} className="hover:text-[#FF5B26] transition-colors">Home</button>
                      <span>&gt;</span>
                      <button onClick={() => navigateToView("enquiries")} className="hover:text-[#FF5B26] transition-colors">My Enquiries</button>
                      <span>&gt;</span>
                      <span className="text-nomichi-ink/75">{displayEnqId}</span>
                    </div>

                    {/* Left Column (Details) and Right Column (Sidebar Summary) Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                      
                      {/* Main Details Panel (Left Column) */}
                      <div className="lg:col-span-8 space-y-6">
                        
                        {/* Header card with status and title */}
                        <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm space-y-4">
                          <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="space-y-2">
                              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${statusObj.bgColor}`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${statusObj.dotColor}`} />
                                {statusObj.label}
                              </div>
                              <h2 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">{trip.title}</h2>
                            </div>
                            
                            <div className="flex items-center gap-3 shrink-0">
                              <button onClick={() => window.print()} className="border border-[#FF5B26]/30 hover:bg-[#FF5B26]/5 text-[#FF5B26] font-bold text-xs px-4 py-2.5 rounded-xl transition-all shadow-sm flex items-center gap-1.5">
                                <Download className="w-4 h-4 stroke-[2.2px]" />
                                Download
                              </button>
                            </div>
                          </div>

                          {/* Info bar */}
                          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-3 border-t border-[#e7e1d5]/30 text-xs font-semibold text-nomichi-ink/50">
                            <span className="flex items-center gap-1">Enquiry ID: <span className="text-nomichi-ink font-bold">{displayEnqId}</span></span>
                            <span className="flex items-center gap-1">Enquired on: <span className="text-nomichi-ink font-bold">{formatLogTime(lead.created_at)}</span></span>
                            <span className="flex items-center gap-1">Via: <span className="text-nomichi-ink font-bold">Website</span></span>
                          </div>
                        </div>

                        {/* Progress Timeline Progress Bar */}
                        <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm">
                          <div className="relative flex justify-between items-center w-full px-4 sm:px-8">
                            
                            {/* Horizontal Line Background */}
                            <div className="absolute left-[10%] right-[10%] top-[14px] h-0.5 bg-zinc-100 -z-0" />
                            {/* Horizontal Line Completed Progress */}
                            <div 
                              className="absolute left-[10%] top-[14px] h-0.5 bg-emerald-500 transition-all -z-0"
                              style={{ width: `${(Math.min(currentStatusIdx, 4) / 4) * 80}%` }}
                            />

                            {/* Steps list */}
                            {steps.map((st, idx) => {
                              const isCompleted = idx < currentStatusIdx;
                              const isActive = idx === currentStatusIdx;
                              const isLostStep = st.statusKey === "lost";
                              
                              // Handle lost status mapping display: if status is lost, highlight "Not a Fit" at index 5.
                              const showStepLost = lead.status === "lost" || lead.status === "not_a_fit";
                              
                              let stepColorClass = "border-zinc-200 bg-white text-zinc-300";
                              if (isCompleted) {
                                stepColorClass = "bg-emerald-500 border-emerald-500 text-white";
                              } else if (isActive) {
                                stepColorClass = "border-[#FF5B26] bg-white text-[#FF5B26]";
                              }

                              // Skip displaying "Not a fit" on progress timeline if the lead is not actually lost
                              if (isLostStep && !showStepLost) return null;
                              // Skip "Confirmed" display if the lead is lost to make room for "Not a Fit"
                              if (st.statusKey === "converted" && showStepLost) return null;

                              return (
                                <div key={st.label} className="relative z-10 flex flex-col items-center space-y-2">
                                  <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shadow-sm ${stepColorClass}`}>
                                    {isCompleted ? (
                                      <svg className="w-4 h-4 stroke-[3px]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                      </svg>
                                    ) : (
                                      <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-[#FF5B26]' : 'bg-transparent'}`} />
                                    )}
                                  </div>
                                  <div className="text-center">
                                    <span className={`text-[11px] font-bold block ${isActive ? 'text-[#FF5B26]' : 'text-nomichi-ink/65'}`}>{st.label}</span>
                                    {isActive && (
                                      <span className="text-[9px] font-semibold text-nomichi-ink/40 block mt-0.5">{formatLogTime(lead.created_at).split(" at ")[1]}</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}

                          </div>
                        </div>

                        {/* Traveller Details Card */}
                        <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm space-y-5">
                          <div className="flex justify-between items-center border-b border-[#e7e1d5]/30 pb-3">
                            <h3 className="text-sm font-bold text-nomichi-ink">Traveller Details</h3>
                            {!isEditingDetails ? (
                              <button 
                                onClick={startEditingDetails}
                                className="bg-[#FAF8F4] hover:bg-[#FAF8F4]/80 text-[#FF5B26] border border-[#FF5B26]/30 font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1 shadow-sm"
                              >
                                <Edit className="w-3.5 h-3.5" />
                                Edit
                              </button>
                            ) : (
                              <div className="flex items-center gap-2">
                                <button 
                                  onClick={handleSaveDetails}
                                  disabled={savingDetails}
                                  className="bg-[#FF5B26] hover:bg-[#E04B1B] text-white font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm disabled:opacity-50"
                                >
                                  {savingDetails ? "Saving..." : "Save"}
                                </button>
                                <button 
                                  onClick={() => setIsEditingDetails(false)}
                                  className="bg-zinc-100 hover:bg-zinc-200 text-nomichi-ink font-bold text-xs px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditingDetails ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 text-xs">
                              <div className="space-y-1.5">
                                <label className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[10px]">Full Name</label>
                                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none" required />
                              </div>
                              <div className="space-y-1.5">
                                <label className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[10px]">Phone Number</label>
                                <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none" />
                              </div>
                              <div className="space-y-1.5">
                                <label className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[10px]">Group Type</label>
                                <select value={editGroupType} onChange={(e) => setEditGroupType(e.target.value)} className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none cursor-pointer">
                                  <option value="couple">Couple</option>
                                  <option value="friends">Friends</option>
                                  <option value="solo">Solo</option>
                                  <option value="family">Family</option>
                                  <option value="small group">Small Group</option>
                                </select>
                              </div>
                              <div className="space-y-1.5">
                                <label className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[10px]">Number of People</label>
                                <input type="number" min={1} value={editGroupSize} onChange={(e) => setEditGroupSize(parseInt(e.target.value))} className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none" required />
                              </div>
                              <div className="space-y-1.5">
                                <label className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[10px]">Preferred Month</label>
                                <input type="text" placeholder="e.g. October 2026" value={editPrefMonth} onChange={(e) => setEditPrefMonth(e.target.value)} className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none" />
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <label className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[10px]">What are you hoping this trip feels like?</label>
                                <textarea rows={2} value={editHopeFeels} onChange={(e) => setEditHopeFeels(e.target.value)} className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none" />
                              </div>
                              <div className="space-y-1.5 md:col-span-2">
                                <label className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[10px]">Anything else we should know?</label>
                                <textarea rows={2} value={editAnythingElse} onChange={(e) => setEditAnythingElse(e.target.value)} className="w-full bg-[#FAF8F4] border border-[#e7e1d5]/60 rounded-xl px-3 py-2.5 text-xs font-semibold text-nomichi-ink focus:outline-none" />
                              </div>
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                              
                              {/* Left details column */}
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">Full Name</span>
                                  <div className="flex items-center gap-2 font-bold text-nomichi-ink text-sm">
                                    <UserIcon className="w-4 h-4 text-nomichi-sand shrink-0" />
                                    <span>{lead.name}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">Phone Number</span>
                                  <div className="flex items-center gap-2 font-bold text-nomichi-ink text-sm">
                                    <Phone className="w-4 h-4 text-nomichi-sand shrink-0" />
                                    <span>{lead.phone || "Not provided"}</span>
                                    {lead.phone && (() => {
                                      const adminName = user.fullName || "Admin";
                                      const travelerName = lead.name || "there";
                                      const tripTitle = lead.trips?.title || lead.trip_interest || "your trip";
                                      const waText = encodeURIComponent(`Hello ${travelerName}, this is ${adminName} from Nomichi. Thank you for your enquiry for the trip ${tripTitle}.`);
                                      return (
                                        <a 
                                          href={`https://wa.me/${lead.phone.replace(/[^0-9]/g, '')}?text=${waText}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8F8F0] hover:bg-[#D0F2E0] transition-colors shrink-0"
                                        >
                                          <svg className="w-3.5 h-3.5 text-[#25D366] fill-current" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.782 1.452 5.386 0 9.778-4.387 9.781-9.76.002-2.602-1.01-5.05-2.854-6.897-1.844-1.847-4.29-2.858-6.894-2.859-5.39 0-9.783 4.387-9.786 9.762-.001 1.7.461 3.35 1.339 4.816L1.99 21.053l4.657-1.226zM17.5 14.5c-.28-.14-1.65-.82-1.9-.91-.25-.09-.44-.14-.62.14-.18.28-.7 1-.86 1.18-.16.18-.32.2-.6.06-.28-.14-1.18-.44-2.25-1.4-1.22-1.09-1.62-1.62-1.82-1.9-.2-.28 0-.44.14-.58.13-.13.28-.32.42-.48.14-.16.2-.28.3-.46.1-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.23-.55-.47-.48-.65-.48-.17 0-.37-.02-.57-.02-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.5.7.3 1.26.49 1.69.63.71.22 1.35.19 1.86.11.57-.08 1.65-.68 1.88-1.33.23-.65.23-1.21.16-1.33-.07-.12-.25-.26-.53-.4z" />
                                          </svg>
                                        </a>
                                      );
                                    })()}
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">Email Address</span>
                                  <div className="flex items-center gap-2 font-bold text-nomichi-rust text-sm">
                                    <Mail className="w-4 h-4 text-nomichi-sand shrink-0" />
                                    {lead.email && (() => {
                                      const adminName = user.fullName || "Admin";
                                      const travelerName = lead.name || "there";
                                      const tripTitle = lead.trips?.title || lead.trip_interest || "your trip";
                                      const emailSubject = encodeURIComponent(`Nomichi Enquiry - ${tripTitle}`);
                                      const emailBody = encodeURIComponent(`Hello ${travelerName},\n\nThis is ${adminName} from Nomichi. Thank you for your enquiry for the trip ${tripTitle}.`);
                                      return (
                                        <div className="flex items-center gap-2">
                                          <a href={`mailto:${lead.email}?subject=${emailSubject}&body=${emailBody}`} className="hover:underline">{lead.email}</a>
                                          <a 
                                            href={`https://mail.google.com/mail/?view=cm&fs=1&to=${lead.email}&su=${emailSubject}&body=${emailBody}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-[10px] text-red-500 hover:underline font-extrabold uppercase ml-2 border border-red-200 bg-red-50 px-1.5 py-0.5 rounded"
                                          >
                                            Gmail
                                          </a>
                                        </div>
                                      );
                                    })()}
                                  </div>
                                </div>
                              </div>

                              {/* Middle details column */}
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">Group Type</span>
                                  <div className="flex items-center gap-2 font-bold text-nomichi-ink text-sm">
                                    <Users className="w-4 h-4 text-nomichi-sand shrink-0" />
                                    <span className="capitalize">{lead.group_type || "Couple"}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">Number of People</span>
                                  <div className="flex items-center gap-2 font-bold text-nomichi-ink text-sm">
                                    <UserIcon className="w-4 h-4 text-nomichi-sand shrink-0" />
                                    <span>{adultsStr}</span>
                                  </div>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">Preferred Month</span>
                                  <div className="flex items-center gap-2 font-bold text-nomichi-ink text-sm">
                                    <Calendar className="w-4 h-4 text-nomichi-sand shrink-0" />
                                    <span>{lead.preferred_month || "October 2026"}</span>
                                  </div>
                                </div>
                              </div>

                              {/* Right details column */}
                              <div className="space-y-4">
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">What are you hoping this trip feels like?</span>
                                  <p className="text-nomichi-ink font-semibold text-xs leading-relaxed">{lead.hope_trip_feels_like || "Not provided."}</p>
                                </div>
                                <div className="space-y-1">
                                  <span className="font-bold text-nomichi-ink/50 block uppercase tracking-wider text-[9px]">Anything else we should know?</span>
                                  <p className="text-nomichi-ink font-semibold text-xs leading-relaxed">{lead.dietary_and_accessibility || "Not provided."}</p>
                                </div>
                              </div>

                            </div>
                          )}
                        </div>

                        {/* Activity & Notes Panel */}
                        <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm space-y-6">
                          <h3 className="text-sm font-bold text-nomichi-ink border-b border-[#e7e1d5]/30 pb-3">Activity & Notes</h3>
                          
                          {/* Note Form */}
                          <form onSubmit={handleAddNote} className="flex gap-4 items-center bg-[#FAF8F4] border border-[#e7e1d5]/50 rounded-2xl px-4 py-2">
                            <input 
                              type="text"
                              placeholder="Add a note or update..."
                              value={newNoteText}
                              onChange={(e) => setNewNoteText(e.target.value)}
                              className="w-full bg-transparent text-xs font-semibold text-nomichi-ink placeholder-nomichi-ink/35 focus:outline-none py-2"
                              required
                            />
                            
                            <div className="flex items-center gap-2 shrink-0">
                              <button type="button" className="p-2 text-nomichi-ink/40 hover:text-nomichi-ink/75 transition-all">
                                <Paperclip className="w-4.5 h-4.5" />
                              </button>
                              
                              <button 
                                type="submit" 
                                disabled={addingNote}
                                className="bg-[#FF5B26] hover:bg-[#E04B1B] text-white font-extrabold text-xs px-4 py-2 rounded-xl transition-all shadow-md disabled:opacity-50"
                              >
                                {addingNote ? "Adding..." : "Add Note"}
                              </button>
                            </div>
                          </form>

                          {/* Notes Timeline Feed */}
                          <div className="relative border-l border-zinc-200 ml-4 pl-6 space-y-6">
                            {allLogs.map((log) => {
                              // Avatar background and icon colors based on sender
                              let avatarColorClass = "bg-zinc-100 text-zinc-600";
                              let avatarInitials = "A";
                              
                              if (log.sender === "You") {
                                avatarColorClass = "bg-[#FFEFEA] text-[#FF5B26]";
                                avatarInitials = user.fullName
                                  ? user.fullName
                                      .split(" ")
                                      .map((n: string) => n[0])
                                      .join("")
                                      .toUpperCase()
                                      .slice(0, 2)
                                  : "Y";
                              } else if (log.sender === "Admin") {
                                avatarColorClass = "bg-blue-50 text-blue-600";
                                avatarInitials = "A";
                              }

                              return (
                                <div key={log.id} className="relative space-y-1.5">
                                  
                                  {/* Timeline circle marker overlay */}
                                  <div className="absolute -left-[35px] top-1.5 w-3 h-3 rounded-full bg-white border-2 border-zinc-300 flex items-center justify-center">
                                    <div className="w-1 h-1 rounded-full bg-zinc-300" />
                                  </div>

                                  <div className="flex items-center justify-between gap-4 flex-wrap">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${avatarColorClass}`}>
                                        {avatarInitials}
                                      </div>
                                      <span className="text-xs font-bold text-nomichi-ink">{log.sender}</span>
                                      <span className="text-[10px] font-semibold text-nomichi-ink/35">{log.absoluteTime}</span>
                                    </div>

                                    {log.badge && (
                                      <div className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${log.badge.colorClass}`}>
                                        <span className="w-1 h-1 rounded-full bg-[#FF5B26]" />
                                        {log.badge.label}
                                      </div>
                                    )}
                                  </div>

                                  <p className="text-xs text-nomichi-ink/75 font-semibold leading-relaxed pl-8">
                                    {log.text}
                                  </p>

                                </div>
                              );
                            })}
                          </div>

                        </div>

                      </div>

                      {/* Right Sidebar (Sidebar Summary - Col 4) */}
                      <div className="lg:col-span-4 space-y-6">
                        
                        {/* Trip Summary Card */}
                        <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm space-y-5">
                          <h3 className="text-sm font-bold text-nomichi-ink border-b border-[#e7e1d5]/30 pb-3">Trip Summary</h3>
                          
                          {/* Inner trip card */}
                          <div className="bg-[#FAF8F4]/50 border border-[#e7e1d5]/40 rounded-2xl p-4 flex gap-3.5 items-start">
                            <img 
                              src={trip.image_url || "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=150&q=80"}
                              alt={trip.title}
                              className="w-16 h-16 rounded-xl object-cover shrink-0 border border-[#e7e1d5]/30"
                            />
                            <div className="space-y-1 min-w-0">
                              <h4 className="font-display font-bold text-xs text-nomichi-ink truncate leading-tight">{trip.title}</h4>
                              <div className="flex items-center gap-1 text-[10px] text-nomichi-ink/50 font-medium">
                                <Calendar className="w-3.5 h-3.5 text-[#FF5B26]/65 shrink-0" />
                                <span>{trip.duration || "7 Days"} / {trip.duration ? `${parseInt(trip.duration) - 1} Nights` : "6 Nights"}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-nomichi-ink/50 font-medium">
                                <MapPin className="w-3.5 h-3.5 text-[#FF5B26]/65 shrink-0" />
                                <span className="truncate">{trip.destination}</span>
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-nomichi-ink/50 font-medium">
                                <Users className="w-3.5 h-3.5 text-[#FF5B26]/65 shrink-0" />
                                <span>{trip.group_size || "Small Group (8–12)"}</span>
                              </div>
                            </div>
                          </div>

                          {/* Price details */}
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold text-nomichi-ink/45 uppercase tracking-wider block">Price (per person)</span>
                            <span className="text-xl font-extrabold text-[#FF5B26] block">
                              {trip.price ? `₹${Number(trip.price).toLocaleString("en-IN")}` : "₹1,29,999"}
                            </span>
                            <span className="text-[10px] text-nomichi-ink/40 font-semibold block">Inclusive of all taxes (GST)</span>
                          </div>

                          {/* Seats Available Progress Bar */}
                          <div className="space-y-2 pt-3 border-t border-[#e7e1d5]/30">
                            <div className="flex items-center justify-between text-[11px] font-bold">
                              <span className="text-[#25D366] flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#25D366]" />
                                Seats Available
                              </span>
                              <span className="text-nomichi-ink/65">{trip.seats_left ?? 6} seats left</span>
                            </div>
                            <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-[#25D366] transition-all"
                                style={{ width: `${((trip.seats_left ?? 6) / (trip.total_seats ?? 12)) * 100}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Enquiry Owner Card */}
                        <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm space-y-4">
                          <h3 className="text-sm font-bold text-nomichi-ink border-b border-[#e7e1d5]/30 pb-3">Enquiry Owner</h3>
                          
                          {loadingExpert ? (
                            <div className="flex items-center gap-3 animate-pulse">
                              <div className="w-9 h-9 rounded-full bg-zinc-100 shrink-0" />
                              <div className="flex-1 space-y-1.5">
                                <div className="h-3 bg-zinc-100 rounded w-2/3" />
                                <div className="h-2.5 bg-zinc-100 rounded w-1/3" />
                              </div>
                            </div>
                          ) : assignedExpert ? (
                            <>
                              <div className="flex items-center gap-3">
                                {assignedExpert.avatar_url ? (
                                  <img 
                                    src={assignedExpert.avatar_url} 
                                    alt={assignedExpert.full_name} 
                                    className="w-9 h-9 rounded-full object-cover border border-[#FF5B26]/10 shrink-0"
                                  />
                                ) : (
                                  <div className="w-9 h-9 rounded-full bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/10 flex items-center justify-center font-bold text-xs shrink-0">
                                    {assignedExpert.full_name
                                      ? assignedExpert.full_name.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
                                      : "E"}
                                  </div>
                                )}
                                <div className="flex flex-col">
                                  <span className="text-xs font-bold text-nomichi-ink">{assignedExpert.full_name}</span>
                                  <span className="text-[10px] font-semibold text-nomichi-ink/50">
                                    {assignedExpert.role === "ADMIN" ? "Administrator" : assignedExpert.role === "MANAGER" ? "Trip Expert" : "Representative"}
                                  </span>
                                </div>
                              </div>

                              {/* Quick icon actions */}
                              {(() => {
                                const travelerName = profileData?.full_name || profileForm.fullName || "User";
                                const tripTitle = trip.title || "your trip";
                                const userWaText = encodeURIComponent(`Hi, I am ${travelerName}. I have submitted my enquiry for the trip ${tripTitle}.`);
                                const waHref = assignedExpert.phone
                                  ? `https://wa.me/${assignedExpert.phone.replace(/[^0-9]/g, '')}?text=${userWaText}`
                                  : "#";
                                const mailHref = assignedExpert.email
                                  ? `mailto:${assignedExpert.email}?subject=${encodeURIComponent(`Enquiry for ${tripTitle}`)}&body=${userWaText}`
                                  : "#";
                                return (
                                  <div className="flex items-center gap-3 pt-3 border-t border-[#e7e1d5]/30 justify-center">
                                    {assignedExpert.phone && (
                                      <>
                                        <a 
                                          href={`tel:${assignedExpert.phone}`}
                                          className="w-8 h-8 rounded-full bg-[#FAF8F4] hover:bg-[#FF5B26]/5 border border-[#e7e1d5]/60 flex items-center justify-center text-nomichi-ink/50 hover:text-[#FF5B26] transition-all"
                                          title="Call Expert"
                                        >
                                          <Phone className="w-4 h-4" />
                                        </a>
                                        <a 
                                          href={waHref}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-8 h-8 rounded-full bg-[#FAF8F4] hover:bg-[#FF5B26]/5 border border-[#e7e1d5]/60 flex items-center justify-center text-nomichi-ink/50 hover:text-[#25D366] transition-all"
                                          title="WhatsApp Expert"
                                        >
                                          <svg className="w-4 h-4 fill-current text-nomichi-ink/50 hover:text-[#25D366]" viewBox="0 0 24 24">
                                            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.782 1.452 5.386 0 9.778-4.387 9.781-9.76.002-2.602-1.01-5.05-2.854-6.897-1.844-1.847-4.29-2.858-6.894-2.859-5.39 0-9.783 4.387-9.786 9.762-.001 1.7.461 3.35 1.339 4.816L1.99 21.053l4.657-1.226zM17.5 14.5c-.28-.14-1.65-.82-1.9-.91-.25-.09-.44-.14-.62.14-.18.28-.7 1-.86 1.18-.16.18-.32.2-.6.06-.28-.14-1.18-.44-2.25-1.4-1.22-1.09-1.62-1.62-1.82-1.9-.2-.28 0-.44.14-.58.13-.13.28-.32.42-.48.14-.16.2-.28.3-.46.1-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.23-.55-.47-.48-.65-.48-.17 0-.37-.02-.57-.02-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.5.7.3 1.26.49 1.69.63.71.22 1.35.19 1.86.11.57-.08 1.65-.68 1.88-1.33.23-.65.23-1.21.16-1.33-.07-.12-.25-.26-.53-.4z" />
                                          </svg>
                                        </a>
                                      </>
                                    )}
                                    {assignedExpert.email && (
                                      <>
                                        <a 
                                          href={mailHref}
                                          className="w-8 h-8 rounded-full bg-[#FAF8F4] hover:bg-[#FF5B26]/5 border border-[#e7e1d5]/60 flex items-center justify-center text-nomichi-ink/50 hover:text-[#FF5B26] transition-all"
                                          title="Email Expert"
                                        >
                                          <Mail className="w-4 h-4" />
                                        </a>
                                        <a 
                                          href={`https://mail.google.com/mail/?view=cm&fs=1&to=${assignedExpert.email}&su=${encodeURIComponent(`Enquiry for ${tripTitle}`)}&body=${userWaText}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="w-8 h-8 rounded-full bg-[#FAF8F4] hover:bg-red-50 border border-[#e7e1d5]/60 flex items-center justify-center text-nomichi-ink/50 hover:text-red-600 transition-all font-black text-xs"
                                          title="Gmail Expert"
                                        >
                                          M
                                        </a>
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </>
                          ) : (
                            <div className="flex flex-col items-center py-2 text-center">
                              <div className="w-9 h-9 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center font-bold text-zinc-400 text-xs mb-2">
                                ?
                              </div>
                              <span className="text-xs font-bold text-nomichi-ink">Not Assigned</span>
                              <span className="text-[10px] font-semibold text-nomichi-ink/40 mt-0.5">We will assign a Trip Expert shortly</span>
                            </div>
                          )}
                        </div>

                        {/* Quick Actions List */}
                        <div className="bg-white border border-[#e7e1d5]/50 rounded-[24px] p-6 shadow-sm space-y-4">
                          <h3 className="text-sm font-bold text-nomichi-ink border-b border-[#e7e1d5]/30 pb-3">Quick Actions</h3>
                          
                          <div className="space-y-2.5 text-xs font-semibold text-nomichi-ink/75">
                            <button 
                              onClick={() => navigateToView("messages")}
                              className="w-full text-left flex items-center gap-2 hover:text-[#FF5B26] transition-all p-1 hover:bg-[#FAF8F4] rounded-lg bg-transparent"
                            >
                              <MessageSquare className="w-4.5 h-4.5 text-[#FF5B26]/85 shrink-0" />
                              <span>Message Trip Expert</span>
                            </button>
                            
                            {(() => {
                              const travelerName = profileData?.full_name || profileForm.fullName || "User";
                              const tripTitle = trip.title || "your trip";
                              const userWaText = encodeURIComponent(`Hi, I am ${travelerName}. I have submitted my enquiry for the trip ${tripTitle}.`);
                              const waHref = assignedExpert?.phone
                                ? `https://wa.me/${assignedExpert.phone.replace(/[^0-9]/g, '')}?text=${userWaText}`
                                : "#";
                              const mailHref = assignedExpert?.email
                                ? `mailto:${assignedExpert.email}?subject=${encodeURIComponent(`Enquiry for ${tripTitle}`)}&body=${userWaText}`
                                : "#";
                              const gmailHref = assignedExpert?.email
                                ? `https://mail.google.com/mail/?view=cm&fs=1&to=${assignedExpert.email}&su=${encodeURIComponent(`Enquiry for ${tripTitle}`)}&body=${userWaText}`
                                : "#";
                              return (
                                <>
                                  {assignedExpert?.email && (
                                    <>
                                      <a 
                                        href={mailHref}
                                        className="flex items-center gap-2 hover:text-[#FF5B26] transition-all p-1 hover:bg-[#FAF8F4] rounded-lg"
                                      >
                                        <Mail className="w-4.5 h-4.5 text-[#FF5B26]/85 shrink-0" />
                                        <span>Email Trip Expert</span>
                                      </a>
                                      <a 
                                        href={gmailHref}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-2 hover:text-[#FF5B26] transition-all p-1 hover:bg-[#FAF8F4] rounded-lg"
                                      >
                                        <Mail className="w-4.5 h-4.5 text-red-500 shrink-0" />
                                        <span>Gmail Trip Expert</span>
                                      </a>
                                    </>
                                  )}
                                  
                                  {assignedExpert?.phone && (
                                    <a 
                                      href={waHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="flex items-center gap-2 hover:text-[#FF5B26] transition-all p-1 hover:bg-[#FAF8F4] rounded-lg"
                                    >
                                      <svg className="w-4.5 h-4.5 text-[#25D366] fill-current shrink-0" viewBox="0 0 24 24">
                                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.504-5.729-1.464L0 24zm6.59-4.846c1.6.95 3.197 1.451 4.782 1.452 5.386 0 9.778-4.387 9.781-9.76.002-2.602-1.01-5.05-2.854-6.897-1.844-1.847-4.29-2.858-6.894-2.859-5.39 0-9.783 4.387-9.786 9.762-.001 1.7.461 3.35 1.339 4.816L1.99 21.053l4.657-1.226zM17.5 14.5c-.28-.14-1.65-.82-1.9-.91-.25-.09-.44-.14-.62.14-.18.28-.7 1-.86 1.18-.16.18-.32.2-.6.06-.28-.14-1.18-.44-2.25-1.4-1.22-1.09-1.62-1.62-1.82-1.9-.2-.28 0-.44.14-.58.13-.13.28-.32.42-.48.14-.16.2-.28.3-.46.1-.18.05-.34-.02-.48-.07-.14-.62-1.5-.85-2.05-.23-.55-.47-.48-.65-.48-.17 0-.37-.02-.57-.02-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.87 1.22 3.07c.15.2 2.1 3.2 5.08 4.5.7.3 1.26.49 1.69.63.71.22 1.35.19 1.86.11.57-.08 1.65-.68 1.88-1.33.23-.65.23-1.21.16-1.33-.07-.12-.25-.26-.53-.4z" />
                                      </svg>
                                      <span>WhatsApp Trip Expert</span>
                                    </a>
                                  )}
                                </>
                              );
                            })()}
                            
                            <button 
                              onClick={() => router.push(`/trips/${trip.id}`)}
                              className="w-full text-left flex items-center gap-2 hover:text-[#FF5B26] transition-all p-1 hover:bg-[#FAF8F4] rounded-lg bg-transparent"
                            >
                              <Compass className="w-4.5 h-4.5 text-[#FF5B26]/85 shrink-0" />
                              <span>View Detailed Itinerary</span>
                            </button>
                            
                            <button 
                              onClick={startEditingDetails}
                              className="w-full text-left flex items-center gap-2 hover:text-[#FF5B26] transition-all p-1 hover:bg-[#FAF8F4] rounded-lg bg-transparent"
                            >
                              <Edit className="w-4.5 h-4.5 text-[#FF5B26]/85 shrink-0" />
                              <span>Edit Traveller Details</span>
                            </button>
                          </div>
                        </div>

                      </div>

                    </div>

                  </div>
                );
              })()}
            </div>
          ) : currentView === "journeys" ? (
            <div className="space-y-8 animate-in fade-in duration-300 text-left">
              {(() => {
                const now = new Date();

                // Upcoming journeys: converted status and start date is in the future
                const upcomingJourneys = leads
                  .filter(lead => {
                    if (lead.status !== 'converted' || !lead.trips) return false;
                    const startDate = lead.trips.start_date ? new Date(lead.trips.start_date) : null;
                    return !startDate || startDate >= now;
                  })
                  .sort((a, b) => {
                    const dateA = a.trips?.start_date ? new Date(a.trips.start_date).getTime() : 0;
                    const dateB = b.trips?.start_date ? new Date(b.trips.start_date).getTime() : 0;
                    return dateA - dateB;
                  });

                // Completed journeys: converted status and start date is in the past
                const completedJourneys = leads
                  .filter(lead => {
                    if (lead.status !== 'converted' || !lead.trips) return false;
                    const startDate = lead.trips.start_date ? new Date(lead.trips.start_date) : null;
                    return startDate && startDate < now;
                  })
                  .sort((a, b) => {
                    const dateA = a.trips?.start_date ? new Date(a.trips.start_date).getTime() : 0;
                    const dateB = b.trips?.start_date ? new Date(b.trips.start_date).getTime() : 0;
                    return dateB - dateA;
                  });

                // Helper to format dates
                const fmtDate = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });

                // Detail View
                if (activeJourneyId) {
                  const selectedJourney = upcomingJourneys.find(j => j.id === activeJourneyId) || 
                                          completedJourneys.find(j => j.id === activeJourneyId);
                  
                  if (!selectedJourney) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-sm text-nomichi-ink/50">Journey not found.</p>
                        <button
                          onClick={() => {
                            setActiveJourneyId(null);
                            router.push("/?view=journeys", { scroll: false });
                          }}
                          className="mt-4 px-4 py-2 bg-[#FF5B26] text-white rounded-xl font-bold text-xs"
                        >
                          Back to Journeys
                        </button>
                      </div>
                    );
                  }

                  const trip = selectedJourney.trips;
                  const isCompleted = selectedJourney.trips?.start_date ? new Date(selectedJourney.trips.start_date) < now : false;
                  const isFullyConfirmed = selectedJourney.status === 'converted' || isCompleted;
                  const expertName = selectedJourney.assigned_expert || 
                                     (selectedJourney.id === '86d0779a-5533-478a-90b9-9cdfc362783b' ? "Priya Sharma" : "Ananya Mehta");

                  const startDate = trip.start_date ? new Date(trip.start_date) : null;
                  const endDate = startDate && trip.duration
                    ? new Date(startDate.getTime() + (parseInt(trip.duration) || 7) * 86400000)
                    : startDate
                      ? new Date(startDate.getTime() + 7 * 86400000)
                      : null;
                  
                  const dateRange = startDate && endDate
                    ? `${startDate.getDate()} ${startDate.toLocaleDateString("en-GB", { month: "short" })} – ${endDate.getDate()} ${endDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                    : "Dates to be confirmed";
                  const durationStr = trip.duration ? (trip.duration.toLowerCase().includes("day") ? trip.duration : `${trip.duration} Days`) : "7 Days";

                  // Progress steps calculation
                  const leadCreatedDate = selectedJourney.created_at ? new Date(selectedJourney.created_at) : new Date("2026-06-01");
                  const vibeCheckDate = new Date(leadCreatedDate.getTime() + 3 * 24 * 60 * 60 * 1000);
                  const seatConfirmedDate = new Date(leadCreatedDate.getTime() + 5 * 24 * 60 * 60 * 1000);
                  
                  const timelineSteps = [
                    { 
                      label: "Enquiry Submitted", 
                      done: true, 
                      date: leadCreatedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) 
                    },
                    { 
                      label: "Vibe Check", 
                      done: isFullyConfirmed || selectedJourney.status === "negotiating", 
                      date: vibeCheckDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) 
                    },
                    { 
                      label: "Seat Confirmed", 
                      done: isFullyConfirmed, 
                      date: seatConfirmedDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) 
                    },
                    { 
                      label: isCompleted ? "Documents Verified" : "Documents Pending", 
                      done: isCompleted, 
                      date: isCompleted ? new Date(leadCreatedDate.getTime() + 10 * 24 * 60 * 60 * 1000).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : null 
                    },
                    { 
                      label: "Trip Starts", 
                      done: isCompleted, 
                      date: startDate ? startDate.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }) : "Dates TBC" 
                    }
                  ];

                  return (
                    <div className="space-y-6">
                      {/* Banner Image */}
                      <div className="relative h-64 md:h-72 overflow-hidden rounded-[24px] shadow-sm">
                        <img
                          src={trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80"}
                          alt={trip.title}
                          className="w-full h-full object-cover"
                        />
                        {/* Dark Gradient Overlay */}
                        <div className="absolute inset-0 bg-gradient-to-r from-black/75 via-black/40 to-transparent" />
                        
                        {/* Content inside banner */}
                        <div className="absolute inset-0 p-6 md:p-8 flex flex-col justify-between text-left">
                          {/* Back Button */}
                          <div>
                            <button
                              onClick={() => {
                                setActiveJourneyId(null);
                                router.push("/?view=journeys", { scroll: false });
                              }}
                              className="flex items-center gap-1.5 text-white/80 hover:text-white text-xs font-bold bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-full transition-all border-0 cursor-pointer backdrop-blur-sm"
                            >
                              <ChevronLeft className="w-4 h-4" />
                              Back to My Journeys
                            </button>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
                            <div className="space-y-2">
                              <h2 className="font-display font-extrabold text-2xl md:text-3.5xl text-white tracking-tight leading-tight">{trip.title}</h2>
                              
                              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-white/90 text-xs md:text-sm font-semibold">
                                <div className="flex items-center gap-1.5">
                                  <Calendar className="w-4 h-4 text-white/60 stroke-[2]" />
                                  <span>{dateRange}</span>
                                </div>
                                <span className="text-white/40 hidden sm:inline">•</span>
                                <div className="flex items-center gap-1.5">
                                  <Clock className="w-4 h-4 text-white/60 stroke-[2]" />
                                  <span>{durationStr}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 text-white/80 text-xs md:text-sm font-semibold pt-1">
                                <MapPin className="w-4 h-4 text-white/60 stroke-[2]" />
                                <span>{trip.destination || "International"}</span>
                              </div>
                            </div>

                            {/* Confirmed Pill */}
                            <div className="self-start md:self-auto">
                              <span className={`px-4 py-2 rounded-full text-xs font-extrabold tracking-wider ${
                                isCompleted 
                                  ? "bg-zinc-700/95 text-white" 
                                  : "bg-[#457e5e]/95 text-white"
                              }`}>
                                {isCompleted ? "Completed" : "Confirmed"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Journey Progress and Trip Info Column Grid */}
                      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        {/* Journey Progress */}
                        <div className="lg:col-span-3 bg-nomichi-white p-6 rounded-[24px] border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between">
                          <div>
                            <h3 className="text-sm font-display font-extrabold text-nomichi-ink tracking-tight mb-6">Journey Progress</h3>
                            
                            <div className="relative w-full py-4">
                              {/* Background Connecting Line */}
                              <div className="absolute left-[10%] right-[10%] top-8 -translate-y-1/2 h-[3px] bg-[#e7e1d5]/40 z-0" />
                              
                              {/* Active/Completed Line */}
                              <div 
                                className="absolute left-[10%] top-8 -translate-y-1/2 h-[3px] bg-[#425d4c] transition-all duration-500 z-0"
                                style={{
                                  width: isCompleted 
                                    ? "80%" 
                                    : isFullyConfirmed 
                                      ? "40%" // to step 2 (Seat Confirmed)
                                      : "20%" // to step 1 (Vibe Check)
                                }}
                              />

                              {/* Progress Circles Row (centered vertically at top-8) */}
                              <div className="relative z-10 flex items-center justify-between w-full h-8">
                                {timelineSteps.map((step, idx) => {
                                  const isDone = step.done;
                                  return (
                                    <div key={step.label} className="flex-1 flex justify-center">
                                      <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                                        isDone 
                                          ? "bg-[#425d4c] border-[#425d4c] text-white" 
                                          : "bg-white border-[#e7e1d5] text-nomichi-ink/30"
                                      }`}>
                                        {isDone ? (
                                          <Check className="w-4.5 h-4.5 stroke-[3.5]" />
                                        ) : null}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>

                              {/* Progress Labels Row */}
                              <div className="relative flex items-start justify-between w-full mt-3">
                                {timelineSteps.map((step) => {
                                  const isDone = step.done;
                                  return (
                                    <div key={step.label} className="flex-1 text-center px-1">
                                      <p className={`text-[10px] font-extrabold leading-tight ${isDone ? "text-nomichi-ink" : "text-nomichi-ink/35"}`}>
                                        {step.label}
                                      </p>
                                      {step.date ? (
                                        <p className="text-[9px] font-semibold text-nomichi-ink/40 mt-1">
                                          {step.date}
                                        </p>
                                      ) : (
                                        <p className="text-[9px] select-none text-transparent mt-1">None</p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Trip Information */}
                        <div className="lg:col-span-2 bg-nomichi-white p-6 rounded-[24px] border border-[#e7e1d5]/40 shadow-sm flex flex-col justify-between">
                          <div className="space-y-5">
                            <h3 className="text-sm font-display font-extrabold text-nomichi-ink tracking-tight">Trip Information</h3>
                            
                            <div className="space-y-4">
                              {[
                                { label: "Trip Expert", value: expertName.split("(")[0].trim(), icon: UserIcon },
                                { label: "Group Size", value: trip.group_size || "8 – 12 Travelers", icon: Users },
                                { label: "Meeting Point", value: selectedJourney.meeting_point || "Delhi Airport", icon: MapPin },
                                { label: "Departure Date", value: startDate ? fmtDate(startDate) : "TBC", icon: Calendar }
                              ].map((info) => (
                                <div key={info.label} className="flex items-center gap-4 py-2 border-b border-[#e7e1d5]/15 last:border-0 last:pb-0">
                                  <info.icon className="w-5 h-5 text-nomichi-ink/55 stroke-[1.8px] shrink-0" />
                                  <span className="text-sm font-medium text-nomichi-ink/60">{info.label}</span>
                                  <span className="text-sm font-bold text-nomichi-ink ml-auto text-right">{info.value}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <button
                          onClick={() => router.push(`/trips/${trip.id}`)}
                          className="py-3 px-6 bg-[#FF5B26] hover:bg-[#e04d1d] text-white font-extrabold text-xs rounded-xl shadow-sm hover:shadow transition-all border-0 cursor-pointer flex items-center justify-center gap-2"
                        >
                          <Calendar className="w-4.5 h-4.5 stroke-[2]" />
                          View Itinerary
                        </button>
                        <button
                          onClick={() => {
                            if (trip.brochure_url) {
                              const link = document.createElement('a');
                              link.href = trip.brochure_url;
                              link.target = '_blank';
                              link.download = `${trip.title.replace(/\s+/g, '_')}_Brochure.pdf`;
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            } else {
                              window.print();
                            }
                          }}
                          className="py-3 px-6 border border-[#FF5B26]/30 text-[#FF5B26] hover:bg-[#FFEFEA]/50 bg-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <FileText className="w-4.5 h-4.5 stroke-[2]" />
                          Download Trip PDF
                        </button>
                        <button
                          onClick={() => {
                            setCurrentView("messages");
                            router.push(`/?view=messages`, { scroll: false });
                          }}
                          className="py-3 px-6 border border-[#FF5B26]/30 text-[#FF5B26] hover:bg-[#FFEFEA]/50 bg-white font-extrabold text-xs rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                        >
                          <MessageSquare className="w-4.5 h-4.5 stroke-[2]" />
                          Message Team
                        </button>
                      </div>

                      {/* Quick Resources */}
                      <div className="bg-nomichi-white p-6 rounded-[24px] border border-[#e7e1d5]/40 shadow-sm text-left space-y-5">
                        <h3 className="text-sm font-display font-extrabold text-nomichi-ink tracking-tight">Quick Resources</h3>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {[
                            {
                              title: "Itinerary",
                              desc: "View day by day plan",
                              icon: Calendar,
                              color: "bg-[#FFEFEA]",
                              iconColor: "text-[#FF5B26]",
                              action: () => router.push(`/trips/${trip.id}`)
                            },
                            {
                              title: "Trip Documents",
                              desc: "Tickets, vouchers & more",
                              icon: FileText,
                              color: "bg-[#E8F8F0]",
                              iconColor: "text-[#10B981]",
                              action: () => alert("Opening Trip Documents folder...")
                            },
                            {
                              title: "Important Notes",
                              desc: "Things to know before you go",
                              icon: Edit,
                              color: "bg-[#FFEFEA]",
                              iconColor: "text-[#FF5B26]",
                              action: () => {
                                if (!isCompleted) {
                                  setActiveEnquiryId(selectedJourney.id);
                                  setCurrentView("enquiry_detail");
                                  router.push(`/?view=enquiry_detail&id=${selectedJourney.id}`, { scroll: false });
                                } else {
                                  alert("No notes available for completed trips.");
                                }
                              }
                            }
                          ].map((card) => (
                            <div
                              key={card.title}
                              onClick={card.action}
                              className="bg-nomichi-white rounded-xl border border-[#e7e1d5]/40 shadow-sm p-4 flex items-center justify-between hover:shadow-md hover:border-[#FF5B26]/35 transition-all cursor-pointer"
                            >
                              <div className="flex items-center gap-3">
                                <div className={`w-9 h-9 ${card.color} rounded-xl flex items-center justify-center shrink-0`}>
                                  <card.icon className={`w-4.5 h-4.5 ${card.iconColor} stroke-[2]`} />
                                </div>
                                <div className="text-left">
                                  <span className="text-xs font-display font-extrabold text-nomichi-ink block">{card.title}</span>
                                  <span className="text-[9px] font-semibold text-nomichi-ink/40 block mt-0.5">{card.desc}</span>
                                </div>
                              </div>
                              <ChevronRight className="w-4 h-4 text-nomichi-ink/35 stroke-[2]" />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Help / Contact Support Banner */}
                      <div className="bg-[#FFEFEA] rounded-2xl border border-[#FF5B26]/10 p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-left">
                        <div className="flex items-center gap-4">
                          <div className="w-11 h-11 rounded-full bg-[#FF5B26]/10 flex items-center justify-center shrink-0">
                            <Headphones className="w-5.5 h-5.5 text-[#FF5B26]" />
                          </div>
                          <div>
                            <h4 className="font-display font-extrabold text-xs text-nomichi-ink">We're here for you</h4>
                            <p className="text-[10px] text-nomichi-ink/65 font-semibold mt-1">Have questions about your trip? Our team is just a message away.</p>
                          </div>
                        </div>
                        
                        <button
                          onClick={() => {
                            setCurrentView("messages");
                            router.push(`/?view=messages`, { scroll: false });
                          }}
                          className="px-5 py-2.5 bg-white hover:bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/40 font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer self-stretch sm:self-auto text-center"
                        >
                          Contact Support
                        </button>
                      </div>
                    </div>
                  );
                }

                // List View
                const displayJourneys = activeJourneyTab === "upcoming" 
                  ? upcomingJourneys 
                  : completedJourneys;

                return (
                  <div className="space-y-6">
                    {/* Header */}
                    <div className="leading-none">
                      <h2 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">My Journeys</h2>
                      <p className="text-xs text-nomichi-ink/50 font-medium mt-1.5">
                        Trips you've confirmed with Nomichi. Everything you need before departure.
                      </p>
                    </div>

                    {/* Tabs Selector */}
                    <div className="flex gap-6 border-b border-[#e7e1d5]/30 pb-0">
                      <button
                        onClick={() => setActiveJourneyTab("upcoming")}
                        className={`pb-3 text-xs font-display font-extrabold relative transition-colors bg-transparent border-0 cursor-pointer ${
                          activeJourneyTab === "upcoming" 
                            ? "text-[#FF5B26]" 
                            : "text-nomichi-ink/40 hover:text-nomichi-ink/65"
                        }`}
                      >
                        Upcoming ({upcomingJourneys.length})
                        {activeJourneyTab === "upcoming" && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5B26]" />
                        )}
                      </button>
                      <button
                        onClick={() => setActiveJourneyTab("completed")}
                        className={`pb-3 text-xs font-display font-extrabold relative transition-colors bg-transparent border-0 cursor-pointer ${
                          activeJourneyTab === "completed" 
                            ? "text-[#FF5B26]" 
                            : "text-nomichi-ink/40 hover:text-nomichi-ink/65"
                        }`}
                      >
                        Completed ({completedJourneys.length})
                        {activeJourneyTab === "completed" && (
                          <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5B26]" />
                        )}
                      </button>
                    </div>

                    {/* Cards List */}
                    {displayJourneys.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-20 bg-nomichi-white rounded-[24px] border border-[#e7e1d5]/40 shadow-sm text-center">
                        <div className="w-16 h-16 bg-[#FFEFEA] rounded-2xl flex items-center justify-center mb-5">
                          <Map className="w-7 h-7 text-[#FF5B26] stroke-[1.5]" />
                        </div>
                        <h3 className="font-display font-extrabold text-sm text-nomichi-ink">No journeys in this category.</h3>
                        <p className="text-xs text-nomichi-ink/40 font-medium mt-2 max-w-xs leading-relaxed">
                          {activeJourneyTab === "upcoming" 
                            ? "When an enquiry is confirmed, it will appear here as an upcoming trip." 
                            : "Your past trips with Nomichi will show up here after completion."}
                        </p>
                        {activeJourneyTab === "upcoming" && (
                          <button
                            onClick={() => navigateToView("explore")}
                            className="mt-6 px-6 py-3 bg-[#FF5B26] hover:bg-[#e04d1d] text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all border-0 cursor-pointer flex items-center gap-2"
                          >
                            <Compass className="w-4 h-4 stroke-[2]" />
                            Explore Trips
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {displayJourneys.map((journey) => {
                          const trip = journey.trips;
                          if (!trip) return null;

                          const startDate = trip.start_date ? new Date(trip.start_date) : null;
                          const endDate = startDate && trip.duration
                            ? new Date(startDate.getTime() + (parseInt(trip.duration) || 7) * 86400000)
                            : startDate
                              ? new Date(startDate.getTime() + 7 * 86400000)
                              : null;
                          
                          const dateRange = startDate && endDate
                            ? `${startDate.getDate()} ${startDate.toLocaleDateString("en-GB", { month: "short" })} – ${endDate.getDate()} ${endDate.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}`
                            : "Dates to be confirmed";
                          const isCompletedTab = activeJourneyTab === "completed";

                          return (
                            <div
                              key={journey.id}
                              onClick={() => {
                                setActiveJourneyId(journey.id);
                                router.push(`/?view=journeys&id=${journey.id}`, { scroll: false });
                              }}
                              className="bg-nomichi-white rounded-[24px] border border-[#e7e1d5]/40 shadow-sm overflow-hidden hover:shadow-md transition-all cursor-pointer flex flex-col md:flex-row items-stretch text-left group"
                            >
                              {/* Left image banner thumbnail */}
                              <div className="relative md:w-64 w-full h-44 md:h-auto shrink-0 overflow-hidden">
                                <img
                                  src={trip.image_url || "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=900&q=80"}
                                  alt={trip.title}
                                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>

                              {/* Right details content */}
                              <div className="flex-1 p-6 flex flex-col justify-between relative">
                                <div className="space-y-3">
                                  <h4 className="font-display font-extrabold text-lg text-nomichi-ink leading-snug">{trip.title}</h4>
                                  
                                  <div className="flex flex-col sm:flex-row sm:items-center gap-y-1.5 gap-x-5 text-nomichi-ink/75 text-[11px] font-semibold">
                                    <div className="flex items-center gap-1.5">
                                      <Calendar className="w-4 h-4 text-nomichi-ink/35 shrink-0 stroke-[2]" />
                                      <span>{dateRange}</span>
                                    </div>
                                    <span className="text-nomichi-ink/20 hidden sm:inline">•</span>
                                    <div className="flex items-center gap-1.5">
                                      <Users className="w-4 h-4 text-nomichi-ink/35 shrink-0 stroke-[2]" />
                                      <span>{trip.group_size || "Small Group (8–12)"}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-1.5 text-nomichi-ink/75 text-[11px] font-semibold">
                                    <MapPin className="w-4 h-4 text-nomichi-ink/35 shrink-0 stroke-[2]" />
                                    <span>{trip.destination || "International"}</span>
                                  </div>
                                </div>

                                {/* Status badge and chevron */}
                                <div className="flex items-center justify-between mt-5 md:mt-0 pt-3 md:pt-0 border-t border-[#e7e1d5]/15 md:border-t-0 md:absolute md:right-6 md:top-1/2 md:-translate-y-1/2 md:flex-row md:gap-4">
                                  <div className={`px-3 py-1 rounded-full text-[10px] font-extrabold flex items-center gap-1.5 border transition-all ${
                                    isCompletedTab
                                      ? "bg-zinc-100 text-zinc-600 border-zinc-200"
                                      : "bg-[#EAF7EC] text-[#1E5E2F] border-[#1E5E2F]/10"
                                  }`}>
                                    <div className={`w-1.5 h-1.5 rounded-full ${isCompletedTab ? "bg-zinc-400" : "bg-[#2E7D32]"}`} />
                                    <span>
                                      {isCompletedTab ? "Completed" : "Confirmed"}
                                    </span>
                                  </div>
                                  <ChevronRight className="w-4 h-4 text-nomichi-ink/30 hidden md:block group-hover:text-nomichi-ink/50 group-hover:translate-x-0.5 transition-all" />
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : currentView === "wishlist" ? (
            <div className="space-y-6 animate-in fade-in duration-300">
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">My Wishlist</h2>
                <p className="text-xs text-nomichi-ink/50 font-medium">Your curated bucket list of dream destinations.</p>
              </div>

              {wishlist.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                  {displayRecommended
                    .filter(trip => wishlist.includes(trip.id))
                    .map((rec) => renderTripCard(rec))}
                </div>
              ) : (
                <div className="text-center py-12 bg-nomichi-white rounded-2xl border border-[#e7e1d5]/40 p-6 flex flex-col items-center">
                  <Heart className="w-10 h-10 text-nomichi-sand mb-3" />
                  <h4 className="font-bold text-sm text-nomichi-ink">Your wishlist is empty</h4>
                  <p className="text-xs text-nomichi-ink/50 mt-1 max-w-xs leading-relaxed">
                    Save trips that catch your eye while exploring, and they'll show up here!
                  </p>
                </div>
              )}
            </div>
          ) : currentView === "profile" ? (
            <div className="space-y-8 animate-in fade-in duration-300 relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleAvatarChange} 
                style={{ display: "none" }} 
                accept="image/*" 
              />

              {/* Password Change Dialog Modal */}
              {isPasswordModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-nomichi-ink/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
                  <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/60 p-6 w-full max-w-md shadow-2xl relative animate-in zoom-in duration-200">
                    <button 
                      onClick={() => { setIsPasswordModalOpen(false); setPasswordMessage({ type: "", text: "" }); }}
                      className="absolute top-4 right-4 text-nomichi-ink/40 hover:text-nomichi-ink/80 transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                    
                    <h3 className="font-display font-extrabold text-lg text-nomichi-ink mb-2">Change Password</h3>
                    <p className="text-xs text-nomichi-ink/50 mb-6 font-medium">Update your account login security password.</p>
                    
                    <form onSubmit={handleUpdatePassword} className="space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-nomichi-ink/75 block">New Password</label>
                        <input 
                          type="password"
                          required
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          placeholder="Min 6 characters"
                          className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-nomichi-ink/75 block">Confirm New Password</label>
                        <input 
                          type="password"
                          required
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          placeholder="Confirm password"
                          className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-4 py-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                        />
                      </div>
                      
                      {passwordMessage.text && (
                        <div className={`p-3 rounded-xl text-xs font-semibold ${passwordMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-rose-50 text-rose-700 border border-rose-100"}`}>
                          {passwordMessage.text}
                        </div>
                      )}
                      
                      <div className="flex gap-3 pt-2">
                        <button 
                          type="button" 
                          onClick={() => { setIsPasswordModalOpen(false); setPasswordMessage({ type: "", text: "" }); }}
                          className="flex-1 py-2.5 border border-[#e7e1d5]/50 text-nomichi-ink hover:bg-[#FAF8F4] text-xs font-bold rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          disabled={passwordUpdating}
                          className="flex-1 py-2.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-bold text-xs rounded-xl shadow-md transition-all disabled:opacity-50"
                        >
                          {passwordUpdating ? "Updating..." : "Update Password"}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Title Header */}
              <div className="flex flex-col gap-2">
                <h2 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">My Profile</h2>
                <p className="text-xs text-nomichi-ink/50 font-medium">Manage your personal information and travel preferences.</p>
              </div>

              {profileLoading ? (
                <div className="flex flex-col items-center justify-center py-20 bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm">
                  <div className="w-8 h-8 border-4 border-t-nomichi-rust border-nomichi-sand/30 rounded-full animate-spin mb-3" />
                  <span className="text-xs text-nomichi-ink/50 font-semibold">Loading profile data...</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Profile Info Banner Card */}
                  <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex flex-col sm:flex-row items-center gap-5 w-full sm:w-auto">
                      {/* Avatar container */}
                      <div 
                        onClick={handleAvatarClick}
                        className="w-20 h-20 rounded-full relative overflow-hidden group cursor-pointer border border-[#e7e1d5]/60 bg-[#FAF8F4] shrink-0"
                      >
                        {profileData?.avatar_url ? (
                          <img 
                            src={profileData.avatar_url} 
                            alt="Profile Avatar" 
                            className="w-full h-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-[#FFEFEA] text-[#FF5B26] font-display font-black text-2xl">
                            {profileForm.fullName ? profileForm.fullName.charAt(0).toUpperCase() : "T"}
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                          <Camera className="w-5 h-5" />
                        </div>
                      </div>

                      {/* Profile details text */}
                      <div className="space-y-2 text-center sm:text-left">
                        <div className="flex flex-col sm:flex-row items-center gap-2">
                          <h3 className="text-lg font-display font-extrabold text-nomichi-ink">
                            {profileForm.fullName || "Tejaswa Jhode"}
                          </h3>
                          <span className="inline-flex items-center gap-1 bg-[#E8F8F0] text-[#10B981] text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-[#10B981]/15">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                            Explorer Member
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-4 gap-y-1.5 text-xs text-nomichi-ink/65 font-semibold">
                          <span className="flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-nomichi-sand" />
                            {profileForm.email || user.email}
                          </span>
                          <span className="flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-nomichi-sand" />
                            {profileForm.phone || "+91 98765 43210"}
                          </span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-nomichi-sand" />
                            Member since {profileData?.created_at ? new Date(profileData.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" }) : "May 2024"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => {
                        const nameInput = document.getElementById("profile-fullname");
                        if (nameInput) nameInput.focus();
                      }}
                      className="border border-[#FF5B26]/30 text-[#FF5B26] hover:bg-[#FF5B26]/5 text-xs font-extrabold px-5 py-2.5 rounded-xl transition-all shadow-sm w-full md:w-auto text-center shrink-0"
                    >
                      Edit Profile
                    </button>
                  </div>

                  {/* Tabs Row */}
                  <div className="flex items-center gap-6 border-b border-[#e7e1d5]/45 pb-1 overflow-x-auto scrollbar-none">
                    {[
                      { name: "Personal Information", key: "personal" },
                      { name: "Travel Preferences", key: "travel_preferences" },
                      { name: "Notification Preferences", key: "notifications" },
                      { name: "Security", key: "security" }
                    ].map((tab) => {
                      const isActive = activeProfileTab === tab.key;
                      return (
                        <button 
                          key={tab.key}
                          onClick={() => setActiveProfileTab(tab.key)}
                          className={`text-xs font-bold pb-2 border-b-2 transition-all whitespace-nowrap bg-transparent border-0 cursor-pointer ${isActive ? "border-[#FF5B26] text-[#FF5B26]" : "border-transparent text-nomichi-ink/50 hover:text-[#FF5B26]"}`}
                        >
                          {tab.name}
                        </button>
                      );
                    })}
                  </div>

                  {/* Two-Column Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column (Forms) */}
                    <div className="lg:col-span-2 space-y-8">
                      {activeProfileTab === "personal" ? (
                        <>
                          {/* Personal Information Form */}
                          <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-6">
                            <h3 className="font-display font-extrabold text-md text-nomichi-ink">Personal Information</h3>
                            
                            <form onSubmit={handleSaveProfileChanges} className="space-y-6">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                {/* Full Name */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-nomichi-ink/65 block">Full Name</label>
                                  <input 
                                    id="profile-fullname"
                                    type="text" 
                                    required
                                    value={profileForm.fullName}
                                    onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                                    placeholder="Enter your full name"
                                    className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                  />
                                </div>

                                {/* Gender */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-nomichi-ink/65 block">Gender</label>
                                  <div className="relative">
                                    <select 
                                      value={profileForm.gender}
                                      onChange={(e) => setProfileForm({ ...profileForm, gender: e.target.value })}
                                      className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink appearance-none cursor-pointer"
                                    >
                                      <option value="">Select Gender</option>
                                      <option value="Female">Female</option>
                                      <option value="Male">Male</option>
                                      <option value="Other">Other</option>
                                      <option value="Prefer not to say">Prefer not to say</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-nomichi-ink/40 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Email Address */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-nomichi-ink/65 block">Email Address</label>
                                  <input 
                                    type="email" 
                                    required
                                    value={profileForm.email}
                                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                                    placeholder="yourname@example.com"
                                    className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                  />
                                </div>

                                {/* Nationality */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-nomichi-ink/65 block">Nationality</label>
                                  <div className="relative">
                                    <select 
                                      value={profileForm.nationality}
                                      onChange={(e) => setProfileForm({ ...profileForm, nationality: e.target.value })}
                                      className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink appearance-none cursor-pointer"
                                    >
                                      <option value="">Select Nationality</option>
                                      <option value="Indian">Indian</option>
                                      <option value="American">American</option>
                                      <option value="British">British</option>
                                      <option value="Canadian">Canadian</option>
                                      <option value="Australian">Australian</option>
                                      <option value="Other">Other</option>
                                    </select>
                                    <ChevronDown className="w-4 h-4 text-nomichi-ink/40 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>

                                {/* Phone Number */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-nomichi-ink/65 block">Phone Number</label>
                                  <div className="flex items-center gap-2 bg-[#FAF8F4] border border-[#e7e1d5]/50 rounded-xl px-3 py-1.5">
                                    <div className="flex items-center gap-1 cursor-pointer select-none">
                                      <span className="text-base">🇮🇳</span>
                                      <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40" />
                                    </div>
                                    <div className="w-px h-5 bg-[#e7e1d5] mx-1" />
                                    <input 
                                      type="tel" 
                                      value={profileForm.phone}
                                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                                      placeholder="+91 XXXXX XXXXX"
                                      className="bg-transparent text-xs font-semibold text-nomichi-ink focus:outline-none w-full py-1.5"
                                    />
                                  </div>
                                </div>

                                {/* Date of Birth */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-nomichi-ink/65 block">Date of Birth</label>
                                  <input 
                                    type="date" 
                                    value={profileForm.dateOfBirth}
                                    onChange={(e) => setProfileForm({ ...profileForm, dateOfBirth: e.target.value })}
                                    className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] px-4 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink cursor-pointer"
                                  />
                                </div>
                              </div>

                              <button 
                                type="submit" 
                                disabled={savingProfile}
                                className="w-full py-3.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2"
                              >
                                {savingProfile ? "Saving Changes..." : "Save Changes"}
                              </button>
                            </form>
                          </div>

                          {/* Emergency Contact Card */}
                          <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-4">
                            <div>
                              <h3 className="font-display font-extrabold text-md text-nomichi-ink">Emergency Contact</h3>
                              <p className="text-[10px] text-nomichi-ink/50 font-medium mt-0.5">This contact will be used in case of emergency during your trips.</p>
                            </div>

                            {isEditingEmergency ? (
                              <form onSubmit={handleSaveEmergencyContact} className="bg-[#FAF8F4]/50 border border-[#e7e1d5]/40 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-nomichi-ink/60 block">Contact Name</label>
                                    <input 
                                      type="text"
                                      required
                                      value={emergencyForm.name}
                                      onChange={(e) => setEmergencyForm({ ...emergencyForm, name: e.target.value })}
                                      placeholder="e.g. Rohit Jhode"
                                      className="w-full border border-[#e7e1d5]/40 bg-white px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-nomichi-ink/60 block">Relation</label>
                                    <input 
                                      type="text"
                                      required
                                      value={emergencyForm.relation}
                                      onChange={(e) => setEmergencyForm({ ...emergencyForm, relation: e.target.value })}
                                      placeholder="e.g. Brother"
                                      className="w-full border border-[#e7e1d5]/40 bg-white px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                    />
                                  </div>
                                  <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-nomichi-ink/60 block">Phone Number</label>
                                    <input 
                                      type="tel"
                                      required
                                      value={emergencyForm.phone}
                                      onChange={(e) => setEmergencyForm({ ...emergencyForm, phone: e.target.value })}
                                      placeholder="e.g. +91 91234 56789"
                                      className="w-full border border-[#e7e1d5]/40 bg-white px-3 py-2 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end gap-2 pt-2 border-t border-[#e7e1d5]/20">
                                  <button 
                                    type="button" 
                                    onClick={() => {
                                      setIsEditingEmergency(false);
                                      setEmergencyForm({
                                        name: profileData?.emergency_contact_name || "",
                                        phone: profileData?.emergency_contact_phone || "",
                                        relation: profileData?.emergency_contact_relation || ""
                                      });
                                    }}
                                    className="px-4 py-2 border border-[#e7e1d5]/50 text-nomichi-ink hover:bg-[#FAF8F4] text-xs font-bold rounded-xl transition-all"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="submit"
                                    className="px-4 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white text-xs font-bold rounded-xl shadow-sm transition-all"
                                  >
                                    Save Contact
                                  </button>
                                </div>
                              </form>
                            ) : (
                              <div className="bg-[#FAF8F4]/40 border border-[#e7e1d5]/30 rounded-2xl p-4 flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4">
                                  <div className="w-10 h-10 rounded-full bg-nomichi-sand/15 flex items-center justify-center text-nomichi-rust shrink-0">
                                    <UserIcon className="w-5 h-5 stroke-[1.8px]" />
                                  </div>
                                  <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h4 className="text-xs font-extrabold text-nomichi-ink">
                                        {profileData?.emergency_contact_name || "Rohit Jhode"} {profileData?.emergency_contact_relation && `(${profileData.emergency_contact_relation})`}
                                      </h4>
                                      <span className="bg-[#E8F8F0] text-[#10B981] text-[9px] font-black px-2 py-0.5 rounded-full border border-[#10B981]/10 uppercase tracking-wider">
                                        Primary Contact
                                      </span>
                                    </div>
                                    <p className="text-xs font-semibold text-nomichi-ink/50 leading-none">
                                      {profileData?.emergency_contact_phone || "+91 91234 56789"}
                                    </p>
                                  </div>
                                </div>
                                <button 
                                  onClick={() => setIsEditingEmergency(true)}
                                  className="border border-[#e7e1d5]/80 hover:bg-[#FAF8F4] text-nomichi-ink/80 text-[10px] font-extrabold px-3 py-1.5 rounded-xl transition-all shadow-sm"
                                >
                                  Edit
                                </button>
                              </div>
                            )}
                          </div>
                        </>
                      ) : activeProfileTab === "travel_preferences" ? (
                        <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-6 text-left">
                          <form onSubmit={handleSaveTravelPrefs} className="space-y-6">
                            
                            {/* Travel Style */}
                            <div className="space-y-3">
                              <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                Travel Style
                              </label>
                              <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
                                {[
                                  { name: "Adventure", icon: Mountain },
                                  { name: "Luxury", icon: Gem },
                                  { name: "Cultural", icon: Landmark },
                                  { name: "Nature", icon: Leaf },
                                  { name: "Beach", icon: Palmtree },
                                  { name: "Wildlife", icon: PawPrint },
                                  { name: "Spiritual", icon: Flower },
                                  { name: "Road Trips", icon: Car }
                                ].map((style) => {
                                  const isSelected = travelPrefs.travel_style?.includes(style.name);
                                  return (
                                    <button
                                      key={style.name}
                                      type="button"
                                      onClick={() => toggleTravelPrefArray('travel_style', style.name)}
                                      className={`flex flex-col items-center justify-center p-3.5 rounded-2xl border transition-all text-center min-h-[90px] ${
                                        isSelected
                                          ? "border-[#FF5B26] bg-[#FFEFEA]/15 text-[#FF5B26] shadow-sm font-bold animate-in fade-in zoom-in-95 duration-100"
                                          : "border-[#e7e1d5]/60 bg-white text-nomichi-ink hover:border-[#FF5B26]/40"
                                      }`}
                                    >
                                      <style.icon className={`w-5 h-5 mb-2 stroke-[1.8px] ${isSelected ? "text-[#FF5B26]" : "text-nomichi-ink/50"}`} />
                                      <span className="text-[10px] font-extrabold tracking-tight">{style.name}</span>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Dropdowns Row 1: Destinations, Months, Budget */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                              <CustomMultiSelect 
                                label="Preferred Destinations"
                                icon={Globe}
                                options={["Asia", "Europe", "Middle East", "India", "South America"]}
                                selectedValues={travelPrefs.preferred_destinations || []}
                                onToggle={(val) => toggleTravelPrefArray('preferred_destinations', val)}
                                isOpen={activeDropdown === 'destinations'}
                                onToggleOpen={() => setActiveDropdown(activeDropdown === 'destinations' ? null : 'destinations')}
                              />

                              <CustomMultiSelect 
                                label="Preferred Months"
                                icon={Calendar}
                                options={["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]}
                                selectedValues={travelPrefs.preferred_months || []}
                                onToggle={(val) => toggleTravelPrefArray('preferred_months', val)}
                                isOpen={activeDropdown === 'months'}
                                onToggleOpen={() => setActiveDropdown(activeDropdown === 'months' ? null : 'months')}
                              />

                              <CustomSingleSelect 
                                label="Budget Range (per person)"
                                icon={Wallet}
                                options={["Under ₹50,000", "₹50k - ₹1L", "₹1L - ₹2L", "₹2L+"]}
                                selectedValue={travelPrefs.budget_range || ""}
                                onChange={(val) => setTravelPrefs({ ...travelPrefs, budget_range: val })}
                                isOpen={activeDropdown === 'budget'}
                                onToggleOpen={() => setActiveDropdown(activeDropdown === 'budget' ? null : 'budget')}
                              />
                            </div>

                            {/* Dropdowns Row 2: Group, Accommodation, Dietary */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2">
                              {/* Group Preference */}
                              <div className="space-y-1.5 w-full text-left">
                                <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                  <Users className="w-3.5 h-3.5 text-nomichi-ink/40 stroke-[1.8px]" />
                                  Group Preference
                                </label>
                                <div className="flex flex-wrap gap-2 min-h-[42px] items-center">
                                  {["Solo", "Couple", "Friends", "Family"].map((group) => {
                                    const isSelected = travelPrefs.group_preference === group;
                                    return (
                                      <button
                                        key={group}
                                        type="button"
                                        onClick={() => setTravelPrefs({ ...travelPrefs, group_preference: group })}
                                        className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all border ${
                                          isSelected
                                            ? "border-[#FF5B26] bg-white text-[#FF5B26] shadow-sm font-bold"
                                            : "border-[#e7e1d5]/50 bg-white text-nomichi-ink/70 hover:border-[#FF5B26]/30"
                                        }`}
                                      >
                                        {group}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>

                              <CustomMultiSelect 
                                label="Accommodation Preference"
                                icon={Bed}
                                options={["Hotel", "Resort", "Boutique Stay", "Homestay"]}
                                selectedValues={
                                  Array.isArray(travelPrefs.accommodation_preference) 
                                    ? travelPrefs.accommodation_preference 
                                    : travelPrefs.accommodation_preference 
                                      ? [travelPrefs.accommodation_preference] 
                                      : []
                                }
                                onToggle={(val) => {
                                  const current = Array.isArray(travelPrefs.accommodation_preference) 
                                    ? travelPrefs.accommodation_preference 
                                    : travelPrefs.accommodation_preference 
                                      ? [travelPrefs.accommodation_preference] 
                                      : [];
                                  const updated = current.includes(val) 
                                    ? current.filter(v => v !== val) 
                                    : [...current, val];
                                  setTravelPrefs({ ...travelPrefs, accommodation_preference: updated as any });
                                }}
                                isOpen={activeDropdown === 'accommodation'}
                                onToggleOpen={() => setActiveDropdown(activeDropdown === 'accommodation' ? null : 'accommodation')}
                              />

                              <CustomSingleSelect 
                                label="Dietary Preference"
                                icon={Utensils}
                                options={["Vegetarian", "Vegan", "Jain", "Non-Vegetarian"]}
                                selectedValue={travelPrefs.dietary_preference || ""}
                                onChange={(val) => setTravelPrefs({ ...travelPrefs, dietary_preference: val })}
                                isOpen={activeDropdown === 'dietary'}
                                onToggleOpen={() => setActiveDropdown(activeDropdown === 'dietary' ? null : 'dietary')}
                              />
                            </div>

                            {/* Activity Interests */}
                            <div className="space-y-3 pt-2">
                              <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider flex items-center gap-1.5 select-none">
                                <Star className="w-3.5 h-3.5 text-nomichi-ink/40 stroke-[1.8px]" />
                                Activity Interests
                              </label>
                              <div className="flex flex-wrap gap-2.5">
                                {["Trekking", "Scuba Diving", "Photography", "Skiing", "Food Tours", "Shopping"].map((act) => {
                                  const isSelected = travelPrefs.activity_interests?.includes(act);
                                  return (
                                    <button
                                      key={act}
                                      type="button"
                                      onClick={() => toggleTravelPrefArray('activity_interests', act)}
                                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                                        isSelected
                                          ? "border-[#FF5B26] bg-white text-[#FF5B26] shadow-sm font-bold"
                                          : "border-[#e7e1d5]/50 bg-white text-nomichi-ink/70 hover:border-[#FF5B26]/30"
                                      }`}
                                    >
                                      {act}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="w-full mt-4 py-3.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2 select-none"
                            >
                              {savingProfile ? "Saving Preferences..." : "Save Preferences"}
                            </button>
                          </form>
                        </div>
                      ) : activeProfileTab === "notifications" ? (
                        <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-8 text-left">
                          <div>
                            <h3 className="font-display font-extrabold text-md text-nomichi-ink">Notification Preferences</h3>
                            <p className="text-[10px] text-nomichi-ink/50 font-medium mt-0.5">Control how and when you receive updates about your enquiries, bookings, and reminders.</p>
                          </div>

                          <form onSubmit={handleSaveNotifications} className="space-y-8">
                            {/* Email Notifications */}
                            <div className="space-y-4">
                              <h4 className="text-xs font-extrabold text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2">Email Notifications</h4>
                              <div className="space-y-2">
                                <CustomCheckbox 
                                  label="Enquiry Updates"
                                  checked={notificationPrefs.email.enquiry_updates}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, enquiry_updates: !notificationPrefs.email.enquiry_updates }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Trip Confirmations"
                                  checked={notificationPrefs.email.trip_confirmations}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, trip_confirmations: !notificationPrefs.email.trip_confirmations }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Payment Receipts"
                                  checked={notificationPrefs.email.payment_receipts}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, payment_receipts: !notificationPrefs.email.payment_receipts }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Itinerary Updates"
                                  checked={notificationPrefs.email.itinerary_updates}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, itinerary_updates: !notificationPrefs.email.itinerary_updates }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Marketing Offers"
                                  checked={notificationPrefs.email.marketing_offers}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, marketing_offers: !notificationPrefs.email.marketing_offers }
                                  })}
                                />
                              </div>
                            </div>

                            {/* WhatsApp Notifications */}
                            <div className="space-y-4 pt-4 border-t border-[#e7e1d5]/30">
                              <h4 className="text-xs font-extrabold text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2">WhatsApp Notifications</h4>
                              <div className="space-y-2">
                                <CustomCheckbox 
                                  label="Trip Updates"
                                  checked={notificationPrefs.whatsapp.trip_updates}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    whatsapp: { ...notificationPrefs.whatsapp, trip_updates: !notificationPrefs.whatsapp.trip_updates }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Team Messages"
                                  checked={notificationPrefs.whatsapp.team_messages}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    whatsapp: { ...notificationPrefs.whatsapp, team_messages: !notificationPrefs.whatsapp.team_messages }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Booking Confirmations"
                                  checked={notificationPrefs.whatsapp.booking_confirmations}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    whatsapp: { ...notificationPrefs.whatsapp, booking_confirmations: !notificationPrefs.whatsapp.booking_confirmations }
                                  })}
                                />
                              </div>
                            </div>

                            {/* Push Notifications */}
                            <div className="space-y-4 pt-4 border-t border-[#e7e1d5]/30">
                              <h4 className="text-xs font-extrabold text-nomichi-ink uppercase tracking-wider border-b border-[#e7e1d5]/30 pb-2">Push Notifications</h4>
                              <div className="space-y-2">
                                <CustomCheckbox 
                                  label="New Messages"
                                  checked={notificationPrefs.push.new_messages}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    push: { ...notificationPrefs.push, new_messages: !notificationPrefs.push.new_messages }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Upcoming Journey Reminders"
                                  checked={notificationPrefs.push.upcoming_journey_reminders}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    push: { ...notificationPrefs.push, upcoming_journey_reminders: !notificationPrefs.push.upcoming_journey_reminders }
                                  })}
                                />
                                <CustomCheckbox 
                                  label="Important Travel Alerts"
                                  checked={notificationPrefs.push.important_travel_alerts}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    push: { ...notificationPrefs.push, important_travel_alerts: !notificationPrefs.push.important_travel_alerts }
                                  })}
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="w-full py-3.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2"
                            >
                              {savingProfile ? "Saving Notification Preferences..." : "Save Notification Preferences"}
                            </button>
                          </form>
                        </div>
                      ) : activeProfileTab === "notifications" ? (
                        <div className="space-y-6 text-left animate-in fade-in duration-300">
                          <div>
                            <h3 className="font-display font-extrabold text-md text-nomichi-ink">Notification Preferences</h3>
                            <p className="text-[10px] text-nomichi-ink/50 font-medium mt-0.5">Choose how you want to stay updated with your travel plans.</p>
                          </div>

                          <form onSubmit={handleSaveNotifications} className="space-y-6">
                            
                            {/* Email Notifications Card */}
                            <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-6">
                              <div className="flex items-center justify-between gap-4 border-b border-[#e7e1d5]/20 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center shrink-0">
                                    <Mail className="w-5 h-5 stroke-[1.8px]" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-nomichi-ink">Email Notifications</h4>
                                    <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Receive important updates and confirmations via email.</p>
                                  </div>
                                </div>
                                <div 
                                  onClick={toggleEmailSelectAll}
                                  className="flex items-center gap-2 select-none cursor-pointer"
                                >
                                  <span className="text-[10px] font-bold text-nomichi-ink/40">Select all</span>
                                  <div 
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      emailSelectAll 
                                        ? "bg-[#FF5B26] border-[#FF5B26] text-white" 
                                        : "bg-white border-[#e7e1d5] text-transparent hover:border-[#FF5B26]/50"
                                    }`}
                                  >
                                    {emailSelectAll && (
                                      <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <NotificationCheckbox 
                                  label="Enquiry Updates"
                                  subtitle="Updates on your enquiries"
                                  checked={notificationPrefs.email.enquiry_updates}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, enquiry_updates: !notificationPrefs.email.enquiry_updates }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Trip Confirmations"
                                  subtitle="When your trip is confirmed"
                                  checked={notificationPrefs.email.trip_confirmations}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, trip_confirmations: !notificationPrefs.email.trip_confirmations }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Payment Receipts"
                                  subtitle="Receipts for payments"
                                  checked={notificationPrefs.email.payment_receipts}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, payment_receipts: !notificationPrefs.email.payment_receipts }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Itinerary Updates"
                                  subtitle="Changes to your itinerary"
                                  checked={notificationPrefs.email.itinerary_updates}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, itinerary_updates: !notificationPrefs.email.itinerary_updates }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Marketing Offers"
                                  subtitle="Deals, offers and newsletters"
                                  checked={notificationPrefs.email.marketing_offers}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    email: { ...notificationPrefs.email, marketing_offers: !notificationPrefs.email.marketing_offers }
                                  })}
                                />
                              </div>
                            </div>

                            {/* WhatsApp Notifications Card */}
                            <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-6">
                              <div className="flex items-center justify-between gap-4 border-b border-[#e7e1d5]/20 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0">
                                    <MessageSquare className="w-4.5 h-4.5 stroke-[1.8px]" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-nomichi-ink">WhatsApp Notifications</h4>
                                    <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Get real-time updates on WhatsApp.</p>
                                  </div>
                                </div>
                                <div 
                                  onClick={toggleWhatsappSelectAll}
                                  className="flex items-center gap-2 select-none cursor-pointer"
                                >
                                  <span className="text-[10px] font-bold text-nomichi-ink/40">Select all</span>
                                  <div 
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      whatsappSelectAll 
                                        ? "bg-[#FF5B26] border-[#FF5B26] text-white" 
                                        : "bg-white border-[#e7e1d5] text-transparent hover:border-[#FF5B26]/50"
                                    }`}
                                  >
                                    {whatsappSelectAll && (
                                      <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <NotificationCheckbox 
                                  label="Trip Updates"
                                  subtitle="Important updates about your trip"
                                  checked={notificationPrefs.whatsapp.trip_updates}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    whatsapp: { ...notificationPrefs.whatsapp, trip_updates: !notificationPrefs.whatsapp.trip_updates }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Team Messages"
                                  subtitle="Messages from Nomichi team"
                                  checked={notificationPrefs.whatsapp.team_messages}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    whatsapp: { ...notificationPrefs.whatsapp, team_messages: !notificationPrefs.whatsapp.team_messages }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Booking Confirmations"
                                  subtitle="Bookings and confirmations"
                                  checked={notificationPrefs.whatsapp.booking_confirmations}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    whatsapp: { ...notificationPrefs.whatsapp, booking_confirmations: !notificationPrefs.whatsapp.booking_confirmations }
                                  })}
                                />
                              </div>
                            </div>

                            {/* Push Notifications Card */}
                            <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-6">
                              <div className="flex items-center justify-between gap-4 border-b border-[#e7e1d5]/20 pb-3">
                                <div className="flex items-center gap-3">
                                  <div className="w-9 h-9 rounded-full bg-[#EBF3FE] text-[#3B82F6] flex items-center justify-center shrink-0">
                                    <Bell className="w-4.5 h-4.5 stroke-[1.8px]" />
                                  </div>
                                  <div>
                                    <h4 className="text-xs font-black text-nomichi-ink">Push Notifications</h4>
                                    <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Notifications on your device.</p>
                                  </div>
                                </div>
                                <div 
                                  onClick={togglePushSelectAll}
                                  className="flex items-center gap-2 select-none cursor-pointer"
                                >
                                  <span className="text-[10px] font-bold text-nomichi-ink/40">Select all</span>
                                  <div 
                                    className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-all ${
                                      pushSelectAll 
                                        ? "bg-[#FF5B26] border-[#FF5B26] text-white" 
                                        : "bg-white border-[#e7e1d5] text-transparent hover:border-[#FF5B26]/50"
                                    }`}
                                  >
                                    {pushSelectAll && (
                                      <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                                      </svg>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                                <NotificationCheckbox 
                                  label="New Messages"
                                  subtitle="When you receive a new message"
                                  checked={notificationPrefs.push.new_messages}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    push: { ...notificationPrefs.push, new_messages: !notificationPrefs.push.new_messages }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Upcoming Journey Reminders"
                                  subtitle="Reminders before your trip"
                                  checked={notificationPrefs.push.upcoming_journey_reminders}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    push: { ...notificationPrefs.push, upcoming_journey_reminders: !notificationPrefs.push.upcoming_journey_reminders }
                                  })}
                                />
                                <NotificationCheckbox 
                                  label="Important Travel Alerts"
                                  subtitle="Alerts about safety or travel"
                                  checked={notificationPrefs.push.important_travel_alerts}
                                  onChange={() => setNotificationPrefs({
                                    ...notificationPrefs,
                                    push: { ...notificationPrefs.push, important_travel_alerts: !notificationPrefs.push.important_travel_alerts }
                                  })}
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              disabled={savingProfile}
                              className="w-full py-3.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all text-center flex items-center justify-center gap-2 select-none"
                            >
                              {savingProfile ? "Saving Notification Preferences..." : "Save Notification Preferences"}
                            </button>
                          </form>
                        </div>
                      ) : activeProfileTab === "security" ? (
                        <div className="space-y-6 text-left animate-in fade-in duration-300">
                          
                          {/* Change Password Card */}
                          {!isChangePasswordExpanded ? (
                            <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm flex items-center justify-between gap-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="text-left leading-none">
                                <h3 className="font-display font-extrabold text-sm text-nomichi-ink">Change Password</h3>
                                <p className="text-[10px] text-nomichi-ink/50 font-semibold leading-normal mt-2.5">Choose a strong password to keep your account secure.</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setIsChangePasswordExpanded(true)}
                                className="px-4 py-2.5 border border-[#e7e1d5]/80 hover:bg-[#FAF8F4] text-nomichi-ink font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer bg-transparent whitespace-nowrap"
                              >
                                Change Password
                              </button>
                            </div>
                          ) : (
                            <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                              <div className="flex items-center justify-between gap-4">
                                <div className="text-left">
                                  <h3 className="font-display font-extrabold text-sm text-nomichi-ink">Change Password</h3>
                                  <p className="text-[10px] text-nomichi-ink/50 font-semibold leading-normal mt-1">Choose a strong password to keep your account secure.</p>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setIsChangePasswordExpanded(false);
                                    setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                  }}
                                  className="px-4 py-2.5 border border-[#e7e1d5]/80 hover:bg-[#FAF8F4] text-nomichi-ink font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer bg-transparent whitespace-nowrap"
                                >
                                  Change Password
                                </button>
                              </div>

                              <form onSubmit={handleUpdatePassword} className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start relative">
                                <div className="lg:col-span-2 space-y-4">
                                  {/* Current Password */}
                                  <div className="space-y-1.5">
                                    <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider block">Current Password</label>
                                    <div className="relative">
                                      <input 
                                        type={showCurrentPassword ? "text" : "password"} 
                                        required
                                        value={passwordForm.currentPassword}
                                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                                        placeholder="••••••••••••"
                                        className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] pl-4 pr-10 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                      />
                                      <button
                                        type="button"
                                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-nomichi-ink/40 hover:text-nomichi-ink transition-colors bg-transparent border-0 cursor-pointer"
                                      >
                                        {showCurrentPassword ? <EyeOff className="w-4.5 h-4.5 stroke-[1.8px]" /> : <Eye className="w-4.5 h-4.5 stroke-[1.8px]" />}
                                      </button>
                                    </div>
                                  </div>

                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {/* New Password */}
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider block">New Password</label>
                                      <div className="relative">
                                        <input 
                                          type={showNewPassword ? "text" : "password"} 
                                          required
                                          value={passwordForm.newPassword}
                                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                          placeholder="••••••••••••"
                                          className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] pl-4 pr-10 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setShowNewPassword(!showNewPassword)}
                                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-nomichi-ink/40 hover:text-nomichi-ink transition-colors bg-transparent border-0 cursor-pointer"
                                        >
                                          {showNewPassword ? <EyeOff className="w-4.5 h-4.5 stroke-[1.8px]" /> : <Eye className="w-4.5 h-4.5 stroke-[1.8px]" />}
                                        </button>
                                      </div>
                                    </div>

                                    {/* Confirm New Password */}
                                    <div className="space-y-1.5">
                                      <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider block">Confirm New Password</label>
                                      <div className="relative">
                                        <input 
                                          type={showConfirmPassword ? "text" : "password"} 
                                          required
                                          value={passwordForm.confirmPassword}
                                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                          placeholder="••••••••••••"
                                          className="w-full border border-[#e7e1d5]/50 bg-[#FAF8F4] pl-4 pr-10 py-3 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-nomichi-ink/40 hover:text-nomichi-ink transition-colors bg-transparent border-0 cursor-pointer"
                                        >
                                          {showConfirmPassword ? <EyeOff className="w-4.5 h-4.5 stroke-[1.8px]" /> : <Eye className="w-4.5 h-4.5 stroke-[1.8px]" />}
                                        </button>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Requirements Checklist */}
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2.5 pt-3">
                                    <Requirement label="At least 8 characters long" met={passwordForm.newPassword.length >= 8} />
                                    <Requirement label="Includes a special character" met={/[!@#$%^&*(),.?":{}|<>_]/.test(passwordForm.newPassword)} />
                                    <Requirement label="Includes a number" met={/\d/.test(passwordForm.newPassword)} />
                                    <Requirement label="Passwords match" met={passwordForm.newPassword !== "" && passwordForm.newPassword === passwordForm.confirmPassword} />
                                    <Requirement label="Includes an uppercase letter" met={/[A-Z]/.test(passwordForm.newPassword)} />
                                  </div>
                                </div>

                                {/* Right Side Lock Ornament */}
                                <div className="hidden lg:flex flex-col items-center justify-center h-full pt-4">
                                  <div className="w-16 h-16 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center border border-[#FF5B26]/10 mb-2.5">
                                    <Lock className="w-7 h-7 stroke-[1.8px]" />
                                  </div>
                                  <span className="text-sm font-black text-[#FF5B26] tracking-widest">★★★★★</span>
                                </div>

                                <div className="lg:col-span-3 flex justify-end gap-3 pt-4 border-t border-[#e7e1d5]/20 w-full">
                                  <button 
                                    type="button"
                                    onClick={() => {
                                      setIsChangePasswordExpanded(false);
                                      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
                                    }}
                                    className="px-4 py-2 text-nomichi-ink hover:underline text-xs font-bold transition-all bg-transparent border-0 cursor-pointer"
                                  >
                                    Cancel
                                  </button>
                                  <button 
                                    type="submit"
                                    disabled={passwordUpdating}
                                    className="px-5 py-2.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white text-xs font-extrabold rounded-xl shadow-sm hover:shadow transition-all cursor-pointer border-0"
                                  >
                                    {passwordUpdating ? "Updating..." : "Update Password"}
                                  </button>
                                </div>
                              </form>
                            </div>
                          )}

                          {/* Two-Factor Authentication (2FA) Card */}
                          <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm flex items-center justify-between gap-4">
                            <div className="flex items-start gap-4 text-left">
                              <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 border ${
                                securitySettings.two_factor_enabled 
                                  ? "bg-[#E8F8F0] text-[#10B981] border-[#10B981]/15" 
                                  : "bg-[#FAF8F4] text-nomichi-ink/40 border-[#e7e1d5]/40"
                              }`}>
                                <ShieldCheck className="w-5 h-5 stroke-[1.8px]" />
                              </div>
                              <div className="text-left leading-none">
                                <div className="flex flex-wrap items-center gap-2.5">
                                  <h3 className="font-display font-extrabold text-sm text-nomichi-ink">Two-Factor Authentication (2FA)</h3>
                                  {securitySettings.two_factor_enabled ? (
                                    <span className="bg-[#E8F8F0] text-[#10B981] text-[9px] font-black px-2.5 py-1 rounded-full border border-[#10B981]/10 uppercase tracking-wider">
                                      Enabled
                                    </span>
                                  ) : (
                                    <span className="bg-[#FAF8F4] text-nomichi-ink/40 text-[9px] font-black px-2.5 py-1 rounded-full border border-[#e7e1d5]/40 uppercase tracking-wider">
                                      Disabled
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-nomichi-ink/50 font-semibold leading-relaxed mt-2.5">
                                  Add an extra layer of security to your account. You receive a verification code on your phone.
                                </p>
                                <div className="flex items-center gap-2 mt-3.5 bg-[#FAF8F4]/55 border border-[#e7e1d5]/35 px-3 py-1.5 rounded-xl w-fit">
                                  <Lock className="w-3.5 h-3.5 text-nomichi-ink/40 stroke-[2]" />
                                  <span className="text-[10px] font-bold text-nomichi-ink/70">Authenticator App (TOTP)</span>
                                  {securitySettings.two_factor_enabled ? (
                                    <span className="bg-[#E8F8F0] text-[#10B981] text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-[#10B981]/10 uppercase ml-1">
                                      Active
                                    </span>
                                  ) : (
                                    <span className="bg-[#FAF8F4] text-nomichi-ink/40 text-[8px] font-extrabold px-1.5 py-0.5 rounded-md border border-[#e7e1d5]/30 uppercase ml-1">
                                      Inactive
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleToggle2FA}
                              className="px-4 py-2.5 border border-[#e7e1d5]/80 hover:bg-[#FAF8F4] text-nomichi-ink font-extrabold text-xs rounded-xl shadow-sm transition-all shrink-0 cursor-pointer bg-transparent"
                            >
                              {securitySettings.two_factor_enabled ? "Disable 2FA" : "Enable 2FA"}
                            </button>
                          </div>

                          {/* Login Activity Card */}
                          <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-4">
                            <div className="flex items-center justify-between border-b border-[#e7e1d5]/25 pb-3">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#EBF3FE] text-[#3B82F6] flex items-center justify-center shrink-0">
                                  <Lock className="w-4.5 h-4.5 stroke-[1.8px]" />
                                </div>
                                <div className="text-left">
                                  <h3 className="font-display font-extrabold text-sm text-nomichi-ink">Login Activity</h3>
                                  <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Review your active login sessions.</p>
                                </div>
                              </div>
                            </div>

                            <div className="divide-y divide-[#e7e1d5]/25">
                              {currentSession ? (
                                <div className="flex items-center justify-between py-3.5 first:pt-1 last:pb-1 animate-in fade-in duration-200">
                                  <div className="flex items-start gap-3 text-left">
                                    <span className="text-xl pt-0.5">
                                      {currentSession.os === 'iOS' || currentSession.os === 'Android' ? '📱' : '💻'}
                                    </span>
                                    <div>
                                      <h5 className="text-xs font-black text-nomichi-ink">
                                        {currentSession.device} • {currentSession.browser} • {currentSession.os}
                                      </h5>
                                      <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">
                                        Active now • Current Session
                                      </p>
                                    </div>
                                  </div>
                                  <span className="bg-[#E8F8F0] text-[#10B981] text-[9px] font-black px-2.5 py-1 rounded-full border border-[#10B981]/10 uppercase tracking-wider">
                                    Current Session
                                  </span>
                                </div>
                              ) : (
                                <div className="py-4 text-center text-xs text-nomichi-ink/40 font-medium">
                                  Detecting session details...
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Delete Account Card */}
                          <div className="bg-[#FFF5F5] rounded-3xl border border-[#FEB2B2]/40 p-6 shadow-sm flex items-center justify-between gap-4">
                            <div className="flex items-start gap-4 text-left">
                              <div className="w-10 h-10 rounded-full bg-[#FFF5F5] text-[#C53030] flex items-center justify-center shrink-0 border border-[#FEB2B2]/20">
                                🗑️
                              </div>
                              <div className="leading-none">
                                <h3 className="font-display font-extrabold text-sm text-[#C53030]">Delete Account</h3>
                                <p className="text-[10px] text-[#E53E3E] font-medium leading-relaxed mt-2.5">
                                  Permanently delete your account and all associated data.
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={handleDeleteAccount}
                              className="px-4 py-2.5 border border-[#FEB2B2] hover:bg-[#FFF5F5] text-[#E53E3E] font-extrabold text-xs rounded-xl shadow-sm transition-all shrink-0 cursor-pointer bg-transparent"
                            >
                              Delete Account
                            </button>
                          </div>
                        </div>
                      ) : null}
                    </div>

                    {/* Right Column (Widgets) */}
                    <div className="space-y-6">
                      {/* Account Summary Widget */}
                      <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-5">
                        <h3 className="font-display font-extrabold text-sm text-nomichi-ink text-left">Account Summary</h3>
                        
                        <div className="space-y-3.5">
                          {/* Enquiries */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center shrink-0 border border-[#FF5B26]/10">
                                <Send className="w-4.5 h-4.5 stroke-[1.8px] rotate-45 -translate-y-0.5 translate-x-0.5" />
                              </div>
                              <div className="text-left leading-none">
                                <span className="text-sm font-black text-nomichi-ink block">{leads.length}</span>
                                <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block mt-0.5">Enquiries</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => navigateToView("enquiries")}
                              className="bg-transparent border-0 text-[10px] font-extrabold text-[#FF5B26] hover:underline hover:text-[#b04b1e] cursor-pointer"
                            >
                              View all
                            </button>
                          </div>

                          {/* Upcoming Journeys */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center shrink-0 border border-[#FF5B26]/10">
                                <Calendar className="w-4.5 h-4.5 stroke-[1.8px]" />
                              </div>
                              <div className="text-left leading-none">
                                <span className="text-sm font-black text-nomichi-ink block">{profileData?.completed_journeys ? 1 : 0}</span>
                                <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block mt-0.5">Upcoming Journey</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => navigateToView("journeys")}
                              className="bg-transparent border-0 text-[10px] font-extrabold text-[#FF5B26] hover:underline hover:text-[#b04b1e] cursor-pointer"
                            >
                              View all
                            </button>
                          </div>

                          {/* Wishlist Items */}
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center shrink-0 border border-[#FF5B26]/10">
                                <Heart className="w-4.5 h-4.5 stroke-[1.8px]" />
                              </div>
                              <div className="text-left leading-none">
                                <span className="text-sm font-black text-nomichi-ink block">{wishlist.length}</span>
                                <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider block mt-0.5">Wishlist Items</span>
                              </div>
                            </div>
                            <button 
                              onClick={() => navigateToView("wishlist")}
                              className="bg-transparent border-0 text-[10px] font-extrabold text-[#FF5B26] hover:underline hover:text-[#b04b1e] cursor-pointer"
                            >
                              View all
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Travel Preferences (Quick View) */}
                      <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-4">
                        <div className="flex items-center justify-between">
                          <h3 className="font-display font-extrabold text-sm text-nomichi-ink text-left">Travel Preferences (Quick View)</h3>
                          <button 
                            onClick={() => setActiveProfileTab("travel_preferences")}
                            className="text-nomichi-ink/40 hover:text-[#FF5B26] bg-transparent border-0 cursor-pointer"
                          >
                            <Edit className="w-4 h-4 stroke-[2]" />
                          </button>
                        </div>

                        <div className="space-y-2.5">
                          {/* Travel Style */}
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-[#e7e1d5]/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0">
                                <Mountain className="w-3.5 h-3.5 stroke-[2]" />
                              </div>
                              <span className="text-[11px] font-semibold text-nomichi-ink/50">Travel Style</span>
                            </div>
                            <span className="text-[11px] font-bold text-nomichi-ink truncate max-w-[150px] text-right">
                              {travelPrefs.travel_style?.length > 0 ? travelPrefs.travel_style.join(", ") : "Not set"}
                            </span>
                          </div>

                          {/* Group Type */}
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-[#e7e1d5]/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0">
                                <Users className="w-3.5 h-3.5 stroke-[2]" />
                              </div>
                              <span className="text-[11px] font-semibold text-nomichi-ink/50">Group Type</span>
                            </div>
                            <span className="text-[11px] font-bold text-nomichi-ink truncate max-w-[150px] text-right">
                              {travelPrefs.group_preference || "Not set"}
                            </span>
                          </div>

                          {/* Preferred Months */}
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-[#e7e1d5]/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0">
                                <Calendar className="w-3.5 h-3.5 stroke-[2]" />
                              </div>
                              <span className="text-[11px] font-semibold text-nomichi-ink/50">Preferred Months</span>
                            </div>
                            <span className="text-[11px] font-bold text-nomichi-ink truncate max-w-[150px] text-right">
                              {travelPrefs.preferred_months?.length > 0 ? travelPrefs.preferred_months.join(", ") : "Not set"}
                            </span>
                          </div>

                          {/* Preferred Destinations */}
                          <div className="flex items-center justify-between gap-4 py-2 border-b border-[#e7e1d5]/20">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0">
                                <Globe className="w-3.5 h-3.5 stroke-[2]" />
                              </div>
                              <span className="text-[11px] font-semibold text-nomichi-ink/50">Preferred Destinations</span>
                            </div>
                            <span className="text-[11px] font-bold text-nomichi-ink truncate max-w-[150px] text-right">
                              {travelPrefs.preferred_destinations?.length > 0 ? travelPrefs.preferred_destinations.join(", ") : "Not set"}
                            </span>
                          </div>

                          {/* Budget Range */}
                          <div className="flex items-center justify-between gap-4 py-2">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-[#E8F8F0] text-[#10B981] flex items-center justify-center shrink-0">
                                <Wallet className="w-3.5 h-3.5 stroke-[2]" />
                              </div>
                              <span className="text-[11px] font-semibold text-nomichi-ink/50">Budget Range</span>
                            </div>
                            <span className="text-[11px] font-bold text-nomichi-ink truncate max-w-[150px] text-right">
                              {travelPrefs.budget_range || "Not set"}
                            </span>
                          </div>
                        </div>

                        <div className="h-px bg-[#e7e1d5]/45" />

                        <button 
                          onClick={() => setActiveProfileTab("travel_preferences")}
                          className="w-full text-center text-xs font-black text-[#FF5B26] hover:text-[#b04b1e] hover:underline flex items-center justify-center gap-1 transition-colors bg-transparent border-0 cursor-pointer pt-1"
                        >
                          View Full Preferences
                          <ChevronRight className="w-4 h-4 mt-0.5" />
                        </button>
                      </div>

                      {/* Need Help? Widget */}
                      <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 p-6 shadow-sm space-y-4">
                        <div className="text-left">
                          <h3 className="font-display font-extrabold text-sm text-nomichi-ink leading-none">Need Help?</h3>
                          <p className="text-[10px] text-nomichi-ink/50 font-semibold mt-1.5">
                            We're here for you.
                          </p>
                        </div>

                        <div className="space-y-2.5">
                          <button 
                            onClick={() => navigateToView("messages")}
                            className="w-full py-3 bg-[#FFEFEA] hover:bg-[#FFEFEA]/80 text-[#FF5B26] font-extrabold text-xs rounded-xl flex items-center justify-center gap-2 transition-all border-0 cursor-pointer shadow-sm"
                          >
                            <MessageSquare className="w-4 h-4 stroke-[2]" />
                            Chat with Us
                          </button>
                          
                          <a 
                            href="tel:+919876543210"
                            className="w-full py-2.5 border border-[#e7e1d5]/80 hover:bg-[#FAF8F4] text-nomichi-ink/80 font-bold text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all text-center no-underline"
                          >
                            <Phone className="w-4 h-4 text-nomichi-ink/40 stroke-[2]" />
                            Call us at +91 98765 43210
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : currentView === "settings" ? (
            <SettingsView user={user} onBack={() => navigateToView("home")} />
          ) : (
            <div className="space-y-6 animate-in fade-in duration-300 text-left">
              {/* Header Row */}
              <div className="flex items-center justify-between gap-4 mb-2 text-left">
                <div className="leading-none">
                  <h2 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Messages</h2>
                  <p className="text-xs text-nomichi-ink/50 font-medium mt-1.5">Chat with our team and stay updated on your enquiries and trips.</p>
                </div>
                <button 
                  type="button"
                  onClick={() => {
                    setActiveThreadId("support-team");
                  }}
                  className="px-4 py-2.5 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md hover:shadow-lg transition-all flex items-center gap-2 border-0 cursor-pointer"
                >
                  <Edit className="w-4 h-4 stroke-[2.5]" />
                  New Message
                </button>
              </div>

              {/* Chat Wrapper Panel */}
              <div className="bg-nomichi-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col lg:flex-row h-[680px]">
                {/* Left Column: Chat threads list */}
                <div className="w-full lg:w-[420px] xl:w-[460px] border-r border-[#e7e1d5]/30 flex flex-col bg-white shrink-0 h-full">
                  {/* Search and Filters */}
                  <div className="px-5 pt-5 pb-3 border-b border-[#e7e1d5]/20 space-y-4">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-4 h-4 text-nomichi-ink/35 absolute left-4 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        value={chatSearchQuery}
                        onChange={(e) => setChatSearchQuery(e.target.value)}
                        placeholder="Search messages..."
                        className="w-full pl-11 pr-11 py-3 border border-[#e7e1d5]/50 bg-[#FAF8F4] rounded-2xl text-[13px] font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/40"
                      />
                      <button type="button" className="absolute right-4 top-1/2 -translate-y-1/2 text-nomichi-ink/40 hover:text-nomichi-ink bg-transparent border-0 cursor-pointer">
                        <SlidersHorizontal className="w-4 h-4 stroke-[1.8]" />
                      </button>
                    </div>

                    {/* Tabs — full width, evenly spaced */}
                    <div className="flex">
                      {["all", "team", "updates", "archived"].map((tab) => (
                        <button
                          key={tab}
                          type="button"
                          onClick={() => setChatActiveTab(tab as any)}
                          className={`flex-1 pb-3 text-[13px] font-bold capitalize relative bg-transparent border-0 cursor-pointer transition-colors ${
                            chatActiveTab === tab 
                              ? "text-[#FF5B26]" 
                              : "text-nomichi-ink/40 hover:text-nomichi-ink/70"
                          }`}
                        >
                          {tab}
                          {chatActiveTab === tab && (
                            <span className="absolute bottom-0 left-2 right-2 h-[2.5px] bg-[#FF5B26] rounded-full" />
                          )}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Threads List (scrollable) */}
                  <div className="flex-1 overflow-y-auto divide-y divide-[#e7e1d5]/15 p-2 space-y-1">
                    {filteredThreads.length > 0 ? (
                      filteredThreads.map(thread => {
                        const lastMsg = thread.messages[thread.messages.length - 1];
                        const isSelected = thread.id === activeThreadId;

                        return (
                          <div
                            key={thread.id}
                            onClick={() => {
                              setActiveThreadId(thread.id);
                              setChatThreads(prev => 
                                prev.map(t => t.id === thread.id ? { ...t, unreadCount: 0 } : t)
                              );
                            }}
                            className={`flex items-start gap-3 p-3.5 rounded-2xl cursor-pointer transition-all ${
                              isSelected 
                                ? "bg-[#FFEFEA]/45 border border-[#FF5B26]/10" 
                                : "hover:bg-[#FAF8F4]/50 border border-transparent"
                            }`}
                          >
                            {/* Avatar */}
                            <div className="relative shrink-0 select-none">
                              {thread.avatarUrl ? (
                                <img 
                                  src={thread.avatarUrl} 
                                  alt={thread.name} 
                                  className="w-10 h-10 rounded-full object-cover border border-[#e7e1d5]/20"
                                />
                              ) : (
                                <div className="w-10 h-10 rounded-full bg-[#FFEFEA] text-[#FF5B26] font-display font-extrabold text-xs flex items-center justify-center border border-[#FF5B26]/10">
                                  {thread.avatarText || thread.name.substring(0, 2).toUpperCase()}
                                </div>
                              )}
                              {thread.isOnline && (
                                <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#10B981] border-2 border-white rounded-full" />
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 min-w-0 text-left leading-none">
                              <div className="flex items-center justify-between gap-2">
                                <h5 className="text-xs font-black text-nomichi-ink truncate">{thread.name}</h5>
                                <span className="text-[9px] font-semibold text-nomichi-ink/35 whitespace-nowrap">{thread.lastTime}</span>
                              </div>
                              <p className="text-[10px] text-nomichi-ink/50 font-semibold leading-normal mt-2 line-clamp-2">
                                {lastMsg ? lastMsg.content : "No messages yet"}
                              </p>
                            </div>

                            {/* Unread count */}
                            {thread.unreadCount && thread.unreadCount > 0 ? (
                              <span className="w-4.5 h-4.5 bg-[#FF5B26] text-white text-[9px] font-black rounded-full flex items-center justify-center shrink-0 ml-1">
                                {thread.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        );
                      })
                    ) : (
                      <div className="py-12 text-center text-xs text-nomichi-ink/40 font-medium select-none">
                        No threads found
                      </div>
                    )}
                  </div>

                  {/* Bottom Button */}
                  <div className="p-3 border-t border-[#e7e1d5]/25">
                    <button 
                      type="button"
                      onClick={() => setChatActiveTab("archived")}
                      className="w-full py-2.5 border border-[#e7e1d5]/60 hover:bg-[#FAF8F4] text-nomichi-ink/80 font-bold text-[11px] rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer bg-transparent"
                    >
                      <Archive className="w-4 h-4 text-nomichi-ink/40 stroke-[2]" />
                      View Archived
                    </button>
                  </div>
                </div>

                {/* Right Column: Chat Window */}
                <div className="flex-1 flex flex-col bg-[#FAF8F4]/20 h-full relative">
                  {activeThread ? (
                    <>
                      {/* Chat Header */}
                      <div className="p-4 border-b border-[#e7e1d5]/30 flex items-center justify-between bg-white shrink-0">
                        <div className="flex items-center gap-3 text-left">
                          <div className="relative select-none">
                            {activeThread.avatarUrl ? (
                              <img 
                                src={activeThread.avatarUrl} 
                                alt={activeThread.name} 
                                className="w-10 h-10 rounded-full object-cover border border-[#e7e1d5]/20"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-full bg-[#FFEFEA] text-[#FF5B26] font-display font-extrabold text-xs flex items-center justify-center border border-[#FF5B26]/10">
                                {activeThread.avatarText || activeThread.name.substring(0, 2).toUpperCase()}
                              </div>
                            )}
                            {activeThread.isOnline && (
                              <span className="absolute bottom-0.5 right-0.5 w-2.5 h-2.5 bg-[#10B981] border-2 border-white rounded-full" />
                            )}
                          </div>
                          <div className="leading-none">
                            <div className="flex items-center gap-1.5">
                              <h4 className="text-xs font-black text-nomichi-ink">{activeThread.name}</h4>
                              {activeThread.isOnline && (
                                <span className="w-1.5 h-1.5 bg-[#10B981] rounded-full mt-0.5" />
                              )}
                            </div>
                            <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-1.5">
                              {activeThread.isOnline ? "Typically replies within a few minutes" : "Offline"}
                            </p>
                          </div>
                        </div>

                        {/* Header controls — only kebab menu */}
                        <div className="flex items-center gap-2">
                          <button type="button" className="w-8 h-8 bg-transparent border border-[#e7e1d5]/80 hover:bg-[#FAF8F4] rounded-xl flex items-center justify-center cursor-pointer text-nomichi-ink/60 transition-colors text-base font-black">
                            ⋮
                          </button>
                        </div>
                      </div>

                      {/* Messages Area — anchored to bottom like WhatsApp */}
                      <div className="flex-1 overflow-y-auto p-5 flex flex-col justify-end gap-3">
                        <span className="self-center bg-[#FAF8F4] border border-[#e7e1d5]/35 text-[9px] font-bold text-nomichi-ink/45 px-2.5 py-1 rounded-full uppercase tracking-wider select-none mb-1">
                          Today
                        </span>

                        {activeThread.messages.map((msg) => {
                          const isUser = msg.sender === 'user';
                          return (
                            <div 
                              key={msg.id} 
                              className={`flex flex-col max-w-[78%] ${
                                isUser ? "self-end items-end" : "self-start items-start"
                              }`}
                            >
                              <div className={`px-4 py-2.5 rounded-2xl text-left leading-relaxed font-semibold text-[12.5px] min-w-[60px] ${
                                isUser 
                                  ? "bg-[#FFEFEA] text-nomichi-ink border border-[#FF5B26]/15 rounded-tr-sm" 
                                  : "bg-white text-nomichi-ink border border-[#e7e1d5]/40 rounded-tl-sm shadow-sm"
                              }`}>
                                <p className="whitespace-pre-line leading-relaxed">{msg.content}</p>

                                {/* Attachment card */}
                                {msg.attachment && (
                                  <div className="mt-3 bg-white border border-[#e7e1d5]/40 rounded-xl overflow-hidden shadow-sm max-w-sm">
                                    <div className="h-32 bg-gradient-to-br from-[#FFECE5] to-[#FFF6F4] relative flex items-center justify-center overflow-hidden border-b border-[#e7e1d5]/20">
                                      <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom,_var(--tw-gradient-stops))] from-[#FF5B26]/15 via-[#FFF6F4] to-transparent opacity-60" />
                                      <div className="absolute w-20 h-20 bg-orange-300/20 rounded-full blur-xl bottom-[-10px] left-1/2 -translate-x-1/2" />
                                      <div className="z-10 flex flex-col items-center gap-1.5 text-center">
                                        <span className="text-3xl select-none">🌴</span>
                                        <span className="text-[10px] font-extrabold text-[#FF5B26] tracking-wider uppercase bg-[#FFEFEA] px-2 py-0.5 rounded-md border border-[#FF5B26]/10">Bestseller</span>
                                      </div>
                                    </div>
                                    <div className="p-3 flex items-center justify-between gap-4">
                                      <div className="text-left min-w-0">
                                        <h6 className="text-[11px] font-black text-nomichi-ink truncate">{msg.attachment.title}</h6>
                                        <p className="text-[9px] text-nomichi-ink/40 font-bold mt-0.5 truncate">{msg.attachment.subtitle}</p>
                                        <div className="flex items-center gap-1.5 mt-2 bg-[#FAF8F4] px-2 py-1 rounded border border-[#e7e1d5]/45 w-fit">
                                          <span className="text-[8px] font-extrabold text-[#FF5B26]">📄 PDF</span>
                                          <span className="text-[8px] font-bold text-nomichi-ink/45">• {msg.attachment.size}</span>
                                        </div>
                                      </div>
                                      <button type="button" className="w-8.5 h-8.5 rounded-full bg-[#FAF8F4] border border-[#e7e1d5]/50 hover:bg-[#FFEFEA] hover:text-[#FF5B26] flex items-center justify-center shrink-0 cursor-pointer transition-colors">
                                        <ArrowDownToLine className="w-4 h-4 stroke-[2]" />
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                              <div className={`flex items-center gap-1.5 mt-1 px-0.5 ${isUser ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[9px] font-semibold text-nomichi-ink/30">{msg.time}</span>
                                {isUser && (
                                  <span className="text-[#3B82F6] text-[10px] select-none">✓✓</span>
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Scroll anchor — always at bottom */}
                        <div ref={chatEndRef} className="h-0 shrink-0" />
                      </div>

                      {/* Chat Input Bar */}
                      <form 
                        onSubmit={handleSendChatMessage}
                        className="p-4 border-t border-[#e7e1d5]/30 bg-white shrink-0 space-y-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          <button 
                            type="button"
                            className="w-9 h-9 rounded-xl border border-[#e7e1d5]/75 hover:bg-[#FAF8F4] flex items-center justify-center shrink-0 cursor-pointer text-nomichi-ink/50 transition-colors bg-transparent"
                          >
                            <Paperclip className="w-4.5 h-4.5 stroke-[2]" />
                          </button>
                          
                          <div className="flex-1 relative">
                            <input 
                              type="text"
                              value={chatInputText}
                              onChange={(e) => setChatInputText(e.target.value)}
                              placeholder="Type your message..."
                              className="w-full border border-[#e7e1d5]/60 pl-4 pr-10 py-3.5 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink bg-[#FAF8F4]/30 placeholder-nomichi-ink/35"
                            />
                            <button 
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-nomichi-ink/35 hover:text-nomichi-ink bg-transparent border-0 cursor-pointer p-1"
                            >
                              <Smile className="w-5 h-5 stroke-[1.8]" />
                            </button>
                          </div>

                          <button 
                            type="submit"
                            className="w-9 h-9 rounded-xl bg-[#FF5B26] hover:bg-[#b04b1e] text-white flex items-center justify-center shrink-0 cursor-pointer shadow-md hover:shadow-lg transition-all border-0"
                          >
                            <Send className="w-4 h-4 stroke-[2.5]" />
                          </button>
                        </div>
                        
                        <p className="text-[9px] font-bold text-nomichi-ink/35 select-none pt-0.5">
                          We typically reply within a few minutes during business hours (10 AM - 7 PM IST).
                        </p>
                      </form>
                    </>
                  ) : (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
                      <MessageSquare className="w-12 h-12 text-nomichi-sand/55 mb-2.5" />
                      <h4 className="font-bold text-sm text-nomichi-ink">Select a chat to start messaging</h4>
                      <p className="text-xs text-nomichi-ink/40 mt-1 max-w-xs leading-normal">
                        Choose a thread from the list on the left to begin your conversation.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

    </div>
  );
}

const CustomCheckbox = ({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) => {
  return (
    <label className="flex items-center gap-3 cursor-pointer py-1.5 select-none">
      <div className={`w-5 h-5 rounded-lg border flex items-center justify-center transition-all ${
        checked 
          ? "bg-[#FF5B26] border-[#FF5B26] text-white" 
          : "bg-white border-[#e7e1d5] text-transparent hover:border-[#FF5B26]/50"
      }`}>
        <svg className="w-3.5 h-3.5 stroke-[3]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <span className="text-xs font-semibold text-nomichi-ink/85">{label}</span>
    </label>
  );
};

const CustomMultiSelect = ({ 
  label, 
  icon: Icon, 
  options, 
  selectedValues, 
  onToggle, 
  isOpen, 
  onToggleOpen 
}: { 
  label: string; 
  icon: any; 
  options: string[]; 
  selectedValues: string[]; 
  onToggle: (val: string) => void; 
  isOpen: boolean; 
  onToggleOpen: () => void; 
}) => {
  return (
    <div className="space-y-1.5 relative w-full text-left">
      <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider flex items-center gap-1.5 select-none">
        {Icon && <Icon className="w-3.5 h-3.5 text-nomichi-ink/40 stroke-[1.8px]" />}
        {label}
      </label>
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5]/50 px-4 py-3 rounded-xl text-xs font-semibold text-left text-nomichi-ink flex items-center justify-between hover:bg-[#FAF8F4]/50 transition-all focus:outline-none focus:border-[#FF5B26] min-h-[42px]"
      >
        <span className="truncate pr-2 select-none">
          {selectedValues.length > 0 ? selectedValues.join(", ") : "Select options"}
        </span>
        <ChevronDown className={`w-4 h-4 text-nomichi-ink/40 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-20 w-full mt-1.5 bg-white border border-[#e7e1d5]/60 rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => {
            const isChecked = selectedValues.includes(option);
            return (
              <button
                key={option}
                type="button"
                onClick={() => onToggle(option)}
                className={`w-full flex items-center gap-2 px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                  isChecked 
                    ? "bg-[#FFEFEA]/40 text-[#FF5B26]" 
                    : "text-nomichi-ink hover:bg-[#FAF8F4]/60"
                }`}
              >
                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                  isChecked 
                    ? "bg-[#FF5B26] border-[#FF5B26] text-white" 
                    : "border-[#e7e1d5]"
                }`}>
                  {isChecked && (
                    <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
                <span className="select-none">{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const CustomSingleSelect = ({ 
  label, 
  icon: Icon, 
  options, 
  selectedValue, 
  onChange, 
  isOpen, 
  onToggleOpen 
}: { 
  label: string; 
  icon: any; 
  options: string[]; 
  selectedValue: string; 
  onChange: (val: string) => void; 
  isOpen: boolean; 
  onToggleOpen: () => void; 
}) => {
  return (
    <div className="space-y-1.5 relative w-full text-left">
      <label className="text-[10px] font-bold text-nomichi-ink/65 uppercase tracking-wider flex items-center gap-1.5 select-none">
        {Icon && <Icon className="w-3.5 h-3.5 text-nomichi-ink/40 stroke-[1.8px]" />}
        {label}
      </label>
      <button
        type="button"
        onClick={onToggleOpen}
        className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5]/50 px-4 py-3 rounded-xl text-xs font-semibold text-left text-nomichi-ink flex items-center justify-between hover:bg-[#FAF8F4]/50 transition-all focus:outline-none focus:border-[#FF5B26] min-h-[42px]"
      >
        <span className="truncate pr-2 select-none">
          {selectedValue || "Select option"}
        </span>
        <ChevronDown className={`w-4 h-4 text-nomichi-ink/40 transition-transform duration-200 shrink-0 ${isOpen ? "rotate-180" : ""}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-20 w-full mt-1.5 bg-white border border-[#e7e1d5]/60 rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
          {options.map((option) => {
            const isSelected = selectedValue === option;
            return (
              <button
                key={option}
                type="button"
                onClick={() => {
                  onChange(option);
                  onToggleOpen();
                }}
                className={`w-full px-2.5 py-2 text-xs font-semibold rounded-lg text-left transition-all ${
                  isSelected 
                    ? "bg-[#FFEFEA]/60 text-[#FF5B26] font-bold" 
                    : "text-nomichi-ink hover:bg-[#FAF8F4]/60"
                }`}
              >
                <span className="select-none">{option}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

const NotificationCheckbox = ({ 
  label, 
  subtitle, 
  checked, 
  onChange 
}: { 
  label: string; 
  subtitle: string; 
  checked: boolean; 
  onChange: () => void; 
}) => {
  return (
    <label className="flex items-start gap-2.5 cursor-pointer py-1.5 select-none w-full text-left">
      <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-all ${
        checked 
          ? "bg-[#FF5B26] border-[#FF5B26] text-white" 
          : "bg-white border-[#e7e1d5] text-transparent hover:border-[#FF5B26]/50"
      }`}>
        {checked && (
          <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>
      <div className="text-left leading-normal min-w-0">
        <span className="text-xs font-extrabold text-nomichi-ink block leading-tight truncate">{label}</span>
        <span className="text-[10px] text-nomichi-ink/45 font-semibold block leading-tight mt-1">{subtitle}</span>
      </div>
    </label>
  );
};

const Requirement = ({ label, met }: { label: string; met: boolean }) => (
  <div className="flex items-center gap-2 text-[10px] font-semibold">
    <div className={`w-3.5 h-3.5 rounded-full flex items-center justify-center transition-all shrink-0 ${
      met 
        ? "bg-[#E8F8F0] text-[#10B981]" 
        : "bg-nomichi-sand/15 text-nomichi-ink/30"
    }`}>
      {met ? (
        <svg className="w-2.5 h-2.5 stroke-[3.5]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3.5} d="M5 13l4 4L19 7" />
        </svg>
      ) : (
        <div className="w-1.5 h-1.5 rounded-full bg-nomichi-ink/30" />
      )}
    </div>
    <span className={met ? "text-[#10B981]" : "text-nomichi-ink/50"}>{label}</span>
  </div>
);
