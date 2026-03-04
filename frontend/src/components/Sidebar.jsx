import { Link, useLocation } from "react-router-dom";

function Sidebar() {
  const location = useLocation();

  const linkStyle = (path) =>
    `block px-4 py-2 rounded-lg ${
      location.pathname === path
        ? "bg-blue-600 text-white"
        : "text-gray-700 hover:bg-gray-200"
    }`;

  return (
    <div className="w-64 bg-white shadow-md p-4">
      <h1 className="text-xl font-bold mb-6">FinanceTracker</h1>

      <nav className="space-y-2">
        <Link to="/" className={linkStyle("/")}>
          Dashboard
        </Link>
        <Link to="/add" className={linkStyle("/add")}>
          Add Transaction
        </Link>
        <Link to="/transactions" className={linkStyle("/transactions")}>
          Transactions
        </Link>
        <Link to="/categories" className={linkStyle("/categories")}>
          Categories
        </Link>
        <Link to="/reports" className={linkStyle("/reports")}>
          Reports
        </Link>
      </nav>
    </div>
  );
}

export default Sidebar;
