"use client";

import { useLead } from "@/hooks/useLead";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, Calendar, Mail, Phone, Tag, Clock, Send, MessageSquare } from "lucide-react";
import Link from "next/link";

interface LeadDetailPageProps {
  params: {
    id: string;
  };
}

export default function LeadDetailPage({ params }: LeadDetailPageProps) {
  const router = useRouter();
  const { lead, loading, error, changeStatus, addNote } = useLead(params.id);
  const [newNoteText, setNewNoteText] = useState("");
  const [addingNote, setAddingNote] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) {
        setCurrentUser(data.user);
      }
    });
  }, []);

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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

  if (error || !lead) {
    return (
      <div className="space-y-4 text-left">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium">
          Error loading lead details: {error || "Lead not found."}
        </div>
        <Link href="/admin/leads" className="inline-flex items-center gap-2 text-xs font-bold text-nomichi-ink hover:underline">
          <ArrowLeft className="w-4 h-4" /> Back to Leads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 text-left">
      {/* Back & Title */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.push("/admin/leads")}
          className="p-2 bg-white border border-[#e7e1d5]/40 rounded-xl text-nomichi-ink hover:bg-[#FAF8F4] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-display font-extrabold text-nomichi-ink">Lead Details</h1>
          <p className="text-xs text-nomichi-ink/40 font-semibold mt-0.5">
            Enquiry ID: {lead.enquiry_id || "ENQ-N/A"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Client Info Card */}
        <div className="lg:col-span-4 bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-6">
          <div>
            <div className="w-16 h-16 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center text-xl font-black uppercase mb-4">
              {lead.name ? lead.name.charAt(0) : "L"}
            </div>
            <h2 className="text-lg font-display font-extrabold text-nomichi-ink">{lead.name}</h2>
            <span className="text-[10px] font-bold text-nomichi-ink/40 uppercase tracking-wider">
              Lead Source: {lead.source || "Website Enquiry"}
            </span>
          </div>

          <div className="border-t border-[#e7e1d5]/30 pt-6 space-y-4">
            {/* Status Selector */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Lead Status</label>
              <select
                value={lead.status || "new"}
                onChange={handleStatusChange}
                className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
              >
                <option value="new">New</option>
                <option value="contacted">Contacted</option>
                <option value="qualified">Qualified</option>
                <option value="negotiating">Negotiating</option>
                <option value="converted">Converted</option>
                <option value="lost">Lost</option>
              </select>
            </div>

            {/* Email */}
            <div className="flex items-center gap-3 text-xs font-semibold text-nomichi-ink/80">
              <Mail className="w-4 h-4 text-nomichi-ink/30 shrink-0" />
              <span className="break-all">{lead.email}</span>
            </div>

            {/* Phone */}
            <div className="flex items-center gap-3 text-xs font-semibold text-nomichi-ink/80">
              <Phone className="w-4 h-4 text-nomichi-ink/30 shrink-0" />
              <span>{lead.phone || "No Phone Number"}</span>
            </div>

            {/* Group Size */}
            <div className="flex items-center gap-3 text-xs font-semibold text-nomichi-ink/80">
              <Tag className="w-4 h-4 text-nomichi-ink/30 shrink-0" />
              <span>Group Size: {lead.group_size || 1} travelers</span>
            </div>

            {/* Trip Interest */}
            <div className="flex items-center gap-3 text-xs font-semibold text-nomichi-ink/80">
              <Calendar className="w-4 h-4 text-nomichi-ink/30 shrink-0" />
              <span>
                Trip Interest: <strong className="text-nomichi-ink">{lead.trips?.title || lead.trip_interest || "General Enquiry"}</strong>
              </span>
            </div>
          </div>

          {lead.notes && (
            <div className="border-t border-[#e7e1d5]/30 pt-6">
              <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-2">Original Message</label>
              <div className="bg-[#FAF8F4] rounded-2xl p-4 text-xs font-medium text-nomichi-ink/70 leading-relaxed italic border border-[#e7e1d5]/20">
                "{lead.notes}"
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interaction Notes Timeline */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 space-y-6">
            <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3 flex items-center gap-2">
              <MessageSquare className="w-4.5 h-4.5 text-[#FF5B26]" />
              Activity Logs & Notes
            </h3>

            {/* Add Note Form */}
            <form onSubmit={handleAddNoteSubmit} className="space-y-3">
              <textarea
                required
                rows={3}
                placeholder="Log a client interaction, note requirements, or add next steps..."
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                className="w-full px-4 py-3 bg-[#FAF8F4] border border-[#e7e1d5]/30 rounded-2xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26]/30 transition-colors resize-none"
              />
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={addingNote || !newNoteText.trim() || !currentUser}
                  className="flex items-center gap-2 px-5 py-2 bg-[#FF5B26] text-white text-xs font-bold rounded-xl hover:bg-[#FF5B26]/90 transition-all shadow-md disabled:opacity-50"
                >
                  {addingNote ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  Log Note
                </button>
              </div>
            </form>

            {/* Timeline List */}
            <div className="space-y-6 relative before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#e7e1d5]/30 pt-2 text-left">
              {!lead.lead_notes || lead.lead_notes.length === 0 ? (
                <div className="text-center py-10 text-xs font-semibold text-nomichi-ink/40 pl-6">
                  No activity logs logged yet. Add your first note above.
                </div>
              ) : (
                lead.lead_notes.map((note) => (
                  <div key={note.id} className="relative pl-8 flex gap-4">
                    {/* Circle marker */}
                    <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full border-2 border-white bg-[#FF5B26] shadow-sm" />
                    
                    <div className="flex-1 bg-[#FAF8F4]/50 border border-[#e7e1d5]/30 rounded-2xl p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] text-nomichi-ink/40 font-bold">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(note.created_at).toLocaleString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>Logged by Admin</span>
                      </div>
                      <p className="text-xs font-semibold text-nomichi-ink/80 leading-relaxed whitespace-pre-wrap">
                        {note.note_text}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
