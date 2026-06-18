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
}

export function UserMenu({ user }: UserMenuProps) {
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


  return (
    <div className="flex items-center gap-6 relative" ref={dropdownRef}>
      
      {/* Notification Bell */}
      <button aria-label="Notifications" className="relative p-1.5 text-nomichi-cream/90 hover:text-nomichi-white hover:bg-nomichi-white/10 rounded-full transition-all duration-300">
        <Bell className="w-5.5 h-5.5 stroke-[1.8px]" />
        <span className="absolute top-1 right-1 w-4 h-4 bg-nomichi-rust rounded-full text-[9px] font-extrabold flex items-center justify-center text-nomichi-white shadow-sm border border-nomichi-cream/20">
          2
        </span>
      </button>

      {/* User Selector Dropdown Trigger */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2.5 p-1 rounded-full hover:bg-nomichi-white/10 transition-all duration-300 group focus:outline-none"
      >
        {user.avatarUrl ? (
          <img 
            src={user.avatarUrl} 
            alt={user.fullName} 
            className="w-8 h-8 rounded-full object-cover border border-nomichi-white/20 group-hover:border-nomichi-sand/50 transition-colors"
          />
        ) : (
          <div className="w-8 h-8 rounded-full bg-nomichi-sand/20 text-nomichi-sand border border-nomichi-white/20 flex items-center justify-center font-bold text-sm shrink-0">
            {user.fullName.charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden sm:inline text-sm font-semibold text-nomichi-cream group-hover:text-nomichi-white transition-colors">
          {user.fullName}
        </span>
        <ChevronDown className={`w-4 h-4 text-nomichi-cream/80 group-hover:text-nomichi-white transition-transform duration-300 shrink-0 ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown Menu Box */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-nomichi-white rounded-2xl shadow-xl border border-nomichi-sand/15 py-2.5 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors">
            <Calendar className="w-4.5 h-4.5 stroke-[1.8px]" />
            My Trips
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors">
            <BookOpen className="w-4.5 h-4.5 stroke-[1.8px]" />
            Bookings
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors">
            <Heart className="w-4.5 h-4.5 stroke-[1.8px]" />
            Wishlist
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors">
            <UserIcon className="w-4.5 h-4.5 stroke-[1.8px]" />
            Profile
          </a>
          <a href="#" className="flex items-center gap-3 px-4 py-2.5 text-sm font-medium text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors">
            <Settings className="w-4.5 h-4.5 stroke-[1.8px]" />
            Settings
          </a>
          <div className="h-px bg-nomichi-sand/10 my-2" />
          <a 
            href="/auth/signout"
            onClick={(e) => {
              e.preventDefault();
              window.location.href = "/auth/signout";
            }}
            className="flex items-center gap-3 w-full px-4 py-2.5 text-sm font-semibold text-nomichi-rust hover:bg-nomichi-rust/5 transition-colors text-left"
          >
            <LogOut className="w-4.5 h-4.5 stroke-[2px]" />
            Log out
          </a>
        </div>
      )}

    </div>
  );
}
