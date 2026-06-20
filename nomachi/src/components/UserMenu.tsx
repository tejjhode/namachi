"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { 
  Bell, 
  ChevronDown, 
  Calendar, 
  BookOpen, 
  Heart, 
  User as UserIcon, 
  Settings, 
  LogOut 
} from "lucide-react";

interface UserMenuProps {
  user: {
    fullName: string;
    avatarUrl?: string;
    email: string;
  };
  onNavigate?: (view: "home" | "explore" | "enquiries" | "journeys" | "wishlist" | "profile" | "settings") => void;
  showBell?: boolean;
}

export function UserMenu({ user, onNavigate, showBell = false }: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, []);

  const handleNav = (view: "home" | "explore" | "enquiries" | "journeys" | "wishlist" | "profile" | "settings") => {
    setIsOpen(false);
    if (onNavigate) {
      onNavigate(view);
    } else {
      router.push(`/?view=${view}`);
    }
  };

  return (
    <div className="flex items-center gap-6 relative" ref={dropdownRef}>
      
      {/* Notification Bell */}
      {showBell && (
        <button aria-label="Notifications" className="relative p-1.5 text-nomichi-ink/70 hover:text-nomichi-rust hover:bg-nomichi-sand/10 rounded-full transition-all duration-300 border-0 bg-transparent cursor-pointer">
          <Bell className="w-5.5 h-5.5 stroke-[1.8px]" />
          <span className="absolute top-1 right-1 w-4 h-4 bg-nomichi-rust rounded-full text-[9px] font-extrabold flex items-center justify-center text-nomichi-white shadow-sm border border-nomichi-cream/20">
            2
          </span>
        </button>
      )}

      {/* User Selector Dropdown Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-nomichi-sand/10 transition-all duration-300 group focus:outline-none border-0 bg-transparent cursor-pointer"
      >
        {user.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt={user.fullName} 
            className="w-8 h-8 rounded-full object-cover border border-[#e7e1d5]/30 group-hover:border-[#FF5B26]/30 transition-colors"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-[#FFEFEA] text-[#FF5B26] border border-[#FF5B26]/10 flex items-center justify-center font-bold text-sm shrink-0">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline text-xs font-bold text-nomichi-ink group-hover:text-[#FF5B26] transition-colors">
          {user.fullName}
        </span>
        <ChevronDown className={`w-4 h-4 text-nomichi-ink/50 group-hover:text-[#FF5B26] transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Box */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2.5 w-56 bg-white rounded-2xl shadow-xl border border-[#e7e1d5]/60 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <button 
            onClick={() => handleNav("journeys")} 
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors text-left border-0 bg-transparent cursor-pointer"
          >
            <Calendar className="w-4.5 h-4.5 stroke-[1.8px]" />
            My Trips
          </button>
          <button 
            onClick={() => handleNav("enquiries")} 
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors text-left border-0 bg-transparent cursor-pointer"
          >
            <BookOpen className="w-4.5 h-4.5 stroke-[1.8px]" />
            Bookings
          </button>
          <button 
            onClick={() => handleNav("wishlist")} 
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors text-left border-0 bg-transparent cursor-pointer"
          >
            <Heart className="w-4.5 h-4.5 stroke-[1.8px]" />
            Wishlist
          </button>
          <button 
            onClick={() => handleNav("profile")} 
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors text-left border-0 bg-transparent cursor-pointer"
          >
            <UserIcon className="w-4.5 h-4.5 stroke-[1.8px]" />
            Profile
          </button>
          <button 
            onClick={() => handleNav("settings")} 
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors text-left border-0 bg-transparent cursor-pointer"
          >
            <Settings className="w-4.5 h-4.5 stroke-[1.8px]" />
            Settings
          </button>
          <div className="h-px bg-[#e7e1d5]/20 my-2" />
          <button 
            onClick={() => {
              setIsOpen(false);
              window.location.href = "/auth/signout";
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-nomichi-rust hover:bg-nomichi-rust/5 transition-colors text-left border-0 bg-transparent cursor-pointer"
          >
            <LogOut className="w-4.5 h-4.5 stroke-[2px]" />
            Log out
          </button>
        </div>
      )}

    </div>
  );
}

