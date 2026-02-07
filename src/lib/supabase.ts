import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,

    flowType: "pkce",
    storage: typeof chrome !== "undefined" && chrome.storage ? {
      getItem: (key: string) => {
        return new Promise((resolve) => {
          chrome.storage.local.get([key], (result) => {
            resolve(result[key] || null);
          });
        });
      },
      setItem: (key: string, value: string) => {
        chrome.storage.local.set({ [key]: value });
      },
      removeItem: (key: string) => {
        chrome.storage.local.remove([key]);
      },
    } : undefined,
  },
});

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      text_processing: {
        Row: {
          id: string;
          user_id: string;
          selected_text: string;
          source_url: string | null;
          processed_text: string | null;
          status: "pending" | "processing" | "completed" | "failed";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          selected_text: string;
          source_url?: string | null;
          processed_text?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          selected_text?: string;
          source_url?: string | null;
          processed_text?: string | null;
          status?: "pending" | "processing" | "completed" | "failed";
          created_at?: string;
          updated_at?: string;
        };
      };
    };
  };
};
