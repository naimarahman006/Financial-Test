import { AlertCircle, Calculator, CheckCircle, ChevronDown, ChevronRight } from "lucide-react"
import React, { useEffect, useMemo, useState } from "react"
import { formatCurrency } from "../utils/accounting"

const TrialBalance = ({
  trialBalance,
  ledgers,
  startDate,
  endDate,
  onStartDateChange,
  onEndDateChange,
  onClearDates,
  onFilterChange, 
}) => {
  const [expandedKey, setExpandedKey] = useState(null)


  const toLocalDateOnly = (input) => {
    if (input instanceof Date) return new Date(input.getFullYear(), input.getMonth(), input.getDate())
    if (typeof input === "string") {
      const m = input.match(/^(\d{4})-(\d{2})-(\d{2})/)
      if (m) return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]))
      const d = new Date(input)
      if (!isNaN(d)) return new Date(d.getFullYear(), d.getMonth(), d.getDate())
      return null
    }
    return null
  }

  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999)

  // Precompute bounds (inclusive) once per change
  const { startBound, endBound } = useMemo(() => {
    const start = startDate ? toLocalDateOnly(startDate) : new Date(1900, 0, 1)
    const end = endDate ? endOfDay(toLocalDateOnly(endDate)) : new Date(2100, 11, 31, 23, 59, 59, 999)
    return { startBound: start, endBound: end }
  }, [startDate, endDate])

  // Inclusive range check using local date-only objects
  const isInDateRange = (dateStr) => {
    const date = toLocalDateOnly(dateStr)
    if (!date) return false
    return date >= startBound && date <= endBound
  }

  const categoryOrder = ["Assets", "Expenses", "Revenues", "Liabilities", "Capital"]

  const viewMode = useMemo(() => (startDate || endDate ? "period" : "asof"), [startDate, endDate])


  const { filteredTrialBalance, totalDebits, totalCredits, isBalanced } = useMemo(() => {
    const filteredEntries = []
    let totalDebitsAcc = 0
    let totalCreditsAcc = 0

    for (const originalEntry of trialBalance) {
      const accountLedger = ledgers.find((l) => l.accountName === originalEntry.accountName)
      if (!accountLedger) continue

      const isDebitNormal = ["Assets", "Expenses"].includes(originalEntry.category)

      // 1) Starting balance at period start
      let startingBalance = Number(accountLedger.openingBalance || 0)

      if (startDate) {
        for (const txn of accountLedger.transactions || []) {
          const txnDate = toLocalDateOnly(txn.date)
          if (txnDate && txnDate < startBound) {
            const debit = Number(txn.debit || 0)
            const credit = Number(txn.credit || 0)
            startingBalance += isDebitNormal ? debit - credit : credit - debit
          }
        }
      }

      // 2) Period movement within bounds
      const filteredTransactions = (accountLedger.transactions || []).filter((txn) => isInDateRange(txn.date))
      const periodDebit = filteredTransactions.reduce((s, t) => s + Number(t.debit || 0), 0)
      const periodCredit = filteredTransactions.reduce((s, t) => s + Number(t.credit || 0), 0)

      // 3) Final net (closing) balance as of end date
      const periodNet = periodDebit - periodCredit
      const finalNetBalance = startingBalance + (isDebitNormal ? periodNet : -periodNet)

      // 4) Row display:
      let rowNet
      if (viewMode === "period") {
        rowNet = isDebitNormal ? (periodDebit - periodCredit) : (periodCredit - periodDebit)
      } else {
        rowNet = finalNetBalance
      }

      // Place rowNet into debit/credit columns
      let displayDebit = 0
      let displayCredit = 0
      if (rowNet >= 0) {
        if (isDebitNormal) displayDebit = rowNet
        else displayCredit = rowNet
      } else {
        if (isDebitNormal) displayCredit = Math.abs(rowNet)
        else displayDebit = Math.abs(rowNet)
      }

      if (displayDebit > 0 || displayCredit > 0) {
        filteredEntries.push({
          ...originalEntry,
          debit: displayDebit,
          credit: displayCredit,
          category: originalEntry.category,
          _startingBalance: startingBalance,
          _filteredTransactions: filteredTransactions,
        })
        totalDebitsAcc += displayDebit
        totalCreditsAcc += displayCredit
      }
    }

    return {
      filteredTrialBalance: filteredEntries,
      totalDebits: totalDebitsAcc,
      totalCredits: totalCreditsAcc,
      isBalanced: Math.abs(totalDebitsAcc - totalCreditsAcc) < 0.01,
    }
  }, [trialBalance, ledgers, startBound, endBound, startDate, viewMode])

  const toggleExpand = (key) => setExpandedKey((prev) => (prev === key ? null : key))

  // Group by category (memoized)
  const groupedEntries = useMemo(() => {
    return filteredTrialBalance.reduce((acc, entry) => {
      const cat = entry.category
      if (!acc[cat]) acc[cat] = []
      acc[cat].push(entry)
      return acc
    }, {})
  }, [filteredTrialBalance])

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

  const getBalanceCellColor = (entry, type) => {
    const isDebitNormal = ["Assets", "Expenses"].includes(entry.category)
    if (type === "debit" && !isDebitNormal && entry.debit > entry.credit) return "text-red-600"
    if (type === "credit" && isDebitNormal && entry.credit > entry.debit) return "text-red-600"
    return "text-gray-900"
  }

  const formatLocalDate = (dStr) => {
    const d = toLocalDateOnly(dStr)
    return d ? d.toLocaleDateString("en-BD") : ""
  }

  // Reset expansion & optionally notify parent whenever filters change
  const filterKey = useMemo(() => `${startDate ?? ""}|${endDate ?? ""}`, [startDate, endDate])
  useEffect(() => {
    setExpandedKey(null)
    onFilterChange?.({ startDate, endDate, startBound, endBound })
  }, [filterKey]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Force a remount of the card when filters change so the table fully refreshes */}
      <div key={filterKey} className="bg-white p-9 rounded-lg shadow-md border border-gray-200">
        {/* Date Filter Row - Centered */}
        <div className="flex justify-center items-center gap-4 mb-4">
          <input
            type="date"
            value={startDate || ""}
            onChange={(e) => onStartDateChange?.(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md text-sm"
            placeholder="From"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={endDate || ""}
            onChange={(e) => onEndDateChange?.(e.target.value)}
            className="border border-gray-300 px-3 py-2 rounded-md text-sm"
            placeholder="To"
          />
          {(startDate || endDate) && (
            <button
              onClick={() => onClearDates?.()}
              className="text-sm text-red-700 border border-red-500 px-3 py-2 rounded hover:bg-red-50 transition"
            >
              Clear Filter
            </button>
          )}
        </div>

        {/* Title Row - Centered */}
        <div className="text-center mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Trial Balance</h2>
        </div>

        {/* Summary line: auto view mode */}
        <div className="text-center mb-6">
          <p className="text-gray-600">
            {viewMode === "period" && (startDate || endDate)
              ? `For the period ${startDate ? formatLocalDate(startDate) : "…"} to ${endDate ? formatLocalDate(endDate) : "…"}`
              : `As of ${formatLocalDate(endDate || startDate || new Date())}`}
          </p>
        </div>

        {/* Balanced Status - Right aligned */}
        <div className="flex justify-end mb-6">
          <div
            className={`flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium ${
              isBalanced ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            }`}
          >
            {isBalanced ? (
              <>
                <CheckCircle className="h-4 w-4" />
                Balanced
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4" />
                Unbalanced
              </>
            )}
          </div>
        </div>

        {filteredTrialBalance.length === 0 ? (
          <div className="text-center py-12">
            <Calculator className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No accounts have transactions in the selected date range.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {categoryOrder.map((category) => {
              const entries = groupedEntries[category]
              if (!entries || entries.length === 0) return null

              return (
                <div key={category} className="space-y-3">
                  <h3 className={`text-lg font-semibold px-3 py-2 rounded-lg border ${getCategoryColor(category)}`}>
                    {category}
                  </h3>

                  <div className="bg-gray-50 rounded-lg overflow-x-auto">
                    <table className="w-full table-fixed">
                      <thead className="bg-gray-100">
                        <tr>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Account Name</th>
                          <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Account Type</th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Debit</th>
                          <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Credit</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {entries.map((entry) => {
                          const uniqueKey = `${category}::${entry.accountName}`
                          return (
                            <React.Fragment key={uniqueKey}>
                              <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => toggleExpand(uniqueKey)}>
                                <td className="px-6 py-3 font-medium text-gray-900 flex items-center gap-2">
                                  {expandedKey === uniqueKey ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                  {entry.accountName}
                                </td>
                                <td className="px-6 py-3 text-gray-600">{entry.accountType}</td>
                                <td className={`px-6 py-3 text-right font-medium ${getBalanceCellColor(entry, "debit")}`}>
                                  {entry.debit > 0 ? formatCurrency(entry.debit) : "—"}
                                </td>
                                <td className={`px-6 py-3 text-right font-medium ${getBalanceCellColor(entry, "credit")}`}>
                                  {entry.credit > 0 ? formatCurrency(entry.credit) : "—"}
                                </td>
                              </tr>

                              {expandedKey === uniqueKey && (
                                <tr className="bg-gray-100">
                                  <td colSpan={4} className="px-6 py-4">
                                    <h4 className="font-medium text-gray-900 mb-2">Transaction History</h4>
                                    <div className="space-y-2">
                                      {(() => {
                                        const ledger = ledgers.find((l) => l.accountName === entry.accountName)
                                        if (!ledger) return <p className="text-sm text-gray-500">No ledger data</p>

                                        const transactionsInRange = (ledger.transactions || []).filter((txn) =>
                                          isInDateRange(txn.date)
                                        )

                                        if (transactionsInRange.length === 0) {
                                          return <p className="text-sm text-gray-500">No transactions in selected date range</p>
                                        }

                                        return transactionsInRange.map((transaction) => (
                                          <div key={transaction.id} className="bg-white p-3 rounded border border-gray-200">
                                            <div className="flex items-center justify-between text-sm">
                                              <div>
                                                <p className="font-medium text-gray-900">{transaction.description}</p>
                                                <p className="text-xs text-gray-500">
                                                  {formatLocalDate(transaction.date)}
                                                </p>
                                              </div>
                                              <div className="text-right">
                                                <p className="font-semibold text-gray-900">
                                                  {Number(transaction.debit || 0) > 0
                                                    ? formatCurrency(Number(transaction.debit || 0))
                                                    : Number(transaction.credit || 0) > 0
                                                    ? formatCurrency(Number(transaction.credit || 0))
                                                    : formatCurrency(0)}
                                                </p>
                                                <p className="text-xs text-gray-500">
                                                  {Number(transaction.debit || 0) > 0
                                                    ? "Debit"
                                                    : Number(transaction.credit || 0) > 0
                                                    ? "Credit"
                                                    : ""}
                                                </p>
                                                <p className="text-xs mt-1 text-gray-500">
                                                  Balance: {formatCurrency(Number(transaction.balance || 0))}
                                                </p>
                                              </div>
                                            </div>
                                          </div>
                                        ))
                                      })()}
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )
            })}

            <div className="bg-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-semibold text-gray-900">Total</span>
                <div className="flex gap-16">
                  <div className="text-right mr-32">
                    <p className="text-sm text-gray-600">Total Debits</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(totalDebits)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Total Credits</p>
                    <p className="text-xl font-bold text-gray-900">{formatCurrency(totalCredits)}</p>
                  </div>
                </div>
              </div>

              {!isBalanced && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center">
                    <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                    <p className="text-red-700 font-medium">
                      Trial balance is unbalanced. Difference: {formatCurrency(Math.abs(totalDebits - totalCredits))}
                    </p>
                  </div>
                  <p className="text-sm text-red-600 mt-1">
                    Please review your journal entries to ensure all debits equal credits.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default TrialBalance;
