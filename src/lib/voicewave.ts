import { voicewaveGeometry } from "./voicewave-geometry";

export const VOICEWAVE_BARS = voicewaveGeometry.bars;

export const VOICEWAVE_COLORS = {
  light: { ink: "#181b21", accent: "#2f6b5e" },
  dark: { ink: "#f1ede5", accent: "#7fd0bb" },
} as const;
