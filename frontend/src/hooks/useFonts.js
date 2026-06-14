import { useEffect } from "react";

// ─── Font URLs ────────────────────────────────────────────────────────────────

const FONT_URLS = {
  app: "https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;600&family=Sora:wght@300;400;500;600&display=swap",

  landing:
    "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@300;400;500;600&display=swap",
};

// ─── Module-level set tracks which URLs are already injected ─────────────────

const _injected = new Set();

const useFonts = (variant = "app") => {
  useEffect(() => {
    const href = FONT_URLS[variant];

    if (!href) {
      console.warn(`useFonts: unknown variant "${variant}"`);
      return;
    }

    // Already injected in this session — nothing to do
    if (_injected.has(href)) return;

    // Guard against duplicate tags surviving across HMR cycles
    if (document.querySelector(`link[href="${href}"]`)) {
      _injected.add(href);
      return;
    }

    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    document.head.appendChild(link);

    _injected.add(href);
  }, [variant]);
};

export default useFonts;
