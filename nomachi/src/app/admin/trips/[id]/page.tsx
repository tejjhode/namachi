"use client";

import { useTrip } from "@/hooks/useTrip";
import {
  ArrowLeft,
  Save,
  Loader2,
  HelpCircle,
  ImageIcon,
  Compass,
  ChevronDown,
  Plus,
  Edit3,
  Trash2,
  GripVertical,
  CheckCircle,
  XCircle,
  Sparkles,
  Upload,
  FileText
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const AVAILABLE_STYLES = ["Roadtrip", "Adventure", "Slow Travel", "Trek", "Cultural", "Backpacker", "Luxury"];
const AVAILABLE_BEST_FOR = ["Solo Travellers", "Couples", "First Timers", "Nature Lovers", "Thrill Seekers", "Photographers"];

interface EditTripPageProps {
  params: {
    id: string;
  };
}

export default function EditTripPage({ params }: EditTripPageProps) {
  const router = useRouter();
  const { trip, loading, error, success, saveTrip, refresh } = useTrip(params.id);

  const [form, setForm] = useState<any>({
    title: "",
    destination: "",
    status: "Draft",
    startDate: "",
    endDate: "",
    totalSeats: 12,
    seatsLeft: 12,
    price: 0,
    duration: "",
    description: "",
    accommodation: "",
    imageUrl: "",
    brochureUrl: "",
    difficulty: "Easy",
    ageGroup: "18-35",
    meals: "Breakfast Only",
    groupSize: "8-12",
  });

  const [brochureFileName, setBrochureFileName] = useState("");

  const [highlights, setHighlights] = useState<string[]>([]);
  const [newHighlight, setNewHighlight] = useState("");

  const [inclusions, setInclusions] = useState<string[]>([]);
  const [newInclusion, setNewInclusion] = useState("");

  const [exclusions, setExclusions] = useState<string[]>([]);
  const [newExclusion, setNewExclusion] = useState("");

  const [itinerary, setItinerary] = useState<any[]>([]);
  const [newDayTitle, setNewDayTitle] = useState("");
  const [newDayDesc, setNewDayDesc] = useState("");
  const [editingDayIdx, setEditingDayIdx] = useState<number | null>(null);

  const [faqs, setFaqs] = useState<any[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [editingFAQIdx, setEditingFAQIdx] = useState<number | null>(null);

  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [selectedBestFor, setSelectedBestFor] = useState<string[]>([]);

  const [styleDropdownOpen, setStyleDropdownOpen] = useState(false);
  const [bestForDropdownOpen, setBestForDropdownOpen] = useState(false);
  const [livePreviewActive, setLivePreviewActive] = useState(true);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Sync loaded trip details into local states
  useEffect(() => {
    if (trip) {
      setForm({
        title: trip.title || "",
        destination: trip.destination || "",
        status: trip.status || "Draft",
        startDate: trip.start_date || "",
        endDate: trip.end_date || "",
        totalSeats: trip.total_seats || 12,
        seatsLeft: trip.seats_left || 12,
        price: trip.price || 0,
        duration: trip.duration || "",
        description: trip.description || "",
        accommodation: trip.accommodation || "",
        imageUrl: trip.image_url || "",
        brochureUrl: trip.brochure_url || "",
        difficulty: trip.difficulty || "Easy",
        ageGroup: trip.age_group || "18-35",
        meals: trip.meals || "Breakfast Only",
        groupSize: trip.group_size || "8-12",
      });

      setHighlights(trip.highlights || []);
      setInclusions(trip.inclusions || []);
      setExclusions(trip.exclusions || []);
      setItinerary(trip.itinerary || []);
      setFaqs(trip.faqs || []);
      setGalleryImages(trip.images || []);
      setSelectedStyles(trip.trip_style ? trip.trip_style.split(",").map((s) => s.trim()) : []);
      setSelectedBestFor(trip.best_for ? trip.best_for.split(",").map((s) => s.trim()) : []);
      setBrochureFileName(trip.brochure_url ? "uploaded_brochure.pdf" : "");
    }
  }, [trip]);

  const getNormalizedStatus = (s: string) => {
    if (!s) return "Draft";
    if (s.toLowerCase() === "open for enquiries") return "Open for Enquiries";
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
  };

  const toggleStyle = (style: string) => {
    if (selectedStyles.includes(style)) {
      setSelectedStyles(selectedStyles.filter((s) => s !== style));
    } else {
      setSelectedStyles([...selectedStyles, style]);
    }
  };

  const toggleBestFor = (val: string) => {
    if (selectedBestFor.includes(val)) {
      setSelectedBestFor(selectedBestFor.filter((s) => s !== val));
    } else {
      setSelectedBestFor([...selectedBestFor, val]);
    }
  };

  // Highlights handlers
  const handleAddHighlight = () => {
    if (newHighlight.trim()) {
      setHighlights([...highlights, newHighlight.trim()]);
      setNewHighlight("");
    }
  };

  const handleRemoveHighlight = (idx: number) => {
    setHighlights(highlights.filter((_, i) => i !== idx));
  };

  // Inclusions handlers
  const handleAddInclusion = () => {
    if (newInclusion.trim()) {
      setInclusions([...inclusions, newInclusion.trim()]);
      setNewInclusion("");
    }
  };

  const handleRemoveInclusion = (idx: number) => {
    setInclusions(inclusions.filter((_, i) => i !== idx));
  };

  // Exclusions handlers
  const handleAddExclusion = () => {
    if (newExclusion.trim()) {
      setExclusions([...exclusions, newExclusion.trim()]);
      setNewExclusion("");
    }
  };

  const handleRemoveExclusion = (idx: number) => {
    setExclusions(exclusions.filter((_, i) => i !== idx));
  };

  // Itinerary Day handlers
  const handleAddDay = () => {
    if (!newDayTitle.trim() || !newDayDesc.trim()) return;
    if (editingDayIdx !== null) {
      const updated = [...itinerary];
      updated[editingDayIdx] = {
        day: editingDayIdx + 1,
        title: newDayTitle.trim(),
        description: newDayDesc.trim(),
      };
      setItinerary(updated);
      setEditingDayIdx(null);
    } else {
      setItinerary([
        ...itinerary,
        {
          day: itinerary.length + 1,
          title: newDayTitle.trim(),
          description: newDayDesc.trim(),
        },
      ]);
    }
    setNewDayTitle("");
    setNewDayDesc("");
  };

  const handleStartEditDay = (idx: number) => {
    setEditingDayIdx(idx);
    setNewDayTitle(itinerary[idx].title);
    setNewDayDesc(itinerary[idx].description);
  };

  const handleRemoveDay = (idx: number) => {
    const filtered = itinerary.filter((_, i) => i !== idx);
    const reordered = filtered.map((d, i) => ({ ...d, day: i + 1 }));
    setItinerary(reordered);
  };

  // FAQ handlers
  const handleAddFAQ = () => {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    if (editingFAQIdx !== null) {
      const updated = [...faqs];
      updated[editingFAQIdx] = {
        question: newQuestion.trim(),
        answer: newAnswer.trim(),
      };
      setFaqs(updated);
      setEditingFAQIdx(null);
    } else {
      setFaqs([
        ...faqs,
        {
          question: newQuestion.trim(),
          answer: newAnswer.trim(),
        },
      ]);
    }
    setNewQuestion("");
    setNewAnswer("");
  };

  const handleStartEditFAQ = (idx: number) => {
    setEditingFAQIdx(idx);
    setNewQuestion(faqs[idx].question);
    setNewAnswer(faqs[idx].answer);
  };

  const handleRemoveFAQ = (idx: number) => {
    setFaqs(faqs.filter((_, i) => i !== idx));
  };

  // Cover upload reader
  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev: any) => ({ ...prev, imageUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Brochure upload reader
  const handleBrochureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.type !== "application/pdf") {
      alert("Please select a PDF file.");
      return;
    }
    if (file.size > 20 * 1024 * 1024) {
      alert("Brochure must be under 20 MB.");
      return;
    }
    setBrochureFileName(file.name);
    const reader = new FileReader();
    reader.onloadend = () => {
      setForm((prev: any) => ({ ...prev, brochureUrl: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

  // Gallery images reader
  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setGalleryImages((prev) => [...prev, reader.result as string].slice(0, 10));
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent, statusOverride?: string) => {
    e.preventDefault();
    setSubmitLoading(true);

    try {
      const finalStatus = statusOverride || form.status;
      const updates = {
        title: form.title,
        destination: form.destination,
        status: finalStatus,
        start_date: form.startDate ? new Date(form.startDate).toISOString() : null,
        end_date: form.endDate ? new Date(form.endDate).toISOString() : null,
        total_seats: parseInt(form.totalSeats) || null,
        seats_left: parseInt(form.seatsLeft) || null,
        price: parseFloat(form.price) || 0,
        duration: form.duration,
        description: form.description,
        accommodation: form.accommodation,
        image_url: form.imageUrl,
        brochure_url: form.brochureUrl || null,
        difficulty: form.difficulty,
        age_group: form.ageGroup,
        meals: form.meals,
        group_size: form.groupSize,
        highlights,
        inclusions,
        exclusions,
        itinerary,
        faqs,
        images: galleryImages,
        trip_style: selectedStyles.join(", "),
        best_for: selectedBestFor.join(", "),
      };

      await saveTrip(updates);
      router.push("/admin/trips");
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-40">
        <Loader2 className="w-8 h-8 text-[#FF5B26] animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e7e1d5]/50 pb-5">
        <div className="text-left flex items-center gap-3">
          <Link href="/admin/trips" className="p-2 bg-white border border-[#e7e1d5]/40 rounded-xl text-nomichi-ink hover:bg-[#FAF8F4] transition-colors">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-display font-extrabold text-nomichi-ink tracking-tight">Edit Trip</h1>
            <p className="text-xs text-nomichi-ink/40 font-semibold mt-1">
              Update existing trip template information and configuration.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.push("/admin/trips")}
            className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, "Draft")}
            disabled={submitLoading}
            className="px-4 py-2 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin inline-block mr-1.5" /> : null}
            Save as Draft
          </button>
          <button
            type="button"
            onClick={(e) => handleSubmit(e, form.status)}
            disabled={submitLoading}
            className="px-5 py-2 bg-[#FF5B26] hover:bg-[#b04b1e] text-white font-extrabold text-xs rounded-xl shadow-md transition-all cursor-pointer border-0 flex items-center gap-1.5 disabled:opacity-50"
          >
            {submitLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Save Changes
          </button>
        </div>
      </div>

      {/* Alert Banners */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5 text-left">
          <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-xl text-xs font-medium flex items-center gap-2.5 text-left">
          <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
          {success}
        </div>
      )}

      {/* Layout Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column Form */}
        <div className="lg:col-span-8 space-y-6">
          
          {/* 1. Basic Information */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-5">
            <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">1. Basic Information</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Trip Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tokyo Lights & Mt. Fuji"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Destination *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Tokyo, Japan"
                  value={form.destination}
                  onChange={(e) => setForm({ ...form, destination: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Status *</label>
                <select
                  value={getNormalizedStatus(form.status)}
                  onChange={(e) => setForm({ ...form, status: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                >
                  <option value="Draft">Draft</option>
                  <option value="Open for Enquiries">Open for Enquiries</option>
                  <option value="Active">Active</option>
                  <option value="Completed">Completed</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>
            </div>

            {!(form.status?.toLowerCase() === "active" || form.status?.toLowerCase() === "completed") ? (
              <div className="bg-[#FFEFEA]/50 border border-[#FF5B26]/10 text-nomichi-rust rounded-2xl p-4 flex items-center gap-3 mt-4 text-xs font-semibold">
                <HelpCircle className="w-4.5 h-4.5 text-[#FF5B26] shrink-0" />
                <span>Start date, end date and total seats will be set when you activate the trip.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-3 border-t border-[#e7e1d5]/20 mt-4">
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={form.startDate ? form.startDate.split("T")[0] : ""}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">End Date *</label>
                  <input
                    type="date"
                    required
                    value={form.endDate ? form.endDate.split("T")[0] : ""}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Total Seats *</label>
                  <input
                    type="number"
                    required
                    value={form.totalSeats}
                    onChange={(e) => setForm({ ...form, totalSeats: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Seats Left</label>
                  <input
                    type="number"
                    value={form.seatsLeft}
                    onChange={(e) => setForm({ ...form, seatsLeft: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 2. Cover Image */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-[#e7e1d5]/20 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide">2. Cover Image</h3>
                <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">This image will be used as the main banner for your trip.</p>
              </div>
              <label htmlFor="cover-file-upload" className="px-3 py-1.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 font-bold text-xs rounded-xl shadow-sm transition-all cursor-pointer">
                Change Image
              </label>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="w-full h-40 rounded-2xl border border-[#e7e1d5]/50 bg-[#FAF8F4] overflow-hidden relative flex items-center justify-center shadow-inner">
                {form.imageUrl ? (
                  <img src={form.imageUrl} alt="Cover Preview" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-nomichi-ink/30 text-xs font-semibold">No image selected</div>
                )}
              </div>

              <div className="border border-dashed border-[#e7e1d5] bg-[#FAF8F4]/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-40">
                <input type="file" className="hidden" id="cover-file-upload" onChange={handleCoverUpload} accept="image/*" />
                <div className="w-10 h-10 rounded-full bg-white border border-[#e7e1d5] flex items-center justify-center text-nomichi-ink/40 shadow-sm mb-2">
                  <ImageIcon className="w-4 h-4 text-[#FF5B26]" />
                </div>
                <span className="text-xs font-bold text-nomichi-ink">Upload Image</span>
                <span className="text-[10px] text-nomichi-ink/40 font-semibold mt-1 mb-3">JPG, PNG or WebP, Recommended size 16:9.</span>
                <label htmlFor="cover-file-upload" className="px-3 py-1.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all">
                  Browse Files
                </label>
              </div>
            </div>
          </div>
          {/* 2b. Trip Brochure */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
            <div className="flex justify-between items-center border-b border-[#e7e1d5]/20 pb-3">
              <div>
                <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide">2b. Trip Brochure (Optional)</h3>
                <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Upload a PDF brochure detailing the itinerary, packing list, and trip details.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="w-full h-40 rounded-2xl border border-[#e7e1d5]/50 bg-[#FAF8F4] p-4 flex flex-col justify-between shadow-inner">
                {form.brochureUrl ? (
                  <div className="flex flex-col justify-between h-full">
                     <div className="flex items-start gap-3">
                       <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-100 flex items-center justify-center shrink-0 shadow-sm">
                         <FileText className="w-5 h-5 text-red-500" />
                       </div>
                       <div className="flex-1 min-w-0">
                         <p className="text-xs font-bold text-nomichi-ink truncate">
                           {brochureFileName || "Uploaded_Brochure.pdf"}
                         </p>
                         <p className="text-[10px] text-emerald-600 font-bold mt-0.5 flex items-center gap-1">
                           <CheckCircle className="w-3 h-3" /> Successfully Attached
                         </p>
                       </div>
                     </div>
                     
                     <div className="flex items-center gap-2 pt-3 border-t border-[#e7e1d5]/40">
                       <a
                         href={form.brochureUrl}
                         download={brochureFileName || "brochure.pdf"}
                         className="px-2.5 py-1.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink/70 hover:text-nomichi-ink font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1.5"
                       >
                         <Upload className="w-3 h-3 rotate-180 text-[#FF5B26]" /> Download
                       </a>
                       <button
                         type="button"
                         onClick={() => {
                           setForm((p: any) => ({ ...p, brochureUrl: "" }));
                           setBrochureFileName("");
                         }}
                         className="px-2.5 py-1.5 bg-white border border-rose-100 hover:bg-rose-50 text-rose-500 hover:text-rose-700 font-bold text-[10px] rounded-lg shadow-sm transition-all flex items-center gap-1.5 ml-auto"
                       >
                         <Trash2 className="w-3 h-3" /> Remove
                       </button>
                     </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-nomichi-ink/30 space-y-1">
                    <FileText className="w-8 h-8 opacity-40" />
                    <span className="text-xs font-semibold">No brochure uploaded</span>
                  </div>
                )}
              </div>

              <div className="border border-dashed border-[#e7e1d5] bg-[#FAF8F4]/20 rounded-2xl p-6 flex flex-col items-center justify-center text-center h-40">
                <input
                  type="file"
                  className="hidden"
                  id="brochure-file-upload"
                  onChange={handleBrochureUpload}
                  accept="application/pdf"
                />
                <div className="w-10 h-10 rounded-full bg-white border border-[#e7e1d5] flex items-center justify-center text-nomichi-ink/40 shadow-sm mb-2">
                  <Upload className="w-4 h-4 text-[#FF5B26]" />
                </div>
                <span className="text-xs font-bold text-nomichi-ink">Upload Brochure PDF</span>
                <span className="text-[10px] text-nomichi-ink/40 font-semibold mt-1 mb-3">PDF format only. Max file size 20MB.</span>
                <label
                  htmlFor="brochure-file-upload"
                  className="px-3 py-1.5 bg-white border border-[#e7e1d5] hover:bg-[#FAF8F4] text-nomichi-ink font-bold text-[10px] rounded-lg shadow-sm cursor-pointer transition-all"
                >
                  Browse Files
                </label>
              </div>
            </div>
          </div>

          {/* 3. Trip Overview */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-5">
            <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">3. Trip Overview</h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                {/* Trip Style */}
                <div className="space-y-1.5 relative w-full text-left">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Trip Style</label>
                  <div
                    onClick={() => setStyleDropdownOpen(!styleDropdownOpen)}
                    className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5] px-3 py-2 rounded-xl text-xs font-semibold text-left text-nomichi-ink flex items-center justify-between hover:bg-[#FAF8F4]/50 transition-all focus-within:border-[#FF5B26] min-h-[42px] cursor-pointer"
                  >
                    <div className="flex flex-wrap gap-1 items-center max-w-[170px] overflow-hidden">
                      {selectedStyles.length > 0 ? (
                        selectedStyles.map((val) => (
                          <span
                            key={val}
                            className="inline-flex items-center gap-1 bg-white border border-[#e7e1d5] text-nomichi-ink px-1.5 py-0.5 rounded-lg text-[9px] font-bold shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleStyle(val);
                            }}
                          >
                            {val}
                            <span className="text-nomichi-rust hover:text-[#b04b1e] cursor-pointer">✕</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-nomichi-ink/30">Select styles</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-nomichi-ink/40 transition-transform duration-200 shrink-0 ${styleDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                  {styleDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setStyleDropdownOpen(false)} />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-[#e7e1d5] rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
                        {AVAILABLE_STYLES.map((option) => {
                          const isChecked = selectedStyles.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleStyle(option)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg text-left transition-all ${
                                isChecked ? "bg-[#FFEFEA]/40 text-[#FF5B26]" : "text-nomichi-ink hover:bg-[#FAF8F4]/60"
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isChecked ? "bg-[#FF5B26] border-[#FF5B26] text-white" : "border-[#e7e1d5]"}`}>
                                {isChecked && (
                                  <svg className="w-2 h-2 stroke-[4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Difficulty */}
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Difficulty</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Moderate">Moderate</option>
                    <option value="Challenging">Challenging</option>
                  </select>
                </div>

                {/* Best For */}
                <div className="space-y-1.5 relative w-full text-left">
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider">Best For</label>
                  <div
                    onClick={() => setBestForDropdownOpen(!bestForDropdownOpen)}
                    className="w-full bg-[#FAF8F4]/30 border border-[#e7e1d5] px-3 py-2 rounded-xl text-xs font-semibold text-left text-nomichi-ink flex items-center justify-between hover:bg-[#FAF8F4]/50 transition-all focus-within:border-[#FF5B26] min-h-[42px] cursor-pointer"
                  >
                    <div className="flex flex-wrap gap-1 items-center max-w-[170px] overflow-hidden">
                      {selectedBestFor.length > 0 ? (
                        selectedBestFor.map((val) => (
                          <span
                            key={val}
                            className="inline-flex items-center gap-1 bg-white border border-[#e7e1d5] text-nomichi-ink px-1.5 py-0.5 rounded-lg text-[9px] font-bold shadow-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleBestFor(val);
                            }}
                          >
                            {val}
                            <span className="text-nomichi-rust hover:text-[#b04b1e] cursor-pointer">✕</span>
                          </span>
                        ))
                      ) : (
                        <span className="text-nomichi-ink/30">Select audience</span>
                      )}
                    </div>
                    <ChevronDown className={`w-4 h-4 text-nomichi-ink/40 transition-transform duration-200 shrink-0 ${bestForDropdownOpen ? "rotate-180" : ""}`} />
                  </div>
                  {bestForDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-10" onClick={() => setBestForDropdownOpen(false)} />
                      <div className="absolute z-20 w-full mt-1 bg-white border border-[#e7e1d5] rounded-xl shadow-lg p-2 max-h-48 overflow-y-auto space-y-0.5">
                        {AVAILABLE_BEST_FOR.map((option) => {
                          const isChecked = selectedBestFor.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() => toggleBestFor(option)}
                              className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs font-semibold rounded-lg text-left transition-all ${
                                isChecked ? "bg-[#FFEFEA]/40 text-[#FF5B26]" : "text-nomichi-ink hover:bg-[#FAF8F4]/60"
                              }`}
                            >
                              <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${isChecked ? "bg-[#FF5B26] border-[#FF5B26] text-white" : "border-[#e7e1d5]"}`}>
                                {isChecked && (
                                  <svg className="w-2 h-2 stroke-[4]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={4} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                              <span>{option}</span>
                            </button>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>

                {/* Age Group */}
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Age Group</label>
                  <select
                    value={form.ageGroup}
                    onChange={(e) => setForm({ ...form, ageGroup: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                  >
                    <option value="18+">18+</option>
                    <option value="18–35">18–35</option>
                    <option value="25–45">25–45</option>
                    <option value="40+">40+</option>
                    <option value="All Ages">All Ages</option>
                  </select>
                </div>
              </div>

              {/* Dropdown selectors row 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Meals Included</label>
                  <select
                    value={form.meals}
                    onChange={(e) => setForm({ ...form, meals: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                  >
                    <option value="Breakfast Only">Breakfast Only</option>
                    <option value="Breakfast + Dinner">Breakfast + Dinner</option>
                    <option value="All Inclusive">All Inclusive</option>
                    <option value="Self Managed">Self Managed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Group Size</label>
                  <select
                    value={form.groupSize}
                    onChange={(e) => setForm({ ...form, groupSize: e.target.value })}
                    className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                  >
                    <option value="6–8">6–8</option>
                    <option value="8–12">8–12</option>
                    <option value="12–16">12–16</option>
                    <option value="16+">16+</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Price Range / Est. Price (₹)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-extrabold text-nomichi-ink/30">₹</span>
                    <input
                      type="number"
                      placeholder="129999"
                      value={form.price}
                      onChange={(e) => setForm({ ...form, price: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-7 pr-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider mb-1.5">Duration</label>
                  <input
                    type="text"
                    placeholder="7 Days"
                    value={form.duration}
                    onChange={(e) => setForm({ ...form, duration: e.target.value })}
                    className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold min-h-[42px]"
                  />
                </div>
              </div>

            </div>
          </div>

          {/* 4. Description */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
            <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">4. Description</h3>
            
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 border border-[#e7e1d5] bg-[#FAF8F4]/40 p-1.5 rounded-lg text-nomichi-ink/50">
                <button type="button" className="p-1 hover:bg-white rounded text-[10px] font-extrabold border-0 bg-transparent">B</button>
                <button type="button" className="p-1 hover:bg-white rounded text-[10px] italic border-0 bg-transparent">I</button>
                <button type="button" className="p-1 hover:bg-white rounded text-[10px] underline border-0 bg-transparent">U</button>
                <div className="w-px h-3.5 bg-[#e7e1d5] mx-1" />
                <button type="button" className="p-1 hover:bg-white rounded text-[10px] border-0 bg-transparent">List</button>
              </div>
              
              <div className="relative">
                <textarea
                  rows={5}
                  required
                  placeholder="Narrative overview, why this trip is unique, etc."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
                <span className="text-[9px] text-nomichi-ink/30 font-bold absolute bottom-2.5 right-3">
                  {form.description.length} / 3000
                </span>
              </div>
            </div>
          </div>

          {/* 5, 6, 7, 8: Repeatables Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* 5. Highlights */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">5. Highlights</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {highlights.map((h, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FAF8F4]/60 px-2.5 py-1.5 rounded-xl border border-[#e7e1d5]/40 text-[11px] gap-2 group">
                      <div className="flex items-center gap-1.5 truncate">
                        <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                        <span className="text-emerald-700 font-extrabold shrink-0">✓</span>
                        <span className="font-semibold text-nomichi-ink/85 truncate">{h}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveHighlight(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer font-extrabold text-[10px]">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  placeholder="e.g., Bullet Train Ride"
                  value={newHighlight}
                  onChange={(e) => setNewHighlight(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddHighlight(); } }}
                  className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
                <button type="button" onClick={handleAddHighlight} className="w-full py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer">
                  + Add Highlight
                </button>
              </div>
            </div>

            {/* 6. Inclusions */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">6. Inclusions</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {inclusions.map((inc, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FAF8F4]/60 px-2.5 py-1.5 rounded-xl border border-[#e7e1d5]/40 text-[11px] gap-2 group">
                      <div className="flex items-center gap-1.5 truncate">
                        <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                        <span className="text-emerald-700 font-extrabold shrink-0">✓</span>
                        <span className="font-semibold text-nomichi-ink/85 truncate">{inc}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveInclusion(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer font-extrabold text-[10px]">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  placeholder="e.g., 6 Nights Stay"
                  value={newInclusion}
                  onChange={(e) => setNewInclusion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddInclusion(); } }}
                  className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
                <button type="button" onClick={handleAddInclusion} className="w-full py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer">
                  + Add Inclusion
                </button>
              </div>
            </div>

            {/* 7. Exclusions */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">7. Exclusions</h3>
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {exclusions.map((exc, i) => (
                    <div key={i} className="flex items-center justify-between bg-[#FAF8F4]/60 px-2.5 py-1.5 rounded-xl border border-[#e7e1d5]/40 text-[11px] gap-2 group">
                      <div className="flex items-center gap-1.5 truncate">
                        <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                        <span className="text-[#FF5B26] font-extrabold shrink-0">✕</span>
                        <span className="font-semibold text-nomichi-ink/85 truncate">{exc}</span>
                      </div>
                      <button type="button" onClick={() => handleRemoveExclusion(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer font-extrabold text-[10px]">✕</button>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-2 pt-2">
                <input
                  type="text"
                  placeholder="e.g., Visa Fees"
                  value={newExclusion}
                  onChange={(e) => setNewExclusion(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddExclusion(); } }}
                  className="w-full px-3 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold"
                />
                <button type="button" onClick={handleAddExclusion} className="w-full py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer">
                  + Add Exclusion
                </button>
              </div>
            </div>

            {/* 8. Accommodation */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4">
              <h3 className="text-xs font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-2.5">8. Accommodation</h3>
              <div className="relative h-[calc(100%-35px)]">
                <textarea
                  rows={6}
                  placeholder="e.g. Hotel Gracery Shinjuku – 3 Nights&#10;The Thousand Kyoto – 3 Nights"
                  value={form.accommodation}
                  onChange={(e) => setForm({ ...form, accommodation: e.target.value })}
                  className="w-full px-3.5 py-2.5 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-[#FAF8F4]/30 text-xs font-semibold resize-none"
                />
              </div>
            </div>
          </div>

          {/* 9. Itinerary Builder & 10. FAQs Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {/* 9. Itinerary Builder */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
              <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">9. Itinerary Builder</h3>
              
              <div className="space-y-3">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {itinerary.map((day, i) => (
                    <div key={i} className="bg-[#FAF8F4]/60 p-3 rounded-2xl border border-[#e7e1d5]/40 text-xs flex items-center justify-between gap-3 group">
                      <div className="flex items-center gap-2 truncate">
                        <GripVertical className="w-3.5 h-3.5 text-nomichi-ink/20 shrink-0 cursor-grab" />
                        <div className="truncate">
                          <span className="font-extrabold text-[#FF5B26] block">Day {day.day} • {day.title}</span>
                          <span className="text-nomichi-ink/65 mt-0.5 block truncate">{day.description}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => handleStartEditDay(i)} className="text-nomichi-ink/40 hover:text-nomichi-ink border-0 bg-transparent cursor-pointer p-1">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleRemoveDay(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Day builder inputs */}
                <div className="bg-[#FAF8F4]/40 p-4 rounded-2xl border border-[#e7e1d5]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-nomichi-ink/50 text-left">
                      {editingDayIdx !== null ? `Editing Day ${editingDayIdx + 1}` : `Day ${itinerary.length + 1}`}
                    </span>
                    {editingDayIdx !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingDayIdx(null);
                          setNewDayTitle("");
                          setNewDayDesc("");
                        }}
                        className="text-[10px] text-nomichi-rust hover:underline bg-transparent border-0 font-extrabold cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Day Title (e.g. Shibuya Exploring)"
                    value={newDayTitle}
                    onChange={(e) => setNewDayTitle(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                  />
                  <textarea
                    rows={2}
                    placeholder="Day Activities overview description..."
                    value={newDayDesc}
                    onChange={(e) => setNewDayDesc(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold resize-none"
                  />
                  <button type="button" onClick={handleAddDay} className="px-4 py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> {editingDayIdx !== null ? "Save Changes" : "Add Day"}
                  </button>
                </div>
              </div>
            </div>

            {/* 10. FAQs */}
            <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-6 text-left space-y-4">
              <h3 className="text-sm font-extrabold text-nomichi-ink tracking-wide border-b border-[#e7e1d5]/20 pb-3">10. FAQs</h3>
              
              <div className="space-y-3">
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {faqs.map((faq, i) => (
                    <div key={i} className="bg-[#FAF8F4]/60 p-3 rounded-2xl border border-[#e7e1d5]/40 text-xs flex items-center justify-between gap-3 text-left">
                      <div className="truncate">
                        <span className="font-extrabold text-nomichi-ink block truncate">Q: {faq.question}</span>
                        <span className="text-nomichi-ink/60 font-semibold block truncate">A: {faq.answer}</span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <button type="button" onClick={() => handleStartEditFAQ(i)} className="text-nomichi-ink/40 hover:text-nomichi-ink border-0 bg-transparent cursor-pointer p-1">
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button type="button" onClick={() => handleRemoveFAQ(i)} className="text-nomichi-rust hover:text-[#b04b1e] border-0 bg-transparent cursor-pointer p-1">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* FAQ builder input */}
                <div className="bg-[#FAF8F4]/40 p-4 rounded-2xl border border-[#e7e1d5]/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-nomichi-ink/50 text-left">
                      {editingFAQIdx !== null ? `Editing FAQ #${editingFAQIdx + 1}` : "New FAQ"}
                    </span>
                    {editingFAQIdx !== null && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFAQIdx(null);
                          setNewQuestion("");
                          setNewAnswer("");
                        }}
                        className="text-[10px] text-nomichi-rust hover:underline bg-transparent border-0 font-extrabold cursor-pointer"
                      >
                        Cancel Edit
                      </button>
                    )}
                  </div>
                  
                  <input
                    type="text"
                    placeholder="Question (e.g. Is insurance mandatory?)"
                    value={newQuestion}
                    onChange={(e) => setNewQuestion(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                  />
                  <input
                    type="text"
                    placeholder="Answer (e.g. Yes, we require basic coverage.)"
                    value={newAnswer}
                    onChange={(e) => setNewAnswer(e.target.value)}
                    className="w-full px-3.5 py-2 border border-[#e7e1d5] rounded-xl focus:outline-none focus:border-[#FF5B26] bg-white text-xs font-semibold"
                  />
                  <button type="button" onClick={handleAddFAQ} className="px-4 py-2 bg-nomichi-ink text-white font-bold text-xs rounded-xl hover:bg-nomichi-ink/80 transition-all border-0 cursor-pointer flex items-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> {editingFAQIdx !== null ? "Save Changes" : "Add FAQ"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 11. Gallery */}
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm p-5 text-left space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-xs font-extrabold text-nomichi-ink uppercase tracking-wide">11. Additional Gallery Images</h4>
                <p className="text-[10px] text-nomichi-ink/40 font-semibold mt-0.5">Upload photos that populate the travel gallery.</p>
              </div>
              <span className="text-[10px] font-bold text-nomichi-ink/40">{galleryImages.length} / 10 Images</span>
            </div>

            <div className="flex flex-wrap gap-2.5 items-center">
              {galleryImages.map((imgUrl, i) => (
                <div key={i} className="w-16 h-16 rounded-xl bg-[#FAF8F4] overflow-hidden border border-[#e7e1d5]/40 relative group shadow-sm shrink-0">
                  <img src={imgUrl} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => setGalleryImages(galleryImages.filter((_, idx) => idx !== i))}
                    className="absolute inset-0 bg-black/40 text-white flex items-center justify-center border-0 cursor-pointer opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    ✕
                  </button>
                </div>
              ))}
              
              {galleryImages.length < 10 && (
                <div>
                  <input type="file" multiple className="hidden" id="gallery-img-upload" onChange={handleGalleryUpload} accept="image/*" />
                  <label htmlFor="gallery-img-upload" className="w-16 h-16 border-2 border-dashed border-[#e7e1d5] hover:border-[#FF5B26]/40 hover:bg-[#FAF8F4]/30 rounded-xl flex flex-col items-center justify-center cursor-pointer transition-all gap-1">
                    <Plus className="w-5 h-5 text-nomichi-ink/30" />
                  </label>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Right Column Sticky Preview */}
        <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-[90px]">
          <div className="bg-white rounded-3xl border border-[#e7e1d5]/40 shadow-sm overflow-hidden flex flex-col text-left">
            <div className="px-6 py-4.5 border-b border-[#e7e1d5]/20 flex items-center justify-between bg-[#FAF8F4]/30">
              <span className="text-sm font-black uppercase tracking-widest text-nomichi-ink">Trip Preview</span>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-nomichi-ink/40">Live Preview</span>
                <div 
                  onClick={() => setLivePreviewActive(!livePreviewActive)}
                  className={`w-8 h-4 rounded-full p-0.5 flex items-center cursor-pointer transition-colors duration-200 ${
                    livePreviewActive ? "bg-[#5CB87A] justify-end" : "bg-gray-200 justify-start"
                  }`}
                >
                  <div className="w-3.5 h-3.5 rounded-full bg-white shadow-sm" />
                </div>
              </div>
            </div>

            {livePreviewActive && (
              <div className="p-5 space-y-5 animate-in fade-in duration-200">
                <div className="w-full h-44 rounded-2xl overflow-hidden bg-[#FAF8F4] relative border border-[#e7e1d5]/30 flex items-center justify-center shadow-inner">
                  {form.imageUrl ? (
                    <img src={form.imageUrl} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <ImageIcon className="w-8 h-8 text-nomichi-ink/20" />
                  )}
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-display font-black text-nomichi-ink leading-tight">{form.title || "Untitled Trip"}</h3>
                  <p className="text-xs font-semibold text-nomichi-ink/40">{form.destination || "Destination TBD"}</p>
                </div>
                <div className="flex justify-between border-t border-[#e7e1d5]/20 pt-4 text-xs font-bold text-nomichi-ink/75">
                  <span>₹{(form.price || 0).toLocaleString("en-IN")}</span>
                  <span>{form.duration || "Flexible Duration"}</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
