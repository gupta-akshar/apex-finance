import React from "react";
import logo from "../../../public/logo.svg";

const PARTICLE_DATA = Array.from({ length: 20 }, (_, i) => ({
  id: i,
  size: 1 + (((i * 7 + 3) % 10) / 10) * 3,
  x: (i * 37 + 11) % 100,
  y: (i * 53 + 7) % 100,
  delay: (i * 8) % 8,
  duration: 6 + (i % 8),
  opacity: 0.08 + (i % 5) * 0.04,
  isSecondary: i % 3 === 0,
}));

const MeshBackground = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    <div
      className="absolute inset-0"
      style={{
        background:
          "linear-gradient(135deg, #0a0a0f 0%, #0d0d1a 40%, #0f0f1f 70%, #0a0a0f 100%)",
      }}
    />
    <div
      className="absolute rounded-full animate-float-slow"
      style={{
        width: "600px",
        height: "600px",
        top: "-120px",
        left: "-80px",
        background:
          "radial-gradient(circle, rgba(99,102,241,0.22) 0%, transparent 65%)",
        filter: "blur(40px)",
      }}
    />
    <div
      className="absolute rounded-full animate-float-medium"
      style={{
        width: "500px",
        height: "500px",
        bottom: "-100px",
        right: "-60px",
        background:
          "radial-gradient(circle, rgba(139,92,246,0.18) 0%, transparent 65%)",
        filter: "blur(50px)",
      }}
    />
    <div
      className="absolute rounded-full animate-float-fast"
      style={{
        width: "300px",
        height: "300px",
        top: "40%",
        left: "50%",
        transform: "translate(-50%, -50%)",
        background:
          "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)",
        filter: "blur(30px)",
      }}
    />
    <div
      className="absolute inset-0 opacity-[0.04]"
      style={{
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    />
    <div
      className="absolute inset-0 opacity-[0.025]"
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        backgroundSize: "256px 256px",
      }}
    />
  </div>
);

const Particles = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {PARTICLE_DATA.map((p) => (
      <div
        key={p.id}
        className="absolute rounded-full animate-drift"
        style={{
          width: p.size + "px",
          height: p.size + "px",
          left: p.x + "%",
          top: p.y + "%",
          background: p.isSecondary ? "#818cf8" : "#6366f1",
          opacity: p.opacity,
          animationDelay: `-${p.delay}s`,
          animationDuration: p.duration + "s",
        }}
      />
    ))}
  </div>
);

const AuthLayout = ({ marketingPanel, children, animKey }) => {
  return (
    <div
      className="min-h-screen lg:h-screen lg:overflow-hidden flex bg-[#0a0a0c]"
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      <div
        className="hidden lg:flex lg:flex-col relative overflow-hidden"
        style={{ flex: "0 0 58%" }}
      >
        <MeshBackground />
        <Particles />
        <div className="relative z-10 flex flex-col h-full px-10 py-8 overflow-y-auto no-scrollbar">
          {marketingPanel}
        </div>
      </div>

      <div
        className="flex-1 flex flex-col relative"
        style={{
          background:
            "linear-gradient(160deg, #111114 0%, #0d0d10 60%, #0a0a0c 100%)",
          borderLeft: "1px solid rgba(255,255,255,0.05)",
        }}
      >
        <div
          className="absolute top-0 left-0 right-0 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(99,102,241,0.4), transparent)",
          }}
        />

        <div className="lg:hidden flex items-center gap-2.5 px-8 pt-6 pb-2 shrink-0">
          <img
            src={logo}
            alt="ExpenseTracker"
            className="w-10 h-10 rounded-xl shrink-0"
            style={{ boxShadow: "0 4px 20px rgba(99,102,241,0.4)" }}
          />
          <span
            className="text-sm font-bold text-white"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            ExpenseTracker
          </span>
        </div>

        <div className="flex-1 flex justify-center px-6 sm:px-10 pt-12 pb-6 overflow-y-auto no-scrollbar">
          <div key={animKey} className="w-full max-w-[400px] auth-form-enter">
            {children}
          </div>
        </div>

        <div className="shrink-0 px-8 pb-4 text-center">
          <p
            className="text-[11px] text-[#3f3f46]"
            style={{ fontFamily: "'DM Sans', sans-serif" }}
          >
            © 2025 ExpenseTracker · Built for better financial habits
          </p>
        </div>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(20px, -30px) scale(1.05); }
          66% { transform: translate(-15px, 20px) scale(0.95); }
        }
        @keyframes float-medium {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(-25px, -20px) scale(1.08); }
        }
        @keyframes float-fast {
          0%, 100% { transform: translate(-50%, -50%) scale(1); }
          50% { transform: translate(-50%, calc(-50% - 15px)) scale(1.12); }
        }
        @keyframes drift {
          0%, 100% { transform: translateY(0px) translateX(0px); }
          25% { transform: translateY(-12px) translateX(5px); }
          75% { transform: translateY(8px) translateX(-5px); }
        }
        @keyframes auth-enter {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slide-in-left {
          from { opacity: 0; transform: translateX(-24px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes fade-in-up {
          from { opacity: 0; transform: translateY(16px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0.4); }
          70% { transform: scale(1); box-shadow: 0 0 0 10px rgba(99,102,241,0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(99,102,241,0); }
        }
        @keyframes shimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes bar-grow {
          from { transform: scaleX(0); }
          to { transform: scaleX(1); }
        }

        .animate-float-slow { animation: float-slow 14s ease-in-out infinite; }
        .animate-float-medium { animation: float-medium 10s ease-in-out infinite; }
        .animate-float-fast { animation: float-fast 8s ease-in-out infinite; }
        .animate-drift { animation: drift linear infinite; }

        .auth-form-enter {
          animation: auth-enter 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        .stagger-1 { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.05s both; }
        .stagger-2 { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
        .stagger-3 { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.15s both; }
        .stagger-4 { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both; }
        .stagger-5 { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.25s both; }
        .stagger-6 { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both; }
        .stagger-7 { animation: fade-in-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) 0.35s both; }

        .left-stagger-1 { animation: slide-in-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.1s both; }
        .left-stagger-2 { animation: slide-in-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.2s both; }
        .left-stagger-3 { animation: slide-in-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.3s both; }
        .left-stagger-4 { animation: slide-in-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.4s both; }
        .left-stagger-5 { animation: slide-in-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both; }
        .left-stagger-6 { animation: slide-in-left 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.6s both; }

        .auth-input:focus {
          outline: none;
          border-color: rgba(99,102,241,0.6);
          box-shadow: 0 0 0 3px rgba(99,102,241,0.12), 0 1px 3px rgba(0,0,0,0.3);
        }
        .auth-input:hover:not(:focus) {
          border-color: rgba(255,255,255,0.15);
        }
        .auth-input.error {
          border-color: rgba(248,113,113,0.6);
          box-shadow: 0 0 0 3px rgba(248,113,113,0.1);
        }

        .btn-primary {
          position: relative;
          overflow: hidden;
          transition: all 0.2s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .btn-primary:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: 0 8px 24px rgba(99,102,241,0.4);
        }
        .btn-primary:active:not(:disabled) {
          transform: translateY(0);
        }
        .btn-primary::after {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.12), transparent);
          opacity: 0;
          transition: opacity 0.2s;
        }
        .btn-primary:hover::after { opacity: 1; }

        .stat-card {
          transition: transform 0.2s ease, border-color 0.2s ease;
        }
        .stat-card:hover {
          transform: translateY(-2px);
          border-color: rgba(99,102,241,0.3);
        }

        .feature-card {
          transition: all 0.25s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .feature-card:hover {
          background: rgba(255,255,255,0.05);
          border-color: rgba(99,102,241,0.25);
          transform: translateX(4px);
        }

        .password-strength-bar {
          transform-origin: left;
          animation: bar-grow 0.4s cubic-bezier(0.22, 1, 0.36, 1) both;
        }

        @keyframes error-slide-in {
          from { opacity: 0; transform: translateY(-6px); max-height: 0; }
          to   { opacity: 1; transform: translateY(0);    max-height: 80px; }
        }
        .auth-error-banner {
          animation: error-slide-in 0.25s ease both;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

export default AuthLayout;
