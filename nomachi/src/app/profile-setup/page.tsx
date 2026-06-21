"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Phone, User, Calendar, Globe, Loader2, LogOut, ChevronDown } from "lucide-react";
import { notificationService } from "@/services/notification.service";

const supabase = createClient();

const countryCodes = [
  { code: "+91", flag: "🇮🇳", label: "India" },
  { code: "+1", flag: "🇺🇸", label: "US/Canada" },
  { code: "+44", flag: "🇬🇧", label: "UK" },
  { code: "+971", flag: "🇦🇪", label: "UAE" },
  { code: "+65", flag: "🇸🇬", label: "Singapore" },
  { code: "+61", flag: "🇦🇺", label: "Australia" },
  { code: "+49", flag: "🇩🇪", label: "Germany" },
  { code: "+33", flag: "🇫🇷", label: "France" },
  { code: "+81", flag: "🇯🇵", label: "Japan" },
  { code: "+60", flag: "🇲🇾", label: "Malaysia" },
  { code: "+66", flag: "🇹🇭", label: "Thailand" }
];

export default function ProfileSetupPage() {
  const router = useRouter();
  const [countryCode, setCountryCode] = useState("+91");
  const [localNumber, setLocalNumber] = useState("");
  const [gender, setGender] = useState("");
  const [dob, setDob] = useState("");
  const [nationality, setNationality] = useState("Indian"); // Default nationality to Indian
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // OTP Verification state
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [isPhoneAlreadyVerified, setIsPhoneAlreadyVerified] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("phone, gender, date_of_birth, nationality")
        .eq("id", user.id)
        .single();

      if (profile) {
        setGender(profile.gender || "");
        setDob(profile.date_of_birth || "");
        
        // Use existing nationality if set, otherwise default to "Indian"
        setNationality(profile.nationality || "Indian");

        // Parse existing phone number if loaded from DB
        if (profile.phone) {
          const matched = countryCodes.find(c => profile.phone.startsWith(c.code));
          if (matched) {
            setCountryCode(matched.code);
            setLocalNumber(profile.phone.replace(matched.code, "").trim());
          } else {
            setLocalNumber(profile.phone);
          }
          setIsPhoneAlreadyVerified(true);
        }

        if (profile.phone && profile.gender && profile.date_of_birth && profile.nationality) {
          router.push("/");
        }
      }
    }
    loadProfile();
  }, [router]);

  const sendVerificationCode = async (phoneNum: string) => {
    try {
      setSendingOtp(true);
      setError("");
      
      // Update phone in Supabase Auth to trigger native SMS OTP sending
      const { error: authError } = await supabase.auth.updateUser({
        phone: phoneNum.trim()
      });

      if (authError) throw authError;

      setShowOtpScreen(true);
    } catch (err: any) {
      setError(err.message || "Failed to send verification SMS. Please verify your phone number and try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const fullPhone = countryCode + localNumber.replace(/[\s-]/g, "");
    if (!localNumber.trim() || !gender || !dob || !nationality.trim()) {
      setError("Please fill in all mandatory fields.");
      return;
    }

    // Trigger OTP verification if the phone number is entered for the first time
    if (!isPhoneAlreadyVerified) {
      await sendVerificationCode(fullPhone);
      return;
    }

    await saveProfileData(fullPhone);
  };

  const saveProfileData = async (fullPhone: string) => {
    try {
      setLoading(true);
      setError("");

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No authenticated user session found.");

      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          phone: fullPhone.trim(),
          gender,
          date_of_birth: dob,
          nationality: nationality.trim(),
        })
        .eq("id", user.id);

      if (updateError) throw updateError;

      // Send Welcome Notification after completing the profile setup with OTP
      try {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("id", user.id)
          .maybeSingle();

        if (profile?.email) {
          await notificationService.notifyTraveler(
            profile.email,
            "Welcome to Nomichi 🌍 Your Journey Begins Here",
            "Your profile is ready. Adventure, connection, and unforgettable experiences await.",
            "Welcome to Nomichi",
            user.id,
            "High"
          );
        }
      } catch (notifErr) {
        console.error("Welcome notification trigger failed:", notifErr);
      }

      router.refresh();
      router.push("/");
    } catch (err: any) {
      setError(err.message || "Failed to update profile. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!otpCode.trim()) {
      setError("Please enter the verification code.");
      return;
    }

    const fullPhone = countryCode + localNumber.replace(/[\s-]/g, "");

    try {
      setLoading(true);
      
      // Verify OTP via Supabase Auth (default type is 'phone_change' for existing authenticated users adding a phone number)
      const { error: verifyError } = await supabase.auth.verifyOtp({
        phone: fullPhone.trim(),
        token: otpCode.trim(),
        type: "phone_change"
      });

      if (verifyError) {
        // Fallback verify type 'sms' if 'phone_change' was rejected
        const { error: verifySmsError } = await supabase.auth.verifyOtp({
          phone: fullPhone.trim(),
          token: otpCode.trim(),
          type: "sms"
        });
        if (verifySmsError) throw verifyError;
      }

      setIsPhoneAlreadyVerified(true);
      setShowOtpScreen(false);
      
      // Complete registration in database
      await saveProfileData(fullPhone);
    } catch (err: any) {
      setError(err.message || "Invalid verification code. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const fullPhoneDisplay = countryCode + " " + localNumber;

  if (showOtpScreen) {
    return (
      <div className="min-h-screen flex bg-nomichi-cream font-sans antialiased text-nomichi-ink overflow-x-hidden">
        {/* Left Section - Hero */}
        <div className="hidden lg:flex lg:w-1/2 relative text-nomichi-white p-16 flex-col justify-between overflow-hidden">
          <div className="absolute inset-0 z-0 overflow-hidden">
            <div
              className="absolute inset-0 bg-cover bg-center scale-100"
              style={{ backgroundImage: "url('/nomichi-hero.png')" }}
            />
            <div className="absolute inset-0 bg-gradient-to-tr from-nomichi-ink/80 via-nomichi-ink/50 to-nomichi-olive/30 mix-blend-multiply" />
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-nomichi-ink/20 to-nomichi-ink/80" />
          </div>

          <div className="relative z-10">
            <div className="mb-20">
              <img
                src="/logo.png"
                alt="Nomichi"
                className="h-10 w-auto object-contain"
              />
              <p className="text-nomichi-sand text-[10px] font-semibold tracking-[0.2em] uppercase mt-3">Explore. Discover. Travel.</p>
            </div>

            <div className="max-w-xl text-left">
              <h2 className="text-5xl sm:text-6xl font-display font-extrabold leading-[1.08] tracking-tight mb-6 text-nomichi-cream">
                Verify Your Number
              </h2>
              <p className="text-nomichi-sand/85 text-lg mb-16 font-light leading-relaxed max-w-sm">
                We've sent a 6-digit OTP code to verify your phone number via Supabase Auth.
              </p>
            </div>
          </div>

          <div className="relative z-10 flex items-center justify-between text-xs text-nomichi-sand/65 border-t border-[#e7e1d5]/20 pt-6">
            <p>© {new Date().getFullYear()} Nomichi. All rights reserved.</p>
            <a href="/auth/signout" className="hover:text-nomichi-rust transition-colors flex items-center gap-1.5">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </a>
          </div>
        </div>

        {/* Right Section - OTP verification form */}
        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 lg:p-24 relative">
          <div className="w-full max-w-md space-y-8">
            <div>
              <h1 className="text-3xl font-display font-extrabold text-nomichi-ink text-left">Phone Verification</h1>
              <p className="text-nomichi-ink/50 text-sm mt-2 text-left">
                Please enter the 6-digit verification code sent to **{fullPhoneDisplay}** to complete registration.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-semibold text-left">
                  {error}
                </div>
              )}

              {/* OTP Code input */}
              <div className="space-y-2 text-left">
                <label className="text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Verification OTP Code</label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="Enter 6-digit code"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  className="w-full text-center tracking-[0.5em] py-4 bg-[#FFFFFF] border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] focus:ring-1 focus:ring-[#FF5B26] rounded-xl text-lg font-extrabold text-nomichi-ink outline-none transition-all placeholder:text-nomichi-ink/25 placeholder:tracking-normal placeholder:text-sm"
                  required
                />
                <span className="text-[10px] text-nomichi-ink/40 font-bold block mt-2 text-center leading-relaxed">
                  Enter the verification code sent to your mobile phone.
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-[#FF5B26] hover:bg-[#b04b1e] text-nomichi-white text-sm font-bold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Completing Registration...
                  </>
                ) : (
                  "Verify & Complete"
                )}
              </button>

              <div className="flex items-center justify-between text-xs pt-2">
                <button
                  type="button"
                  onClick={() => sendVerificationCode(countryCode + localNumber.replace(/[\s-]/g, ""))}
                  disabled={sendingOtp}
                  className="text-[#FF5B26] hover:underline font-extrabold bg-transparent border-0 cursor-pointer"
                >
                  {sendingOtp ? "Resending..." : "Resend OTP"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowOtpScreen(false)}
                  className="text-nomichi-ink/40 hover:text-nomichi-ink font-bold bg-transparent border-0 cursor-pointer"
                >
                  Back to Form
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-nomichi-cream font-sans antialiased text-nomichi-ink overflow-x-hidden">
      {/* Left Section - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative text-nomichi-white p-16 flex-col justify-between overflow-hidden">
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center scale-100"
            style={{ backgroundImage: "url('/nomichi-hero.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-nomichi-ink/80 via-nomichi-ink/50 to-nomichi-olive/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-nomichi-ink/20 to-nomichi-ink/80" />
        </div>

        <div className="relative z-10">
          <div className="mb-20">
            <img
              src="/logo.png"
              alt="Nomichi"
              className="h-10 w-auto object-contain"
            />
            <p className="text-nomichi-sand text-[10px] font-semibold tracking-[0.2em] uppercase mt-3">Explore. Discover. Travel.</p>
          </div>

          <div className="max-w-xl text-left">
            <h2 className="text-5xl sm:text-6xl font-display font-extrabold leading-[1.08] tracking-tight mb-6 text-nomichi-cream">
              Complete your Profile
            </h2>
            <p className="text-nomichi-sand/85 text-lg mb-16 font-light leading-relaxed max-w-sm">
              To guarantee seamless trip bookings, visa applications, and personal safety, we require your phone, gender, DOB, and nationality.
            </p>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-nomichi-sand/65 border-t border-[#e7e1d5]/20 pt-6">
          <p>© {new Date().getFullYear()} Nomichi. All rights reserved.</p>
          <a href="/auth/signout" className="hover:text-nomichi-rust transition-colors flex items-center gap-1.5">
            <LogOut className="h-3.5 w-3.5" /> Sign Out
          </a>
        </div>
      </div>

      {/* Right Section - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 md:p-16 lg:p-24 relative">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-display font-extrabold text-nomichi-ink text-left">Set Up Your Profile</h1>
            <p className="text-nomichi-ink/50 text-sm mt-2 text-left">
              Please provide your details below. You can change these later in your account settings.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-xl p-3.5 text-xs font-semibold text-left">
                {error}
              </div>
            )}

            {/* Phone Number Input with Prefix Switcher Option */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Phone Number</label>
              <div className="flex gap-2">
                {/* Prefix Selector Dropdown */}
                <div className="relative shrink-0 w-[110px]">
                  <select
                    value={countryCode}
                    onChange={(e) => setCountryCode(e.target.value)}
                    className="w-full pl-3 pr-8 py-3.5 bg-[#FFFFFF] border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] focus:ring-1 focus:ring-[#FF5B26] rounded-xl text-sm font-semibold text-nomichi-ink outline-none transition-all appearance-none cursor-pointer"
                  >
                    {countryCodes.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.code}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 text-nomichi-ink/40 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
                {/* Local Number input */}
                <div className="relative flex-1">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nomichi-ink/30">
                    <Phone className="h-4 w-4" />
                  </span>
                  <input
                    type="tel"
                    placeholder="98765 43210"
                    value={localNumber}
                    onChange={(e) => setLocalNumber(e.target.value.replace(/[^\d\s-]/g, ""))}
                    className="w-full pl-11 pr-4 py-3.5 bg-[#FFFFFF] border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] focus:ring-1 focus:ring-[#FF5B26] rounded-xl text-sm font-semibold text-nomichi-ink outline-none transition-all placeholder:text-nomichi-ink/25"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Gender */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Gender</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nomichi-ink/30">
                  <User className="h-4 w-4" />
                </span>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-[#FFFFFF] border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] focus:ring-1 focus:ring-[#FF5B26] rounded-xl text-sm font-semibold text-nomichi-ink outline-none transition-all appearance-none"
                  required
                >
                  <option value="" disabled>Select Gender</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Non-Binary">Non-Binary</option>
                  <option value="Other">Other</option>
                  <option value="Prefer not to say">Prefer not to say</option>
                </select>
              </div>
            </div>

            {/* DOB */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Date of Birth</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nomichi-ink/30">
                  <Calendar className="h-4 w-4" />
                </span>
                <input
                  type="date"
                  value={dob}
                  onChange={(e) => setDob(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-[#FFFFFF] border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] focus:ring-1 focus:ring-[#FF5B26] rounded-xl text-sm font-semibold text-nomichi-ink outline-none transition-all"
                  required
                />
              </div>
            </div>

            {/* Nationality */}
            <div className="space-y-2 text-left">
              <label className="text-[10px] font-bold text-nomichi-ink/50 uppercase tracking-wider block">Nationality</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-nomichi-ink/30">
                  <Globe className="h-4 w-4" />
                </span>
                <input
                  type="text"
                  placeholder="e.g. Indian"
                  value={nationality}
                  onChange={(e) => setNationality(e.target.value)}
                  className="w-full pl-11 pr-4 py-3.5 bg-[#FFFFFF] border border-[#e7e1d5]/60 hover:border-[#FF5B26]/30 focus:border-[#FF5B26] focus:ring-1 focus:ring-[#FF5B26] rounded-xl text-sm font-semibold text-nomichi-ink outline-none transition-all placeholder:text-nomichi-ink/25"
                  required
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#FF5B26] hover:bg-[#b04b1e] text-nomichi-white text-sm font-bold py-4 rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving Details...
                </>
              ) : (
                <>
                  Complete Registration
                </>
              )}
            </button>
          </form>

          <div className="flex items-center justify-between text-xs text-nomichi-ink/40 pt-4 lg:hidden">
            <p>© {new Date().getFullYear()} Nomichi.</p>
            <a href="/auth/signout" className="hover:text-nomichi-rust transition-colors flex items-center gap-1">
              <LogOut className="h-3.5 w-3.5" /> Sign Out
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
