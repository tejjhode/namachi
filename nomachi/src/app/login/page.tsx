"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useState } from "react";
import { Compass, Shield, Headphones, Plane, Mail, Lock, Eye, EyeOff, Luggage } from "lucide-react";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "http://localhost:3000/auth/callback",
          queryParams: {
            prompt: "select_account",
            access_type: "offline",
          },
        },
      });
      console.log("OAuth Data:", data);
      console.log("OAuth Error:", error);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError("");
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      
      router.refresh();
      router.push("/");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-nomichi-cream font-sans antialiased text-nomichi-ink overflow-x-hidden">
      <style>{`
        @keyframes slow-zoom {
          0% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .animate-slow-zoom {
          animation: slow-zoom 25s infinite alternate ease-in-out;
        }
      `}</style>

      {/* Left Section - Hero */}
      <div className="hidden lg:flex lg:w-1/2 relative text-nomichi-white p-16 flex-col justify-between overflow-hidden">
        {/* Background Image Container with Slow Zoom */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center scale-100 animate-slow-zoom"
            style={{ backgroundImage: "url('/nomichi-hero.png')" }}
          />
          <div className="absolute inset-0 bg-gradient-to-tr from-nomichi-ink/80 via-nomichi-ink/50 to-nomichi-olive/30 mix-blend-multiply" />
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-nomichi-ink/20 to-nomichi-ink/80" />
        </div>

        {/* Top Header */}
        <div className="relative z-10">
          <div className="mb-20">
            <img
              src="/logo.png"
              alt="Nomichi"
              className="h-10 w-auto object-contain"
            />
            <p className="text-nomichi-sand text-[10px] font-semibold tracking-[0.2em] uppercase mt-3">Explore. Discover. Travel.</p>
          </div>

          <div className="max-w-xl">
            <h2 className="text-5xl sm:text-6xl font-display font-extrabold leading-[1.08] tracking-tight mb-6 text-nomichi-cream">
              Discover amazing places with Nomichi
            </h2>
            <p className="text-nomichi-sand/85 text-lg mb-16 font-light leading-relaxed max-w-sm">
              Your journey to unforgettable experiences begins with a single sign in.
            </p>
          </div>

          {/* Features */}
          <div className="space-y-8 max-w-lg">
            <div className="flex gap-4 group">
              <div className="w-12 h-12 rounded-full bg-nomichi-white/5 border border-nomichi-white/10 flex items-center justify-center text-nomichi-sand group-hover:text-nomichi-rust group-hover:border-nomichi-rust/30 transition-all duration-300 backdrop-blur-md">
                <Luggage size={20} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg mb-1 text-nomichi-white">Curated Trips</h3>
                <p className="text-nomichi-sand/70 text-sm leading-relaxed">Handpicked destinations for every traveler</p>
              </div>
            </div>

            <div className="flex gap-4 group">
              <div className="w-12 h-12 rounded-full bg-nomichi-white/5 border border-nomichi-white/10 flex items-center justify-center text-nomichi-sand group-hover:text-nomichi-rust group-hover:border-nomichi-rust/30 transition-all duration-300 backdrop-blur-md">
                <Shield size={20} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg mb-1 text-nomichi-white">Trusted & Secure</h3>
                <p className="text-nomichi-sand/70 text-sm leading-relaxed">Your data is safe with us</p>
              </div>
            </div>

            <div className="flex gap-4 group">
              <div className="w-12 h-12 rounded-full bg-nomichi-white/5 border border-nomichi-white/10 flex items-center justify-center text-nomichi-sand group-hover:text-nomichi-rust group-hover:border-nomichi-rust/30 transition-all duration-300 backdrop-blur-md">
                <Headphones size={20} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-display font-semibold text-lg mb-1 text-nomichi-white">24/7 Support</h3>
                <p className="text-nomichi-sand/70 text-sm leading-relaxed">We're here to help you anytime</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="relative z-10 text-xs text-nomichi-sand/50 tracking-wider font-light uppercase">
          Empowering travelers around the world
        </div>
      </div>

      {/* Right Section - Login Form */}
      <div className="w-full lg:w-1/2 relative flex flex-col justify-center px-6 sm:px-16 lg:px-20 py-12 bg-nomichi-white">
        {/* Top Right Link */}
        <div className="absolute top-8 right-12 text-sm">
          <span className="text-nomichi-ink/65 font-light">New here? </span>
          <Link href="/signup" className="text-nomichi-rust font-semibold hover:text-nomichi-ink hover:underline transition-all duration-200">
            Create an account
          </Link>
        </div>

        {/* Login Form Container */}
        <div className="max-w-md w-full mx-auto flex flex-col justify-center">
          {/* Logo and Brand Title */}
          <div className="flex flex-col items-center justify-center mb-8">
            <img
              src="/logo.png"
              alt="Nomichi"
              className="h-12 w-auto object-contain"
            />
          </div>

          <h1 className="text-4xl font-display font-bold text-nomichi-ink mb-2 text-center tracking-tight">
            Welcome back!
          </h1>
          <p className="text-nomichi-olive/70 text-center mb-8 text-sm font-light">
            Sign in to continue to your account
          </p>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50/70 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 text-xs font-medium">
              {error}
            </div>
          )}

          {/* Google Sign In Button */}
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full py-3 px-4 border border-nomichi-sand/40 rounded-xl font-semibold text-nomichi-ink bg-nomichi-white hover:bg-nomichi-cream/50 transition-all duration-200 flex items-center justify-center gap-3 mb-6 disabled:opacity-50 active:scale-[0.99]"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 border-t border-nomichi-sand/25"></div>
            <span className="text-nomichi-olive/40 text-xs font-semibold tracking-widest uppercase">OR</span>
            <div className="flex-1 border-t border-nomichi-sand/25"></div>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleEmailLogin}>
            {/* Email Input */}
            <div className="mb-5">
              <label className="block text-sm font-semibold text-nomichi-ink mb-2">
                Email address
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-nomichi-olive/50 w-5 h-5" />
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-12 pr-4 py-3.5 border border-nomichi-sand/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-nomichi-rust/10 focus:border-nomichi-rust bg-nomichi-cream/5 text-nomichi-ink placeholder-nomichi-olive/40 transition-all duration-200 text-sm"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold text-nomichi-ink">
                  Password
                </label>
                <Link href="/forgot-password" className="text-sm text-nomichi-rust hover:underline transition-colors duration-200 font-semibold">
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-nomichi-olive/50 w-5 h-5" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-3.5 border border-nomichi-sand/50 rounded-xl focus:outline-none focus:ring-4 focus:ring-nomichi-rust/10 focus:border-nomichi-rust bg-nomichi-cream/5 text-nomichi-ink placeholder-nomichi-olive/40 transition-all duration-200 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-nomichi-olive/50 hover:text-nomichi-rust transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 bg-nomichi-rust text-nomichi-white font-semibold rounded-xl hover:bg-nomichi-rust/90 transition-all duration-200 mb-6 disabled:opacity-50 text-sm active:scale-[0.99] shadow-lg shadow-nomichi-rust/10"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Remember Me & Need Help */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="remember"
                className="w-4 h-4 rounded border-nomichi-sand/50 text-nomichi-rust focus:ring-nomichi-rust accent-nomichi-rust"
                defaultChecked
              />
              <label htmlFor="remember" className="text-sm text-nomichi-olive/80 font-medium">
                Remember me
              </label>
            </div>
            <Link href="/support" className="text-sm text-nomichi-rust hover:underline transition-colors duration-200 font-semibold">
              Need help?
            </Link>
          </div>

          {/* Terms Footer */}
          <p className="text-center text-xs text-nomichi-olive/50 leading-relaxed font-light mt-12">
            By signing in, you agree to our{" "}
            <Link href="/terms" className="text-nomichi-rust hover:underline transition-colors duration-200">
              Terms of Service
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-nomichi-rust hover:underline transition-colors duration-200">
              Privacy Policy
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}