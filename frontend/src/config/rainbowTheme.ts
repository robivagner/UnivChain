import { darkTheme } from "@rainbow-me/rainbowkit";

/** Matches --uc-bg-base in globals.css */
const PORTAL_BG = "#0A0F1C";
/** Matches elevated surfaces in the portal shell */
const PORTAL_BG_ELEVATED = "#111827";
const PORTAL_SURFACE = "#1E293B";
const PORTAL_GOLD = "#E8B86D";
const PORTAL_TEXT = "#E8EDF5";
const PORTAL_TEXT_MUTED = "#94A3B8";

const base = darkTheme({
  accentColor: PORTAL_GOLD,
  accentColorForeground: PORTAL_BG,
  borderRadius: "medium",
  overlayBlur: "small",
});

export const portalTheme = {
  ...base,
  colors: {
    ...base.colors,
    modalBackground: PORTAL_BG,
    modalBackdrop: "rgba(6, 9, 18, 0.75)",
    modalBorder: "rgba(148, 163, 184, 0.18)",
    modalText: PORTAL_TEXT,
    modalTextSecondary: PORTAL_TEXT_MUTED,
    modalTextDim: "rgba(148, 163, 184, 0.45)",
    /* profileForeground is a BACKGROUND token — keep it dark, not a text color */
    profileForeground: PORTAL_BG_ELEVATED,
    profileAction: PORTAL_SURFACE,
    profileActionHover: "#334155",
    connectButtonBackground: "linear-gradient(135deg, #F0C878 0%, #E8B86D 45%, #C9974A 100%)",
    connectButtonBackgroundError: "#F87171",
    connectButtonInnerBackground: "linear-gradient(135deg, #F0C878 0%, #E8B86D 45%, #C9974A 100%)",
    connectButtonText: PORTAL_BG,
    connectButtonTextError: "#FFFFFF",
    menuItemBackground: "rgba(17, 24, 39, 0.92)",
    generalBorder: "rgba(148, 163, 184, 0.18)",
    generalBorderDim: "rgba(148, 163, 184, 0.1)",
    actionButtonSecondaryBackground: PORTAL_SURFACE,
    actionButtonBorder: "rgba(148, 163, 184, 0.2)",
    closeButton: PORTAL_TEXT_MUTED,
    closeButtonBackground: PORTAL_SURFACE,
  },
};
