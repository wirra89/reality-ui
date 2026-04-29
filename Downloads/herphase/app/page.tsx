"use client";

// app/page.tsx
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

export default function HomePage() {
  const { user, profile, loading } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (!user) {
      router.replace("/auth");
      return;
    }

    // Wait for profile to load
    if (profile === null) return;

    // Check localStorage first (existing users)
    const hasOnboarded = localStorage.getItem(`herphase_onboarded_${user.id}`);
    if (hasOnboarded) {
      router.replace("/dashboard");
      return;
    }

    // For new users (especially Google OAuth) — check if profile has been filled
    // If they have a name that's not just an email prefix AND cycle settings exist,
    // they've completed onboarding before. Mark them as done.
    const profileComplete = !!(
      profile.name &&
      profile.name !== profile.name?.split("@")[0] || // has real name
      profile.height_cm || // has body metrics
      profile.goals?.length > 0 // has goals set
    );

    if (profileComplete) {
      // Mark as onboarded so we don't redirect again
      localStorage.setItem(`herphase_onboarded_${user.id}`, "true");
      router.replace("/dashboard");
    } else {
      router.replace("/onboarding");
    }
  }, [user, profile, loading, router]);

  return (
    <div className="min-h-dvh bg-background flex items-center justify-center">
      <div className="text-center">
        <div
          className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center text-3xl"
          style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
        >
          🌸
        </div>
        <p className="text-secondary text-sm font-body">Loading…</p>
      </div>
    </div>
  );
}
