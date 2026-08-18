import React from "react";

const DividerWithText = ({ text = "or continue with" }) => (
  <div className="flex items-center gap-3 my-5">
    <div
      className="flex-1 h-px"
      style={{ background: "rgba(255,255,255,0.07)" }}
    />
    <span
      className="text-[11px] font-medium uppercase tracking-[0.1em]"
      style={{ color: "#3f3f46", fontFamily: "'DM Sans', sans-serif" }}
    >
      {text}
    </span>
    <div
      className="flex-1 h-px"
      style={{ background: "rgba(255,255,255,0.07)" }}
    />
  </div>
);

export default DividerWithText;
