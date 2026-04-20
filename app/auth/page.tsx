"use client";

// app/auth/page.tsx
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { signIn, signUp, signInWithGoogle, resetPassword } from "@/lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const { user, loading } = useApp();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  async function handleForgotPassword() {
    if (!email) { setError("Enter your email address first."); return; }
    setSubmitting(true); setError("");
    const { error: err } = await resetPassword(email);
    setSubmitting(false);
    if (err) { setError(err.message); return; }
    setResetSent(true);
  }

  // Already logged in → go to dashboard
  useEffect(() => {
    if (!loading && user) router.replace("/dashboard");
  }, [user, loading, router]);

  async function handleGoogleSignIn() {
    setError("");
    setSubmitting(true);
    const { error: err } = await signInWithGoogle();
    if (err) { setError(err.message); setSubmitting(false); }
    // On success, Supabase redirects to /dashboard automatically
  }

  async function handleSubmit() {
    setError("");
    if (!email || !password) { setError("Please fill in all fields."); return; }
    if (mode === "register" && !name) { setError("Please enter your name."); return; }
    if (password.length < 6) { setError("Password must be at least 6 characters."); return; }

    setSubmitting(true);

    if (mode === "login") {
      const { error: err } = await signIn(email, password);
      if (err) { setError(err.message); setSubmitting(false); return; }
      router.push("/dashboard");
    } else {
      const { error: err } = await signUp(email, password, name);
      if (err) { setError(err.message); setSubmitting(false); return; }
      setRegistered(true);
      setSubmitting(false);
    }
  }

  if (loading) return null;

  return (
    <div className="min-h-dvh bg-background flex flex-col items-center justify-center px-4">
      <div
        className="fixed top-0 left-0 right-0 h-72 pointer-events-none"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(232,130,154,0.12) 0%, transparent 70%)" }}
      />

      <div className="relative z-10 w-full max-w-app">
        {/* Logo */}
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
          >
            🌸
          </div>
          <h1 className="font-display text-3xl font-semibold text-dark">HerPhase</h1>
          <p className="text-secondary text-sm font-body mt-1">Cycle-aware fitness</p>
        </div>

        {registered ? (
          /* ── Email confirmation state ── */
          <div className="bg-surface rounded-3xl p-6 shadow-card text-center">
            <div className="text-4xl mb-3">✉️</div>
            <h2 className="font-display text-xl font-semibold text-dark mb-2">Check your email</h2>
            <p className="text-dark/60 text-sm font-body mb-2 leading-relaxed">
              We sent a confirmation link to <strong>{email}</strong>.
            </p>
            <p className="text-dark/40 text-xs font-body mb-5">
              Click the link in your email, then come back and sign in.
            </p>
            <button
              onClick={() => { setRegistered(false); setMode("login"); }}
              className="w-full py-3.5 rounded-2xl font-semibold text-white transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
            >
              Go to Sign In
            </button>
          </div>
        ) : (
          <div className="bg-surface rounded-3xl p-6 shadow-card">
            {/* Mode toggle */}
            <div className="flex rounded-2xl bg-background p-1 mb-6 gap-1">
              {(["login", "register"] as const).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); setError(""); }}
                  className="flex-1 py-2 rounded-xl text-sm font-semibold capitalize transition-all duration-200"
                  style={{
                    background: mode === m ? "linear-gradient(135deg, #C48A97, #7B6D8D)" : "transparent",
                    color: mode === m ? "var(--color-surface)" : "var(--color-text-dim)",
                  }}
                >
                  {m === "login" ? "Sign In" : "Register"}
                </button>
              ))}
            </div>

            <div className="space-y-3">
              {mode === "register" && (
                <div>
                  <label className="text-xs font-semibold text-dark/50 uppercase tracking-wide block mb-1.5">Your name</label>
                  <input
                    type="text" placeholder="Ana" value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-background rounded-2xl px-4 py-3 text-sm text-dark outline-none placeholder:text-dark/30 font-body border border-transparent focus:border-primary/30 transition-colors"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-semibold text-dark/50 uppercase tracking-wide block mb-1.5">Email</label>
                <input
                  type="email" placeholder="ana@example.com" value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                  className="w-full bg-background rounded-2xl px-4 py-3 text-sm text-dark outline-none placeholder:text-dark/30 font-body border border-transparent focus:border-primary/30 transition-colors"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-dark/50 uppercase tracking-wide block mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="Min. 6 characters" value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                    className="w-full bg-background rounded-2xl px-4 py-3 text-sm text-dark outline-none placeholder:text-dark/30 font-body border border-transparent focus:border-primary/30 transition-colors pr-12"
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-dark/30 hover:text-dark/60 transition-colors text-xs font-semibold">
                    {showPassword ? "Hide" : "Show"}
                  </button>
                </div>
                {mode === "login" && (
                  <button type="button" onClick={handleForgotPassword}
                    disabled={submitting}
                    className="mt-1.5 text-xs text-primary/70 hover:text-primary transition-colors font-semibold">
                    Forgot password?
                  </button>
                )}
                {resetSent && (
                  <p className="mt-2 text-xs text-emerald-600 font-medium">
                    ✓ Reset link sent — check your email
                  </p>
                )}
              </div>
            </div>

            {error && (
              <div className="mt-4 px-3 py-2.5 rounded-xl bg-rose-50 border border-rose-100">
                <p className="text-rose-500 text-xs font-medium">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit} disabled={submitting}
              className="w-full mt-5 py-4 rounded-2xl font-semibold text-white text-base tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-50 shadow-soft"
              style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="var(--color-surface)" strokeWidth="4"/>
                    <path className="opacity-75" fill="var(--color-surface)" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  {mode === "login" ? "Signing in…" : "Creating account…"}
                </span>
              ) : mode === "login" ? "Sign In" : "Create Account"}
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 mt-5">
              <div className="flex-1 h-px bg-dark/10" />
              <span className="text-xs text-dark/30 font-body">or continue with</span>
              <div className="flex-1 h-px bg-dark/10" />
            </div>

            {/* Google sign-in */}
            <button
              onClick={handleGoogleSignIn} disabled={submitting}
              className="w-full mt-3 py-3.5 rounded-2xl font-semibold text-dark text-sm tracking-wide transition-all duration-300 active:scale-95 disabled:opacity-50 flex items-center justify-center gap-3 border"
              style={{ background: "var(--color-surface)", borderColor: "rgba(var(--color-text-rgb),0.12)" }}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>
          </div>
        )}

        <p className="text-center text-xs text-dark/25 mt-6 font-body">HerPhase · Your data stays private</p>
      </div>
    </div>
  );
}
