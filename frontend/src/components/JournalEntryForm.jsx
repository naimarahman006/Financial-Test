import { AlertCircle, Plus, Save, Trash2 } from "lucide-react"
import { useEffect, useRef, useState } from "react"
import { v4 as uuidv4 } from "uuid"
import { formatCurrency, validateJournalEntry } from "../utils/accounting"

const JournalEntryForm = ({ initialEntry, onSaveEntry, isEditing = false, existingLedgers = [] }) => {
  const [date, setDate] = useState(initialEntry?.date || new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState(initialEntry?.description || "")
  const [transactions, setTransactions] = useState(
    initialEntry?.transactions || [
      { id: uuidv4(), accountName: "", accountType: "Current Asset", debit: 0, credit: 0, type: "debit" },
      { id: uuidv4(), accountName: "", accountType: "Other Expenses", debit: 0, credit: 0, type: "credit" },
    ],
  )
  const [errors, setErrors] = useState([])
  const [accountSuggestions, setAccountSuggestions] = useState({})
  const [showSuggestions, setShowSuggestions] = useState({})
  const [highlightedIndex, setHighlightedIndex] = useState({})

  const suggestionListRefs = useRef({})
  const suggestionItemRefs = useRef({})

  // Refs for navigation
  const inputRefs = useRef({})
  const descriptionRef = useRef(null)
  const saveButtonRef = useRef(null)
  const dateRef = useRef(null)

  // Static account name suggestions
  const staticSuggestions = {
    // Expense Accounts
    "Salary Expense": "Expense",
    "Rent Expense": "Expense",
    "Utilities Expense": "Expense",
    "Insurance Expense": "Expense",
    "Supplies Expense": "Expense",
    "Depreciation Expense": "Expense",
    "Advertising Expense": "Expense",
    "Travel Expense": "Expense",
    Bonus: "Expense",
    Wages: "Expense",
    "Medical Allowance": "Expense",
    Purchase: "Expense",
    "Repairs and Maintenance": "Expense",

    // Revenue Accounts
    Sales: "Revenue",
    "Service Revenue": "Revenue",
    "Interest Income": "Revenue",
    "Commission Income": "Revenue",
    "Rental Income": "Revenue",
    "Consulting Revenue": "Revenue",

    // Current Assets
    Cash: "Current Asset",
    Bank: "Current Asset",
    "Accounts Receivable": "Current Asset",
    "Prepaid Rent": "Current Asset",
    "Prepaid Insurance": "Current Asset",
    Inventory: "Current Asset",
    Supplies: "Current Asset",

    // Fixed Assets
    Furniture: "Fixed Asset",
    Building: "Fixed Asset",
    Equipment: "Fixed Asset",
    Land: "Fixed Asset",
    Vehicles: "Fixed Asset",
    "Computer Equipment": "Fixed Asset",

    //  Equity
    "Owner's Equity": "Capital",
    "Owner's Drawings": "Capital",
    "Retained Earnings": "Capital",
  }

  // Helper function to check if an OB exists for a given account
  const hasOpeningBalanceEntry = (accountName, accountType) => {
    return existingLedgers.some(
      (ledger) =>
        ledger.accountName === accountName &&
        ledger.accountType === accountType &&
        ledger.transactions.some((t) => {
          const desc = (t.description || "").toString().toLowerCase()
          return desc.includes("opening balance") || (t.openingBalance !== undefined && Number(t.openingBalance) !== 0)
        }),
    )
  }

  // Get stored OB for an account, return 0 if none exists
  const getStoredOpeningBalance = (accountName, accountType) => {
    const ledger = existingLedgers.find((l) => l.accountName === accountName && l.accountType === accountType)
    return ledger ? ledger.openingBalance || 0 : 0
  }

  const allSuggestions = () => {
    const existingSuggestion = existingLedgers.reduce((acc, ledger) => {
      acc[ledger.accountName] = ledger.accountType
      return acc
    }, {})

    // Combine static suggestions with existing ledger accounts
    return { ...staticSuggestions, ...existingSuggestion }
  }

  // A unified function to get suggestions from both existing ledgers and the static list
  const getCombinedSuggestions = (input) => {
    if (!input.trim()) return []
    const suggestion = allSuggestions()
    const suggestionNames = Object.keys(suggestion)
    return suggestionNames.filter((account) => account.toLowerCase().includes(input.toLowerCase())).slice(0, 5) // Limit to 5 suggestions
  }

  const baseAccountTypes = ["Fixed Asset", "Current Asset", "Expense", "Revenue", "Capital"]

  const liabilityTypes = {
    "Short-term Liabilities": [
      "Short-term Liability: Accounts Payable",
      "Short-term Liability: Interest Payable",
      "Short-term Liability: Salaries Payable",
      "Short-term Liability: Rent Payable",
      "Short-term Liability: Short-term Loan",
      "Short-term Liability: Taxes Payable",
      "Short-term Liability: Unearned Revenue",
      "Short-term Liability: Notes Payable",
    ],

    "Long-term Liabilities": ["Long-term Liability: Loan"],
  }

  const addTransaction = () => {
    const newTransaction = {
      id: uuidv4(),
      accountName: "",
      accountType: "Current Asset",
      debit: 0,
      credit: 0,
      openingBalance: 0, // Default OB to 0 for new transactions
      type: transactions.length % 2 === 0 ? "debit" : "credit",
    }
    setTransactions([...transactions, newTransaction])
  }

  const removeTransaction = (id) => {
    if (transactions.length > 0) {
      setTransactions(transactions.filter((t) => t.id !== id))
    }
  }

  const updateTransaction = (id, field, value) => {
    const normalizedValue = String(value)
    setTransactions(
      transactions.map((t) => {
        if (t.id === id) {
          let updatedTransaction = { ...t }
          if (field === "accountName") {
            // Update suggestions when account name changes
            const suggestions = getCombinedSuggestions(normalizedValue)
            setAccountSuggestions((prev) => ({ ...prev, [id]: suggestions }))
            setShowSuggestions((prev) => ({
              ...prev,
              [id]: suggestions.length > 0 && normalizedValue.trim().length > 0,
            }))
            setHighlightedIndex((prev) => ({ ...prev, [id]: -1 }))
            updatedTransaction = { ...updatedTransaction, accountName: normalizedValue }

            // Update OB field when account name changes - show stored OB for that account
            if (normalizedValue.trim() && updatedTransaction.accountType) {
              const storedOB = getStoredOpeningBalance(normalizedValue.trim(), updatedTransaction.accountType)
              updatedTransaction = { ...updatedTransaction, openingBalance: storedOB }
            }
          } else if (field === "accountType") {
            updatedTransaction = { ...updatedTransaction, accountType: value }

            // Update OB field when account type changes - show stored OB for that account
            if (updatedTransaction.accountName.trim()) {
              const storedOB = getStoredOpeningBalance(updatedTransaction.accountName.trim(), value)
              updatedTransaction = { ...updatedTransaction, openingBalance: storedOB }
            }
          } else if (field === "amount") {
            const amount = Number(value)
            if (updatedTransaction.type === "debit") {
              updatedTransaction = { ...updatedTransaction, debit: amount, credit: 0 }
            } else {
              updatedTransaction = { ...updatedTransaction, debit: 0, credit: amount }
            }
          } else if (field === "type") {
            if (value === "debit") {
              updatedTransaction = { ...updatedTransaction, type: "debit", credit: 0 }
            } else {
              updatedTransaction = { ...updatedTransaction, type: "credit", debit: 0 }
            }
          } else if (field === "openingBalance") {
            updatedTransaction = { ...updatedTransaction, openingBalance: Number(value) }
          } else {
            updatedTransaction = { ...updatedTransaction, [field]: value }
          }
          return updatedTransaction
        }
        return t
      }),
    )
  }

  const selectSuggestion = (transactionId, accountName) => {
    const suggestion = allSuggestions()
    if (accountName in suggestion) {
      const accountType = suggestion[accountName]
      const storedOB = getStoredOpeningBalance(accountName, accountType) // Get stored OB for selected account
      setTransactions(
        transactions.map((t) => {
          if (t.id === transactionId) {
            return { ...t, accountName, accountType, openingBalance: storedOB } // Set stored OB
          }
          return t
        }),
      )
    }
    setShowSuggestions((prev) => ({ ...prev, [transactionId]: false }))
    setHighlightedIndex((prev) => ({ ...prev, [transactionId]: -1 }))
  }

  // --- New Keyboard Navigation Logic ---
  const handleKeyDown = (e, transactionId, field, index) => {
    const suggestions = accountSuggestions[transactionId] || []
    const currentIndex = highlightedIndex[transactionId] !== undefined ? highlightedIndex[transactionId] : -1
    const isLastTransaction = index === transactions.length - 1

    // Handle Enter key for navigation
    if (e.key === "Enter") {
      e.preventDefault()
      if (field === "accountName") {
        if (currentIndex !== -1) {
          selectSuggestion(transactionId, suggestions[currentIndex])
          // After selecting, move to the amount field
          inputRefs.current[`${transactionId}-amount`]?.focus()
        } else {
          inputRefs.current[`${transactionId}-amount`]?.focus()
        }
      } else if (field === "amount") {
        if (isLastTransaction) {
          descriptionRef.current?.focus()
        } else {
          const nextTransaction = transactions[index + 1]
          inputRefs.current[`${nextTransaction.id}-accountName`]?.focus()
        }
      } else if (field === "description") {
        saveButtonRef.current?.focus()
      }
    }
    // Handle Backspace key for reverse navigation
    else if (e.key === "Backspace" && e.target.selectionStart === 0 && e.target.selectionEnd === 0) {
      e.preventDefault()
      if (field === "amount") {
        inputRefs.current[`${transactionId}-accountName`]?.focus()
      } else if (field === "accountName") {
        if (index > 0) {
          const prevTransaction = transactions[index - 1]
          inputRefs.current[`${prevTransaction.id}-amount`]?.focus()
        } else {
          // If it's the first transaction, go to the date field
          dateRef.current?.focus()
        }
      } else if (field === "description") {
        const lastTransaction = transactions[transactions.length - 1]
        inputRefs.current[`${lastTransaction.id}-amount`]?.focus()
      }
    }
    // Handle Arrow Up/Down for suggestions
    else if (field === "accountName") {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault()
          const nextIndex = currentIndex < suggestions.length - 1 ? currentIndex + 1 : 0
          setHighlightedIndex((prev) => ({ ...prev, [transactionId]: nextIndex }))
          break
        case "ArrowUp":
          e.preventDefault()
          const prevIndex = currentIndex > 0 ? currentIndex - 1 : suggestions.length - 1
          setHighlightedIndex((prev) => ({ ...prev, [transactionId]: prevIndex }))
          break
        case "Escape":
          setShowSuggestions((prev) => ({ ...prev, [transactionId]: false }))
          setHighlightedIndex((prev) => ({ ...prev, [transactionId]: -1 }))
          break
        default:
          break
      }
    }
  }

  // Effect to handle scrolling when the highlighted index changes
  useEffect(() => {
    Object.entries(highlightedIndex).forEach(([transactionId, index]) => {
      if (
        index !== -1 &&
        suggestionItemRefs.current[transactionId] &&
        suggestionItemRefs.current[transactionId][index]
      ) {
        suggestionItemRefs.current[transactionId][index].scrollIntoView({
          block: "nearest",
        })
      }
    })
  }, [highlightedIndex])

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = validateJournalEntry(transactions)
    if (!description.trim()) {
      validationErrors.push("Description is required")
    }
    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }
    const totalDebit = transactions.reduce((sum, t) => sum + Number(t.debit), 0)
    const totalCredit = transactions.reduce((sum, t) => sum + Number(t.credit), 0)

    if (totalDebit !== totalCredit) {
      setErrors([...validationErrors, "Total debit and credit must be equal"])
      return
    }

    const entry = {
      id: initialEntry?.id || Date.now().toString(),
      date,
      description,
      transactions: transactions.map((t) => ({
        ...t,
        debit: Number(t.debit),
        credit: Number(t.credit),
        openingBalance: Number(t.openingBalance || 0), // Ensure OB is included in saved entry
      })),
      createdAt: initialEntry?.createdAt || new Date().toISOString(),
    }

    onSaveEntry(entry)

    // Reset form only if not editing
    if (!isEditing) {
      setDescription("")
      setTransactions([
        {
          id: uuidv4(),
          accountName: "",
          accountType: "Current Asset",
          debit: 0,
          credit: 0,
          openingBalance: 0,
          type: "debit",
        },
        {
          id: uuidv4(),
          accountName: "",
          accountType: "Expense",
          debit: 0,
          credit: 0,
          openingBalance: 0,
          type: "credit",
        },
      ])
      setErrors([])
    }
  }

  const totalDebits = transactions.reduce((sum, t) => sum + Number(t.debit), 0)
  const totalCredits = transactions.reduce((sum, t) => sum + Number(t.credit), 0)
  const isBalanced = Math.abs(totalDebits - totalCredits) < 0.01

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        {isEditing ? "Edit Journal Entry" : "Add Journal Entry"}
      </h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Entry Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
            <input
              ref={dateRef}
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>
        </div>

        {/* Transactions */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Transactions</h3>
            <button
              type="button"
              onClick={addTransaction}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Transaction
            </button>
          </div>
          <div className="space-y-3">
            {transactions.map((transaction, index) => {
              // Check if OB exists for this account - lock field if it does
              const obExists = hasOpeningBalanceEntry(transaction.accountName, transaction.accountType)
              const storedOB = getStoredOpeningBalance(transaction.accountName, transaction.accountType)

              return (
                <div key={transaction.id} className="p-4 bg-gray-50 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
                      <div className="relative">
                        <input
                          ref={(el) => (inputRefs.current[`${transaction.id}-accountName`] = el)}
                          type="text"
                          value={transaction.accountName}
                          onChange={(e) => updateTransaction(transaction.id, "accountName", e.target.value)}
                          onFocus={() => {
                            const suggestions = getCombinedSuggestions(transaction.accountName)
                            setAccountSuggestions((prev) => ({ ...prev, [transaction.id]: suggestions }))
                            setShowSuggestions((prev) => ({
                              ...prev,
                              [transaction.id]: suggestions.length > 0 && transaction.accountName.trim().length > 0,
                            }))
                          }}
                          onBlur={() => {
                            // Delay hiding suggestions to allow clicking
                            setTimeout(() => setShowSuggestions((prev) => ({ ...prev, [transaction.id]: false })), 200)
                          }}
                          onKeyDown={(e) => handleKeyDown(e, transaction.id, "accountName", index)}
                          placeholder="Enter account name"
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          required
                        />
                        {showSuggestions[transaction.id] && accountSuggestions[transaction.id]?.length > 0 && (
                          <div
                            ref={(el) => (suggestionListRefs.current[transaction.id] = el)}
                            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
                          >
                            {accountSuggestions[transaction.id].map((suggestion, idx) => (
                              <button
                                key={idx}
                                ref={(el) => {
                                  if (!suggestionItemRefs.current[transaction.id]) {
                                    suggestionItemRefs.current[transaction.id] = []
                                  }
                                  suggestionItemRefs.current[transaction.id][idx] = el
                                }}
                                type="button"
                                onMouseDown={() => selectSuggestion(transaction.id, suggestion)}
                                onMouseEnter={() => setHighlightedIndex((prev) => ({ ...prev, [transaction.id]: idx }))}
                                className={`w-full px-3 py-2 text-left hover:bg-blue-50 hover:text-blue-700 focus:bg-blue-50 focus:text-blue-700 focus:outline-none ${highlightedIndex[transaction.id] === idx ? "bg-blue-100" : ""}`}
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
                      <div className="relative">
                        <select
                          value={
                            transaction.accountName in allSuggestions()
                              ? allSuggestions()[transaction.accountName]
                              : transaction.accountType
                          }
                          onChange={(e) => updateTransaction(transaction.id, "accountType", e.target.value)}
                          className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          {baseAccountTypes.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                          <optgroup label="Short-term Liabilities">
                            {liabilityTypes["Short-term Liabilities"].map((type) => (
                              <option key={type} value={type}>
                                {type.replace("Short-term Liability: ", "")}
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Long-term Liabilities">
                            {liabilityTypes["Long-term Liabilities"].map((type) => (
                              <option key={type} value={type}>
                                {type.replace("Long-term Liability: ", "")}
                              </option>
                            ))}
                          </optgroup>
                        </select>
                      </div>
                    </div>
                    {/* Opening Balance field - lock if OB exists for this account */}
                    <div className="md:col-span-1">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Opening Balance
                        {obExists && <span className="text-xs text-orange-600 ml-1"></span>}
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={obExists ? storedOB : transaction.openingBalance || 0} // Show stored OB if exists
                        onChange={(e) =>
                          !obExists && updateTransaction(transaction.id, "openingBalance", e.target.value)
                        } // Only allow changes if no OB exists
                        className={`w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${obExists ? "bg-gray-100 cursor-not-allowed" : ""}`}
                        placeholder="0.00"
                        disabled={obExists} // Disable field if OB exists for this account
                        title={obExists ? "Opening Balance already exists for this account" : "Enter opening balance"}
                      />
                    </div>
                    <div className="md:col-span-2">
                      <div className="flex mb-1">
                        <div className="w-1/2">
                          <label className="block text-sm font-medium text-gray-700">Dr/Cr</label>
                        </div>
                        <div className="w-1/2 pl-2">
                          <label className="block text-sm font-medium text-gray-700">Amount</label>
                        </div>
                      </div>
                      <div className="flex rounded-lg shadow-sm">
                        <div className="inline-flex rounded-md shadow-sm" role="group">
                          <button
                            type="button"
                            onClick={() => updateTransaction(transaction.id, "type", "debit")}
                            className={`px-4 py-2 text-sm font-medium rounded-l-lg border ${transaction.type === "debit" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-200 text-gray-900 border-gray-200 hover:bg-gray-300"}`}
                          >
                            Debit
                          </button>
                          <button
                            type="button"
                            onClick={() => updateTransaction(transaction.id, "type", "credit")}
                            className={`px-4 py-2 text-sm font-medium rounded-r-lg border ${transaction.type === "credit" ? "bg-blue-600 text-white border-blue-600" : "bg-gray-200 text-gray-900 border-gray-200 hover:bg-gray-300"}`}
                          >
                            Credit
                          </button>
                        </div>
                        <input
                          ref={(el) => (inputRefs.current[`${transaction.id}-amount`] = el)}
                          type="number"
                          step="0.01"
                          value={
                            transaction.type === "debit"
                              ? transaction.debit === 0
                                ? 0
                                : transaction.debit || ""
                              : transaction.credit === 0
                                ? 0
                                : transaction.credit || ""
                          }
                          onChange={(e) => {
                            const value = e.target.value === "" ? "" : Number(e.target.value)
                            updateTransaction(transaction.id, "amount", value)
                          }}
                          onKeyDown={(e) => handleKeyDown(e, transaction.id, "amount", index)}
                          className="flex-1 p-2 border border-gray-300 rounded-r-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          min="0"
                        />
                      </div>
                    </div>
                    <div className="flex justify-end items-center">
                      {transactions.length > 2 && (
                        <button
                          type="button"
                          onClick={() => removeTransaction(transaction.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <input
            ref={descriptionRef}
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, null, "description", null)}
            placeholder="Enter transaction description"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          />
        </div>

        {/* Balance Summary */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <span className="font-medium text-gray-700">Total Debits:</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totalDebits)}</span>
          </div>
          <div className="flex items-center justify-between text-sm mt-2">
            <span className="font-medium text-gray-700">Total Credits:</span>
            <span className="font-semibold text-gray-900">{formatCurrency(totalCredits)}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-200">
            <div className={`flex items-center justify-between ${isBalanced ? "text-green-600" : "text-red-600"}`}>
              <span className="font-medium">Balance:</span>
              <span className="font-semibold">
                {isBalanced ? "✓ Balanced" : `Difference: ${formatCurrency(Math.abs(totalDebits - totalCredits))}`}
              </span>
            </div>
          </div>
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center mb-2">
              <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
              <h4 className="font-medium text-red-800">Please fix the following errors:</h4>
            </div>
            <ul className="list-disc list-inside text-sm text-red-700 space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit Button */}
        <button
          ref={saveButtonRef}
          type="submit"
          className="w-full flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <Save className="h-5 w-5 mr-2" />
          {isEditing ? "Update Journal Entry" : "Save Journal Entry"}
        </button>
      </form>
    </div>
  )
}

export default JournalEntryForm;
