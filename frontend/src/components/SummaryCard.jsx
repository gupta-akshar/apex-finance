const SummaryCard = ({ title, value, color }) => (
  <div className="bg-card border border-border rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow duration-300 hover:scale-105 cursor-pointer">
    <p className="text-secondaryText mb-2">{title}</p>
    <h2 className={`text-2xl font-semibold ${color}`}>₹{value}</h2>
  </div>
);

export default SummaryCard;
