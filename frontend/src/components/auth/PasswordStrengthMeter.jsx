import React from "react";
import { getPasswordStrength } from "../../hooks/useAuthForm";

const RequirementItem = ({ met, text }) => (
  <div className="flex items-center gap-1.5">
    <span
      className="text-[11px] transition-colors duration-200"
      style={{ color: met ? "#10b981" : "#52525b" }}
    >
      {met ? "✓" : "○"}
    </span>
    <span
      className="text-[11px] transition-colors duration-200"
      style={{
        color: met ? "#a1a1aa" : "#52525b",
        fontFamily: "'DM Sans', sans-serif",
      }}
    >
      {text}
    </span>
  </div>
);

const PasswordStrengthMeter = ({ password, show = true }) => {
  if (!show || !password) return null;

  const { score, label, color, checks } = getPasswordStrength(password);
  const segments = 5;

  return (
    <div className="mt-2">
      {/* Segmented bar */}
      <div className="flex gap-1 mb-1.5">
        {Array.from({ length: segments }).map((_, i) => (
          <div
            key={i}
            className="flex-1 h-1 rounded-full transition-all duration-300"
            style={{
              background: i < score ? color : "rgba(255,255,255,0.08)",
            }}
          />
        ))}
      </div>

      {/* Label */}
      {label && (
        <p
          className="text-[11px] font-semibold mb-2 transition-colors duration-200"
          style={{ color, fontFamily: "'DM Sans', sans-serif" }}
        >
          {label}
        </p>
      )}

      {/* Requirements checklist */}
      {checks && (
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <RequirementItem met={checks.length} text="8+ characters" />
          <RequirementItem met={checks.uppercase} text="Uppercase letter" />
          <RequirementItem met={checks.number} text="Number" />
          <RequirementItem met={checks.special} text="Special character" />
        </div>
      )}
    </div>
  );
};

export default PasswordStrengthMeter;
