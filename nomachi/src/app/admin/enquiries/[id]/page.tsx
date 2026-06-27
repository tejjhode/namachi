"use client";

import { useLead } from "@/hooks/useLead";
import { useUsers } from "@/hooks/useUsers";
import { createClient } from "@/lib/supabase/client";
import { getLeadNoteAuthorLabel, getLeadNoteDisplay, getLeadNoteVisual } from "@/lib/lead-notes";
import { LeadNote } from "@/types/admin.types";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Calendar,
  Mail,
  Phone,
  Tag,
  MessageSquare,
  Send,
  Clock3,
  FileText,
  Copy,
  User,
  Compass,
  CheckCircle2,
  AlertCircle,
  ChevronDown,
  UserCheck,
  XCircle,
  ExternalLink,
  Edit,
  MoreHorizontal,
  Bed,
  Utensils,
  Star,
  Heart,
  Users,
  Wallet,
  Camera,
} from "lucide-react";
import { leadService } from "@/services/lead.service";
import { taskService } from "@/services/task.service";
import { notificationService } from "@/services/notification.service";

interface EnquiryDetailPageProps {
  params: {
    id: string;
  };
}

export default function EnquiryDetailPage({ params }: EnquiryDetailPageProps) {
  const router = useRouter();
  const { lead, loading, error, changeStatus, addNote, refresh } = useLead(params.id);
  const { users } = useUsers();
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isPromoting, setIsPromoting] = useState(false);
  const [selectedManagerId, setSelectedManagerId] = useState("");
  const [isSubmittingPromotion, setIsSubmittingPromotion] = useState(false);
  const [isSubmittingClose, setIsSubmittingClose] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setCurrentUser(data.user);
    });
  }, []);

  const managers = useMemo(
    () => users.filter((u) => u.role?.toLowerCase() === "manager" || u.role?.toLowerCase() === "admin"),
    [users]
  );

  const usersById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const activityNotes = lead?.lead_notes || [];
  const isTripActive = (lead?.trips?.status || "").toLowerCase() === "active";
  const tripStatusLabel = lead?.trips?.status || "Draft";

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    try {
      await changeStatus(e.target.value);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAddNoteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim() || !currentUser) return;

    try {
      setAddingNote(true);
      await addNote(newNoteText.trim(), currentUser.id);
      setNewNoteText("");
    } catch (err) {
      console.error(err);
    } finally {
      setAddingNote(false);
    }
  };

  const handleConvertToLead = async () => {
    if (!lead || !selectedManagerId || !isTripActive) return;

    try {
      setIsSubmittingPromotion(true);
      await leadService.updateLead(lead.id, {
        is_lead: true,
        status: "new",
        assigned_to: selectedManagerId,
      });

      try {
        const tripName = lead.trips?.title || lead.trip_interest || "Selected Trip";
        await taskService.createTasksForLeadAssignment({
          leadId: lead.id,
          leadName: lead.name,
          leadStatus: "new",
          tripName,
          enquiryId: lead.enquiry_id || "",
          assignedTo: selectedManagerId,
          createdBy: currentUser?.id || "",
        });
      } catch (taskErr) {
        console.warn("Failed to auto-generate tasks for assigned lead:", taskErr);
      }

      try {
        const assignedUser = users.find((u) => u.id === selectedManagerId);
        const assigneeName = assignedUser ? assignedUser.full_name : "A Trip Manager";
        await notificationService.notifyManager(
          selectedManagerId,
          "Lead Assigned",
          `New lead "${lead.name}" has been assigned to you.`,
          "Lead Assigned",
          lead.id,
          "High"
        );
        await notificationService.notifyTraveler(
          lead.email,
          "Manager Assigned",
          `${assigneeName} has been assigned to assist you.`,
          "Manager Assigned",
          lead.id,
          "High"
        );
      } catch (notifErr) {
        console.error("Failed to dispatch manager assignment notification:", notifErr);
      }

      await refresh();
      setIsPromoting(false);
      setSelectedManagerId("");
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingPromotion(false);
    }
  };

  const handleCloseEnquiry = async () => {
    if (!lead) return;
    try {
      setIsSubmittingClose(true);
      await leadService.updateLead(lead.id, { status: "closed" });
      await refresh();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmittingClose(false);
    }
  };

  const handleMarkAsReviewed = async () => {
    if (!lead) return;
    try {
      await leadService.updateLead(lead.id, { status: "reviewed" });
      await refresh();
    } catch (err) {
      console.error(err);
    }
  };

  const copyEnquiryId = async () => {
    if (!lead?.enquiry_id) return;
    await navigator.clipboard.writeText(lead.enquiry_id);
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4 text-left">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs font-medium text-red-700">
          Error loading enquiry details: {error || "Enquiry not found."}
        </div>
        <Link href="/admin/enquiries" className="inline-flex items-center gap-2 text-xs font-bold text-nomichi-ink hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Enquiries
        </Link>
      </div>
    );
  }

  const status = (lead.status || "new").toLowerCase();

  // Formatted group details: e.g. "3 Travellers"
  const groupDetails = `${lead.group_size || 1} ${(lead.group_size || 1) === 1 ? 'Traveller' : 'Travellers'}`;

  // Unique Enquiry ID representation: e.g. ENQ-942122
  const displayEnqId = lead.enquiry_id || `ENQ-${lead.id ? String(lead.id).replace(/[^0-9]/g, '').slice(0, 5) || String(lead.id).slice(0, 5).toUpperCase() : '12345'}`;

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* Back button and page header metadata */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="space-y-3 flex-1 min-w-0">
          <Link href="/admin/enquiries" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors no-underline">
            <ArrowLeft className="w-4 h-4" /> Back to Enquiries
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Enquiry Details</h1>
            <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
              status === "new" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-blue-50 text-blue-700 border border-blue-200"
            }`}>
              {status}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs font-semibold text-slate-400">
            <span>Enquiry ID: <strong className="text-slate-600">{displayEnqId}</strong></span>
            <span>•</span>
            <span>Source: <strong className="text-slate-600">{lead.source || "Website"}</strong></span>
            <span>•</span>
            <span>Received On: <strong className="text-slate-600">{lead.created_at ? new Date(lead.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "27 Jun 2026, 10:45 AM"}</strong></span>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button onClick={() => alert("Edit Enquiry feature...")} className="px-4 py-2 border border-slate-200 hover:bg-[#FAF8F4] text-slate-700 font-bold text-xs rounded-xl flex items-center gap-2 bg-white cursor-pointer transition-all shadow-xs">
            <Edit className="w-4 h-4 text-slate-400" /> Edit Enquiry
          </button>
          <button 
            disabled={!isTripActive}
            onClick={() => setIsPromoting(true)} 
            className="px-4 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl flex items-center gap-2 cursor-pointer transition-all shadow-xs border-0"
          >
            <UserCheck className="w-4 h-4" /> Assign Manager
          </button>
          <button className="px-3 py-2 border border-slate-200 hover:bg-[#FAF8F4] text-slate-700 font-bold text-xs rounded-xl flex items-center bg-white cursor-pointer transition-all shadow-xs">
            <MoreHorizontal className="w-4 h-4 text-slate-500" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Main Columns (lg:col-span-8) */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* Traveller Information Card */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-black text-nomichi-ink/45 uppercase tracking-widest border-b border-[#e7e1d5]/20 pb-2">Traveller Information</h3>
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center text-sm font-black uppercase shrink-0 border border-[#FF5B26]/10">
                  {lead.name ? lead.name.split(" ").map((n: string) => n[0]).join("").slice(0, 2).toUpperCase() : "TJ"}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap text-left">
                    <h4 className="text-sm font-extrabold text-nomichi-ink">{lead.name}</h4>
                    <span className="px-2 py-0.5 bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/10 text-[9px] font-black uppercase tracking-wider rounded-md">
                      {lead.is_lead ? "Lead" : "Enquiry"}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1 text-[11px] font-semibold text-slate-500 text-left">
                    <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5 text-slate-300" /> {lead.email}</span>
                    <span className="flex items-center gap-1.5"><Phone className="w-3.5 h-3.5 text-slate-300" /> {lead.phone || "No phone number"}</span>
                    <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5 text-slate-300" /> Group Size: {groupDetails}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-3.5 text-xs border-l border-slate-100 pl-6 w-full md:w-auto text-left">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Preferred Contact</span>
                  <span className="font-semibold text-slate-700">Email</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Best Time to Contact</span>
                  <span className="font-semibold text-slate-700">Anytime</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Language Preference</span>
                  <span className="font-semibold text-slate-700">English</span>
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Newsletter Subscription</span>
                  <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-md border border-emerald-200">Subscribed</span>
                </div>
                <div className="space-y-0.5 col-span-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">WhatsApp Opt-in</span>
                  <span className="inline-block px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[9px] font-black uppercase rounded-md border border-emerald-200">Yes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Enquiry Preferences Card */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-5">
            <h3 className="text-xs font-black text-nomichi-ink/45 uppercase tracking-widest border-b border-[#e7e1d5]/20 pb-2">Enquiry Preferences</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5 text-xs text-nomichi-ink">
              
              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Compass className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Trip Interest</span>
                  <span className="font-bold text-slate-800">{lead.trips?.title || lead.trip_interest || "General Enquiry"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Preferred Travel Dates</span>
                  <span className="font-bold text-slate-800">
                    {lead.trips?.start_date
                      ? `${new Date(lead.trips.start_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })} - ${lead.trips?.end_date ? new Date(lead.trips.end_date).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : ""}`
                      : "24 Jun 2026 - 26 Jun 2026"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Preferred Month</span>
                  <span className="font-bold text-slate-800">{lead.preferred_month || "July 2026"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Heart className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Hope this trip feels like</span>
                  <p className="font-semibold text-slate-700 leading-relaxed max-w-sm">
                    {lead.hope_trip_feels_like || "A peaceful escape into nature with close wildlife sightings and memorable experiences."}
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Star className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">How should this trip feel like?</span>
                  <span className="font-bold text-slate-800">Relaxing, Nature-filled, Adventurous</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Dietary & Accessibility</span>
                  <span className="font-bold text-slate-800">{lead.dietary_and_accessibility || "Vegetarian, No accessibility requirements"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Budget (Approx.)</span>
                  <span className="font-bold text-slate-800">
                    {lead.trips?.price 
                      ? `₹${Number(lead.trips.price).toLocaleString("en-IN")} - ₹${Math.round(Number(lead.trips.price) * 1.3).toLocaleString("en-IN")}`
                      : "₹30,000 - ₹40,000"}
                  </span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Bed className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Accommodation Preference</span>
                  <span className="font-bold text-slate-800">Mid-range, Comfortable</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Travel Style</span>
                  <span className="font-bold text-slate-800 capitalize">{lead.group_type || "Family Trip"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Camera className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Activities Interest</span>
                  <span className="font-bold text-slate-800">Wildlife Safari, Nature Walk, Photography</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start col-span-2 border-t border-slate-100 pt-4 text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Special Requests</span>
                  <span className="font-semibold text-slate-700">{lead.notes || "Need a good naturalist guide"}</span>
                </div>
              </div>

            </div>
          </div>

          {/* Additional Information Card */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-nomichi-ink/45 uppercase tracking-widest border-b border-[#e7e1d5]/20 pb-2">Additional Information</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-6 text-xs text-nomichi-ink text-left">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-[#FF5B26]/60 uppercase tracking-wide block">Destination Preference</span>
                <span className="font-bold text-slate-800">{lead.trips?.destination || "Jungle, Wildlife, Nature"}</span>
              </div>
              <div className="space-y-1 border-l border-slate-100 pl-4">
                <span className="text-[10px] font-bold text-[#FF5B26]/60 uppercase tracking-wide block">Time Flexibility</span>
                <span className="font-bold text-slate-800">Flexible</span>
              </div>
              <div className="space-y-1 border-l border-slate-100 pl-4">
                <span className="text-[10px] font-bold text-[#FF5B26]/60 uppercase tracking-wide block">Previous Travel Experience</span>
                <span className="font-bold text-slate-800">Beginner</span>
              </div>
              <div className="space-y-1 border-l border-slate-100 pl-4">
                <span className="text-[10px] font-bold text-[#FF5B26]/60 uppercase tracking-wide block">Any Health Conditions</span>
                <span className="font-bold text-slate-800">None</span>
              </div>
              <div className="space-y-1 border-l border-slate-100 pl-4">
                <span className="text-[10px] font-bold text-[#FF5B26]/60 uppercase tracking-wide block">Other Notes</span>
                <span className="font-semibold text-slate-600">-</span>
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar Columns (lg:col-span-4) */}
        <div className="lg:col-span-4 space-y-6">

          {/* Enquiry Summary Card */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-nomichi-ink/45 uppercase tracking-widest border-b border-[#e7e1d5]/20 pb-2 text-left">Enquiry Summary</h3>
            <div className="grid grid-cols-2 gap-x-4 gap-y-4 text-xs font-semibold text-slate-600">
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Status</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase ${
                  status === "new" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-orange-50 text-[#FF5B26] border border-orange-200"
                }`}>
                  {status}
                </span>
              </div>
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Current Stage</span>
                <span className="font-bold text-[#FF5B26] uppercase">
                  {status === "new" ? "Open for Enquiries" : status.toUpperCase()}
                </span>
              </div>
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Assigned To</span>
                <span className="font-bold text-slate-700 flex items-center gap-1.5 truncate">
                  <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  {lead.profiles?.full_name || "Unassigned"}
                </span>
              </div>
              <div className="space-y-0.5 text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Source</span>
                <span className="font-bold text-slate-700">{lead.source || "Website"}</span>
              </div>
              <div className="space-y-0.5 text-left col-span-2 border-t border-slate-50 pt-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Received On</span>
                <span className="font-bold text-slate-700">{lead.created_at ? new Date(lead.created_at).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-"}</span>
              </div>
              <div className="space-y-0.5 text-left col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Last Updated</span>
                <span className="font-bold text-slate-700">
                  {(() => {
                    const lastNote = activityNotes[activityNotes.length - 1];
                    const dateVal = lastNote?.created_at || lead.created_at;
                    return dateVal ? new Date(dateVal).toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "-";
                  })()}
                </span>
              </div>
            </div>
          </div>

          {/* Assign Manager Card */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-nomichi-ink/45 uppercase tracking-widest border-b border-[#e7e1d5]/20 pb-2 text-left">Assign Manager</h3>
            <div className="space-y-3.5">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Select Manager</label>
                <div className="relative">
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-[#FAF8F4]/30 px-3 py-2 text-xs font-bold text-slate-700 focus:border-[#FF5B26] focus:outline-none cursor-pointer"
                  >
                    <option value="">Choose a manager</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.full_name} ({mgr.role?.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
              
              {!isTripActive && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-[10px] font-bold text-amber-800 leading-normal">
                  Activate this trip first before assigning a manager. The trip must be set to Active in admin.
                </div>
              )}

              <button
                disabled={isSubmittingPromotion || !selectedManagerId || !isTripActive}
                onClick={handleConvertToLead}
                className="w-full py-2.5 bg-[#FF5B26] hover:bg-[#b04b1e] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs rounded-xl transition-all shadow-xs border-0 cursor-pointer"
              >
                {isSubmittingPromotion ? "Assigning..." : "Assign Manager"}
              </button>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-nomichi-ink/45 uppercase tracking-widest border-b border-[#e7e1d5]/20 pb-2 text-left">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-2.5 text-xs">
              <button onClick={() => window.open(`tel:${lead.phone || ""}`)} className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs border-0">
                <Phone className="w-4 h-4 text-slate-400" /> Call Traveller
              </button>
              <button onClick={() => window.open(`mailto:${lead.email}`)} className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs border-0">
                <Mail className="w-4 h-4 text-slate-400" /> Send Email
              </button>
              <button onClick={() => window.open(`https://wa.me/${(lead.phone || "").replace(/[^0-9]/g, '')}`)} className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs border-0">
                <MessageSquare className="w-4 h-4 text-[#25D366] fill-current" /> Send WhatsApp
              </button>
              <button onClick={() => document.getElementById("internal-notes-textarea")?.focus()} className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs border-0">
                <FileText className="w-4 h-4 text-slate-400" /> Add Note
              </button>
              <button onClick={() => alert("Schedule Follow-up calendar...")} className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs col-span-2 border-0">
                <Calendar className="w-4 h-4 text-slate-400" /> Schedule Follow-up
              </button>
            </div>
          </div>

          {/* Internal Notes Card */}
          <div className="bg-white border border-[#e7e1d5]/40 rounded-[24px] p-6 shadow-sm space-y-4">
            <h3 className="text-xs font-black text-nomichi-ink/45 uppercase tracking-widest border-b border-[#e7e1d5]/20 pb-2 text-left">Internal Notes</h3>
            <form onSubmit={handleAddNoteSubmit} className="space-y-3">
              <textarea
                id="internal-notes-textarea"
                required
                rows={4}
                placeholder="Add internal notes about this enquiry..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-[#FAF8F4]/30 px-4 py-3 text-xs font-semibold resize-none focus:border-[#FF5B26]/30 focus:outline-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingNote || !newNoteText.trim() || !currentUser}
                  className="rounded-xl bg-[#FF5B26] hover:bg-[#b04b1e] disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-xs px-4 py-2 transition-all shadow-xs border-0 cursor-pointer"
                >
                  {addingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
}
