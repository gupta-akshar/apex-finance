import React, { forwardRef } from "react";

const AuthInput = forwardRef(
  (
    {
      label,
      type = "text",
      placeholder,
      error,
      rightElement,
      autoComplete,
      disabled,
      className = "",
      ...props
    },
    ref,
  ) => {
    return (
      <div className={`flex flex-col gap-1.5 ${className}`}>
        {label && (
          <label
            className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[#71717a]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            {label}
          </label>
        )}

        <div className="relative">
          <input
            ref={ref}
            type={type}
            placeholder={placeholder}
            autoComplete={autoComplete}
            disabled={disabled}
            className={`auth-input w-full px-4 py-3 rounded-xl text-sm text-[#e4e4e7] placeholder:text-[#52525b] transition-all duration-200 ${error ? "error" : ""} ${rightElement ? "pr-12" : ""} ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            style={{
              background: "rgba(255,255,255,0.03)",
              border: error
                ? "1px solid rgba(248,113,113,0.5)"
                : "1px solid rgba(255,255,255,0.08)",
              outline: "none",
              fontFamily: "'DM Sans', sans-serif",
              fontSize: "14px",
            }}
            {...props}
          />
          {rightElement && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {rightElement}
            </div>
          )}
        </div>

        {error && (
          <p
            className="text-[12px] text-red-400 flex items-center gap-1.5"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            <span>⚠</span>
            {error}
          </p>
        )}
      </div>
    );
  },
);

AuthInput.displayName = "AuthInput";
export default AuthInput;
