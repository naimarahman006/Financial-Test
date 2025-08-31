import { BookOpen, Calendar, ChevronDown, ChevronRight, Filter, Search } from "lucide-react"
import { useEffect, useState } from "react"
import { formatCurrency, getFiscalStartDate, sortTransactionsByDate } from "../utils/accounting"

const Ledger = ({ ledgers }) => {
  const [selectedAccount, setSelectedAccount] = useState(null)
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [searchTerm, setSearchTerm] = useState("")
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [expandedCategory, setExpandedCategory] = useState(null)

  useEffect(() => {
    setSelectedAccount(null)
  }, [searchTerm, categoryFilter, startDate, endDate])

  const categories = ["All", "Assets", "Expenses", "Revenues", "Liabilities", "Capital"]
  const categoryOrder = ["Assets", "Expenses", "Revenues", "Liabilities", "Capital"]

  const filteredLedgers = ledgers.filter((ledger) => {
    const matchesCategory = categoryFilter === "All" || ledger.category === categoryFilter
    const matchesSearch =
      ledger.accountName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ledger.accountType.toLowerCase().includes(searchTerm.toLowerCase())

    let matchesDateRange = true
    if (startDate || endDate) {
      const hasTransactionsInRange = ledger.transactions.some((transaction) => {
        const transactionDate = new Date(transaction.date)
        const start = startDate ? new Date(startDate) : new Date("1900-01-01")
        const end = endDate ? new Date(endDate) : new Date("2100-12-31")
        return transactionDate >= start && transactionDate <= end
      })
      matchesDateRange = hasTransactionsInRange
    }

    return matchesCategory && matchesSearch && matchesDateRange
  })

  const groupedLedgers = filteredLedgers.reduce((acc, ledger) => {
    const category = ledger.category
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(ledger)
    return acc
  }, {})

  const getCategoryColor = (category) => {
    switch (category) {
      case "Assets":
        return "bg-blue-50 text-blue-700 border-blue-200"
      case "Expenses":
        return "bg-red-50 text-red-700 border-red-200"
      case "Revenues":
        return "bg-green-50 text-green-700 border-green-200"
      case "Liabilities":
        return "bg-orange-50 text-orange-700 border-orange-200"
      case "Capital":
        return "bg-purple-50 text-purple-700 border-purple-200"
      default:
        return "bg-gray-50 text-gray-700 border-gray-200"
    }
  }

  const getFilteredTransactions = (account) => {
    let transactions = account.transactions

    if (startDate || endDate) {
      transactions = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.date)
        const start = startDate ? new Date(startDate) : new Date("1900-01-01")
        const end = endDate ? new Date(endDate) : new Date("2100-12-31")
        return transactionDate >= start && transactionDate <= end
      })
    }

    return sortTransactionsByDate(transactions)
  }

  const handleAccountSelect = (account) => {
    setSelectedAccount(null)
    setTimeout(() => {
      setSelectedAccount(account)
    }, 0)
  }

  const toggleCategory = (category) => {
    setExpandedCategory(expandedCategory === category ? null : category)
    setSelectedAccount(null)
  }

  const getBalanceColor = (balance) => {
    return balance < 0 ? "text-red-600" : "text-gray-900"
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Ledger Accounts</h2>

        {/* Filters */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          {/* Left Side: Search, Category, Clear */}
          <div className="flex flex-wrap items-center gap-4">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 " />
              <input
                type="text"
                placeholder="Search accounts..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-80 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
              />
            </div>

            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-gray-400" />
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-30"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>

            {/* Clear Filters Button */}
            {(searchTerm || startDate || endDate || categoryFilter !== "All") && (
              <button
                onClick={() => {
                  setSearchTerm("")
                  setStartDate("")
                  setEndDate("")
                  setCategoryFilter("All")
                }}
                className=" px-6 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm ml-14"
              >
                Clear
              </button>
            )}
          </div>

          {/* Right Side: Date Range */}
          <div className="flex items-center gap-2 ml-auto">
            {/* Start Date */}
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-gray-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-52"
              />
            </div>

            {/* End Date */}
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm w-52"
              />
            </div>
          </div>
        </div>

        {/* Ledger List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Account List */}
          <div className="space-y-4">
            {categoryOrder
              .filter((category) => groupedLedgers[category])
              .map((category) => {
                const accounts = groupedLedgers[category]
                const isExpanded = expandedCategory === category
                return (
                  <div key={category} className="space-y-2">
                    <h3
                      className={`flex items-center justify-between text-lg font-semibold px-3 py-2 rounded-lg border cursor-pointer ${getCategoryColor(category)}`}
                      onClick={() => toggleCategory(category)}
                    >
                      <span>{category}</span>
                      {isExpanded ? <ChevronDown size={20} /> : <ChevronRight size={20} />}
                    </h3>
                    {isExpanded && (
                      <div className="space-y-2">
                        {accounts.map((ledger) => (
                          <div
                            key={`${ledger.accountName}-${ledger.accountType}`}
                            className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                              selectedAccount === ledger
                                ? "border-blue-500 bg-blue-50"
                                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                            }`}
                            onClick={() => handleAccountSelect(ledger)}
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="font-medium text-gray-900">{ledger.accountName}</p>
                                <p className="text-sm text-gray-600">{ledger.accountType}</p>
                              </div>
                              <div className="text-right">
                                <p className={`font-semibold ${getBalanceColor(ledger.balance)}`}>
                                  {formatCurrency(Math.abs(ledger.balance))}
                                </p>
                                <p className="text-sm text-gray-500">
                                  {ledger.transactions.length} transaction{ledger.transactions.length !== 1 ? "s" : ""}
                                </p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
          </div>

          {/* Account Details */}
          <div className="bg-gray-50 rounded-lg p-6">
            {selectedAccount ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-gray-900">{selectedAccount.accountName}</h3>
                    <p className="text-gray-600">{selectedAccount.accountType}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500">Current Balance</p>
                    <p className={`text-2xl font-bold ${getBalanceColor(selectedAccount.balance)}`}>
                      {formatCurrency(Math.abs(selectedAccount.balance))}
                    </p>
                  </div>
                </div>

                <div className="mt-6">
                  <h4 className="font-medium text-gray-900 mb-3">Transaction History</h4>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {(() => {
                      const filteredTransactions = getFilteredTransactions(selectedAccount)

                      if (filteredTransactions.length === 0) {
                        return (
                          <p className="text-gray-500 text-center py-4">
                            {startDate || endDate ? "No transactions in selected date range" : "No transactions yet"}
                          </p>
                        )
                      }

                      // Check if synthetic OB should be prepended - only if no OB journal entry exists
                      const hasOBTransaction = filteredTransactions.some((t) => {
                        const desc = (t.description || "").toString().toLowerCase()
                        return (
                          desc.includes("opening balance") ||
                          (t.openingBalance !== undefined && Number(t.openingBalance) !== 0)
                        )
                      })

                      let transactionsToShow = [...filteredTransactions]

                      // Do not prepend synthetic OB if an OB journal entry is already in ledger.transactions
                      if (!hasOBTransaction && Number(selectedAccount.openingBalance || 0) !== 0) {
                        const fiscalYear = new Date().getFullYear()
                        const isDebitNormal = ["Assets", "Expenses"].includes(selectedAccount.category)
                        const obAmount = Number(selectedAccount.openingBalance)

                        let debitAmount = 0
                        let creditAmount = 0

                        // Apply category-based sign logic for OB placement
                        if (isDebitNormal) {
                          // Assets & Expenses: positive OB → Debit; negative OB → Credit
                          if (obAmount > 0) {
                            debitAmount = obAmount
                          } else {
                            creditAmount = Math.abs(obAmount)
                          }
                        } else {
                          // Liabilities, Capital, Revenues: positive OB → Credit; negative OB → Debit
                          if (obAmount > 0) {
                            creditAmount = obAmount
                          } else {
                            debitAmount = Math.abs(obAmount)
                          }
                        }

                        const syntheticOB = {
                          id: `ob-${selectedAccount.accountName}-${fiscalYear}`, // ID must include account name and fiscal year
                          date: getFiscalStartDate(fiscalYear),
                          description: "Opening Balance from ledger",
                          debit: debitAmount,
                          credit: creditAmount,
                          balance: selectedAccount.openingBalance,
                        }
                        transactionsToShow = [syntheticOB, ...transactionsToShow]
                      }

                      return transactionsToShow.map((transaction) => (
                        <div key={transaction.id} className="bg-white p-3 rounded border">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-gray-900">{transaction.description}</p>
                              <p className="text-sm text-gray-500">
                                {new Date(transaction.date).toLocaleDateString("en-BD")}
                              </p>
                            </div>
                            <div className="text-right">
                              <div className="flex gap-4">
                                {transaction.debit > 0 && (
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">Debit</p>
                                    <p className="font-medium text-gray-900">{formatCurrency(transaction.debit)}</p>
                                  </div>
                                )}
                                {transaction.credit > 0 && (
                                  <div className="text-right">
                                    <p className="text-sm text-gray-500">Credit</p>
                                    <p className="font-medium text-gray-900">{formatCurrency(transaction.credit)}</p>
                                  </div>
                                )}
                              </div>
                              <p className={`text-sm mt-1 ${getBalanceColor(transaction.balance)}`}>
                                Balance: {formatCurrency(Math.abs(transaction.balance))}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Select an account to view its ledger details</p>
                {(startDate || endDate) && (
                  <p className="text-sm text-gray-400 mt-2">
                    {startDate && endDate
                      ? `Filtering: ${new Date(startDate).toLocaleDateString("en-BD")} to ${new Date(endDate).toLocaleDateString("en-BD")}`
                      : startDate
                        ? `From: ${new Date(startDate).toLocaleDateString("en-BD")}`
                        : `Until: ${new Date(endDate).toLocaleDateString("en-BD")}`}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default Ledger;
