import React from "react";

const AuthCard = ({ children, className = "" }) => (
  <div
    className={`relative rounded-2xl overflow-hidden ${className}`}
    style={{
      background:
        "linear-gradient(160deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
      border: "1px solid rgba(255,255,255,0.08)",
      boxShadow:
        "0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04) inset",
      backdropFilter: "blur(12px)",
    }}
  >
    <div
      className="absolute top-0 left-0 right-0 h-px"
      style={{
        background:
          "linear-gradient(90deg, transparent 0%, rgba(99,102,241,0.5) 40%, rgba(139,92,246,0.4) 70%, transparent 100%)",
      }}
    />
    <div className="p-8">{children}</div>
  </div>
);

export default AuthCard;
