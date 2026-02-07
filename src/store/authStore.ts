import { atom, selector } from "recoil";
import type { User, Session } from "@supabase/supabase-js";

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

    const fullName =
      user.user_metadata?.full_name ||
      user.user_metadata?.name ||
      user.email?.split("@")[0] ||
      "User";

    return {
      id: user.id,
      email: user.email || "",
      fullName: fullName,
      avatar: user.user_metadata?.avatar_url || user.user_metadata?.picture,
    };
  },
});

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
