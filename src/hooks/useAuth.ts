import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string;
  is_guest: boolean;
};

type AuthContextValue = {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  setUsername: (username: string) => Promise<void>;
};

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  profile: null,
  loading: true,
  setUsername: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

export function useAuthProvider(): AuthContextValue {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;

        if (session?.user) {
          setUser(session.user);
          await loadProfile(session.user.id, isMounted);
        } else {
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!isMounted) return;
          if (error) throw error;
          if (data.user) {
            setUser(data.user);
            await loadProfile(data.user.id, isMounted);
          }
        }
      } catch (e) {
        console.error("[useAuth] initAuth error:", e);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    async function loadProfile(userId: string, mounted: boolean) {
      const { data } = await supabase
        .from("profiles")
        .select("id, username, is_guest")
        .eq("id", userId)
        .maybeSingle();
      if (mounted && data) setProfile(data);
    }

    initAuth();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (isMounted) setUser(session?.user ?? null);
    });

    return () => {
      isMounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  async function setUsername(username: string) {
    if (!user) return;
    try {
      if (profile) {
        const { data, error } = await supabase
          .from("profiles")
          .update({ username })
          .eq("id", user.id)
          .select("id, username, is_guest")
          .single();
        if (error) throw error;
        setProfile(data);
      } else {
        const { data, error } = await supabase
          .from("profiles")
          .insert({ id: user.id, username, is_guest: true })
          .select("id, username, is_guest")
          .single();
        if (error) throw error;
        setProfile(data);
      }
    } catch (e) {
      console.error("[useAuth] setUsername error:", e);
      throw e;
    }
  }

  return { user, profile, loading, setUsername };
}
