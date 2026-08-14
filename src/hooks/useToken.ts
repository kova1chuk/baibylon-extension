import { useCallback, useEffect, useState } from "react";
import { getToken } from "../lib/api";

export function useToken() {
  const [token, setTokenState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setLoading(true);
    getToken().then((value) => {
      setTokenState(value);
      setLoading(false);
    });
  }, []);

  useEffect(refresh, [refresh]);

  return { token, loading, refresh };
}
