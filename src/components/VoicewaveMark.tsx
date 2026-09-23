import { useTheme } from "../providers/ThemeProvider";

export function VoicewaveLockup() {
  const { theme } = useTheme();

  return (
    <h1 aria-label="Vocairo">
      <img
        src={theme === "dark" ? "/brand/vocairo-wordmark.png" : "/brand/vocairo-wordmark-light.png"}
        alt=""
        width={96}
        height={22.4}
        className="block h-auto w-24 object-contain"
      />
    </h1>
  );
}
