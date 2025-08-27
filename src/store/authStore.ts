import { atom, selector } from "recoil";
import { User, Session } from "@supabase/supabase-js";

// Auth state atoms
export const userState = atom<User | null>({
  key: "userState",
  default: null,
});

export const sessionState = atom<Session | null>({
  key: "sessionState",
  default: null,
});

export const loadingState = atom<boolean>({
  key: "loadingState",
  default: true,
});

export const authErrorState = atom<string | null>({
  key: "authErrorState",
  default: null,
});

// Computed selectors
export const isAuthenticatedSelector = selector({
  key: "isAuthenticatedSelector",
  get: ({ get }) => {
    const user = get(userState);
    return user !== null;
  },
});

export const userProfileSelector = selector({
  key: "userProfileSelector",
  get: ({ get }) => {
    const user = get(userState);
    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      fullName: user.user_metadata?.full_name || "User",
      avatar: user.user_metadata?.avatar_url,
    };
  },
});

// Auth actions
export const authActions = {
  setUser: (user: User | null) => ({ type: "SET_USER", payload: user }),
  setSession: (session: Session | null) => ({
    type: "SET_SESSION",
    payload: session,
  }),
  setLoading: (loading: boolean) => ({ type: "SET_LOADING", payload: loading }),
  setError: (error: string | null) => ({ type: "SET_ERROR", payload: error }),
  clearAuth: () => ({ type: "CLEAR_AUTH" }),
};
