"use client";

import Link from "next/link";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { EyeOpenIcon, EyeClosedIcon } from "@radix-ui/react-icons";

export default function UserSignupPage() {
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [usernameError, setUsernameError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const supabase = createClient();
  const router = useRouter();

  const validateUsername = (name: string): string => {
    const trimmed = name.trim();
    if (!trimmed) {
      return "Username is required";
    }
    if (trimmed.length < 3) {
      return "Username must be at least 3 characters";
    }
    if (trimmed.length > 30) {
      return "Username must be less than 30 characters";
    }
    // Allow letters, numbers, underscores, and hyphens (no spaces)
    const usernameRegex = /^[a-zA-Z0-9_-]+$/;
    if (!usernameRegex.test(trimmed)) {
      return "Username can only contain letters, numbers, underscores, and hyphens";
    }
    // Must start with a letter or number
    if (!/^[a-zA-Z0-9]/.test(trimmed)) {
      return "Username must start with a letter or number";
    }
    return "";
  };

  const validatePassword = (pwd: string): string => {
    if (!pwd) {
      return "Password is required";
    }
    if (pwd.length < 8) {
      return "Password must be at least 8 characters";
    }
    if (pwd.length > 128) {
      return "Password must be less than 128 characters";
    }
    // Check for uppercase, lowercase, number, and symbol
    const hasUpperCase = /[A-Z]/.test(pwd);
    const hasLowerCase = /[a-z]/.test(pwd);
    const hasNumber = /[0-9]/.test(pwd);
    const hasSymbol = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd);
    
    if (!hasUpperCase) {
      return "Password must contain at least one uppercase letter";
    }
    if (!hasLowerCase) {
      return "Password must contain at least one lowercase letter";
    }
    if (!hasNumber) {
      return "Password must contain at least one number";
    }
    if (!hasSymbol) {
      return "Password must contain at least one symbol (!@#$%^&* etc.)";
    }
    return "";
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate all fields
    const usernameValidation = validateUsername(username);
    const passwordValidation = validatePassword(password);
    
    setUsernameError(usernameValidation);
    setPasswordError(passwordValidation);

    if (usernameValidation || passwordValidation) {
      if (usernameValidation) {
        toast.error(usernameValidation);
      }
      if (passwordValidation) {
        toast.error(passwordValidation);
      }
      return;
    }

    if (!email) {
      toast.error("Email is required");
      return;
    }

    setSendingOtp(true);

    try {
      const response = await fetch("/api/auth/send-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          username,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Failed to send OTP");
        setSendingOtp(false);
        return;
      }

      toast.success("OTP sent to your email! Please check your inbox.");
      setOtpSent(true);
    } catch (error) {
      console.error("Error sending OTP:", error);
      toast.error("Failed to send OTP. Please try again.");
    } finally {
      setSendingOtp(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!otp || otp.length !== 6) {
      toast.error("Please enter a valid 6-digit OTP");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          otp,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast.error(data.error || "Invalid OTP");
        setLoading(false);
        return;
      }

      toast.success("Account created successfully!");
      router.push("/login");
    } catch (error) {
      console.error("Error verifying OTP:", error);
      toast.error("Failed to verify OTP. Please try again.");
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/login`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      toast.error(error.message || "Failed to sign in with Google. Please make sure Google OAuth is enabled in Supabase.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] grid grid-cols-1 lg:grid-cols-2">
      {/* Left: Form */}
      <div className="flex items-center justify-center p-8 bg-white dark:bg-[#0b1220]">
        <div className="w-full max-w-md space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-black dark:text-white mb-2">Create your account</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">Enter your information below to create your account</p>
          </div>
          {!otpSent ? (
            <form onSubmit={handleSendOTP} className="space-y-5">
              <div>
                <label className="text-sm font-medium text-black dark:text-white mb-2 block">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => {
                    const value = e.target.value;
                    setUsername(value);
                    if (value.trim()) {
                      setUsernameError(validateUsername(value));
                    } else {
                      setUsernameError("");
                    }
                  }}
                  onBlur={() => setUsernameError(validateUsername(username))}
                  required
                  disabled={sendingOtp}
                  className={`w-full rounded-lg border ${
                    usernameError
                      ? "border-red-500 dark:border-red-500"
                      : "border-gray-300 dark:border-white/10"
                  } bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 ${
                    usernameError
                      ? "focus:ring-red-500"
                      : "focus:ring-[var(--brand-blue)]"
                  } disabled:opacity-50`}
                  placeholder="Enter your username"
                />
                {usernameError && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{usernameError}</p>
                )}
                {!usernameError && username && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Username can contain letters, numbers, underscores, and hyphens
                  </p>
                )}
              </div>
              <div>
                <label className="text-sm font-medium text-black dark:text-white mb-2 block">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={sendingOtp}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] disabled:opacity-50"
                  placeholder="m@example.com"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-black dark:text-white mb-2 block">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => {
                      const value = e.target.value;
                      setPassword(value);
                      if (value) {
                        setPasswordError(validatePassword(value));
                      } else {
                        setPasswordError("");
                      }
                    }}
                    onBlur={() => setPasswordError(validatePassword(password))}
                    required
                    minLength={8}
                    maxLength={128}
                    disabled={sendingOtp}
                    className={`w-full rounded-lg border ${
                      passwordError
                        ? "border-red-500 dark:border-red-500"
                        : "border-gray-300 dark:border-white/10"
                    } bg-white dark:bg-[#11161d] px-4 py-3 pr-10 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 ${
                      passwordError
                        ? "focus:ring-red-500"
                        : "focus:ring-[var(--brand-blue)]"
                    } disabled:opacity-50`}
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 dark:text-white hover:text-gray-700 dark:hover:text-gray-300 focus:outline-none transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeClosedIcon className="h-5 w-5 text-gray-500 dark:text-white" />
                    ) : (
                      <EyeOpenIcon className="h-5 w-5 text-gray-500 dark:text-white" />
                    )}
                  </button>
                </div>
                {passwordError && (
                  <p className="mt-1 text-xs text-red-500 dark:text-red-400">{passwordError}</p>
                )}
                {!passwordError && password && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Password must be at least 8 characters with uppercase, lowercase, number, and symbol
                  </p>
                )}
              </div>
              <button
                type="submit"
                disabled={sendingOtp}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--brand-blue)" }}
              >
                {sendingOtp ? "Sending OTP..." : "Send OTP"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-5">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  We've sent a 6-digit verification code to <strong>{email}</strong>. Please enter it below.
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-black dark:text-white mb-2 block">Verification Code</label>
                <input
                  type="text"
                  value={otp}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, "").slice(0, 6);
                    setOtp(value);
                  }}
                  required
                  disabled={loading}
                  maxLength={6}
                  className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm text-black dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[var(--brand-blue)] disabled:opacity-50 text-center text-2xl tracking-widest font-mono"
                  placeholder="000000"
                  autoFocus
                />
              </div>
              <button
                type="submit"
                disabled={loading || otp.length !== 6}
                className="w-full rounded-lg px-4 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "var(--brand-blue)" }}
              >
                {loading ? "Verifying..." : "Verify & Sign Up"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setOtp("");
                }}
                disabled={loading}
                className="w-full text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors disabled:opacity-50"
              >
                Change email or resend OTP
              </button>
            </form>
          )}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300 dark:border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-[#0b1220] px-2 text-gray-500 dark:text-gray-400">Or continue with</span>
            </div>
          </div>
          <button
            type="button"
            onClick={handleGoogleSignup}
            disabled={loading || sendingOtp}
            className="w-full rounded-lg border border-gray-300 dark:border-white/10 bg-white dark:bg-[#11161d] px-4 py-3 text-sm font-medium text-black dark:text-white hover:bg-gray-50 dark:hover:bg-white/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Sign up with Google
          </button>
          <div className="text-sm text-center text-gray-600 dark:text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-[var(--brand-blue)] hover:underline font-medium">
              Login
            </Link>
          </div>
        </div>
      </div>
      {/* Right: Graphic */}
      <div className="hidden lg:flex items-center justify-center p-8 bg-[var(--brand-white)] dark:bg-[#11161d]">
        <div className="w-full max-w-md">
          <div className="aspect-square rounded-lg bg-gradient-to-br from-[var(--brand-yellow)]/20 to-[var(--brand-blue)]/20 dark:from-[var(--brand-yellow)]/10 dark:to-[var(--brand-blue)]/10 flex items-center justify-center">
            <div className="text-center space-y-4">
              <div className="h-24 w-24 mx-auto rounded-full bg-[var(--brand-blue)]/20 dark:bg-[var(--brand-blue)]/10 flex items-center justify-center">
                <div className="h-16 w-16 rounded-lg bg-[var(--brand-yellow)] dark:bg-[var(--brand-yellow)]/80 flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#1f2937]">A</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="h-1 w-32 mx-auto bg-[var(--brand-yellow)]/30 dark:bg-[var(--brand-yellow)]/20 rounded-full"></div>
                <div className="h-1 w-24 mx-auto bg-[var(--brand-blue)]/30 dark:bg-[var(--brand-blue)]/20 rounded-full"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


