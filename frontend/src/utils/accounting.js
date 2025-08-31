export const ACCOUNT_CATEGORIES = {
  "Fixed Asset": "Assets",
  "Current Asset": "Assets",
  "Accounts Receivable": "Assets",
  Salary: "Expenses",
  Rent: "Expenses",
  Wages: "Expenses",
  "Other Expenses": "Expenses",
  Sales: "Revenues",
  "Service Revenue": "Revenues",
  "Other Revenue": "Revenues",
  "Short-term Liability: Accounts Payable": "Liabilities",
  "Short-term Liability: Interest Payable": "Liabilities",
  "Short-term Liability: Salary Payable": "Liabilities",
  "Short-term Liability: Rent Payable": "Liabilities",
  "Long-term Liability": "Liabilities",
  "Long-term Liability: Bank Loan": "Liabilities",
  Capital: "Capital",
  "Retained Earnings": "Capital",
  Expense: "Expenses",
  Revenue: "Revenues",
  "Short-term Liability: Short-term Loan": "Liabilities",
  "Short-term Liability: Taxes Payable": "Liabilities",
  "Short-term Liability: Unearned Revenue": "Liabilities",
  "Short-term Liability: Notes Payable": "Liabilities",
  "Long-term Liability: Loan": "Liabilities",
}

// Cash accounts identification
export const CASH_ACCOUNTS = ["Cash", "Bank", "Petty Cash", "Cash in Hand", "Bank Account"]

// Cash flow activity classification
export const CASH_FLOW_ACTIVITIES = {
  // Operating Activities
  Sales: "Operating",
  "Service Revenue": "Operating",
  "Other Revenue": "Operating",
  Salary: "Operating",
  Rent: "Operating",
  Wages: "Operating",
  "Other Expenses": "Operating",
  "Accounts Receivable": "Operating",
  "Short-term Liability: Accounts Payable": "Operating",
  "Short-term Liability: Interest Payable": "Operating",
  "Short-term Liability: Salary Payable": "Operating",
  "Short-term Liability: Rent Payable": "Operating",

  // Investing Activities
  "Fixed Asset": "Investing",

  // Financing Activities
  Capital: "Financing",
  "Retained Earnings": "Financing",
  "Long-term Liability": "Financing",
  "Long-term Liability: Bank Loan": "Financing",
  "Short-term Liability": "Financing",
}

export const normalizeDate = (date) => {
  if (!date) return ""
  const d = new Date(date)
  return d.toISOString().slice(0, 10)
}

export const formatCurrency = (amount) => {
  return `৳${amount.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export const sortTransactionsByDate = (transactions) => {
  return [...transactions].sort((a, b) => new Date(a.date) - new Date(b.date))
}

// Ensure fiscal start date format YYYY-01-01
export const getFiscalStartDate = (year) => `${year}-01-01`

export const generateLedgers = (journalEntries) => {
  const ledgers = {}

  journalEntries.forEach((entry) => {
    const normalizedDate = normalizeDate(entry.date)

    entry.transactions.forEach((transaction) => {
      const normalizedAccountName = transaction.accountName.trim()
      const key = `${normalizedAccountName}|${transaction.accountType}`

      if (!ledgers[key]) {
        ledgers[key] = {
          accountName: normalizedAccountName,
          accountType: transaction.accountType,
          category: ACCOUNT_CATEGORIES[transaction.accountType],
          // default to 0 if undefined
          openingBalance: transaction.openingBalance ?? 0,
          balance: transaction.openingBalance ?? 0,
          transactions: [],
        }
      }

      const ledgerTransaction = {
        id: transaction.id,
        date: normalizedDate,
        description: entry.description,
        debit: transaction.debit,
        credit: transaction.credit,
        // keep any openingBalance included at transaction-level
        openingBalance: transaction.openingBalance ?? 0,
        balance: 0,
      }

      ledgers[key].transactions.push(ledgerTransaction)
    })
  })

  Object.values(ledgers).forEach((ledger) => {
    // Add synthetic OB transaction at fiscal start **only if there is no existing OB transaction**
    // This prevents duplicates where the user already entered an Opening Balance journal entry.
    const fiscalYear = new Date().getFullYear()
    const obDate = getFiscalStartDate(fiscalYear)

    // Detect if an OB-like transaction already exists:
    // - a transaction with a non-zero openingBalance (explicit OB)
    // - or a transaction whose description contains "opening balance" (case-insensitive)
    const hasOBTransaction = ledger.transactions.some((t) => {
      const desc = (t.description || "").toString().toLowerCase()
      const hasDescOB = desc.includes("opening balance")
      const hasNonZeroOBField = t.openingBalance !== undefined && Number(t.openingBalance) !== 0
      return hasDescOB || hasNonZeroOBField
    })

    // Only add synthetic OB if:
    // - no OB transaction already exists, AND
    // - the ledger's openingBalance is non-zero (no need to add zero OB)
    if (!hasOBTransaction && Number(ledger.openingBalance || 0) !== 0) {
      // Create synthetic OB with proper debit/credit based on account category
      const isDebitNormal = ["Assets", "Expenses"].includes(ledger.category)
      const obAmount = Number(ledger.openingBalance)

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

      ledger.transactions.push({
        // Make ID include fiscal year to reduce risk of accidental repetition across years
        id: `ob-${ledger.accountName}-${fiscalYear}`,
        date: obDate,
        description: "Opening Balance from accounting utils",
        debit: debitAmount,
        credit: creditAmount,
        openingBalance: ledger.openingBalance,
        balance: ledger.openingBalance,
      })
    }

    // Sort transactions and compute running balances
    ledger.transactions = sortTransactionsByDate(ledger.transactions)
    let runningBalance = ledger.openingBalance ?? 0

    ledger.transactions.forEach((transaction) => {
      // Determine normal balance side for this account category
      const isDebitNormal = ["Assets", "Expenses"].includes(ledger.category)

      // Apply transaction amounts to running balance using normal-side logic
      runningBalance += isDebitNormal
        ? (transaction.debit || 0) - (transaction.credit || 0)
        : (transaction.credit || 0) - (transaction.debit || 0)

      transaction.balance = runningBalance
    })

    ledger.balance = runningBalance
  })

  return Object.values(ledgers)
}

export const generateTrialBalance = (ledgers) => {
  return ledgers.map((ledger) => {
    const isDebitNormalAccount = ["Assets", "Expenses"].includes(ledger.category)
    let debitAmount = 0
    let creditAmount = 0

    // 1. Handle Opening Balance with category-based sign logic
    if (isDebitNormalAccount) {
      // Assets/Expenses: Positive opening = Debit, Negative opening = Credit
      debitAmount += Math.max(ledger.openingBalance, 0)
      creditAmount += Math.max(-ledger.openingBalance, 0)
    } else {
      // Liabilities/Revenue/Capital: Positive opening = Credit, Negative opening = Debit
      creditAmount += Math.max(ledger.openingBalance, 0)
      debitAmount += Math.max(-ledger.openingBalance, 0)
    }

    const netBalance = ledger.balance - ledger.openingBalance

    if (isDebitNormalAccount) {
      debitAmount += Math.max(netBalance, 0)
      creditAmount += Math.max(-netBalance, 0)
    } else {
      creditAmount += Math.max(netBalance, 0)
      debitAmount += Math.max(-netBalance, 0)
    }

    return {
      accountName: ledger.accountName,
      accountType: ledger.accountType,
      category: ledger.category,
      openingBalance: ledger.openingBalance,
      debit: debitAmount,
      credit: creditAmount,
    }
  })
}

export const calculateFinancialSummary = (ledgers) => {
  const summary = {
    totalRevenue: 0,
    totalExpenses: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalCapital: 0,
    openingBalances: {
      assets: 0,
      liabilities: 0,
      capital: 0,
    },
  }

  ledgers.forEach((ledger) => {
    switch (ledger.category) {
      case "Revenues":
        summary.totalRevenue += ledger.balance
        break
      case "Expenses":
        summary.totalExpenses += ledger.balance
        break
      case "Assets":
        summary.totalAssets += ledger.balance
        summary.openingBalances.assets += ledger.openingBalance
        break
      case "Liabilities":
        summary.totalLiabilities += ledger.balance
        summary.openingBalances.liabilities += ledger.openingBalance
        break
      case "Capital":
        summary.totalCapital += ledger.balance
        summary.openingBalances.capital += ledger.openingBalance
        break
    }
  })

  summary.netProfit = summary.totalRevenue - summary.totalExpenses
  return summary
}

export const generateCashFlowStatement = (journalEntries, ledgers) => {
  const cashFlowData = {
    operating: [],
    investing: [],
    financing: [],
    netCashFlow: {
      operating: 0,
      investing: 0,
      financing: 0,
      total: 0,
    },
    openingCash: 0,
    closingCash: 0,
  }

  // Get cash accounts
  const cashLedgers = ledgers.filter((ledger) =>
    CASH_ACCOUNTS.some((cashAccount) => ledger.accountName.toLowerCase().includes(cashAccount.toLowerCase())),
  )

  // Calculate opening cash balance (earliest transactions)
  let openingCash = 0
  cashLedgers.forEach((cashLedger) => {
    if (cashLedger.transactions.length > 0) {
      const firstTransaction = cashLedger.transactions[0]
      openingCash += firstTransaction.debit - firstTransaction.credit
    }
  })

  // Process each journal entry to categorize cash flows
  journalEntries.forEach((entry) => {
    entry.transactions.forEach((transaction) => {
      const isCashAccount = CASH_ACCOUNTS.some((cashAccount) =>
        transaction.accountName.toLowerCase().includes(cashAccount.toLowerCase()),
      )

      if (isCashAccount) {
        const cashFlow = transaction.debit - transaction.credit
        const activity = CASH_FLOW_ACTIVITIES[transaction.accountType] || "Operating"

        const cashFlowItem = {
          date: entry.date,
          description: entry.description,
          accountName: transaction.accountName,
          accountType: transaction.accountType,
          amount: cashFlow,
          isInflow: cashFlow > 0,
        }

        // Add to appropriate activity category
        switch (activity) {
          case "Operating":
            cashFlowData.operating.push(cashFlowItem)
            cashFlowData.netCashFlow.operating += cashFlow
            break
          case "Investing":
            cashFlowData.investing.push(cashFlowItem)
            cashFlowData.netCashFlow.investing += cashFlow
            break
          case "Financing":
            cashFlowData.financing.push(cashFlowItem)
            cashFlowData.netCashFlow.financing += cashFlow
            break
        }
      } else {
        // For non-cash accounts, find the corresponding cash transaction
        const correspondingCashTransaction = entry.transactions.find((t) =>
          CASH_ACCOUNTS.some((cashAccount) => t.accountName.toLowerCase().includes(cashAccount.toLowerCase())),
        )

        if (correspondingCashTransaction) {
          const cashFlow = correspondingCashTransaction.debit - correspondingCashTransaction.credit
          const activity = CASH_FLOW_ACTIVITIES[transaction.accountType] || "Operating"

          const cashFlowItem = {
            date: entry.date,
            description: entry.description,
            accountName: transaction.accountName,
            accountType: transaction.accountType,
            amount: -cashFlow, // Opposite of cash account movement
            isInflow: -cashFlow > 0,
          }

          // Add to appropriate activity category
          switch (activity) {
            case "Operating":
              if (
                !cashFlowData.operating.some(
                  (item) => item.date === entry.date && item.description === entry.description,
                )
              ) {
                cashFlowData.operating.push(cashFlowItem)
                cashFlowData.netCashFlow.operating += -cashFlow
              }
              break
            case "Investing":
              if (
                !cashFlowData.investing.some(
                  (item) => item.date === entry.date && item.description === entry.description,
                )
              ) {
                cashFlowData.investing.push(cashFlowItem)
                cashFlowData.netCashFlow.investing += -cashFlow
              }
              break
            case "Financing":
              if (
                !cashFlowData.financing.some(
                  (item) => item.date === entry.date && item.description === entry.description,
                )
              ) {
                cashFlowData.financing.push(cashFlowItem)
                cashFlowData.netCashFlow.financing += -cashFlow
              }
              break
          }
        }
      }
    })
  })

  // Calculate total net cash flow
  cashFlowData.netCashFlow.total =
    cashFlowData.netCashFlow.operating + cashFlowData.netCashFlow.investing + cashFlowData.netCashFlow.financing

  // Calculate opening and closing cash balances
  cashFlowData.openingCash = openingCash
  cashFlowData.closingCash = cashLedgers.reduce((total, ledger) => total + ledger.balance, 0)

  return cashFlowData
}

export const processYearEnd = (ledgers) => {
  return ledgers.map((ledger) => ({
    ...ledger,
    openingBalance: ledger.balance,
    transactions: [], // Clear transactions for new year
  }))
}

export const validateJournalEntry = (transactions) => {
  const errors = []
  let hasOpeningBalance = false
  let hasRegularTransaction = false

  // Validate minimum transactions
  if (transactions.length < 2) {
    errors.push("A journal entry must have at least 2 transactions")
  }

  // Calculate totals
  const totalDebits = transactions.reduce((sum, t) => sum + (t.debit || 0), 0)
  const totalCredits = transactions.reduce((sum, t) => sum + (t.credit || 0), 0)
  const totalOpening = transactions.reduce((sum, t) => sum + (t.openingBalance || 0), 0)

  // Validate debit-credit equality (only for regular transactions)
  if (totalOpening === 0 && Math.abs(totalDebits - totalCredits) > 0.01) {
    errors.push("Total debits must equal total credits")
  }

  // Validate each transaction
  transactions.forEach((transaction, index) => {
    const transactionNumber = index + 1

    // Account name validation
    if (!transaction.accountName?.trim()) {
      errors.push(`Transaction ${transactionNumber}: Account name is required`)
    }

    // Debit/credit mutual exclusivity
    if ((transaction.debit || 0) > 0 && (transaction.credit || 0) > 0) {
      errors.push(`Transaction ${transactionNumber}: Cannot have both debit and credit amounts`)
    }

    // Opening balance validation
    if (transaction.openingBalance !== undefined) {
      hasOpeningBalance = true
      if (isNaN(Number(transaction.openingBalance))) {
        errors.push(`Transaction ${transactionNumber}: Opening balance must be a number`)
      }
    }

    // Track if it has regular transactions
    if ((transaction.debit || 0) !== 0 || (transaction.credit || 0) !== 0) {
      hasRegularTransaction = true
    }
  })



  // Validate at least some amounts exist
  if (!hasOpeningBalance && !hasRegularTransaction) {
    errors.push("Journal entry must contain either opening balances or regular transactions")
  }

  return errors;
};
