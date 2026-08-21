import React, { useState, useId } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import useAuthForm from "../hooks/useAuthForm";
import { ROUTES } from "../constants/routes";
import AuthLayout from "../components/auth/AuthLayout";
import AuthCard from "../components/auth/AuthCard";
import AuthInput from "../components/auth/AuthInput";
import LoginMarketingPanel from "../components/auth/LoginMarketingPanel";
import SocialLoginButton from "../components/auth/SocialLoginButton";
import DividerWithText from "../components/auth/DividerWithText";
import { mapAuthError } from "../utils/authErrors";

const EyeOpen = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const EyeClosed = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const {
    values,
    errors,
    handleChange,
    handleBlur,
    validateAll,
    setFieldError,
    clearErrors,
  } = useAuthForm(["email", "password"], true);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState("");

  const rememberMeId = useId();

  const makeChangeHandler = (field) => (e) => {
    if (apiError) setApiError("");
    handleChange(field)(e);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setApiError("");
    clearErrors();

    if (!validateAll()) return;

    setSubmitting(true);
    try {
      await login(values.email.trim(), values.password);
      navigate(ROUTES.DASHBOARD);
    } catch (err) {
      const mapped = mapAuthError(err, "login");
      if (
        mapped.toLowerCase().includes("email") &&
        !mapped.toLowerCase().includes("password")
      ) {
        setFieldError("email", mapped);
      } else if (mapped.toLowerCase().includes("password")) {
        setFieldError("password", mapped);
      } else {
        setApiError(mapped);
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout animKey="login" marketingPanel={<LoginMarketingPanel />}>
      <div className="stagger-1 mb-5">
        <h2
          className="text-2xl font-bold text-white mb-1.5"
          style={{
            fontFamily: "'DM Sans', sans-serif",
            letterSpacing: "-0.02em",
          }}
        >
          Welcome back
        </h2>
        <p
          className="text-sm text-[#71717a]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Sign in to your ExpenseTracker account
        </p>
      </div>

      <AuthCard>
        {apiError && (
          <div
            role="alert"
            aria-live="assertive"
            className="auth-error-banner flex items-start gap-2.5 px-4 py-3 rounded-xl border mb-4 text-sm"
            style={{
              background: "rgba(248,113,113,0.08)",
              borderColor: "rgba(248,113,113,0.2)",
              color: "#f87171",
              fontFamily: "'DM Sans', sans-serif",
            }}
          >
            <span
              className="text-base leading-none mt-0.5 shrink-0"
              aria-hidden
            >
              ⚠
            </span>
            <span>{apiError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="stagger-2">
            <AuthInput
              label="Email address"
              type="email"
              placeholder="you@example.com"
              value={values.email}
              onChange={makeChangeHandler("email")}
              onBlur={handleBlur("email")}
              error={errors.email}
              autoComplete="email"
              disabled={submitting}
            />
          </div>

          <div className="stagger-3 mt-3">
            <AuthInput
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password"
              value={values.password}
              onChange={makeChangeHandler("password")}
              onBlur={handleBlur("password")}
              error={errors.password}
              autoComplete="current-password"
              disabled={submitting}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((p) => !p)}
                  className="text-[#52525b] hover:text-[#a1a1aa] transition-colors focus:outline-none"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeClosed /> : <EyeOpen />}
                </button>
              }
            />
          </div>

          {/* Remember me + Forgot password */}
          <div className="stagger-4 flex items-center justify-between mt-3 mb-5">
            <label
              htmlFor={rememberMeId}
              className="flex items-center gap-2 cursor-pointer group"
            >
              <div className="relative">
                <input
                  id={rememberMeId}
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="sr-only"
                />
                <div
                  className="w-4 h-4 rounded border transition-all duration-200 flex items-center justify-center"
                  style={{
                    background: rememberMe
                      ? "#6366f1"
                      : "rgba(255,255,255,0.04)",
                    borderColor: rememberMe
                      ? "#6366f1"
                      : "rgba(255,255,255,0.15)",
                    boxShadow: rememberMe
                      ? "0 0 0 2px rgba(99,102,241,0.2)"
                      : "none",
                  }}
                  onClick={() => setRememberMe((p) => !p)}
                >
                  {rememberMe && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path
                        d="M2 5l2.5 2.5L8 3"
                        stroke="white"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
              </div>
              <span
                className="text-[12px] text-[#71717a] group-hover:text-[#a1a1aa] transition-colors select-none"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Remember me
              </span>
            </label>

            <button
              type="button"
              className="text-[12px] font-medium transition-colors focus:outline-none"
              style={{ color: "#818cf8", fontFamily: "'DM Sans', sans-serif" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "#a5b4fc")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "#818cf8")}
            >
              Forgot password?
            </button>
          </div>

          {/* Submit */}
          <div className="stagger-5">
            <button
              type="submit"
              disabled={submitting}
              aria-busy={submitting}
              className="btn-primary w-full py-3 rounded-xl text-sm font-semibold text-white transition-all duration-200 focus:outline-none disabled:opacity-60 disabled:cursor-not-allowed disabled:transform-none"
              style={{
                background: submitting
                  ? "rgba(99,102,241,0.5)"
                  : "linear-gradient(135deg, #6366f1, #4f46e5)",
                boxShadow: submitting
                  ? "none"
                  : "0 4px 20px rgba(99,102,241,0.35)",
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    style={{ animation: "spin-slow 0.7s linear infinite" }}
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden="true"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="white"
                      strokeWidth="3"
                    />
                    <path
                      className="opacity-75"
                      fill="white"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  Signing in…
                </span>
              ) : (
                "Sign in to your account"
              )}
            </button>
          </div>

          <div className="stagger-6">
            <DividerWithText />
            <SocialLoginButton
              loading={submitting}
              onClick={() =>
                setApiError("Google Sign-In is not configured yet.")
              }
            />
          </div>
        </form>
      </AuthCard>

      <div className="stagger-7 mt-4 text-center">
        <p
          className="text-sm text-[#52525b]"
          style={{ fontFamily: "'DM Sans', sans-serif" }}
        >
          Don't have an account?{" "}
          <button
            onClick={() => navigate(ROUTES.REGISTER)}
            className="font-semibold transition-colors focus:outline-none"
            style={{ color: "#818cf8" }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#a5b4fc")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#818cf8")}
          >
            Create one free →
          </button>
        </p>
      </div>
    </AuthLayout>
  );
};

export default Login;
