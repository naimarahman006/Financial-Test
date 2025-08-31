import { BookOpen, Calculator, CreditCard, FileText, Home, Plus, Receipt, Settings, User } from "lucide-react"
import { Link, useLocation } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"

const Navigation = () => {
  const location = useLocation()
  const { isDark } = useTheme()

  const tabs = [
    { path: "/dashboard", label: "Dashboard", icon: Home },
    { path: "/receipts", label: "Receipts", icon: Receipt },
    { path: "/payments", label: "Payments", icon: CreditCard },
    { path: "/journal-entries", label: "Journal Entries", icon: Plus },
    { path: "/ledger", label: "Ledger", icon: BookOpen },
    { path: "/reports", label: "Reports", icon: FileText },
    { path: "/settings", label: "Settings", icon: Settings },
    { path: "/profile", label: "Profile", icon: User },
  ]

  return (
    <nav className={`shadow-lg border-b ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <div className="flex-shrink-0 flex items-center">
              <Calculator className="h-8 w-8 text-blue-600 mr-2" />
              <a href="/">
                <h1 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>FinanceFlow</h1>
              </a>
            </div>
          </div>

          <div className="flex space-x-2">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = location.pathname === tab.path
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-blue-100 text-blue-700"
                      : isDark
                        ? "text-gray-300 hover:text-white hover:bg-gray-700"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className="h-4 w-4 mr-2" />
                  {tab.label}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </nav>
  )
}

export default Navigation;
