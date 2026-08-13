import { Component } from "react";

class RouteErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error(
      `[RouteErrorBoundary] Render error in ${this.props.routeName || "unknown route"}:`,
      error,
    );
    console.error("[RouteErrorBoundary] Component stack:", info.componentStack);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isDev = import.meta.env.DEV;
    const routeName = this.props.routeName || "this page";

    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
          fontFamily: "'DM Sans', system-ui, sans-serif",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "400px",
            background: "linear-gradient(145deg, #18181b 0%, #141416 100%)",
            border: "1px solid #27272a",
            borderRadius: "16px",
            padding: "32px 28px",
            position: "relative",
            overflow: "hidden",
          }}
        >
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

          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              background: "rgba(248,113,113,0.12)",
              border: "1px solid rgba(248,113,113,0.25)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "16px",
              marginBottom: "16px",
            }}
          >
            ⚠
          </div>

          <p
            style={{
              fontSize: "11px",
              fontWeight: 600,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#f87171",
              marginBottom: "6px",
            }}
          >
            Page error
          </p>

          <h2
            style={{
              fontSize: "16px",
              fontWeight: 600,
              color: "#e4e4e7",
              marginBottom: "6px",
            }}
          >
            {routeName} failed to load
          </h2>

          <p
            style={{
              fontSize: "13px",
              color: "#71717a",
              lineHeight: 1.6,
              marginBottom: isDev ? "12px" : "20px",
            }}
          >
            An unexpected error occurred. Your data is safe.
          </p>

          {isDev && this.state.error && (
            <div
              style={{
                background: "#0f0f11",
                border: "1px solid #27272a",
                borderRadius: "6px",
                padding: "10px 12px",
                marginBottom: "16px",
                fontFamily: "monospace",
                fontSize: "11px",
                color: "#f87171",
                overflowX: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              {this.state.error.message}
            </div>
          )}

          <button
            onClick={this.handleReset}
            style={{
              width: "100%",
              padding: "9px 0",
              borderRadius: "9px",
              border: "none",
              background: "linear-gradient(135deg, #6366f1, #4f46e5)",
              color: "#fff",
              fontSize: "13px",
              fontWeight: 500,
              cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }
}

export default RouteErrorBoundary;
