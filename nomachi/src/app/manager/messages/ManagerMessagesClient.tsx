"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Activity,
  Bell,
  Briefcase,
  Calendar,
  ChevronDown,
  CircleCheck,
  Edit3,
  FileText,
  LayoutDashboard,
  Loader2,
  LogOut,
  Mail,
  MapPin,
  MessageCircle,
  MoreVertical,
  Paperclip,
  Phone,
  Search,
  Send,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Ticket,
  User,
  Users,
  Plane,
  ClipboardCheck,
} from "lucide-react";
import { decryptMessage } from "@/lib/utils/chat-crypto";

type LeadRecord = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  source?: string | null;
  status: string;
  created_at?: string | null;
  updated_at?: string | null;
  group_size?: number | null;
  notes?: string | null;
  assigned_to?: string | null;
  trip_id?: string | null;
  trips?: {
    id?: string | null;
    title?: string | null;
    destination?: string | null;
    image_url?: string | null;
    start_date?: string | null;
    end_date?: string | null;
  } | null;
};

type ChatMessageRow = {
  id: string;
  lead_id: string;
  sender_type: "user" | "team";
  content_encrypted: string;
  iv: string;
  created_at: string;
  sender_id?: string | null;
};

type ManagerMessagesClientProps = {
  user: {
    full_name: string;
    avatar_url?: string | null;
    email: string;
  };
  leads: LeadRecord[];
  messages: ChatMessageRow[];
  selectedLeadId?: string | null;
};

type MessageItem = {
  id: string;
  sender: "user" | "team";
  senderName: string;
  content: string;
  time: string;
  sortTime: number;
  attachment?: {
    title: string;
    subtitle: string;
    size: string;
  };
};

const statusMeta: Record<string, { label: string; className: string }> = {
  new: { label: "New", className: "bg-[#FFF1EA] text-[#FF5B26]" },
  contacted: { label: "Contacted", className: "bg-[#EAF1FF] text-[#2563EB]" },
  qualified: { label: "Qualified", className: "bg-[#F4EDFF] text-[#7C3AED]" },
  negotiating: { label: "Vibe Check", className: "bg-[#FFF6E5] text-[#D97706]" },
  converted: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#16A34A]" },
  confirmed: { label: "Confirmed", className: "bg-[#ECFDF5] text-[#16A34A]" },
  lost: { label: "Not a Fit", className: "bg-[#F3F4F6] text-[#6B7280]" },
};

const quickTemplates = [
  "Share brochure",
  "Send itinerary",
  "Payment instructions",
  "Vibe check invite",
  "Confirmation message",
];

const formatTime = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
};

const formatDate = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const formatDateRange = (start?: string | null, end?: string | null) => {
  if (!start && !end) return "Flexible dates";
  const startLabel = start ? formatDate(start) : "";
  const endLabel = end ? formatDate(end) : "";
  return startLabel && endLabel ? `${startLabel} - ${endLabel}` : startLabel || endLabel;
};

const relativeTime = (value?: string | null) => {
  if (!value) return "Recently";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Recently";
  const diffMinutes = Math.max(1, Math.floor((Date.now() - timestamp) / 60000));
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
};

export function ManagerMessagesClient({
  user,
  leads,
  messages,
  selectedLeadId,
}: ManagerMessagesClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [chatSearchQuery, setChatSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "unread" | "qualified" | "more">("all");
  const [activeLeadId, setActiveLeadId] = useState<string | null>(selectedLeadId || null);
  const [messageInput, setMessageInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [decryptedThreads, setDecryptedThreads] = useState<Record<string, MessageItem[]>>({});

  const firstName = user.full_name?.split(" ")[0] || "Manager";

  const threads = useMemo(() => {
    const threadMap = new Map<string, {
      lead: LeadRecord;
      messages: MessageItem[];
      unreadCount: number;
      lastTime: number;
    }>();

    leads.forEach((lead) => {
      threadMap.set(lead.id, {
        lead,
        messages: [],
        unreadCount: 0,
        lastTime: new Date(lead.updated_at || lead.created_at || Date.now()).getTime(),
      });
    });

    Object.entries(decryptedThreads).forEach(([leadId, items]) => {
      const entry = threadMap.get(leadId);
      if (!entry) return;
      entry.messages = items;
      const lastMsg = items[items.length - 1];
      entry.lastTime = lastMsg?.sortTime || entry.lastTime;
      entry.unreadCount = lastMsg?.sender === "user" ? 1 : 0;
    });

    return Array.from(threadMap.values())
      .map(({ lead, messages, unreadCount, lastTime }) => ({
        lead,
        messages,
        unreadCount,
        lastTime,
      }))
      .sort((a, b) => b.lastTime - a.lastTime);
  }, [decryptedThreads, leads]);

  useEffect(() => {
    if (activeLeadId) return;
    setActiveLeadId(threads[0]?.lead.id || null);
  }, [activeLeadId, threads]);

  useEffect(() => {
    let mounted = true;

    async function loadMessages() {
      const grouped: Record<string, MessageItem[]> = {};

      for (const row of messages) {
        const text = await decryptMessage(row.content_encrypted, row.iv);
        const lead = leads.find((item) => item.id === row.lead_id);
        if (!lead) continue;

        if (!grouped[lead.id]) grouped[lead.id] = [];

        grouped[lead.id].push({
          id: row.id,
          sender: row.sender_type,
          senderName: row.sender_type === "team" ? (user.full_name || "Nomichi Team") : lead.name,
          content: text,
          time: formatTime(row.created_at),
          sortTime: new Date(row.created_at).getTime(),
        });
      }

      leads.forEach((lead) => {
        if (!grouped[lead.id]) grouped[lead.id] = [];
        if (lead.notes) {
          const createdAt = lead.created_at || new Date().toISOString();
          grouped[lead.id].unshift({
            id: `lead-note-${lead.id}`,
            sender: "user",
            senderName: lead.name,
            content: lead.notes,
            time: formatTime(createdAt),
            sortTime: new Date(createdAt).getTime() - 1000,
          });
        } else if (grouped[lead.id].length === 0) {
          const createdAt = lead.created_at || new Date().toISOString();
          grouped[lead.id].unshift({
            id: `lead-init-${lead.id}`,
            sender: "user",
            senderName: lead.name,
            content: `Hi, I submitted an enquiry for "${lead.trips?.title || "this trip"}".`,
            time: formatTime(createdAt),
            sortTime: new Date(createdAt).getTime() - 1000,
          });
        }

        if (lead.trips?.title && lead.trips.image_url) {
          const last = grouped[lead.id][grouped[lead.id].length - 1];
          if (last?.sender === "team" && /pdf/i.test(last.content)) {
            last.attachment = {
              title: `${lead.trips.title.replace(/\s+/g, "_")}_Itinerary.pdf`,
              subtitle: "PDF",
              size: "1.2 MB",
            };
          }
        }
      });

      Object.keys(grouped).forEach((leadId) => {
        grouped[leadId] = grouped[leadId].sort((a, b) => a.sortTime - b.sortTime);
      });

      if (mounted) setDecryptedThreads(grouped);
    }

    loadMessages();

    return () => {
      mounted = false;
    };
  }, [leads, messages, user.full_name]);

  const filteredThreads = useMemo(() => {
    return threads.filter(({ lead, messages: threadMessages, unreadCount }) => {
      const query = searchQuery.trim().toLowerCase();
      const searchable = `${lead.name} ${lead.email} ${lead.trips?.title || ""} ${threadMessages.map((message) => message.content).join(" ")}`.toLowerCase();
      const matchesSearch = query ? searchable.includes(query) : true;
      const matchesTab =
        activeTab === "all" ||
        (activeTab === "unread" && unreadCount > 0) ||
        (activeTab === "qualified" && lead.status === "qualified") ||
        (activeTab === "more" && !["qualified"].includes(lead.status));

      return matchesSearch && matchesTab;
    });
  }, [activeTab, searchQuery, threads]);

  const activeThread = filteredThreads.find((thread) => thread.lead.id === activeLeadId) || filteredThreads[0] || null;
  const activeLead = activeThread?.lead || null;
  const activeMessages = activeLead ? decryptedThreads[activeLead.id] || [] : [];

  const handleSend = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!activeLead || !messageInput.trim()) return;

    const text = messageInput.trim();
    setMessageInput("");
    setIsSending(true);

    const optimisticMessage: MessageItem = {
      id: `optimistic-${Date.now()}`,
      sender: "team",
      senderName: user.full_name,
      content: text,
      time: formatTime(new Date().toISOString()),
      sortTime: Date.now(),
    };

    setDecryptedThreads((prev) => ({
      ...prev,
      [activeLead.id]: [...(prev[activeLead.id] || []), optimisticMessage],
    }));

    try {
      const response = await fetch("/api/manager/messages/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: activeLead.id, content: text }),
      });

      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      setDecryptedThreads((prev) => ({
        ...prev,
        [activeLead.id]: (prev[activeLead.id] || []).filter((message) => message.id !== optimisticMessage.id),
      }));
      console.error(error);
      alert("Could not send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  const appendTemplate = (template: string) => {
    setMessageInput(template);
  };

  return (
    <section className="px-5 md:px-8 py-6 space-y-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Messages</h1>
              <p className="mt-2 text-slate-500">Chat with travellers assigned to you.</p>
            </div>
            <button className="inline-flex items-center gap-2 rounded-2xl bg-[#FF5B26] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#e64f20]">
              <Edit3 className="w-4 h-4" />
              New Message
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-[370px_1fr_360px] gap-5">
            <aside className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[780px]">
              <div className="p-5 border-b border-slate-100">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-slate-900">Conversations</h2>
                  <button className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                    <FileText className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                  <input
                    value={chatSearchQuery}
                    onChange={(event) => setChatSearchQuery(event.target.value)}
                    placeholder="Search conversations..."
                    className="w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-10 py-3 text-sm outline-none focus:border-[#FF5B26]"
                  />
                  <button className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 hover:bg-slate-50">
                    <SlidersHorizontal className="w-4 h-4" />
                  </button>
                </div>
                <div className="mt-4 flex gap-2 overflow-x-auto">
                  {[
                    { id: "all", label: "All", count: threads.length },
                    { id: "unread", label: "Unread", count: threads.filter((thread) => thread.unreadCount > 0).length },
                    { id: "qualified", label: "Qualified", count: threads.filter((thread) => thread.lead.status === "qualified").length },
                    { id: "more", label: "More", count: Math.max(0, threads.length - 3) },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-medium whitespace-nowrap ${
                        activeTab === tab.id ? "bg-[#FFF1EA] text-[#FF5B26]" : "bg-slate-50 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {tab.label}
                      <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-500">{tab.count}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-2">
                {filteredThreads.map((thread) => {
                  const lastMessage = thread.messages[thread.messages.length - 1];
                  const isActive = activeThread?.lead.id === thread.lead.id;
                  const status = statusMeta[thread.lead.status.toLowerCase()] || statusMeta.new;

                  return (
                    <button
                      key={thread.lead.id}
                      onClick={() => setActiveLeadId(thread.lead.id)}
                      className={`w-full text-left rounded-3xl p-4 mb-2 transition-all border ${
                        isActive ? "bg-[#FFF7F3] border-[#FF5B26]/10" : "bg-white border-transparent hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="h-12 w-12 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center font-bold shrink-0">
                          {thread.lead.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="font-semibold text-slate-900 truncate">{thread.lead.name}</h3>
                            <span className="text-xs text-slate-400 whitespace-nowrap">{relativeTime(thread.lead.updated_at || thread.lead.created_at)}</span>
                          </div>
                          <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                            <span className="truncate">{thread.lead.trips?.title || "General enquiry"}</span>
                            <span className={`rounded-lg px-2 py-0.5 text-[11px] font-semibold ${status.className}`}>{status.label}</span>
                          </div>
                          <p className="mt-2 text-sm text-slate-600 line-clamp-2">
                            {lastMessage ? lastMessage.content : thread.lead.notes || "No messages yet"}
                          </p>
                        </div>
                        {thread.unreadCount > 0 && (
                          <span className="mt-1 h-5 min-w-5 rounded-full bg-[#FF5B26] px-1.5 text-[11px] font-bold text-white flex items-center justify-center">
                            {thread.unreadCount}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </aside>

            <section className="bg-white rounded-3xl border border-slate-200/80 shadow-sm overflow-hidden flex flex-col h-[780px]">
              {activeLead ? (
                <>
                  <div className="p-5 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="h-12 w-12 rounded-full bg-[#FFEFEA] text-[#FF5B26] flex items-center justify-center font-bold">
                        {activeLead.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <h2 className="text-xl font-bold text-slate-900">{activeLead.name}</h2>
                          <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusMeta[activeLead.status.toLowerCase()]?.className || statusMeta.new.className}`}>
                            {(statusMeta[activeLead.status.toLowerCase()] || statusMeta.new).label}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-slate-500">{activeLead.trips?.title || "General enquiry"} · {activeLead.trips?.destination || "Unknown destination"}</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <a href={`tel:${activeLead.phone || ""}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Phone className="w-4 h-4" />
                        Call
                      </a>
                      <a href={`mailto:${activeLead.email}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <Mail className="w-4 h-4" />
                        Email
                      </a>
                      <a href={`https://wa.me/${(activeLead.phone || "").replace(/[^0-9]/g, "")}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        WhatsApp
                      </a>
                      <Link href={`/manager/leads/${activeLead.id}`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
                        Open Lead
                      </Link>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 bg-[#FAF8F4]/20">
                    <div className="flex justify-center mb-5">
                      <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-500 shadow-sm">{formatDate(activeLead.created_at)}</span>
                    </div>

                    <div className="space-y-4">
                      {activeMessages.map((message) => {
                        const mine = message.sender === "team";
                        return (
                          <div key={message.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                            <div className={`max-w-[72%] rounded-3xl px-4 py-3 shadow-sm ${mine ? "bg-[#FFEFE5] text-slate-900" : "bg-white text-slate-900 border border-slate-200"}`}>
                              <div className="text-[11px] font-semibold text-slate-500 mb-1">
                                {mine ? user.full_name : activeLead.name} · {message.time}
                              </div>
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>

                              {message.attachment && (
                                <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-4">
                                  <div>
                                    <div className="text-sm font-semibold text-slate-900">{message.attachment.title}</div>
                                    <div className="text-xs text-slate-500">{message.attachment.subtitle} · {message.attachment.size}</div>
                                  </div>
                                  <button className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50">
                                    <ArrowRight className="w-4 h-4 rotate-90" />
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <form onSubmit={handleSend} className="border-t border-slate-100 p-4 bg-white">
                    <div className="rounded-3xl border border-slate-200 bg-white p-4">
                      <textarea
                        rows={3}
                        value={messageInput}
                        onChange={(event) => setMessageInput(event.target.value)}
                        placeholder="Type your message..."
                        className="w-full resize-none border-0 bg-transparent text-sm outline-none placeholder:text-slate-400"
                      />
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                            <Paperclip className="w-4 h-4" />
                            Attach
                          </button>
                          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                            <Ticket className="w-4 h-4" />
                            Template
                          </button>
                          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 hover:bg-slate-50">
                            <Sparkles className="w-4 h-4" />
                            Emoji
                          </button>
                        </div>

                        <button
                          type="submit"
                          disabled={isSending || !messageInput.trim()}
                          className="inline-flex items-center gap-2 rounded-2xl bg-[#FF5B26] px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-[#e64f20] disabled:opacity-60"
                        >
                          {isSending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                          Send
                        </button>
                      </div>
                    </div>
                  </form>
                </>
              ) : (
                <div className="flex h-full items-center justify-center text-center p-6">
                  <div>
                    <MessageCircle className="w-12 h-12 text-slate-300 mx-auto" />
                    <h3 className="mt-3 text-lg font-semibold text-slate-900">Select a conversation</h3>
                    <p className="mt-2 text-sm text-slate-500">Choose a traveller on the left to open the chat.</p>
                  </div>
                </div>
              )}
            </section>

            <aside className="space-y-5">
              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Traveller Details</h3>
                  <button className="text-slate-400">
                    <MoreVertical className="w-5 h-5" />
                  </button>
                </div>
                {activeLead && (
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center gap-3">
                      <Phone className="w-4 h-4 text-slate-400" />
                      <span>{activeLead.phone || "No phone number"}</span>
                      <div className="ml-auto flex items-center gap-2">
                        <a href={`https://wa.me/${(activeLead.phone || "").replace(/[^0-9]/g, "")}`} className="rounded-lg bg-[#ECFDF5] px-2.5 py-1 text-xs font-semibold text-[#16A34A]">WA</a>
                        <a href={`tel:${activeLead.phone || ""}`} className="rounded-lg bg-[#EEF2FF] px-2.5 py-1 text-xs font-semibold text-[#2563EB]">Call</a>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span className="break-all">{activeLead.email}</span>
                      <a href={`mailto:${activeLead.email}`} className="ml-auto rounded-lg bg-[#FFF7ED] px-2.5 py-1 text-xs font-semibold text-[#F97316]">Email</a>
                    </div>
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span>{activeLead.trips?.destination || "Bangalore, India"}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-900">Trip Interest</h3>
                {activeLead && (
                  <div className="mt-5">
                    <div className="flex items-start gap-3">
                      <img
                        src={activeLead.trips?.image_url || "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=200&q=80"}
                        alt={activeLead.trips?.title || "Trip"}
                        className="h-20 w-20 rounded-2xl object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">{activeLead.trips?.title || "General enquiry"}</h4>
                        <p className="text-sm text-slate-500 mt-1">{formatDateRange(activeLead.trips?.start_date, activeLead.trips?.end_date)}</p>
                        <p className="text-sm text-slate-500 mt-1">{activeLead.group_size || 1} traveller{(activeLead.group_size || 1) !== 1 ? "s" : ""}</p>
                        <p className="text-sm text-slate-500 mt-1">Budget: {activeLead.notes ? "Shared in notes" : "Not shared"}</p>
                      </div>
                    </div>
                    <Link href={activeLead.trips?.id ? `/manager/trips/${activeLead.trips.id}` : "/manager/trips"} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#FF5B26] px-4 py-2 text-sm font-semibold text-[#FF5B26] hover:bg-[#FFF7F3]">
                      View Trip
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                <h3 className="text-lg font-bold text-slate-900">Lead Information</h3>
                {activeLead && (
                  <div className="mt-5 space-y-4 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Status</span>
                      <span className={`rounded-lg px-2.5 py-1 text-xs font-semibold ${statusMeta[activeLead.status.toLowerCase()]?.className || statusMeta.new.className}`}>
                        {(statusMeta[activeLead.status.toLowerCase()] || statusMeta.new).label}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Lead Source</span>
                      <span className="font-medium text-slate-900">{activeLead.source || "Website"}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Enquiry Date</span>
                      <span className="font-medium text-slate-900">{formatDate(activeLead.created_at)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Last Updated</span>
                      <span className="font-medium text-slate-900">{formatDate(activeLead.updated_at || activeLead.created_at)}</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Assigned To</h3>
                  <button className="inline-flex items-center gap-1 rounded-xl border border-[#FF5B26] px-3 py-2 text-sm font-medium text-[#FF5B26]">
                    <User className="w-4 h-4" />
                    Reassign
                  </button>
                </div>
                <div className="mt-5 flex items-center gap-3">
                  {user.avatar_url ? (
                    <img src={user.avatar_url} alt={user.full_name} className="h-11 w-11 rounded-full object-cover" />
                  ) : (
                    <div className="h-11 w-11 rounded-full bg-[#FFF1EA] text-[#FF5B26] flex items-center justify-center font-bold">
                      {firstName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <div className="font-semibold text-slate-900">{user.full_name}</div>
                    <div className="text-xs text-slate-500">Manager</div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-3xl border border-slate-200/80 shadow-sm p-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-bold text-slate-900">Quick Templates</h3>
                  <Link href="/manager/leads" className="text-sm font-semibold text-[#FF5B26]">
                    View All
                  </Link>
                </div>
                <div className="mt-4 space-y-2">
                  {quickTemplates.map((template) => (
                    <button
                      key={template}
                      onClick={() => appendTemplate(template)}
                      className="w-full flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <span>{template}</span>
                      <ArrowRight className="w-4 h-4 text-slate-400" />
                    </button>
                  ))}
                </div>
              </div>
            </aside>
          </div>
    </section>
  );
}
