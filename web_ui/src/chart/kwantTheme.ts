import type { KwantTheme } from "kwant";

import type { Theme } from "../context/ThemeContextStore";

const THEMES: Record<Theme, Partial<KwantTheme>> = {
    dark: {
        containerBackground: "#111316",
        plotBackground: "#0f1318",
        gridColor: "rgba(255, 255, 255, 0.08)",
        accentColor: "#ff8904",
        crosshairColor: "#ffffff",
        crosshairLineStyle: "dashed",
        upColor: "#05df72",
        downColor: "#fb2c36",
    },
    light: {
        containerBackground: "#f0e8dd",
        plotBackground: "#f7f1e7",
        gridColor: "rgba(68, 57, 48, 0.16)",
        accentColor: "#c65d00",
        crosshairColor: "#2b221a",
        crosshairLineStyle: "dashed",
        upColor: "#008c50",
        downColor: "#dc2626",
    },
};

export function kwantTheme(theme: Theme): Partial<KwantTheme> {
    return THEMES[theme];
}
