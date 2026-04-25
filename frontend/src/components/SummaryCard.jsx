const SummaryCard = ({ title, value, color }) => {
  return (
    <div className="bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition hover:scale-105">
      <p className="text-secondaryText mb-2">{title}</p>
      <h2 className={`text-2xl font-semibold ${color}`}>₹{value}</h2>
    </div>
  );
};

export default SummaryCard;