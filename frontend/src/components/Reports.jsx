import { saveAs } from "file-saver"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Calculator, ChevronDown, DollarSign, Download, FileText, TrendingUp } from "lucide-react"
import { useEffect, useMemo, useState } from "react"
import * as XLSX from "xlsx"
import { formatCurrency } from "../utils/accounting"
import { exportToDOC, exportToExcel, exportToPDF } from "../utils/trialBalanceExporter"
import TrialBalance from "./TrialBalance"

// ---------- Date helpers (local date-only, end-of-day inclusive) ----------
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
const formatLocalDate = (dStrOrDate) => {
  const d = dStrOrDate instanceof Date ? toLocalDateOnly(dStrOrDate) : toLocalDateOnly(dStrOrDate)
  return d ? d.toLocaleDateString("en-BD") : ""
}

// ---------- PDF/Excel/DOC helpers for generic reports ----------
const exportFinancialReportToPDF = (reportTitle, data, dateRange) => {
  try {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm" })
    doc.setFont("Helvetica")

    doc.setFontSize(16)
    doc.text(reportTitle, 105, 15, { align: "center" })

    doc.setFontSize(10)
    const dateText =
      dateRange.startDate || dateRange.endDate
        ? `Period: ${dateRange.startDate || "Start"} to ${dateRange.endDate || "End"}`
        : "All Transactions"
    doc.text(dateText, 105, 22, { align: "center" })

    let yPos = 30
    data.forEach((section) => {
      if (section.title) {
        doc.setFontSize(12)
        doc.text(section.title, 14, yPos + 4)
        yPos += 8
      }

      if (section.table) {
        doc.autoTable({
          startY: yPos,
          head: section.table.head,
          body: section.table.body.map((row) =>
            row.map((cell) =>
              typeof cell === "number"
                ? cell.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                : cell
            )
          ),
          theme: "grid",
          styles: { fontSize: 10, cellPadding: 2, font: "Helvetica" },
          headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
        })
        yPos = doc.autoTable.previous.finalY + 5
      }

      if (section.summary) {
        doc.setFontSize(12)
        doc.text(section.summary.text, 14, yPos)
        doc.text(
          typeof section.summary.value === "number"
            ? section.summary.value.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
            : section.summary.value,
          doc.internal.pageSize.width - 14,
          yPos,
          { align: "right" }
        )
        yPos += 8
      }
    })

    doc.save(`${reportTitle.toLowerCase().replace(/ /g, "_")}.pdf`)
  } catch (error) {
    console.error(`PDF export for ${reportTitle} error:`, error)
    throw new Error(`Failed to generate PDF for ${reportTitle}`)
  }
}

const exportFinancialReportToExcel = (reportTitle, data) => {
  try {
    const wb = XLSX.utils.book_new()
    const ws = XLSX.utils.aoa_to_sheet(data)
    XLSX.utils.book_append_sheet(wb, ws, reportTitle)
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" })
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" })
    saveAs(blob, `${reportTitle.toLowerCase().replace(/ /g, "_")}.xlsx`)
  } catch (error) {
    console.error(`Excel export for ${reportTitle} error:`, error)
    throw new Error(`Failed to generate Excel for ${reportTitle}`)
  }
}

const exportFinancialReportToDOC = (reportTitle, contentHTML, dateRange) => {
  try {
    const dateText =
      dateRange.startDate || dateRange.endDate
        ? `Period: ${dateRange.startDate || "Start"} to ${dateRange.endDate || "End"}`
        : "All Transactions"

    const docContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>${reportTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2c3e50; margin-bottom: 5px; text-align: center; }
          .date-range { color: #7f8c8d; margin-bottom: 20px; text-align: center; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; background-color: #f8f9fa; padding: 8px; border-radius: 4px; }
          .item { display: flex; justify-content: space-between; padding: 4px 0; }
          .total { display: flex; justify-content: space-between; font-weight: bold; padding: 8px 0; border-top: 1px solid #dee2e6; }
        </style>
      </head>
      <body>
        <h1>${reportTitle}</h1>
        <div class="date-range">${dateText}</div>
        ${contentHTML}
      </body>
      </html>`
    const blob = new Blob([docContent], { type: "application/msword;charset=UTF-8" })
    saveAs(blob, `${reportTitle.toLowerCase().replace(/ /g, "_")}.doc`)
  } catch (error) {
    console.error(`DOC export for ${reportTitle} error:`, error)
    throw new Error(`Failed to generate DOC for ${reportTitle}`)
  }
}

// ==========================================================================

const Reports = ({ financialSummary, ledgers, trialBalance }) => {
  const [selectedReport, setSelectedReport] = useState("trial-balance")
  const [showExportOptions, setShowExportOptions] = useState(false)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [filteredData, setFilteredData] = useState({
    filteredLedgers: ledgers,
    filteredSummary: financialSummary,
  })

  // ---------- Bounds & range helpers ----------
  const { startBound, endBound } = useMemo(() => {
    const start = startDate ? toLocalDateOnly(startDate) : new Date(1900, 0, 1)
    const end = endDate ? endOfDay(toLocalDateOnly(endDate)) : new Date(2100, 11, 31, 23, 59, 59, 999)
    return { startBound: start, endBound: end }
  }, [startDate, endDate])

  const isInDateRange = (dateStr) => {
    const d = toLocalDateOnly(dateStr)
    if (!d) return false
    return d >= startBound && d <= endBound
  }

  // ---------- Trial Balance (for export) ----------
  const calculateFilteredBalances = () => {
    const filteredEntries = []
    let totalDebits = 0
    let totalCredits = 0

    trialBalance.forEach((originalEntry) => {
      const accountLedger = ledgers.find((l) => l.accountName === originalEntry.accountName)
      if (!accountLedger) return

      const filteredTransactions = (accountLedger.transactions || []).filter((txn) => isInDateRange(txn.date))
      const totalDebit = filteredTransactions.reduce((sum, txn) => sum + Number(txn.debit || 0), 0)
      const totalCredit = filteredTransactions.reduce((sum, txn) => sum + Number(txn.credit || 0), 0)

      let adjustedDebit = totalDebit
      let adjustedCredit = totalCredit

      if (accountLedger.openingBalance) {
        const isDebitNormal = ["Assets", "Expenses"].includes(originalEntry.category)
        const openingBalance = Number(accountLedger.openingBalance || 0)

        if (isDebitNormal) {
          if (openingBalance > 0) adjustedDebit += openingBalance
          else adjustedCredit += Math.abs(openingBalance)
        } else {
          if (openingBalance > 0) adjustedCredit += openingBalance
          else adjustedDebit += Math.abs(openningBalance) // NOTE: keep your original behavior if needed
        }
      }

      const netDebit = adjustedDebit > adjustedCredit ? adjustedDebit - adjustedCredit : 0
      const netCredit = adjustedCredit > adjustedDebit ? adjustedCredit - adjustedDebit : 0

      if (netDebit > 0 || netCredit > 0) {
        filteredEntries.push({
          ...originalEntry,
          debit: netDebit,
          credit: netCredit,
          category: originalEntry.category,
        })
        totalDebits += netDebit
        totalCredits += netCredit
      }
    })

    return {
      filteredTrialBalance: filteredEntries,
      totalDebits,
      totalCredits,
      isBalanced: Math.abs(totalDebits - totalCredits) < 0.01,
    }
  }

  // ---------- Income/Balance computations (existing flow, with local dates) ----------
  const calculateAccountBalance = (account) => {
    const openingBalance = Number(account.openingBalance || 0)
    const totalDebit = (account.transactions || []).reduce((sum, txn) => sum + Number(txn.debit || 0), 0)
    const totalCredit = (account.transactions || []).reduce((sum, txn) => sum + Number(txn.credit || 0), 0)

    if (["Assets", "Expenses"].includes(account.category)) {
      return openingBalance + totalDebit - totalCredit
    } else {
      return openingBalance + totalCredit - totalDebit // Revenues, Liabilities, Capital
    }
  }

  useEffect(() => {
    const tempSummary = {
      totalRevenue: 0,
      totalExpenses: 0,
      totalAssets: 0,
      totalLiabilities: 0,
      totalCapital: 0,
      netProfit: 0,
    }
    const tempLedgers = []

    ledgers.forEach((ledger) => {
      const filteredTransactions = (ledger.transactions || []).filter((txn) => isInDateRange(txn.date))

      const updatedLedger = { ...ledger, transactions: filteredTransactions }
      const newBalance = calculateAccountBalance(updatedLedger)

      tempLedgers.push({ ...updatedLedger, balance: newBalance })

      switch (ledger.category) {
        case "Revenues":
          tempSummary.totalRevenue += newBalance
          break
        case "Expenses":
          tempSummary.totalExpenses += newBalance
          break
        case "Assets":
          tempSummary.totalAssets += newBalance
          break
        case "Liabilities":
          tempSummary.totalLiabilities += newBalance
          break
        case "Capital":
          tempSummary.totalCapital += newBalance
          break
        default:
          break
      }
    })

    tempSummary.netProfit = tempSummary.totalRevenue - tempSummary.totalExpenses

    setFilteredData({
      filteredLedgers: tempLedgers,
      filteredSummary: tempSummary,
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate, ledgers]) // depends on isInDateRange via closure

  // ---------- Cash Flow Statement (PERFECTED) ----------
  const isCashLike = (acc) => {
    const t = (acc.accountType || "").toLowerCase()
    const n = (acc.accountName || "").toLowerCase()
    const nameHits = ["cash", "bank", "checking", "savings", "bkash", "nagad", "rocket", "paypal", "mfs"]
    return t === "cash" || t === "bank" || nameHits.some((k) => n.includes(k))
  }

  const balanceDeltaForAsset = (debit, credit) => Number(debit || 0) - Number(credit || 0) // asset: debit↑ = inflow

  const computeBalanceAt = (ledger, boundInclusive) => {
    const isDebitNormal = ["Assets", "Expenses"].includes(ledger.category)
    let bal = Number(ledger.openingBalance || 0)
    for (const txn of ledger.transactions || []) {
      const d = toLocalDateOnly(txn.date)
      if (d && d <= boundInclusive) {
        const debit = Number(txn.debit || 0)
        const credit = Number(txn.credit || 0)
        bal += isDebitNormal ? debit - credit : credit - debit
      }
    }
    return bal
  }

  const computeStartingBalance = (ledger, startBoundLocal) => {
    const isDebitNormal = ["Assets", "Expenses"].includes(ledger.category)
    let bal = Number(ledger.openingBalance || 0)
    for (const txn of ledger.transactions || []) {
      const d = toLocalDateOnly(txn.date)
      if (d && d < startBoundLocal) {
        const debit = Number(txn.debit || 0)
        const credit = Number(txn.credit || 0)
        bal += isDebitNormal ? debit - credit : credit - debit
      }
    }
    return bal
  }

  const cashFlow = useMemo(() => {
    // Always use ORIGINAL ledgers (not filtered) so we can compute beginning balance correctly
    const cashLedgers = (ledgers || []).filter(isCashLike)

    // Transactions within period (from cash ledgers only)
    const txnsInRange = cashLedgers.flatMap((acc) =>
      (acc.transactions || [])
        .filter((t) => isInDateRange(t.date))
        .map((t) => ({
          ...t,
          __amount: balanceDeltaForAsset(t.debit, t.credit), // +inflow / -outflow for CASH
          __section: ((t.cashFlowType || t.type || "Operating") + "").toLowerCase(),
        }))
    )

    const sections = { Operating: [], Investing: [], Financing: [] }
    for (const t of txnsInRange) {
      const key =
        t.__section.startsWith("invest") ? "Investing" : t.__section.startsWith("financ") ? "Financing" : "Operating"
      sections[key].push(t)
    }

    // Totals per section
    const totalOp = sections.Operating.reduce((s, t) => s + t.__amount, 0)
    const totalInv = sections.Investing.reduce((s, t) => s + t.__amount, 0)
    const totalFin = sections.Financing.reduce((s, t) => s + t.__amount, 0)
    const netChange = totalOp + totalInv + totalFin

    // Beginning & Ending cash
    const beginningCash = cashLedgers.reduce((s, acc) => s + computeStartingBalance(acc, startBound), 0)
    const endingCashComputed = beginningCash + netChange
    const endingCashDirect = cashLedgers.reduce((s, acc) => s + computeBalanceAt(acc, endBound), 0)

    const reconciles = Math.abs(endingCashComputed - endingCashDirect) < 0.01

    return {
      sections,
      totals: { Operating: totalOp, Investing: totalInv, Financing: totalFin },
      summary: {
        beginningCash,
        netChange,
        endingCashComputed,
        endingCashDirect,
        reconciles,
      },
    }
  }, [ledgers, startBound, endBound]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- UI Builders ----------
  const reports = [
    {
      id: "trial-balance",
      title: "Trial Balance",
      description: "List of all accounts and their balances",
      icon: Calculator,
      color: "bg-blue-50 text-blue-700 border-blue-200",
    },
    {
      id: "income-statement",
      title: "Income Statement",
      description: "Profit and loss statement for the period",
      icon: TrendingUp,
      color: "bg-green-50 text-green-700 border-green-200",
    },
    {
      id: "balance-sheet",
      title: "Balance Sheet",
      description: "Assets, liabilities, and Capital snapshot",
      icon: DollarSign,
      color: "bg-purple-50 text-purple-700 border-purple-200",
    },
    {
      id: "cash-flow",
      title: "Cash Flow Statement",
      description: "Tracks cash inflows and outflows",
      icon: FileText,
      color: "bg-yellow-50 text-yellow-700 border-yellow-200",
    },
  ]

  const getRevenueAccounts = () => filteredData.filteredLedgers.filter((l) => l.category === "Revenues")
  const getExpenseAccounts = () => filteredData.filteredLedgers.filter((l) => l.category === "Expenses")
  const getAssetAccounts = () => filteredData.filteredLedgers.filter((l) => l.category === "Assets")
  const getLiabilityAccounts = () => filteredData.filteredLedgers.filter((l) => l.category === "Liabilities")
  const getCapitalAccounts = () => filteredData.filteredLedgers.filter((l) => l.category === "Capital")

  const renderIncomeStatement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4 mb-6">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md" />
        <span className="text-gray-500">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md" />
      </div>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Income Statement</h3>
        <p className="text-gray-600">
          {startDate || endDate
            ? `For the period ${startDate ? formatLocalDate(startDate) : "…"} to ${endDate ? formatLocalDate(endDate) : "…"}`
            : `For the period up to ${formatLocalDate(new Date())}`}
        </p>
      </div>

      <div className="bg-green-50 p-4 rounded-lg">
        <h4 className="font-semibold text-green-800 mb-3">Revenue</h4>
        <div className="space-y-2">
          {getRevenueAccounts().map((account) => (
            <div key={account.accountName} className="flex justify-between">
              <span className="text-gray-700">{account.accountName}</span>
              <span className="font-medium text-gray-900">{formatCurrency(account.balance)}</span>
            </div>
          ))}
          <div className="border-t border-green-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-green-800">
              <span>Total Revenue</span>
              <span>{formatCurrency(filteredData.filteredSummary.totalRevenue)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-red-50 p-4 rounded-lg">
        <h4 className="font-semibold text-red-800 mb-3">Expenses</h4>
        <div className="space-y-2">
          {getExpenseAccounts().map((account) => (
            <div key={account.accountName} className="flex justify-between">
              <span className="text-gray-700">{account.accountName}</span>
              <span className="font-medium text-gray-900">{formatCurrency(account.balance)}</span>
            </div>
          ))}
          <div className="border-t border-red-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-red-800">
              <span>Total Expenses</span>
              <span>{formatCurrency(filteredData.filteredSummary.totalExpenses)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`p-4 rounded-lg ${filteredData.filteredSummary.netProfit >= 0 ? "bg-green-100" : "bg-red-100"}`}>
        <div className="flex justify-between items-center">
          <span className="text-lg font-semibold text-gray-900">Net Income</span>
          <span className={`text-xl font-bold ${filteredData.filteredSummary.netProfit >= 0 ? "text-green-600" : "text-red-600"}`}>
            {formatCurrency(filteredData.filteredSummary.netProfit)}
          </span>
        </div>
      </div>
    </div>
  )

  const renderBalanceSheet = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-center gap-4 mb-6">
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md" />
        <span className="text-gray-500">to</span>
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md" />
      </div>
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-gray-900">Balance Sheet</h3>
        <p className="text-gray-600">
          {endDate ? `As of ${formatLocalDate(endDate)}` : `As of ${formatLocalDate(new Date())}`}
        </p>
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-3">Assets</h4>
        <div className="space-y-2">
          {getAssetAccounts().map((account) => (
            <div key={account.accountName} className="flex justify-between">
              <span className="text-gray-700">{account.accountName}</span>
              <span className="font-medium text-gray-900">{formatCurrency(account.balance)}</span>
            </div>
          ))}
          <div className="border-t border-blue-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-blue-800">
              <span>Total Assets</span>
              <span>{formatCurrency(filteredData.filteredSummary.totalAssets)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-orange-50 p-4 rounded-lg mt-6">
        <h4 className="font-semibold text-orange-800 mb-3">Liabilities</h4>
        <div className="space-y-2">
          {getLiabilityAccounts().map((account) => (
            <div key={account.accountName} className="flex justify-between">
              <span className="text-gray-700">{account.accountName}</span>
              <span className="font-medium text-gray-900">{formatCurrency(account.balance)}</span>
            </div>
          ))}
          <div className="border-t border-orange-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-orange-800">
              <span>Total Liabilities</span>
              <span>{formatCurrency(filteredData.filteredSummary.totalLiabilities)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-purple-50 p-4 rounded-lg mt-6">
        <h4 className="font-semibold text-purple-800 mb-3">Capital</h4>
        <div className="space-y-2">
          {getCapitalAccounts().map((account) => (
            <div key={account.accountName} className="flex justify-between">
              <span className="text-gray-700">{account.accountName}</span>
              <span className="font-medium text-gray-900">{formatCurrency(account.balance)}</span>
            </div>
          ))}
          <div className="flex justify-between">
            <span className="text-gray-700">Net Income</span>
            <span className="font-medium text-gray-900">{formatCurrency(filteredData.filteredSummary.netProfit)}</span>
          </div>
          <div className="border-t border-purple-200 pt-2 mt-2">
            <div className="flex justify-between font-semibold text-purple-800">
              <span>Total Capital</span>
              <span>{formatCurrency(filteredData.filteredSummary.totalCapital + filteredData.filteredSummary.netProfit)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-gray-100 p-4 rounded-lg mt-6">
        <div className="mt-2 text-center">
          <span
            className={`font-bold ${
              Math.abs(
                filteredData.filteredSummary.totalAssets -
                  (filteredData.filteredSummary.totalLiabilities +
                    filteredData.filteredSummary.totalCapital +
                    filteredData.filteredSummary.netProfit)
              ) < 0.01
                ? "text-green-600"
                : "text-red-600"
            }`}
          >
            {formatCurrency(filteredData.filteredSummary.totalAssets)} ={" "}
            {formatCurrency(
              filteredData.filteredSummary.totalLiabilities +
                filteredData.filteredSummary.totalCapital +
                filteredData.filteredSummary.netProfit
            )}
          </span>
        </div>
      </div>
    </div>
  )

  const renderCashFlow = () => {
    const sections = cashFlow.sections
    const totals = cashFlow.totals
    const summary = cashFlow.summary

    const FormatSection = ({ title, rows, color }) => {
      const net =
        title === "Operating" ? totals.Operating : title === "Investing" ? totals.Investing : totals.Financing
      return (
        <div className={`p-4 rounded-lg ${color.bg}`}>
          <h4 className={`font-semibold ${color.text} mb-3`}>{title} Activities</h4>
          <div className="space-y-2">
            {rows.map((txn, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-700">{txn.description || txn.memo || "—"}</span>
                <span className="text-gray-900 font-medium">{formatCurrency(txn.__amount)}</span>
              </div>
            ))}
            <div className={`border-t ${color.border} pt-2 mt-2 flex justify-between font-semibold ${color.text}`}>
              <span>Net {title}</span>
              <span>{formatCurrency(net)}</span>
            </div>
          </div>
        </div>
      )
    }

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center gap-4 mb-6">
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="p-2 border rounded-md" />
          <span className="text-gray-500">to</span>
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="p-2 border rounded-md" />
        </div>

        <div className="text-center mb-6">
          <h3 className="text-xl font-bold text-gray-900">Cash Flow Statement</h3>
          <p className="text-gray-600">
            {startDate || endDate
              ? `For the period ${startDate ? formatLocalDate(startDate) : "…"} to ${endDate ? formatLocalDate(endDate) : "…"}`
              : `For the period up to ${formatLocalDate(new Date())}`}
          </p>
        </div>

        <FormatSection
          title="Operating"
          rows={sections.Operating}
          color={{ bg: "bg-blue-50", text: "text-blue-800", border: "border-blue-200" }}
        />
        <FormatSection
          title="Investing"
          rows={sections.Investing}
          color={{ bg: "bg-green-50", text: "text-green-800", border: "border-green-200" }}
        />
        <FormatSection
          title="Financing"
          rows={sections.Financing}
          color={{ bg: "bg-purple-50", text: "text-purple-800", border: "border-purple-200" }}
        />

        <div className="p-4 bg-yellow-50 rounded-lg mt-4 space-y-2">
          <div className="flex justify-between font-semibold text-yellow-800">
            <span>Beginning Cash</span>
            <span>{formatCurrency(summary.beginningCash)}</span>
          </div>
          <div className="flex justify-between font-semibold text-yellow-800">
            <span>Net Cash Flow</span>
            <span>{formatCurrency(summary.netChange)}</span>
          </div>
          <div className="flex justify-between font-bold text-yellow-900 border-t border-yellow-200 pt-2">
            <span>Ending Cash (Computed)</span>
            <span>{formatCurrency(summary.endingCashComputed)}</span>
          </div>
          <div className="flex justify-between text-sm text-gray-700">
            <span>Ending Cash (Direct from ledgers)</span>
            <span>{formatCurrency(summary.endingCashDirect)}</span>
          </div>
          <div
            className={`text-sm font-medium ${
              summary.reconciles ? "text-green-700" : "text-red-700"
            }`}
          >
            {summary.reconciles ? "Reconciled ✔ Beginning + Net = Ending" : "Warning: does not reconcile"}
          </div>
        </div>
      </div>
    )
  }

  const renderSelectedReport = () => {
    switch (selectedReport) {
      case "income-statement":
        return renderIncomeStatement()
      case "balance-sheet":
        return renderBalanceSheet()
      case "cash-flow":
        return renderCashFlow()
      case "trial-balance":
        return (
          <TrialBalance
            trialBalance={trialBalance}
            ledgers={ledgers}
            startDate={startDate}
            endDate={endDate}
            onStartDateChange={(date) => setStartDate(date)}
            onEndDateChange={(date) => setEndDate(date)}
            onClearDates={() => {
              setStartDate("")
              setEndDate("")
            }}
          />
        )
      default:
        return <div>Select a report to view</div>
    }
  }

  // ---------- Export handling ----------
  const handleExport = (format) => {
    const reportTitle = reports.find((r) => r.id === selectedReport)?.title || "Report"
    const dateRange = {
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }

    if (selectedReport === "trial-balance") {
      const { filteredTrialBalance, totalDebits, totalCredits } = calculateFilteredBalances()
      switch (format) {
        case "pdf":
          exportToPDF(filteredTrialBalance, totalDebits, totalCredits, dateRange)
          break
        case "excel":
          exportToExcel(filteredTrialBalance, totalDebits, totalCredits, dateRange)
          break
        case "doc":
          exportToDOC(filteredTrialBalance, totalDebits, totalCredits, dateRange)
          break
        default:
          break
      }
      setShowExportOptions(false)
      return
    }

    switch (format) {
      case "pdf": {
        const pdfData = getPdfData(selectedReport)
        if (pdfData) exportFinancialReportToPDF(reportTitle, pdfData, dateRange)
        break
      }
      case "excel": {
        const reportData = getReportData(selectedReport)
        if (reportData && reportData.excelData) exportFinancialReportToExcel(reportTitle, reportData.excelData)
        break
      }
      case "doc": {
        const reportContentHtml = getReportHtml(selectedReport)
        exportFinancialReportToDOC(reportTitle, reportContentHtml, dateRange)
        break
      }
      default:
        break
    }
    setShowExportOptions(false)
  }

  const getPdfData = (reportId) => {
    const data = []
    switch (reportId) {
      case "income-statement":
        data.push({
          title: "Revenue",
          table: { head: [["Account", "Amount"]], body: getRevenueAccounts().map((acc) => [acc.accountName, acc.balance]) },
        })
        data.push({ summary: { text: "Total Revenue", value: filteredData.filteredSummary.totalRevenue } })
        data.push({
          title: "Expenses",
          table: { head: [["Account", "Amount"]], body: getExpenseAccounts().map((acc) => [acc.accountName, acc.balance]) },
        })
        data.push({ summary: { text: "Total Expenses", value: filteredData.filteredSummary.totalExpenses } })
        data.push({ summary: { text: "Net Income", value: filteredData.filteredSummary.netProfit } })
        break

      case "balance-sheet":
        data.push({
          title: "Assets",
          table: { head: [["Account", "Amount"]], body: getAssetAccounts().map((acc) => [acc.accountName, acc.balance]) },
        })
        data.push({ summary: { text: "Total Assets", value: filteredData.filteredSummary.totalAssets } })
        data.push({
          title: "Liabilities",
          table: { head: [["Account", "Amount"]], body: getLiabilityAccounts().map((acc) => [acc.accountName, acc.balance]) },
        })
        data.push({ summary: { text: "Total Liabilities", value: filteredData.filteredSummary.totalLiabilities } })
        data.push({
          title: "Capital",
          table: { head: [["Account", "Amount"]], body: getCapitalAccounts().map((acc) => [acc.accountName, acc.balance]) },
        })
        data.push({ summary: { text: "Net Income", value: filteredData.filteredSummary.netProfit } })
        data.push({
          summary: { text: "Total Capital", value: filteredData.filteredSummary.totalCapital + filteredData.filteredSummary.netProfit },
        })
        data.push({
          summary: {
            text: "Balance Check",
            value: `${filteredData.filteredSummary.totalAssets} = ${
              filteredData.filteredSummary.totalLiabilities +
              filteredData.filteredSummary.totalCapital +
              filteredData.filteredSummary.netProfit
            }`,
          },
        })
        break

      case "cash-flow": {
        // Use perfected cashFlow data
        const sections = cashFlow.sections
        const totals = cashFlow.totals
        const summary = cashFlow.summary

        data.push({
          title: "Operating Activities",
          table: {
            head: [["Description", "Amount"]],
            body: sections.Operating.map((txn) => [txn.description || txn.memo || "—", txn.__amount]),
          },
        })
        data.push({ summary: { text: "Net Operating", value: totals.Operating } })

        data.push({
          title: "Investing Activities",
          table: {
            head: [["Description", "Amount"]],
            body: sections.Investing.map((txn) => [txn.description || txn.memo || "—", txn.__amount]),
          },
        })
        data.push({ summary: { text: "Net Investing", value: totals.Investing } })

        data.push({
          title: "Financing Activities",
          table: {
            head: [["Description", "Amount"]],
            body: sections.Financing.map((txn) => [txn.description || txn.memo || "—", txn.__amount]),
          },
        })
        data.push({ summary: { text: "Net Financing", value: totals.Financing } })

        data.push({ summary: { text: "Beginning Cash", value: summary.beginningCash } })
        data.push({ summary: { text: "Net Cash Flow", value: summary.netChange } })
        data.push({ summary: { text: "Ending Cash (Computed)", value: summary.endingCashComputed } })
        data.push({ summary: { text: "Ending Cash (Direct)", value: summary.endingCashDirect } })
        data.push({ summary: { text: "Reconciled", value: summary.reconciles ? "Yes" : "No" } })
        break
      }

      default:
        return null
    }
    return data
  }

  const getReportData = (reportId) => {
    const dateRangeText =
      startDate || endDate ? `Period: ${startDate || "Start"} to ${endDate || "End"}` : "All Transactions"

    switch (reportId) {
      case "income-statement": {
        const revenueData = [["Revenue", "Amount"]].concat(getRevenueAccounts().map((acc) => [acc.accountName, acc.balance]))
        revenueData.push(["Total Revenue", filteredData.filteredSummary.totalRevenue])

        const expenseData = [["Expenses", "Amount"]].concat(getExpenseAccounts().map((acc) => [acc.accountName, acc.balance]))
        expenseData.push(["Total Expenses", filteredData.filteredSummary.totalExpenses])

        const netIncomeData = [["Net Income", filteredData.filteredSummary.netProfit]]

        return {
          excelData: [["Income Statement"], [dateRangeText], [""], ...revenueData, [""], ...expenseData, [""], ...netIncomeData],
        }
      }

      case "balance-sheet": {
        const assetsData = [["Assets", "Amount"]].concat(getAssetAccounts().map((acc) => [acc.accountName, acc.balance]))
        assetsData.push(["Total Assets", filteredData.filteredSummary.totalAssets])

        const liabilitiesData = [["Liabilities", "Amount"]].concat(
          getLiabilityAccounts().map((acc) => [acc.accountName, acc.balance])
        )
        liabilitiesData.push(["Total Liabilities", filteredData.filteredSummary.totalLiabilities])

        const capitalData = [["Capital", "Amount"]].concat(
          getCapitalAccounts().map((acc) => [acc.accountName, acc.balance]),
          [["Net Income", filteredData.filteredSummary.netProfit]]
        )
        capitalData.push(["Total Capital", filteredData.filteredSummary.totalCapital + filteredData.filteredSummary.netProfit])

        return {
          excelData: [
            ["Balance Sheet"],
            [dateRangeText],
            [""],
            ...assetsData,
            [""],
            ...liabilitiesData,
            [""],
            ...capitalData,
            [""],
            [
              "Balance Check",
              `${filteredData.filteredSummary.totalAssets} = ${
                filteredData.filteredSummary.totalLiabilities +
                filteredData.filteredSummary.totalCapital +
                filteredData.filteredSummary.netProfit
              }`,
            ],
          ],
        }
      }

      case "cash-flow": {
        const sections = cashFlow.sections
        const totals = cashFlow.totals
        const summary = cashFlow.summary

        const operatingData = [["Operating Activities", "Amount"]].concat(
          sections.Operating.map((txn) => [txn.description || txn.memo || "—", txn.__amount])
        )
        operatingData.push(["Net Operating", totals.Operating])

        const investingData = [["Investing Activities", "Amount"]].concat(
          sections.Investing.map((txn) => [txn.description || txn.memo || "—", txn.__amount])
        )
        investingData.push(["Net Investing", totals.Investing])

        const financingData = [["Financing Activities", "Amount"]].concat(
          sections.Financing.map((txn) => [txn.description || txn.memo || "—", txn.__amount])
        )
        financingData.push(["Net Financing", totals.Financing])

        const reconData = [
          ["Beginning Cash", summary.beginningCash],
          ["Net Cash Flow", summary.netChange],
          ["Ending Cash (Computed)", summary.endingCashComputed],
          ["Ending Cash (Direct)", summary.endingCashDirect],
          ["Reconciled", summary.reconciles ? "Yes" : "No"],
        ]

        return {
          excelData: [["Cash Flow Statement"], [dateRangeText], [""], ...operatingData, [""], ...investingData, [""], ...financingData, [""], ...reconData],
        }
      }

      default:
        return null
    }
  }

  const getReportHtml = (reportId) => {
    switch (reportId) {
      case "income-statement":
        return `
          <div class="section">
            <div class="section-title">Revenue</div>
            <div class="space-y-2">
              ${getRevenueAccounts()
                .map(
                  (account) => `
                  <div class="item"><span>${account.accountName}</span><span>${formatCurrency(account.balance)}</span></div>`
                )
                .join("")}
              <div class="total"><span>Total Revenue</span><span>${formatCurrency(filteredData.filteredSummary.totalRevenue)}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Expenses</div>
            <div class="space-y-2">
              ${getExpenseAccounts()
                .map(
                  (account) => `
                  <div class="item"><span>${account.accountName}</span><span>${formatCurrency(account.balance)}</span></div>`
                )
                .join("")}
              <div class="total"><span>Total Expenses</span><span>${formatCurrency(filteredData.filteredSummary.totalExpenses)}</span></div>
            </div>
          </div>
          <div class="total" style="font-size: 1.2em;">
            <span>Net Income</span><span>${formatCurrency(filteredData.filteredSummary.netProfit)}</span>
          </div>`

      case "balance-sheet":
        return `
          <div class="section">
            <div class="section-title">Assets</div>
            <div class="space-y-2">
              ${getAssetAccounts()
                .map(
                  (account) => `
                  <div class="item"><span>${account.accountName}</span><span>${formatCurrency(account.balance)}</span></div>`
                )
                .join("")}
              <div class="total"><span>Total Assets</span><span>${formatCurrency(filteredData.filteredSummary.totalAssets)}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Liabilities</div>
            <div class="space-y-2">
              ${getLiabilityAccounts()
                .map(
                  (account) => `
                  <div class="item"><span>${account.accountName}</span><span>${formatCurrency(account.balance)}</span></div>`
                )
                .join("")}
              <div class="total"><span>Total Liabilities</span><span>${formatCurrency(filteredData.filteredSummary.totalLiabilities)}</span></div>
            </div>
          </div>
          <div class="section">
            <div class="section-title">Capital</div>
            <div class="space-y-2">
              ${getCapitalAccounts()
                .map(
                  (account) => `
                  <div class="item"><span>${account.accountName}</span><span>${formatCurrency(account.balance)}</span></div>`
                )
                .join("")}
              <div class="item"><span>Net Income</span><span>${formatCurrency(filteredData.filteredSummary.netProfit)}</span></div>
              <div class="total"><span>Total Capital</span><span>${formatCurrency(filteredData.filteredSummary.totalCapital + filteredData.filteredSummary.netProfit)}</span></div>
            </div>
          </div>
          <div class="total" style="font-size: 1.1em; border-top: 2px solid #2c3e50;">
            <span>Balance Check:</span>
            <span>${formatCurrency(filteredData.filteredSummary.totalAssets)} = ${formatCurrency(filteredData.filteredSummary.totalLiabilities + filteredData.filteredSummary.totalCapital + filteredData.filteredSummary.netProfit)}</span>
          </div>`

      case "cash-flow": {
        const sections = cashFlow.sections
        const totals = cashFlow.totals
        const summary = cashFlow.summary

        const formatSectionHtml = (title, rows, net) => `
          <div class="section">
            <div class="section-title">${title} Activities</div>
            <div class="space-y-2">
              ${rows
                .map(
                  (txn) => `
                  <div class="item"><span>${txn.description || txn.memo || "—"}</span><span>${formatCurrency(txn.__amount)}</span></div>`
                )
                .join("")}
              <div class="total"><span>Net ${title}</span><span>${formatCurrency(net)}</span></div>
            </div>
          </div>`

        return `
          ${formatSectionHtml("Operating", sections.Operating, totals.Operating)}
          ${formatSectionHtml("Investing", sections.Investing, totals.Investing)}
          ${formatSectionHtml("Financing", sections.Financing, totals.Financing)}
          <div class="total" style="font-size: 1.2em;">
            <span>Beginning Cash</span><span>${formatCurrency(summary.beginningCash)}</span>
          </div>
          <div class="total" style="font-size: 1.2em;">
            <span>Net Cash Flow</span><span>${formatCurrency(summary.netChange)}</span>
          </div>
          <div class="total" style="font-size: 1.2em;">
            <span>Ending Cash (Computed)</span><span>${formatCurrency(summary.endingCashComputed)}</span>
          </div>
          <div class="total" style="font-size: 1.0em;">
            <span>Ending Cash (Direct)</span><span>${formatCurrency(summary.endingCashDirect)}</span>
          </div>
          <div class="total" style="font-size: 1.0em;">
            <span>Reconciled</span><span>${summary.reconciles ? "Yes" : "No"}</span>
          </div>`
      }

      default:
        return ""
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Financial Reports</h2>
          <div className="relative">
            <button
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-md border border-gray-300 hover:bg-gray-200 transition-colors"
            >
              <Download size={16} />
              Export
              <ChevronDown size={16} className={`transform transition-transform ${showExportOptions ? "rotate-180" : ""}`} />
            </button>
            {showExportOptions && (
              <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                <button onClick={() => handleExport("pdf")} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Export to PDF
                </button>
                <button onClick={() => handleExport("excel")} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Export to Excel
                </button>
                <button onClick={() => handleExport("doc")} className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  Export to DOC
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <div className="space-y-3 lg:col-span-1">
            {reports.map((report) => {
              const Icon = report.icon
              return (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report.id)}
                  className={`w-full p-4 text-left rounded-lg border transition-colors ${
                    selectedReport === report.id ? report.color : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-6 w-6" />
                    <div>
                      <p className="font-medium">{report.title}</p>
                      <p className="text-sm opacity-75">{report.description}</p>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <div className="lg:col-span-3">
            <div className="bg-gray-50 p-6 rounded-lg min-h-96">{renderSelectedReport()}</div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Reports
