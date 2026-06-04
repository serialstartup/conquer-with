import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Profile = {
  id: string;
  username: string;
  is_guest: boolean;
};

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAuth();
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function initAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      setUser(session.user);
      await loadProfile(session.user.id);
    } else {
      const { data } = await supabase.auth.signInAnonymously();
      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id);
      }
    }
    setLoading(false);
  }

  async function loadProfile(userId: string) {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();
    if (data) {
      setProfile(data);
    }
  }

  async function createProfile(userId: string, username: string) {
    const { data, error } = await supabase
      .from("profiles")
      .insert({ id: userId, username, is_guest: true })
      .select()
      .single();
    if (data) setProfile(data);
    return { data, error };
  }

  async function setUsername(username: string) {
    if (!user) return;
    if (profile) {
      const { data } = await supabase
        .from("profiles")
        .update({ username })
        .eq("id", user.id)
        .select()
        .single();
      if (data) setProfile(data);
    } else {
      await createProfile(user.id, username);
    }
  }

  return { user, profile, loading, setUsername };
}
