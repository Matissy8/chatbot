"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { calculateLevel } from "@/lib/gamification";
import type { AppSession } from "@/lib/session";

const userTypes = ["school_student", "music_student", "music_high_school", "teacher", "independent"] as const;
type UserType = (typeof userTypes)[number];

function parseUserType(value: unknown): UserType {
  return userTypes.includes(value as UserType) ? (value as UserType) : "independent";
}

async function getAppSession(user: User): Promise<AppSession> {
  const supabase = createSupabaseBrowserClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, role, grade_level, language, xp, streak, last_active_at, onboarding_completed_at")
    .eq("id", user.id)
    .maybeSingle();
  const xp = Number(profile?.xp ?? 0);
  const level = calculateLevel(xp).level;
  const language = profile?.language === "en" ? "en" : "lv";

  return {
    id: user.id,
    email: user.email ?? "",
    displayName: profile?.display_name || String(user.user_metadata?.display_name ?? user.email?.split("@")[0] ?? "Skolēns"),
    userType: parseUserType(profile?.role ?? user.user_metadata?.role),
    grade: profile?.grade_level ?? undefined,
    language,
    xp,
    level,
    streak: Number(profile?.streak ?? 0),
    lastActive: profile?.last_active_at ?? new Date().toISOString(),
    onboardingComplete: Boolean(profile?.onboarding_completed_at),
  };
}

type AppContextValue = {
  session: AppSession | null;
  loading: boolean;
  onboardingComplete: boolean;
  refreshSession: () => Promise<void>;
  logout: () => Promise<void>;
};

const AppContext = createContext<AppContextValue | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AppSession | null>(null);
  const [loading, setLoading] = useState(() => isSupabaseConfigured());

  const refreshSession = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      setLoading(false);
      return;
    }

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: { user } } = await supabase.auth.getUser();
      setSession(user ? await getAppSession(user) : null);
    } catch (error) {
      console.error("Unable to load the Supabase session:", error);
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      return;
    }

    const supabase = createSupabaseBrowserClient();
    let active = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, authSession) => {
      if (!authSession?.user) {
        setSession(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      window.setTimeout(() => {
        void getAppSession(authSession.user).then((nextSession) => {
          if (active) setSession(nextSession);
        }).catch((error: unknown) => {
          console.error("Unable to load the user profile:", error);
          if (active) setSession(null);
        }).finally(() => {
          if (active) setLoading(false);
        });
      }, 0);
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const logout = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setSession(null);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
  }, []);

  const value = useMemo<AppContextValue>(() => ({
    session,
    loading,
    onboardingComplete: Boolean(session?.onboardingComplete),
    refreshSession,
    logout,
  }), [session, loading, refreshSession, logout]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppSession() {
  const context = useContext(AppContext);
  if (!context) throw new Error("useAppSession must be used within AppProvider");
  return context;
}
