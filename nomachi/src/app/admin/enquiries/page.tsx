"use client";

import { useLeads } from "@/hooks/useLeads";
import { useUsers } from "@/hooks/useUsers";
import { leadService } from "@/services/lead.service";
import { taskService } from "@/services/task.service";
import { Lead } from "@/types/admin.types";
import { notificationService } from "@/services/notification.service";
import {
  Loader2,
  Search,
  ChevronDown,
  Inbox,
  UserCheck,
  XCircle,
  Calendar,
  Phone,
  Mail,
  User,
  ExternalLink,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function EnquiriesPage() {
  const router = useRouter();
  const {
    leads: enquiries,
    loading: loadingEnquiries,
    error: errorEnquiries,
    refresh: refreshEnquiries
  } = useLeads({ isLead: false });

  const { users, loading: loadingUsers } = useUsers();

  const [searchVal, setSearchVal] = useState("");
  const [statusVal, setStatusVal] = useState("new"); // default to show new enquiries
  const [currentUser, setCurrentUser] = useState<any>(null);

  // Convert to Lead modal state
  const [promotingEnquiry, setPromotingEnquiry] = useState<Lead | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isSubmittingPromotion, setIsSubmittingPromotion] = useState(false);

  // Reject confirmation state
  const [rejectingEnquiry, setRejectingEnquiry] = useState<Lead | null>(null);
  const [isSubmittingReject, setIsSubmittingReject] = useState(false);

  // Alert/Toast states
  const [toastMessage, setToastMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });
  }, []);

  const triggerToast = (text: string, type: "success" | "error" = "success") => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handlePromoteToLead = async () => {
    if (!promotingEnquiry || !selectedManagerId) return;

    try {
      setIsSubmittingPromotion(true);
      
      // 1. Update the database row: set is_lead = true, status = 'new', and assign_to
      await leadService.updateLead(promotingEnquiry.id, {
        is_lead: true,
        status: "new",
        assigned_to: selectedManagerId
      });

      // 2. Auto-generate manager onboarding workflow tasks
      try {
        const tripName = promotingEnquiry.trips?.title || promotingEnquiry.trip_interest || "Selected Trip";
        await taskService.createTasksForLeadAssignment({
          leadId: promotingEnquiry.id,
          leadName: promotingEnquiry.name,
          leadStatus: "new",
          tripName,
          enquiryId: promotingEnquiry.enquiry_id || "",
          assignedTo: selectedManagerId,
          createdBy: currentUser?.id || "",
        });
      } catch (taskErr) {
        console.warn("Failed to auto-generate tasks for assigned lead:", taskErr);
      }

      // 3. Dispatch "Manager Assigned" notification to traveler
      try {
        await notificationService.notifyTraveler(
          promotingEnquiry.email,
          "Manager Assigned",
          "Your enquiry has been assigned to a travel expert.",
          "Manager Assigned",
          promotingEnquiry.id,
          "High"
        );
      } catch (notifErr) {
        console.error("Failed to dispatch manager assignment notification:", notifErr);
      }

      triggerToast(`Enquiry for ${promotingEnquiry.name} successfully converted to a Lead!`);
      setPromotingEnquiry(null);
      setSelectedManagerId("");
      refreshEnquiries();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to convert enquiry to lead.", "error");
    } finally {
      setIsSubmittingPromotion(false);
    }
  };

  const handleRejectEnquiry = async () => {
    if (!rejectingEnquiry) return;

    try {
      setIsSubmittingReject(true);

      // Set status to 'closed' (representing rejected/closed raw enquiry)
      await leadService.updateLead(rejectingEnquiry.id, {
        status: "closed"
      });

      triggerToast(`Enquiry for ${rejectingEnquiry.name} has been rejected.`);
      setRejectingEnquiry(null);
      refreshEnquiries();
    } catch (err: any) {
      console.error(err);
      triggerToast(err.message || "Failed to reject enquiry.", "error");
    } finally {
      setIsSubmittingReject(false);
    }
  };

  // Filter managers & admins from users list
  const managers = users.filter(
    (u) => u.role?.toLowerCase() === "manager" || u.role?.toLowerCase() === "admin"
  );

  // Filter local enquiries list based on search term and selected status filter
  const filteredEnquiries = enquiries.filter((enq) => {
    const matchesSearch =
      enq.name.toLowerCase().includes(searchVal.toLowerCase()) ||
      enq.email.toLowerCase().includes(searchVal.toLowerCase()) ||
      (enq.phone && enq.phone.includes(searchVal));

    const matchesStatus =
      statusVal === "all" ? true : enq.status?.toLowerCase() === statusVal.toLowerCase();

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-20 animate-in fade-in duration-300">
      
      {/* Toast Notification */}
      {toastMessage && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-xl border animate-in slide-in-from-top-4 duration-300 ${
          toastMessage.type === "success" 
            ? "bg-emerald-50 border-emerald-200 text-emerald-800" 
            : "bg-rose-50 border-rose-200 text-rose-800"
        }`}>
          {toastMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" /> : <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />}
          <span className="text-xs font-bold">{toastMessage.text}</span>
        </div>
      )}

      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-[#e7e1d5]/40 shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-[#FFEFEA] flex items-center justify-center text-[#FF5B26]">
              <Inbox className="w-5 h-5" />
            </div>
            <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">
              Enquiries Inbox
            </h1>
          </div>
          <p className="text-xs font-semibold text-nomichi-ink/45 ml-11">
            Review raw traveler interests, reject, or assign trip managers to convert them to leads.
          </p>
        </div>
      </div>

      {/* Filters and Search toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Status Tab Filters */}
        <div className="flex bg-[#FAF8F4] border border-[#e7e1d5]/55 p-1 rounded-2xl shrink-0 self-start">
          {[
            { id: "new", label: "New Inbox" },
            { id: "closed", label: "Rejected / Closed" },
            { id: "all", label: "All Enquiries" }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusVal(tab.id)}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition-all border-0 cursor-pointer ${
                statusVal === tab.id
                  ? "bg-white text-nomichi-ink shadow-sm font-extrabold"
                  : "text-nomichi-ink/45 hover:text-nomichi-ink bg-transparent"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:max-w-md shrink-0">
          <Search className="w-4 h-4 text-nomichi-ink/35 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search enquiries by name, email, or phone..."
            value={searchVal}
            onChange={(e) => setSearchVal(e.target.value)}
            className="w-full bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink px-11 py-3.5 rounded-2xl focus:outline-none transition-all placeholder:text-nomichi-ink/35 shadow-sm"
          />
        </div>
      </div>

      {/* Main Inbox Table Panel */}
      <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden min-h-[300px] flex flex-col">
        {loadingEnquiries ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3">
            <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
            <span className="text-xs font-bold text-nomichi-ink/40">Loading enquiries inbox...</span>
          </div>
        ) : filteredEnquiries.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center p-20 gap-3">
            <Inbox className="w-10 h-10 text-nomichi-ink/20" />
            <span className="text-xs font-bold text-nomichi-ink/45">No enquiries match your selection.</span>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#e7e1d5]/30 bg-[#FAF8F4]/50">
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Date Received</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Traveler</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Contact Info</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Trip Interest</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider">Enquiry Details / Message</th>
                  <th className="px-6 py-4 font-bold text-nomichi-ink/40 text-[10px] uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e7e1d5]/20">
                {filteredEnquiries.map((enq) => (
                  <tr key={enq.id} className="hover:bg-[#FAF8F4]/20 transition-colors">
                    
                    {/* Created Date */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col">
                        <span className="text-xs font-bold text-nomichi-ink">
                          {enq.created_at ? new Date(enq.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric"
                          }) : "-"}
                        </span>
                        <span className="text-[10px] text-nomichi-ink/35 mt-0.5">
                          {enq.created_at ? new Date(enq.created_at).toLocaleTimeString("en-US", {
                            hour: "numeric",
                            minute: "2-digit",
                            hour12: true
                          }) : ""}
                        </span>
                      </div>
                    </td>

                    {/* Traveler Name */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-nomichi-sand/10 border border-[#e7e1d5]/30 flex items-center justify-center text-nomichi-ink/65 shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-bold text-nomichi-ink">{enq.name}</span>
                          <span className="text-[9px] font-semibold text-nomichi-ink/40 mt-0.5 tracking-wider uppercase">
                            Source: {enq.source || "Website"}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Contact Info */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      <div className="flex flex-col gap-1 text-[11px]">
                        <a href={`mailto:${enq.email}`} className="flex items-center gap-1.5 text-nomichi-ink/75 hover:text-[#FF5B26] font-semibold transition-colors no-underline">
                          <Mail className="w-3.5 h-3.5 opacity-60" />
                          {enq.email}
                        </a>
                        {enq.phone && (
                          <a href={`tel:${enq.phone}`} className="flex items-center gap-1.5 text-nomichi-ink/75 hover:text-[#FF5B26] font-semibold transition-colors no-underline">
                            <Phone className="w-3.5 h-3.5 opacity-60" />
                            {enq.phone}
                          </a>
                        )}
                      </div>
                    </td>

                    {/* Trip Interest */}
                    <td className="px-6 py-5 whitespace-nowrap">
                      {enq.trips ? (
                        <Link
                          href={`/admin/trips/${enq.trip_id}/overview`}
                          className="inline-flex items-center gap-1 text-xs font-extrabold text-[#FF5B26] hover:underline"
                        >
                          {enq.trips.title}
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      ) : (
                        <span className="text-xs font-bold text-nomichi-ink/40">No trip chosen</span>
                      )}
                    </td>

                    {/* Message Details */}
                    <td className="px-6 py-5 max-w-sm">
                      <div className="space-y-1">
                        {enq.message ? (
                          <p className="text-xs text-nomichi-ink/80 leading-relaxed font-semibold italic break-words">
                            "{enq.message}"
                          </p>
                        ) : (
                          <p className="text-xs text-nomichi-ink/35 font-semibold">No message provided.</p>
                        )}
                        
                        {/* Custom fields checklist if filled by TripEnquiryView */}
                        {enq.group_size !== undefined && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            <span className="bg-slate-50 border border-slate-200/60 text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md">
                              Group Size: {enq.group_size}
                            </span>
                            {enq.preferred_month && (
                              <span className="bg-slate-50 border border-slate-200/60 text-[9px] font-bold text-slate-600 px-2 py-0.5 rounded-md">
                                Month: {enq.preferred_month}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Actions buttons */}
                    <td className="px-6 py-5 whitespace-nowrap text-right">
                      {enq.status?.toLowerCase() === "closed" ? (
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full uppercase tracking-wider">
                          Closed / Rejected
                        </span>
                      ) : (
                        <div className="flex items-center justify-end gap-2.5">
                          <button
                            onClick={() => setRejectingEnquiry(enq)}
                            className="bg-transparent hover:bg-rose-50 border border-rose-200/40 text-rose-600 hover:text-rose-700 text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 h-[32px]"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            Reject
                          </button>
                          <button
                            onClick={() => setPromotingEnquiry(enq)}
                            className="bg-[#FF5B26] hover:bg-[#b04b1e] border-0 text-white text-xs font-bold px-3.5 py-1.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm hover:shadow h-[32px]"
                          >
                            <UserCheck className="w-3.5 h-3.5" />
                            Convert To Lead
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ===================== CONVERT TO LEAD MODAL ===================== */}
      {promotingEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-[#FAF8F4]/30">
              <div className="space-y-0.5">
                <h3 className="text-base font-display font-black text-nomichi-ink">
                  Convert to Lead
                </h3>
                <p className="text-[10px] font-bold text-nomichi-ink/40">
                  Enquiry ID: {promotingEnquiry.enquiry_id || "N/A"}
                </p>
              </div>
              <button
                onClick={() => { setPromotingEnquiry(null); setSelectedManagerId(""); }}
                className="w-7 h-7 rounded-full bg-nomichi-sand/10 hover:bg-nomichi-sand/20 border-0 flex items-center justify-center text-nomichi-ink transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4">
              <div className="bg-[#FAF8F4] p-4.5 rounded-2xl border border-[#e7e1d5]/40 space-y-2.5 text-xs text-nomichi-ink">
                <div className="flex justify-between">
                  <span className="font-semibold text-nomichi-ink/40">Traveler:</span>
                  <span className="font-extrabold">{promotingEnquiry.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-semibold text-[#FF5B26]">Trip Interest:</span>
                  <span className="font-extrabold text-[#FF5B26] truncate max-w-[200px]">
                    {promotingEnquiry.trips?.title || "No Trip Assigned"}
                  </span>
                </div>
              </div>

              {/* Assign Manager Dropdown */}
              <div className="space-y-2 text-left">
                <label className="block text-[10px] font-extrabold text-nomichi-ink/50 uppercase tracking-widest leading-none">
                  Assign Trip Manager
                </label>
                <div className="relative">
                  <select
                    value={selectedManagerId}
                    onChange={(e) => setSelectedManagerId(e.target.value)}
                    className="w-full bg-white border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] text-xs font-bold text-nomichi-ink px-4 py-3.5 rounded-2xl focus:outline-none transition-all cursor-pointer appearance-none pr-10"
                  >
                    <option value="" disabled>-- Select manager for this lead --</option>
                    {managers.map((mgr) => (
                      <option key={mgr.id} value={mgr.id}>
                        {mgr.full_name} ({mgr.role?.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-nomichi-ink/45 absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-[#e7e1d5]/20 bg-[#FAF8F4]/20 flex items-center justify-end gap-3">
              <button
                onClick={() => { setPromotingEnquiry(null); setSelectedManagerId(""); }}
                className="bg-transparent hover:bg-nomichi-sand/15 text-nomichi-ink/60 hover:text-nomichi-ink text-xs font-bold px-4 py-2.5 rounded-xl transition-all border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handlePromoteToLead}
                disabled={!selectedManagerId || isSubmittingPromotion}
                className="bg-[#FF5B26] hover:bg-[#b04b1e] text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all border-0 cursor-pointer shadow-md disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5"
              >
                {isSubmittingPromotion && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Promote to Lead
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== REJECT ENQUIRY CONFIRMATION MODAL ===================== */}
      {rejectingEnquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-[#e7e1d5]/30 flex justify-between items-center bg-rose-50/10">
              <h3 className="text-base font-display font-black text-rose-600">
                Reject Enquiry
              </h3>
              <button
                onClick={() => setRejectingEnquiry(null)}
                className="w-7 h-7 rounded-full bg-nomichi-sand/10 hover:bg-nomichi-sand/20 border-0 flex items-center justify-center text-nomichi-ink transition-colors cursor-pointer"
              >
                <XCircle className="w-4 h-4 opacity-50 hover:opacity-100" />
              </button>
            </div>

            <div className="p-6 text-left space-y-3">
              <p className="text-xs font-semibold text-nomichi-ink/75 leading-relaxed">
                Are you sure you want to reject the enquiry from <strong className="font-extrabold">{rejectingEnquiry.name}</strong>?
              </p>
              <p className="text-[10px] text-rose-600 bg-rose-50 border border-rose-100 p-3 rounded-xl font-bold">
                ⚠️ This will mark the enquiry status as "Closed" and archive it. It will not be promoted to the CRM Leads list.
              </p>
            </div>

            <div className="p-6 border-t border-[#e7e1d5]/20 bg-[#FAF8F4]/20 flex items-center justify-end gap-3">
              <button
                onClick={() => setRejectingEnquiry(null)}
                className="bg-transparent hover:bg-nomichi-sand/15 text-nomichi-ink/60 hover:text-nomichi-ink text-xs font-bold px-4 py-2.5 rounded-xl transition-all border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRejectEnquiry}
                disabled={isSubmittingReject}
                className="bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all border-0 cursor-pointer shadow-md disabled:opacity-40"
              >
                {isSubmittingReject && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
