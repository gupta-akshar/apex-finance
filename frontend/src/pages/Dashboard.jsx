function Dashboard() {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-4">Dashboard</h2>
      <div className="grid grid-cols-4 gap-6">
        <div className="bg-white p-4 rounded-xl shadow">
          <p>Total Balance</p>
          <h3 className="text-xl font-bold">₹0</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p>Total Income</p>
          <h3 className="text-xl font-bold text-green-600">₹0</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p>Total Expense</p>
          <h3 className="text-xl font-bold text-red-600">₹0</h3>
        </div>
        <div className="bg-white p-4 rounded-xl shadow">
          <p>Savings</p>
          <h3 className="text-xl font-bold text-blue-600">₹0</h3>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;
