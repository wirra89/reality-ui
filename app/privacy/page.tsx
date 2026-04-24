import Link from "next/link";
import type { ReactNode } from "react";

export const metadata = {
  title: "Privacy Policy — HerPhase",
  description: "How HerPhase collects, uses, and protects your data.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="rose-glow fixed top-0 left-0 right-0 pointer-events-none z-0" />
      <main className="relative z-10 mx-auto max-w-app px-4 pt-6 pb-16">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold mb-6 transition-colors"
          style={{ color: "var(--color-text-dim)" }}
        >
          ← Back
        </Link>

        <div className="text-center mb-8">
          <div
            className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl shadow-soft"
            style={{ background: "linear-gradient(135deg, #C48A97, #7B6D8D)" }}
          >
            🌸
          </div>
          <h1 className="font-display text-2xl font-semibold text-dark">Privacy Policy</h1>
          <p className="text-secondary text-sm font-body mt-1">Last updated: April 2026</p>
        </div>

        <div className="space-y-3">
          <PolicySection title="What we collect">
            <p>HerPhase collects the following data to personalise your experience:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li>Menstrual cycle dates and history</li>
              <li>Mood logs — mood rating, energy level, physical symptoms, cravings, and sleep quality</li>
              <li>Workout logs — exercises, sets, reps, and weights</li>
              <li>Meal entries — food names and macro nutrition data (calories, protein, carbs, fats)</li>
              <li>Weight logs and daily hydration logs</li>
              <li>Body metrics — height, weight, age, and activity level (used to calculate macro targets)</li>
              <li>Push notification subscription tokens</li>
            </ul>
            <p className="mt-1">All data is stored securely in Supabase and linked to your account.</p>
          </PolicySection>

          <PolicySection title="How we use your data">
            <p>Your data is used solely to personalise training recommendations, nutrition targets, and cycle insights within HerPhase. We do not use your data for advertising, profiling, or any purpose beyond providing the features of this app.</p>
          </PolicySection>

          <PolicySection title="Third-party services">
            <p>HerPhase uses two third-party services that may process your data:</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong className="font-semibold text-dark/80">Supabase</strong> — database hosting and authentication. Your data is stored on Supabase infrastructure.</li>
              <li><strong className="font-semibold text-dark/80">Sentry</strong> — crash reporting. Sentry receives error logs and stack traces to help us fix bugs. No personal health data is intentionally included in error reports.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Data sharing">
            <p>We do not sell, rent, or share your personal data with any third party beyond the processors listed above. Your health data is never used for advertising or shared with advertisers.</p>
          </PolicySection>

          <PolicySection title="Your rights">
            <p>You have the right to access, correct, or delete your personal data at any time.</p>
            <ul className="list-disc pl-4 mt-1 space-y-1">
              <li><strong className="font-semibold text-dark/80">Delete:</strong> You can delete your account and all associated data from the Profile page. Deletion is permanent.</li>
              <li><strong className="font-semibold text-dark/80">Access / export:</strong> Data export is not currently supported in-app. To request a copy of your data, email us at the address below.</li>
              <li><strong className="font-semibold text-dark/80">Correction:</strong> You can update your profile, cycle data, and body metrics at any time within the app.</li>
            </ul>
          </PolicySection>

          <PolicySection title="Data retention">
            <p>Your data is retained until you delete your account. Upon deletion, all personal data associated with your account is permanently removed from our systems within 30 days.</p>
          </PolicySection>

          <PolicySection title="Cookies and tracking">
            <p>HerPhase uses a single Supabase authentication session cookie to keep you logged in. We do not use advertising cookies, tracking pixels, or third-party analytics.</p>
          </PolicySection>

          <PolicySection title="Children's privacy">
            <p>HerPhase is not intended for users under the age of 16. We do not knowingly collect data from minors. If you believe a minor has created an account, contact us and we will delete it promptly.</p>
          </PolicySection>

          <PolicySection title="Changes to this policy">
            <p>If we make material changes to this privacy policy, we will notify you via an in-app notice. Continued use of HerPhase after notification constitutes acceptance of the updated policy.</p>
          </PolicySection>
        </div>

        <div className="mt-6 bg-surface rounded-2xl p-4 shadow-card text-center">
          <p className="text-xs font-body mb-1" style={{ color: "var(--color-text-dim)" }}>Questions about your data?</p>
          <a
            href="mailto:wiralabs.studio@gmail.com"
            className="text-sm font-semibold"
            style={{ color: "#C48A97" }}
          >
            wiralabs.studio@gmail.com
          </a>
        </div>

        <p className="text-center text-xs mt-6 font-body" style={{ color: "var(--color-text-dim)" }}>
          HerPhase · Cycle-aware fitness
        </p>
      </main>
    </div>
  );
}

function PolicySection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-surface rounded-2xl p-4 shadow-card">
      <h2 className="text-sm font-semibold text-dark mb-2">{title}</h2>
      <div className="text-xs font-body leading-relaxed space-y-1" style={{ color: "rgba(var(--color-text-rgb), 0.6)" }}>
        {children}
      </div>
    </div>
  );
}
