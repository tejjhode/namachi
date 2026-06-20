"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { notificationService, Notification } from "@/services/notification.service";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Inbox,
  Users,
  ClipboardList,
  Compass,
  BarChart3,
  Settings,
  LogOut,
  Menu,
  Bell,
  Search,
  ArrowRightLeft,
  ChevronDown,
  Plane,
  MessageSquare,
  ClipboardCheck
} from "lucide-react";

interface AdminLayoutClientProps {
  children: React.ReactNode;
  user: {
    fullName: string;
    email: string;
    avatarUrl?: string;
    role?: string;
  };
}

export function AdminLayoutClient({ children, user }: AdminLayoutClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [tripsMenuOpen, setTripsMenuOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  // Notifications State & Logic
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchUserId = async () => {
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
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

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

  const firstName = user.fullName.split(" ")[0] || "Admin";

  const navigationItems = [
    {
      label: "Dashboard",
      href: "/admin",
      icon: LayoutDashboard,
      active: pathname === "/admin"
    },
    {
      label: "Enquiries",
      href: "/admin/enquiries",
      icon: Inbox,
      active: pathname.startsWith("/admin/enquiries")
    },
    {
      label: "Leads",
      href: "/admin/leads",
      icon: Users,
      active: pathname.startsWith("/admin/leads")
    },
    {
      label: "Users",
      href: "/admin/users",
      icon: Users,
      active: pathname === "/admin/users"
    },
    {
      label: "Settings",
      href: "/admin/settings",
      icon: Settings,
      active: pathname === "/admin/settings"
    }
  ];

  return (
    <div className="h-screen bg-[#FAF8F4] font-sans antialiased text-nomichi-ink flex w-full overflow-hidden">
      {/* ===================== SIDEBAR ===================== */}
      <aside className="w-[260px] h-screen bg-white border-r border-[#e7e1d5]/50 flex flex-col justify-between shrink-0 p-6 sticky top-0 z-20">
        <div className="space-y-6 flex-grow flex flex-col">
          {/* Logo Section */}
          <div className="flex flex-col items-start px-2 mb-4">
            <img src="/logo.png" alt="Nomichi Logo" className="h-9 w-auto object-contain" />
            <span className="text-[9px] font-bold text-nomichi-sand tracking-[0.2em] uppercase mt-3">
              Wander • Connect • Belong
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="space-y-1 overflow-y-auto max-h-[calc(100vh-220px)] pr-1 flex-1 text-left">
            <Link
              href="/admin"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>

            <Link
              href="/admin/enquiries"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname.startsWith("/admin/enquiries")
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Inbox className="w-4 h-4" />
              Enquiries
            </Link>

            <Link
              href="/admin/leads"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname.startsWith("/admin/leads")
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Users className="w-4 h-4" />
              Leads
            </Link>


            {/* Expandable Trips Tab */}
            <div className="space-y-0.5">
              <button
                onClick={() => setTripsMenuOpen(!tripsMenuOpen)}
                className={`flex items-center justify-between px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 bg-transparent cursor-pointer ${
                  pathname.startsWith("/admin/trips")
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
                  <Link
                    href="/admin/trips"
                    className={`flex items-center gap-3 px-4 py-2 text-[11px] font-bold rounded-lg w-full text-left border-0 cursor-pointer no-underline ${
                      pathname === "/admin/trips" ? "text-[#FF5B26]" : "text-nomichi-ink/50 hover:text-nomichi-ink"
                    }`}
                  >
                    All Trips
                  </Link>
                  <Link
                    href="/admin/trips/new"
                    className={`flex items-center gap-3 px-4 py-2 text-[11px] font-bold rounded-lg w-full text-left border-0 cursor-pointer no-underline ${
                      pathname === "/admin/trips/new" ? "text-[#FF5B26]" : "text-nomichi-ink/50 hover:text-nomichi-ink"
                    }`}
                  >
                    Add Trip
                  </Link>
                </div>
              )}
            </div>

            <Link
              href="/admin/bookings"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/bookings"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <ClipboardList className="w-4 h-4" />
              Bookings
            </Link>

            <Link
              href="/admin/travelers"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/travelers"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Users className="w-4 h-4" />
              Travelers
            </Link>

            <Link
              href="/admin/departures"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/departures"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Plane className="w-4 h-4" />
              Departures
            </Link>


            <Link
              href="/admin/messages"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/messages"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              Messages
            </Link>

            <Link
              href="/admin/tasks"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/tasks"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Tasks
            </Link>

            <Link
              href="/admin/reports"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/reports"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              Reports
            </Link>

            <Link
              href="/admin/users"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/users"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Users className="w-4 h-4" />
              Users
            </Link>

            <Link
              href="/admin/settings"
              className={`flex items-center gap-3.5 px-4 py-2.5 text-xs font-bold rounded-xl w-full text-left transition-all border-0 cursor-pointer no-underline ${
                pathname === "/admin/settings"
                  ? "bg-[#FFEFEA] text-[#FF5B26]"
                  : "text-nomichi-ink/75 hover:bg-nomichi-sand/10 hover:text-[#FF5B26]"
              }`}
            >
              <Settings className="w-4 h-4" />
              Settings
            </Link>
          </nav>
        </div>

        {/* Bottom fixed area */}
        <div className="space-y-1.5 pt-4 border-t border-[#e7e1d5]/50">
          <button
            onClick={() => router.push("/")}
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
                placeholder="Search enquiries, travellers, trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-4 pr-11 py-2 border border-[#e7e1d5] bg-[#FAF8F4]/30 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#FF5B26] text-nomichi-ink placeholder-nomichi-ink/35"
              />
              <Search className="w-4 h-4 text-nomichi-ink/35 absolute right-4 top-1/2 -translate-y-1/2" />
            </div>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            {/* Notification Bell */}
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                className="w-10 h-10 rounded-full border border-[#e7e1d5]/50 hover:bg-[#FAF8F4] flex items-center justify-center text-nomichi-ink/60 transition-all relative cursor-pointer bg-white"
              >
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-[#FF5B26] text-white text-[9px] font-black flex items-center justify-center animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2.5 w-80 bg-white rounded-3xl border border-[#e7e1d5]/60 shadow-xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                  <div className="p-4.5 border-b border-[#e7e1d5]/30 flex items-center justify-between bg-[#FAF8F4]/30">
                    <span className="text-xs font-black uppercase tracking-wide text-nomichi-ink/50">
                      Notifications
                    </span>
                    {unreadCount > 0 && (
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
                  {user.role?.charAt(0).toUpperCase() + user.role?.slice(1) || "User"}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* ===================== MAIN SCROLLABLE CONTENT ===================== */}
        <main className="flex-1 overflow-y-auto p-8 relative">
          {children}
        </main>
      </div>
    </div>
  );
}
