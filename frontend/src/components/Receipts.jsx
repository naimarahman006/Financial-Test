import { Receipt, Save } from "lucide-react"
import { useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { v4 as uuidv4 } from "uuid"

const Receipts = ({ onAddEntry, existingLedgers = [] }) => {
  const navigate = useNavigate()
  const [date, setDate] = useState(new Date().toISOString().split("T")[0])
  const [description, setDescription] = useState("")
  const [amount, setAmount] = useState("")
  const [sourceAccount, setSourceAccount] = useState("Cash")
  const [counterAccount, setCounterAccount] = useState("")
  const [errors, setErrors] = useState([])
  const [accountSuggestions, setAccountSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)

  const suggestionListRef = useRef(null)
  const suggestionItemRefs = useRef([])

  // Context-aware account name suggestions for receipts
  const receiptSuggestions = {
    // Revenue Accounts (increase with a credit)
    Sales: "Revenue",
    "Service Revenue": "Revenue",
    "Interest Income": "Revenue",
    "Commission Income": "Revenue",
    "Rental Income": "Revenue",
    "Consulting Revenue": "Revenue",

    // Current Assets (for when a customer pays an invoice)
    "Accounts Receivable": "Current Asset",

    // Liabilities (increase with a credit, e.g., receiving a loan or prepayment)
    "Unearned Revenue": "Short-term Liability",
    "Short-term Loan": "Short-term Liability",
    "Long-term Loan": "Long-term Liability",

    // // Equity Accounts (increase with a credit)
    // "Owner's Equity": "Capital",
    // "Retained Earnings": "Capital",
  }

  const allSuggestions = () => {
    const existingSuggestion = existingLedgers.reduce((acc, ledger) => {
      acc[ledger.accountName] = ledger.accountType
      return acc
    }, {})
    return { ...receiptSuggestions, ...existingSuggestion }
  }

  const getCombinedSuggestions = (input) => {
    if (!input.trim()) return []
    const suggestion = allSuggestions()
    const suggestionNames = Object.keys(suggestion)
    return suggestionNames.filter((account) => account.toLowerCase().includes(input.toLowerCase())).slice(0, 5)
  }

  const handleCounterAccountChange = (value) => {
    setCounterAccount(value)
    const suggestions = getCombinedSuggestions(value)
    setAccountSuggestions(suggestions)
    setShowSuggestions(suggestions.length > 0 && value.trim().length > 0)
    setHighlightedIndex(-1)
  }

  const selectSuggestion = (accountName) => {
    setCounterAccount(accountName)
    setShowSuggestions(false)
    setHighlightedIndex(-1)
  }

  const handleKeyDown = (e) => {
    if (!showSuggestions || accountSuggestions.length === 0) return

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev < accountSuggestions.length - 1 ? prev + 1 : 0))
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : accountSuggestions.length - 1))
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0) {
          selectSuggestion(accountSuggestions[highlightedIndex])
        }
        break
      case "Escape":
        setShowSuggestions(false)
        setHighlightedIndex(-1)
        break
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const validationErrors = []

    if (!description.trim()) {
      validationErrors.push("Description is required")
    }
    if (!amount || Number.parseFloat(amount) <= 0) {
      validationErrors.push("Amount must be greater than 0")
    }
    if (!counterAccount.trim()) {
      validationErrors.push("Counter Account is required")
    }

    if (validationErrors.length > 0) {
      setErrors(validationErrors)
      return
    }

    // Get account type for counter account
    const suggestions = allSuggestions()
    const counterAccountType = suggestions[counterAccount] || "Revenue"

    // Create journal entry with two transactions
    const entry = {
      id: uuidv4(),
      date,
      description,
      transactions: [
        {
          id: uuidv4(),
          accountName: sourceAccount,
          accountType: "Current Asset",
          debit: Number.parseFloat(amount),
          credit: 0,
          openingBalance: 0,
          type: "debit",
        },
        {
          id: uuidv4(),
          accountName: counterAccount,
          accountType: counterAccountType,
          debit: 0,
          credit: Number.parseFloat(amount),
          openingBalance: 0,
          type: "credit",
        },
      ],
      createdAt: new Date().toISOString(),
    }

    onAddEntry(entry)
    navigate("/journal-entries")
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <Receipt className="h-6 w-6 text-green-600 mr-3" />
            <h1 className="text-2xl font-bold text-gray-900">Receipts</h1>
          </div>
          <p className="mt-1 text-sm text-gray-600">
            Record cash and bank inflows with automatic journal entry creation
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-md">
              <div className="flex">
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <ul className="list-disc pl-5 space-y-1">
                      {errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Date */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Source Account*/}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Receipt</label>
              <select
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="Cash">Cash</option>
                <option value="Bank">Bank</option>
              </select>
            </div>

            {/* Counter Account */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Account Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={counterAccount}
                  onChange={(e) => handleCounterAccountChange(e.target.value)}
                  onFocus={() => {
                    const suggestions = getCombinedSuggestions(counterAccount)
                    setAccountSuggestions(suggestions)
                    setShowSuggestions(suggestions.length > 0 && counterAccount.trim().length > 0)
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Select revenue or receivable account"
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
                {showSuggestions && accountSuggestions.length > 0 && (
                  <div
                    ref={suggestionListRef}
                    className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-40 overflow-y-auto"
                  >
                    {accountSuggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        ref={(el) => (suggestionItemRefs.current[idx] = el)}
                        type="button"
                        onMouseDown={() => selectSuggestion(suggestion)}
                        onMouseEnter={() => setHighlightedIndex(idx)}
                        className={`w-full px-3 py-2 text-left hover:bg-green-50 hover:text-green-700 focus:bg-green-50 focus:text-green-700 focus:outline-none ${
                          highlightedIndex === idx ? "bg-green-100" : ""
                        }`}
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Amount */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the receipt"
                className="w-full p-3 border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
          </div>

          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              <Save className="h-5 w-5 mr-2" />
              Save Receipt
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default Receipts;
