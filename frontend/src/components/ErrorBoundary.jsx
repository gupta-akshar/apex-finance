import { Component } from "react";

/**
 * ErrorBoundary
 *
 * Catches any uncaught render/lifecycle error in the subtree below it.
 * Falls back to a dark-themed error screen that:
 *   - Matches the app's existing palette (#0f0f11 / #6366f1 / etc.)
 *   - Lets the user recover by reloading OR going home
 *   - Shows the error message in dev; hides the stack trace in production
 *   - Never interrupts auth or routing outside its own render pass
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  // Invoked during the render phase — update state so the next render shows
  // the fallback. Do NOT cause side-effects here.
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  // Invoked after the error is confirmed — safe place for side-effects like
  // logging to an error reporting service (Sentry, etc.).
  componentDidCatch(error, info) {
    console.error("[ErrorBoundary] Uncaught render error:", error);
    console.error("[ErrorBoundary] Component stack:", info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    // Hard-navigate so any corrupted React state is fully discarded
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;
    const message = this.state.error?.message ?? "An unexpected error occurred";

    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#0f0f11",
          color: "#e4e4e7",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        {/* Ambient orb — same decorative style as other pages */}
        <div
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            pointerEvents: "none",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-80px",
              right: "-80px",
              width: "400px",
              height: "400px",
              borderRadius: "50%",
              background:
                "radial-gradient(circle, rgba(248,113,113,0.15) 0%, transparent 70%)",
              filter: "blur(48px)",
            }}
          />
        </div>

        <div
          style={{
            position: "relative",
            width: "100%",
            maxWidth: "480px",
            background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
            border: "1px solid #27272a",
            borderRadius: "16px",
            padding: "40px 36px",
            boxShadow: "0 24px 64px rgba(0,0,0,0.6)",
          }}
        >
          {/* Red left-edge accent — mirrors SummaryCard / CategoryRow style */}
          <div
            style={{
              position: "absolute",
              left: 0,
              top: 0,
              bottom: 0,
              width: "3px",
              borderRadius: "16px 0 0 16px",
              background: "#f87171",
            }}
          />

          {/* Icon */}
          <div
            style={{
              width: "44px",
              height: "44px",
              borderRadius: "12px",
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "20px",
              marginBottom: "20px",
            }}
          >
            ⚠
          </div>

          {/* Heading */}
          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#f87171",
              marginBottom: "8px",
            }}
          >
            Something went wrong
          </p>

          <h1
            style={{
              fontSize: "20px",
              fontWeight: 600,
              color: "#e4e4e7",
              marginBottom: "8px",
              lineHeight: 1.3,
            }}
          >
            Unexpected render error
          </h1>

          <p
            style={{
              fontSize: "13px",
              color: "#71717a",
              lineHeight: 1.6,
              marginBottom: "28px",
            }}
          >
            The application hit an unrecoverable error in this view. Your data
            is safe — reloading will restore the app to a working state.
          </p>

          {/* Dev-only: show the error message */}
          {isDev && (
            <div
              style={{
                background: "#0f0f11",
                border: "1px solid #27272a",
                borderRadius: "8px",
                padding: "12px 14px",
                marginBottom: "24px",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: "11px",
                color: "#f87171",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {message}
            </div>
          )}

          {/* Actions */}
          <div style={{ display: "flex", gap: "10px" }}>
            <button
              onClick={this.handleReload}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#fff",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                boxShadow: "0 2px 12px rgba(99,102,241,0.3)",
                fontFamily: "inherit",
              }}
            >
              Reload page
            </button>

            <button
              onClick={this.handleGoHome}
              style={{
                flex: 1,
                padding: "10px 0",
                borderRadius: "10px",
                border: "1px solid #27272a",
                background: "transparent",
                color: "#a1a1aa",
                fontSize: "13px",
                fontWeight: 500,
                cursor: "pointer",
                fontFamily: "inherit",
              }}
            >
              Go to home
            </button>
          </div>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
