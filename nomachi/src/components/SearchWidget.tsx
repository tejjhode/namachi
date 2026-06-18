"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { MapPin, Calendar, Users, Search, Plus, Minus, ChevronDown } from "lucide-react";

interface SearchWidgetProps {
  destinationsList: string[];
}

export function SearchWidget({ destinationsList }: SearchWidgetProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Local state initialized from URL or defaults
  const [destination, setDestination] = useState(searchParams.get("destination") || "");
  const [checkIn, setCheckIn] = useState(searchParams.get("checkin") || "");
  const [checkOut, setCheckOut] = useState(searchParams.get("checkout") || "");
  const [adults, setAdults] = useState(parseInt(searchParams.get("adults") || "2", 10));
  const [childrenCount, setChildrenCount] = useState(parseInt(searchParams.get("children") || "0", 10));

  // Dropdown visibility states
  const [showDestDropdown, setShowDestDropdown] = useState(false);
  const [showTravelersDropdown, setShowTravelersDropdown] = useState(false);

  const destRef = useRef<HTMLDivElement>(null);
  const travelersRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (destRef.current && !destRef.current.contains(event.target as Node)) {
        setShowDestDropdown(false);
      }
      if (travelersRef.current && !travelersRef.current.contains(event.target as Node)) {
        setShowTravelersDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (destination) params.set("destination", destination);
    if (checkIn) params.set("checkin", checkIn);
    if (checkOut) params.set("checkout", checkOut);
    if (adults > 0) params.set("adults", adults.toString());
    if (childrenCount > 0) params.set("children", childrenCount.toString());

    // Navigate to root with params and scroll to destinations section
    router.push(`/?${params.toString()}#destinations`);
  };

  const totalTravelers = adults + childrenCount;

  // Filter destination recommendations
  const filteredDestinations = destinationsList.filter((dest) =>
    dest.toLowerCase().includes(destination.toLowerCase())
  );

  return (
    <div className="absolute left-0 right-0 bottom-0 transform translate-y-1/2 z-20 px-4 md:px-8 max-w-6xl mx-auto">
      <div className="bg-nomichi-white rounded-[24px] shadow-[0_10px_35px_rgba(28,27,26,0.08)] border border-nomichi-sand/15 p-4 md:py-5 md:px-7 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Where to */}
        <div className="md:col-span-4 flex gap-3.5 items-center relative" ref={destRef}>
          <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
            <MapPin className="w-5 h-5" />
          </div>
          <div className="flex flex-col min-w-0 w-full">
            <span className="text-xs font-bold text-nomichi-ink/80 tracking-wide">Where do you want to go?</span>
            <input 
              type="text" 
              placeholder="Search destinations" 
              value={destination}
              onChange={(e) => {
                setDestination(e.target.value);
                setShowDestDropdown(true);
              }}
              onFocus={() => setShowDestDropdown(true)}
              className="bg-transparent text-sm font-medium text-nomichi-ink/65 placeholder-nomichi-ink/40 focus:outline-none focus:placeholder-transparent mt-0.5 w-full"
            />
          </div>

          {/* Destination Popover List */}
          {showDestDropdown && filteredDestinations.length > 0 && (
            <div className="absolute left-0 top-full mt-3 w-64 bg-nomichi-white rounded-2xl shadow-xl border border-nomichi-sand/15 py-2 z-50 max-h-60 overflow-y-auto">
              {filteredDestinations.map((dest, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setDestination(dest);
                    setShowDestDropdown(false);
                  }}
                  className="w-full px-4 py-2.5 text-left text-sm font-semibold text-nomichi-ink/80 hover:bg-nomichi-sand/10 hover:text-nomichi-rust transition-colors flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4 text-nomichi-rust" />
                  {dest}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* When */}
        <div className="md:col-span-3 flex gap-3.5 items-center border-t md:border-t-0 md:border-l border-nomichi-sand/10 md:pl-5 relative">
          <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
            <Calendar className="w-5 h-5" />
          </div>
          <div className="flex flex-col w-full">
            <span className="text-xs font-bold text-nomichi-ink/80 tracking-wide">When?</span>
            <input
              type="date"
              value={checkIn}
              onChange={(e) => setCheckIn(e.target.value)}
              className="bg-transparent text-sm font-medium text-nomichi-ink/65 mt-0.5 focus:outline-none w-full cursor-pointer [color-scheme:light]"
            />
          </div>
        </div>

        {/* Travelers */}
        <div className="md:col-span-3 flex gap-3.5 items-center border-t md:border-t-0 md:border-l border-nomichi-sand/10 md:pl-5 relative" ref={travelersRef}>
          <div className="w-10 h-10 rounded-full bg-nomichi-sand/10 flex items-center justify-center text-nomichi-rust shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <button
            type="button"
            onClick={() => setShowTravelersDropdown(!showTravelersDropdown)}
            className="flex flex-col text-left focus:outline-none w-full"
          >
            <span className="text-xs font-bold text-nomichi-ink/80 tracking-wide flex items-center gap-1">
              Who's going? <ChevronDown className="w-3.5 h-3.5 text-nomichi-ink/40" />
            </span>
            <span className="text-sm font-medium text-nomichi-ink/65 mt-0.5">
              {totalTravelers} Traveler{totalTravelers !== 1 && "s"}
            </span>
          </button>

          {/* Travelers Dropdown */}
          {showTravelersDropdown && (
            <div className="absolute right-0 top-full mt-3 w-64 bg-nomichi-white rounded-2xl shadow-xl border border-nomichi-sand/15 p-4.5 z-50 space-y-4">
              {/* Adults */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-nomichi-ink">Adults</span>
                  <span className="text-xs text-nomichi-ink/40">Age 13 or above</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAdults(Math.max(1, adults - 1))}
                    className="w-8 h-8 rounded-full border border-nomichi-sand/30 flex items-center justify-center text-nomichi-ink hover:border-nomichi-rust hover:text-nomichi-rust transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold text-nomichi-ink w-4 text-center">{adults}</span>
                  <button
                    type="button"
                    onClick={() => setAdults(adults + 1)}
                    className="w-8 h-8 rounded-full border border-nomichi-sand/30 flex items-center justify-center text-nomichi-ink hover:border-nomichi-rust hover:text-nomichi-rust transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Children */}
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-sm font-bold text-nomichi-ink">Children</span>
                  <span className="text-xs text-nomichi-ink/40">Ages 2 – 12</span>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setChildrenCount(Math.max(0, childrenCount - 1))}
                    className="w-8 h-8 rounded-full border border-nomichi-sand/30 flex items-center justify-center text-nomichi-ink hover:border-nomichi-rust hover:text-nomichi-rust transition-colors"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-sm font-bold text-nomichi-ink w-4 text-center">{childrenCount}</span>
                  <button
                    type="button"
                    onClick={() => setChildrenCount(childrenCount + 1)}
                    className="w-8 h-8 rounded-full border border-nomichi-sand/30 flex items-center justify-center text-nomichi-ink hover:border-nomichi-rust hover:text-nomichi-rust transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Explore Trips Button */}
        <button
          type="button"
          onClick={handleSearch}
          className="md:col-span-2 bg-nomichi-rust hover:bg-[#b04b1e] text-nomichi-white py-3.5 px-6 rounded-2xl font-bold tracking-wide flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all duration-300 w-full whitespace-nowrap text-sm"
        >
          <Search className="w-4 h-4 stroke-[2.5px]" />
          Explore Trips
        </button>
      </div>
    </div>
  );
}
