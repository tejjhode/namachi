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
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpTime, setFollowUpTime] = useState("");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [followUpPriority, setFollowUpPriority] = useState("Medium");
  const [schedulingFollowUp, setSchedulingFollowUp] = useState(false);

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
  const isTripActive = (lead?.trips?.status || "").toLowerCase() === "active" || (lead?.trips?.status || "").toLowerCase() === "open for enquiries" || (lead?.trips?.status || "").toLowerCase() === "published";
  const tripStatusLabel = lead?.trips?.status || "Draft";

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lead || !followUpDate || !followUpTime) return;

    try {
      setSchedulingFollowUp(true);
      const combinedDateTime = `${followUpDate}T${followUpTime}:00`;
      
      await taskService.createTask({
        title: `Follow-up with ${lead.name}`,
        description: followUpNotes || `Call traveler to discuss enquiry for ${lead.trips?.title || lead.trip_interest || "trip"}.`,
        source_kind: "lead",
        source_id: lead.id,
        type: "communication",
        priority: followUpPriority,
        due_date: new Date(combinedDateTime).toISOString(),
        status: "pending",
        assigned_to: lead.assigned_to || currentUser?.id || null,
        subtasks: [
          { title: `Call ${lead.name} at ${new Date(combinedDateTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`, completed: false },
          { title: `Discuss ${lead.trips?.title || "selected trip"}`, completed: false },
          { title: `Log requirements in lead detail`, completed: false }
        ]
      });

      const dateFormatted = new Date(combinedDateTime).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      });
      await addNote(`Follow-up scheduled for: ${dateFormatted}. Note: ${followUpNotes || "No notes"}`, currentUser?.id);
      
      setIsFollowUpModalOpen(false);
      setFollowUpDate("");
      setFollowUpTime("");
      setFollowUpNotes("");
      await refresh();
      alert("Follow-up task successfully scheduled!");
    } catch (err: any) {
      console.error("Failed to schedule follow-up:", err.message);
      alert("Error scheduling follow-up: " + err.message);
    } finally {
      setSchedulingFollowUp(false);
    }
  };


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
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Preferred Month</span>
                  <span className="font-bold text-slate-800">{lead.preferred_month || "Not specified"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Clock3 className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Preferred Duration</span>
                  <span className="font-bold text-slate-800">{lead.preferred_duration || "Not specified"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Budget Preference</span>
                  <span className="font-bold text-slate-800">{lead.budget_preference || "Not specified"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Users className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Travel Style (Group Type)</span>
                  <span className="font-bold text-slate-800 capitalize">{lead.group_type || "Not specified"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Utensils className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Dietary & Accessibility</span>
                  <span className="font-bold text-slate-800">{lead.dietary_and_accessibility || "None specified"}</span>
                </div>
              </div>

              <div className="flex gap-3.5 items-start col-span-2 border-t border-slate-100 pt-4 text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Heart className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Hope this trip feels like</span>
                  <p className="font-semibold text-slate-700 leading-relaxed max-w-sm">
                    {lead.hope_trip_feels_like || "Not specified"}
                  </p>
                </div>
              </div>

              <div className="flex gap-3.5 items-start col-span-2 border-t border-slate-100 pt-4 text-left">
                <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                  <Tag className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Referral Source (How they heard about us)</span>
                  <span className="font-bold text-slate-855 capitalize">{lead.source || "Website Search"}</span>
                </div>
              </div>

              {lead.message && (
                <div className="flex gap-3.5 items-start col-span-2 border-t border-slate-100 pt-4 text-left">
                  <div className="w-9 h-9 rounded-xl bg-[#FFEFEA] flex items-center justify-center shrink-0 text-[#FF5B26]">
                    <MessageSquare className="w-5 h-5" />
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Special Message</span>
                    <p className="font-semibold text-slate-700 leading-relaxed max-w-lg">
                      {lead.message}
                    </p>
                  </div>
                </div>
              )}

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
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-[#FAF8F4]/30 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-[#FF5B26] focus:outline-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2523A1A1AA%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat pr-10"
                  >
                    <option value="">Choose a manager</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.full_name} ({mgr.role?.toUpperCase()})
                      </option>
                    ))}
                  </select>
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
              <button
                onClick={() => {
                  if (lead.phone) {
                    window.open(`tel:${lead.phone}`);
                  } else {
                    alert("Traveller phone number not available.");
                  }
                }}
                className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                <Phone className="w-4 h-4 text-slate-400" /> Call Traveller
              </button>
              <button
                onClick={() => {
                  if (lead.email) {
                    window.open(`mailto:${lead.email}`);
                  } else {
                    alert("Traveller email not available.");
                  }
                }}
                className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                <Mail className="w-4 h-4 text-slate-400" /> Send Email
              </button>
              <button
                onClick={() => {
                  if (lead.phone) {
                    window.open(`https://wa.me/${(lead.phone || "").replace(/[^0-9]/g, "")}`);
                  } else {
                    alert("Traveller phone number not available.");
                  }
                }}
                className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                <MessageSquare className="w-4 h-4 text-[#25D366] fill-current" /> Send WhatsApp
              </button>
              <button
                onClick={() => document.getElementById("internal-notes-textarea")?.focus()}
                className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs"
              >
                <FileText className="w-4 h-4 text-slate-400" /> Add Note
              </button>
              <button
                onClick={() => setIsFollowUpModalOpen(true)}
                className="h-10 bg-white hover:bg-slate-50 border border-slate-200 text-[#FF5B26] font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer transition-all shadow-2xs col-span-2"
              >
                <Calendar className="w-4 h-4 text-[#FF5B26]" /> Schedule Follow-up
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

      {/* Schedule Follow-up Modal */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-xl max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-sm font-black text-nomichi-ink uppercase tracking-wider">Schedule Follow-up</h3>
              <button 
                type="button" 
                onClick={() => setIsFollowUpModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 bg-transparent border-0 font-bold text-base cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={handleScheduleFollowUp} className="space-y-4 text-xs font-semibold text-slate-700">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Date *</label>
                  <input
                    type="date"
                    required
                    value={followUpDate}
                    onChange={(e) => setFollowUpDate(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Time *</label>
                  <input
                    type="time"
                    required
                    value={followUpTime}
                    onChange={(e) => setFollowUpTime(e.target.value)}
                    className="w-full px-3 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Priority</label>
                <div className="relative">
                  <select
                    value={followUpPriority}
                    onChange={(e) => setFollowUpPriority(e.target.value)}
                    className="w-full appearance-none rounded-xl border border-slate-200 bg-[#FAF8F4]/30 px-3 py-2.5 text-xs font-bold text-slate-700 focus:border-[#FF5B26] focus:outline-none cursor-pointer bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2024%2024%22%20stroke%3D%22%2523A1A1AA%22%20stroke-width%3D%222%22%3E%3Cpath%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20d%3D%22M19%209l-7%207-7-7%22%20%2F%3E%3C%2Fsvg%3E')] bg-[length:14px] bg-[right_12px_center] bg-no-repeat pr-10"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Follow-up Notes / Description</label>
                <textarea
                  rows={3}
                  value={followUpNotes}
                  onChange={(e) => setFollowUpNotes(e.target.value)}
                  placeholder="e.g., Discuss itinerary options, answer questions about hotels..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 resize-none font-semibold"
                />
              </div>

              <div className="flex gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setIsFollowUpModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold rounded-xl cursor-pointer bg-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={schedulingFollowUp}
                  className="px-5 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-bold rounded-xl cursor-pointer disabled:opacity-50 border-0"
                >
                  {schedulingFollowUp ? "Scheduling..." : "Schedule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
