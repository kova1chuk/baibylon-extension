import { useEffect, useState } from "react";
import { ThemeToggle } from "./components/ThemeToggle";
import { VoicewaveMark, VoicewaveWordmark } from "./components/VoicewaveMark";
import { Button } from "./components/ui/button";
import { useToken } from "./hooks/useToken";
import { ApiError, clearToken } from "./lib/api";
import {
  DeviceAuthBusyError,
  DeviceAuthError,
  getPendingDeviceAuth,
  resumeSignIn,
  signIn,
} from "./lib/deviceAuth";
import { useTheme } from "./providers/ThemeProvider";

function describeSignInError(error: unknown): string {
  if (error instanceof DeviceAuthError) {
    return error.reason === "denied"
      ? "Вхід відхилено"
      : "Код підтвердження протермінувався. Спробуйте ще раз";
  }
  if (error instanceof ApiError && error.kind === "network") {
    return "Немає зʼєднання з сервером";
  }
  return "Вхід не завершено. Спробуйте ще раз.";
}

function App() {
  const { theme } = useTheme();
  const { token, loading, refresh } = useToken();
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [resuming, setResuming] = useState(true);

  // The popup closes on blur, which kills signIn's poll loop the moment chrome.tabs.create
  // shifts focus to the /device tab; reopening the popup resumes any pending flow from storage.
  useEffect(() => {
    let cancelled = false;
    getPendingDeviceAuth().then((pending) => {
      if (cancelled) return;
      setResuming(false);
      if (!pending) return;
      setCode(pending.userCode);
      setBusy(true);
      resumeSignIn(pending)
        .then(() => {
          refresh();
          setBusy(false);
          setCode(null);
        })
        .catch((err: unknown) => {
          if (err instanceof DeviceAuthBusyError) return;
          setError(describeSignInError(err));
          setBusy(false);
          setCode(null);
        });
    });
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const handleSignIn = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(setCode);
      refresh();
    } catch (err) {
      if (err instanceof DeviceAuthBusyError) return;
      setError(describeSignInError(err));
    }
    setBusy(false);
    setCode(null);
  };

  const handleSignOut = async () => {
    await clearToken();
    refresh();
  };

  const isLoading = loading || resuming;

  return (
    <div className="w-96 bg-background text-foreground p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <VoicewaveMark className="h-5 w-auto" scheme={theme} />
          <VoicewaveWordmark scheme={theme} />
        </div>
        <ThemeToggle />
      </div>

      {isLoading ? (
        <p className="text-xs text-muted-foreground">Завантаження…</p>
      ) : token ? (
        <>
          <p className="text-xs text-muted-foreground">
            Ви увійшли. Виділіть слово на будь-якій сторінці.
          </p>
          <Button variant="outline" size="sm" onClick={handleSignOut}>
            Вийти
          </Button>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">
            {busy
              ? "Підтвердьте вхід у вкладці, що відкрилась, тоді поверніться до цього вікна."
              : "Підтвердьте вхід у вкладці, що відкриється."}
          </p>
          {code && <p className="text-sm font-mono">Код: {code}</p>}
          <Button size="sm" disabled={busy} onClick={handleSignIn}>
            {busy ? "Очікуємо підтвердження…" : "Увійти"}
          </Button>
        </>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}

export default App;
