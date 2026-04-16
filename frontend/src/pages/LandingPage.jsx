import React from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";

const features = [
  {
    title: "Track Expenses",
    description: "Keep track of all your expenses in one place.",
  },
  {
    title: "Visual Analytics",
    description: "See where your money goes with charts and reports.",
  },
  {
    title: "Categories & Tags",
    description: "Organize your transactions easily.",
  },
  {
    title: "Secure Login",
    description: "Your data is safe with encrypted authentication.",
  },
];

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-background text-primaryText min-h-screen">
      {/* Navbar */}
      <Navbar />

      {/* Hero Section */}
      <section className="flex flex-col md:flex-row items-center justify-center px-6 md:px-16 py-20 gap-10">
        <div className="flex-1 text-center md:text-left">
          <h1 className="text-5xl font-bold mb-6">
            Manage Your Finances Easily
          </h1>
          <p className="text-secondaryText mb-8 max-w-lg mx-auto md:mx-0">
            Track income, expenses, and visualize your money with smart
            analytics. Stay in control of your finances effortlessly.
          </p>
          <div className="flex justify-center md:justify-start gap-4">
            <button
              onClick={() => navigate("/register")}
              className="bg-accent hover:bg-accentHover px-6 py-3 rounded-lg text-white text-lg transition transform hover:scale-105"
            >
              Get Started
            </button>
            <button
              onClick={() => navigate("/login")}
              className="border border-border px-6 py-3 rounded-lg text-primaryText hover:bg-card text-lg transition transform hover:scale-105"
            >
              Login
            </button>
          </div>
        </div>

        {/* Optional visual block */}
        <div className="flex-1 hidden md:flex justify-center">
          <div className="w-64 h-64 bg-accent/10 rounded-2xl border border-border flex items-center justify-center">
            <p className="text-accent font-bold text-lg">Your Finance Visual</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 md:px-16 py-16 bg-card border-t border-border">
        <h2 className="text-3xl font-bold mb-10 text-center">Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((f, i) => (
            <div
              key={i}
              className="bg-background border border-border rounded-xl p-6 text-center hover:shadow-lg transition-shadow transform hover:scale-105"
            >
              <h3 className="text-xl font-semibold mb-2">{f.title}</h3>
              <p className="text-secondaryText text-sm">{f.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer CTA */}
      <section className="px-6 md:px-16 py-12 text-center">
        <p className="text-secondaryText mb-4">
          Ready to take control of your finances?
        </p>
        <button
          onClick={() => navigate("/register")}
          className="bg-accent hover:bg-accentHover px-6 py-3 rounded-lg text-white text-lg transition transform hover:scale-105"
        >
          Start Tracking Now
        </button>
      </section>
    </div>
  );
};

export default LandingPage;
