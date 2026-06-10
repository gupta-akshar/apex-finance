const DeleteConfirm = ({
  title = "Delete item?",
  description,
  name,
  onConfirm,
  onCancel,
}) => (
  <div
    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
    style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
  >
    <div
      className="w-full max-w-sm rounded-2xl border border-[#27272a] p-6"
      style={{
        background: "#18181b",
        boxShadow: "0 24px 64px rgba(0,0,0,0.7)",
      }}
    >
      <p
        className="text-sm font-semibold text-[#e4e4e7] mb-1"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {title}
      </p>
      <p
        className="text-xs text-[#71717a] mb-5 leading-relaxed"
        style={{ fontFamily: "'Sora', sans-serif" }}
      >
        {description ?? (
          <>
            <span className="text-[#a1a1aa] font-medium">{name}</span> will be
            permanently deleted and cannot be recovered.
          </>
        )}
      </p>
      <div className="flex gap-2">
        <button
          onClick={onCancel}
          className="flex-1 py-2 rounded-lg border border-[#27272a] text-sm
                     text-[#a1a1aa] hover:border-[#3f3f46] hover:text-[#e4e4e7] transition-all"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="flex-1 py-2 rounded-lg border border-[#f87171]/30
                     bg-[#f87171]/10 text-sm text-[#f87171]
                     hover:bg-[#f87171]/20 transition-all"
          style={{ fontFamily: "'Sora', sans-serif" }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

export default DeleteConfirm;
