import { AlertCircle, Clock, DollarSign, PieChart, TrendingDown, TrendingUp } from "lucide-react"
import { Link } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"
import { formatCurrency } from "../utils/accounting"

const Dashboard = ({ financialSummary, recentEntries }) => {
  const { isDark } = useTheme()
  const { totalRevenue, totalExpenses, netProfit, totalAssets, totalLiabilities, totalCapital } = financialSummary

  const metrics = [
    {
      title: "Total Revenue",
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-50",
      iconColor: "text-green-600",
    },
    {
      title: "Total Expenses",
      value: formatCurrency(totalExpenses),
      icon: TrendingDown,
      color: "text-red-600",
      bgColor: "bg-red-50",
      iconColor: "text-red-600",
    },
    {
      title: "Net Profit",
      value: formatCurrency(netProfit),
      icon: DollarSign,
      color: netProfit >= 0 ? "text-green-600" : "text-red-600",
      bgColor: netProfit >= 0 ? "bg-green-50" : "bg-red-50",
      iconColor: netProfit >= 0 ? "text-green-600" : "text-red-600",
    },
    {
      title: "Total Assets",
      value: formatCurrency(totalAssets),
      icon: PieChart,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      iconColor: "text-blue-600",
    },
  ]

  const balanceSheetMetrics = [
    {
      title: "Total Assets",
      value: formatCurrency(totalAssets),
      percentage: "100%",
    },
    {
      title: "Total Liabilities",
      value: formatCurrency(totalLiabilities),
      percentage: totalAssets > 0 ? `${((totalLiabilities / totalAssets) * 100).toFixed(1)}%` : "0%",
    },
    {
      title: "Total Capital",
      value: formatCurrency(totalCapital),
      percentage: totalAssets > 0 ? `${((totalCapital / totalAssets) * 100).toFixed(1)}%` : "0%",
    },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-2">Financial Dashboard</h2>
        <p className="text-blue-100">Overview of your business financial health</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {metrics.map((metric) => {
          const Icon = metric.icon
          return (
            <div
              key={metric.title}
              className={`p-6 rounded-lg shadow-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className={`text-sm font-medium ${isDark ? "text-gray-300" : "text-gray-600"}`}>{metric.title}</p>
                  <p className={`text-2xl font-bold ${metric.color}`}>{metric.value}</p>
                </div>
                <div className={`p-3 rounded-full ${metric.bgColor}`}>
                  <Icon className={`h-6 w-6 ${metric.iconColor}`} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Balance Sheet Overview */}
      <div
        className={`p-6 rounded-lg shadow-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
          Balance Sheet Overview
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {balanceSheetMetrics.map((metric) => (
            <div key={metric.title} className={`p-4 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>{metric.title}</p>
              <p className={`text-xl font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>{metric.value}</p>
              <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                {metric.percentage} of total assets
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Transactions */}
      <div
        className={`p-6 rounded-lg shadow-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${isDark ? "text-white" : "text-gray-900"}`}>Recent Transactions</h3>
          <Clock className={`h-5 w-5 ${isDark ? "text-gray-400" : "text-gray-400"}`} />
        </div>

        {recentEntries.length === 0 ? (
          <div className="text-center py-8">
            <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
            <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
              No journal entries yet. Create your first entry to get started!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {recentEntries.slice(0, 5).map((entry) => (
              <div
                key={entry.id}
                className={`flex items-center justify-between p-3 rounded-lg ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
              >
                <div>
                  <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>{entry.description}</p>
                  <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                    {new Date(entry.date).toLocaleDateString("en-BD")}
                  </p>
                </div>
                <div className="text-right">
                  <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                    {entry.transactions.length} transaction{entry.transactions.length > 1 ? "s" : ""}
                  </p>
                  <p className={`text-sm font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                    {formatCurrency(entry.transactions.reduce((sum, t) => sum + t.debit, 0))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div
        className={`p-6 rounded-lg shadow-md border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <h3 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            to="/journal-entries/new"
            className="p-4 text-left bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors block"
          >
            <TrendingUp className="h-6 w-6 text-blue-600 mb-2" />
            <p className="font-medium text-gray-900">Add Journal Entry</p>
            <p className="text-sm text-gray-600">Record new transactions</p>
          </Link>
          <Link
            to="/reports"
            className="p-4 text-left bg-green-50 hover:bg-green-100 rounded-lg transition-colors block"
          >
            <PieChart className="h-6 w-6 text-green-600 mb-2" />
            <p className="font-medium text-gray-900">View Reports</p>
            <p className="text-sm text-gray-600">Generate financial reports</p>
          </Link>
          <Link
            to="/reports"
            className="p-4 text-left bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors block"
          >
            <DollarSign className="h-6 w-6 text-purple-600 mb-2" />
            <p className="font-medium text-gray-900">Check Trial Balance</p>
            <p className="text-sm text-gray-600">Verify account balances</p>
          </Link>
        </div>
      </div>
    </div>
  )
}

export default Dashboard;
