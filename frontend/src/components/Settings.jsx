import { saveAs } from "file-saver"
import { jsPDF } from "jspdf"
import "jspdf-autotable"
import { Bell, BellOff, Download, Info, LogOut, Mail, Moon, SettingsIcon, Shield, Sun } from "lucide-react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useTheme } from "../context/ThemeContext"
import auth from "../firebase/firebase.init"
import { formatCurrency } from "../utils/accounting"
import { exportToDOC, exportToPDF } from "../utils/trialBalanceExporter"

const Settings = ({ financialSummary, ledgers, trialBalance }) => {
  const navigate = useNavigate()
  const { theme, toggleTheme, isDark } = useTheme()
  const [notifications, setNotifications] = useState({
    lowBalanceWarning: true,
    mismatchedEntries: true,
  })
  const [exportStatus, setExportStatus] = useState("")

  const handleLogout = async () => {
    await auth.signOut()
    navigate("/")
  }

  const handleExport = async (format, dataType) => {
    try {
      setExportStatus(`Exporting ${dataType} as ${format}...`)

      if (dataType === "Trial Balance") {
        // Use existing trial balance export functions
        const filteredTrialBalance = calculateFilteredTrialBalance()
        const totalDebits = filteredTrialBalance.reduce((sum, entry) => sum + entry.debit, 0)
        const totalCredits = filteredTrialBalance.reduce((sum, entry) => sum + entry.credit, 0)

        switch (format) {
          case "CSV":
            exportTrialBalanceToCSV(filteredTrialBalance, totalDebits, totalCredits)
            break
          case "PDF":
            exportToPDF(filteredTrialBalance, totalDebits, totalCredits, {})
            break
          case "DOC":
            exportToDOC(filteredTrialBalance, totalDebits, totalCredits, {})
            break
        }
      } else if (dataType === "Income Statement") {
        switch (format) {
          case "CSV":
            exportIncomeStatementToCSV()
            break
          case "PDF":
            exportIncomeStatementToPDF()
            break
          case "DOC":
            exportIncomeStatementToDOC()
            break
        }
      } else if (dataType === "Balance Sheet") {
        switch (format) {
          case "CSV":
            exportBalanceSheetToCSV()
            break
          case "PDF":
            exportBalanceSheetToPDF()
            break
          case "DOC":
            exportBalanceSheetToDOC()
            break
        }
      }

      setExportStatus(`${dataType} exported successfully as ${format}!`)
      setTimeout(() => setExportStatus(""), 3000)
    } catch (error) {
      console.error("Export error:", error)
      setExportStatus(`Failed to export ${dataType} as ${format}`)
      setTimeout(() => setExportStatus(""), 3000)
    }
  }

  const calculateFilteredTrialBalance = () => {
    return trialBalance
      .map((entry) => {
        const accountLedger = ledgers.find((l) => l.accountName === entry.accountName)
        if (!accountLedger) return entry

        const totalDebit = (accountLedger.transactions || []).reduce((sum, txn) => sum + Number(txn.debit || 0), 0)
        const totalCredit = (accountLedger.transactions || []).reduce((sum, txn) => sum + Number(txn.credit || 0), 0)

        let adjustedDebit = totalDebit
        let adjustedCredit = totalCredit

        if (accountLedger.openingBalance) {
          const isDebitNormal = ["Assets", "Expenses"].includes(entry.category)
          const openingBalance = Number(accountLedger.openingBalance || 0)

          if (isDebitNormal) {
            if (openingBalance > 0) adjustedDebit += openingBalance
            else adjustedCredit += Math.abs(openingBalance)
          } else {
            if (openingBalance > 0) adjustedCredit += openingBalance
            else adjustedDebit += Math.abs(openingBalance)
          }
        }

        const netDebit = adjustedDebit > adjustedCredit ? adjustedDebit - adjustedCredit : 0
        const netCredit = adjustedCredit > adjustedDebit ? adjustedCredit - adjustedDebit : 0

        return {
          ...entry,
          debit: netDebit,
          credit: netCredit,
        }
      })
      .filter((entry) => entry.debit > 0 || entry.credit > 0)
  }

  const exportTrialBalanceToCSV = (filteredTrialBalance, totalDebits, totalCredits) => {
    const csvData = [
      ["Account Name", "Account Type", "Debit", "Credit"],
      ...filteredTrialBalance.map((entry) => [
        entry.accountName,
        entry.accountType,
        entry.debit > 0 ? entry.debit.toFixed(2) : "",
        entry.credit > 0 ? entry.credit.toFixed(2) : "",
      ]),
      ["TOTAL", "", totalDebits.toFixed(2), totalCredits.toFixed(2)],
    ]

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    saveAs(blob, "trial_balance.csv")
  }

  const exportIncomeStatementToCSV = () => {
    const revenueAccounts = ledgers.filter((l) => l.category === "Revenues")
    const expenseAccounts = ledgers.filter((l) => l.category === "Expenses")

    const csvData = [
      ["Income Statement"],
      [""],
      ["Revenue"],
      ["Account Name", "Amount"],
      ...revenueAccounts.map((acc) => [acc.accountName, (acc.balance || 0).toFixed(2)]),
      ["Total Revenue", financialSummary.totalRevenue.toFixed(2)],
      [""],
      ["Expenses"],
      ["Account Name", "Amount"],
      ...expenseAccounts.map((acc) => [acc.accountName, (acc.balance || 0).toFixed(2)]),
      ["Total Expenses", financialSummary.totalExpenses.toFixed(2)],
      [""],
      ["Net Income", financialSummary.netProfit.toFixed(2)],
    ]

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    saveAs(blob, "income_statement.csv")
  }

  const exportBalanceSheetToCSV = () => {
    const assetAccounts = ledgers.filter((l) => l.category === "Assets")
    const liabilityAccounts = ledgers.filter((l) => l.category === "Liabilities")
    const capitalAccounts = ledgers.filter((l) => l.category === "Capital")

    const csvData = [
      ["Balance Sheet"],
      [""],
      ["Assets"],
      ["Account Name", "Amount"],
      ...assetAccounts.map((acc) => [acc.accountName, (acc.balance || 0).toFixed(2)]),
      ["Total Assets", financialSummary.totalAssets.toFixed(2)],
      [""],
      ["Liabilities"],
      ["Account Name", "Amount"],
      ...liabilityAccounts.map((acc) => [acc.accountName, (acc.balance || 0).toFixed(2)]),
      ["Total Liabilities", financialSummary.totalLiabilities.toFixed(2)],
      [""],
      ["Capital"],
      ["Account Name", "Amount"],
      ...capitalAccounts.map((acc) => [acc.accountName, (acc.balance || 0).toFixed(2)]),
      ["Net Income", financialSummary.netProfit.toFixed(2)],
      ["Total Capital", (financialSummary.totalCapital + financialSummary.netProfit).toFixed(2)],
    ]

    const csvContent = csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
    saveAs(blob, "balance_sheet.csv")
  }

  const exportIncomeStatementToPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm" })
    doc.setFont("Helvetica")
    doc.setFontSize(16)
    doc.text("Income Statement", 105, 15, { align: "center" })

    const revenueAccounts = ledgers.filter((l) => l.category === "Revenues")
    const expenseAccounts = ledgers.filter((l) => l.category === "Expenses")

    let yPos = 30

    // Revenue section
    doc.setFontSize(12)
    doc.text("Revenue", 14, yPos)
    yPos += 8

    doc.autoTable({
      startY: yPos,
      head: [["Account", "Amount"]],
      body: revenueAccounts.map((acc) => [acc.accountName, formatCurrency(acc.balance || 0)]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    })
    yPos = doc.autoTable.previous.finalY + 5

    doc.setFontSize(12)
    doc.text("Total Revenue", 14, yPos)
    doc.text(formatCurrency(financialSummary.totalRevenue), doc.internal.pageSize.width - 14, yPos, { align: "right" })
    yPos += 10

    // Expenses section
    doc.text("Expenses", 14, yPos)
    yPos += 8

    doc.autoTable({
      startY: yPos,
      head: [["Account", "Amount"]],
      body: expenseAccounts.map((acc) => [acc.accountName, formatCurrency(acc.balance || 0)]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    })
    yPos = doc.autoTable.previous.finalY + 5

    doc.text("Total Expenses", 14, yPos)
    doc.text(formatCurrency(financialSummary.totalExpenses), doc.internal.pageSize.width - 14, yPos, { align: "right" })
    yPos += 10

    doc.text("Net Income", 14, yPos)
    doc.text(formatCurrency(financialSummary.netProfit), doc.internal.pageSize.width - 14, yPos, { align: "right" })

    doc.save("income_statement.pdf")
  }

  const exportBalanceSheetToPDF = () => {
    const doc = new jsPDF({ orientation: "portrait", unit: "mm" })
    doc.setFont("Helvetica")
    doc.setFontSize(16)
    doc.text("Balance Sheet", 105, 15, { align: "center" })

    const assetAccounts = ledgers.filter((l) => l.category === "Assets")
    const liabilityAccounts = ledgers.filter((l) => l.category === "Liabilities")
    const capitalAccounts = ledgers.filter((l) => l.category === "Capital")

    let yPos = 30

    // Assets section
    doc.setFontSize(12)
    doc.text("Assets", 14, yPos)
    yPos += 8

    doc.autoTable({
      startY: yPos,
      head: [["Account", "Amount"]],
      body: assetAccounts.map((acc) => [acc.accountName, formatCurrency(acc.balance || 0)]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    })
    yPos = doc.autoTable.previous.finalY + 5

    doc.text("Total Assets", 14, yPos)
    doc.text(formatCurrency(financialSummary.totalAssets), doc.internal.pageSize.width - 14, yPos, { align: "right" })
    yPos += 15

    // Liabilities section
    doc.text("Liabilities", 14, yPos)
    yPos += 8

    doc.autoTable({
      startY: yPos,
      head: [["Account", "Amount"]],
      body: liabilityAccounts.map((acc) => [acc.accountName, formatCurrency(acc.balance || 0)]),
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    })
    yPos = doc.autoTable.previous.finalY + 5

    doc.text("Total Liabilities", 14, yPos)
    doc.text(formatCurrency(financialSummary.totalLiabilities), doc.internal.pageSize.width - 14, yPos, {
      align: "right",
    })
    yPos += 15

    // Capital section
    doc.text("Capital", 14, yPos)
    yPos += 8

    const capitalData = [
      ...capitalAccounts.map((acc) => [acc.accountName, formatCurrency(acc.balance || 0)]),
      ["Net Income", formatCurrency(financialSummary.netProfit)],
    ]

    doc.autoTable({
      startY: yPos,
      head: [["Account", "Amount"]],
      body: capitalData,
      theme: "grid",
      styles: { fontSize: 10, cellPadding: 2 },
      headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    })
    yPos = doc.autoTable.previous.finalY + 5

    doc.text("Total Capital", 14, yPos)
    doc.text(
      formatCurrency(financialSummary.totalCapital + financialSummary.netProfit),
      doc.internal.pageSize.width - 14,
      yPos,
      { align: "right" },
    )

    doc.save("balance_sheet.pdf")
  }

  const exportIncomeStatementToDOC = () => {
    const revenueAccounts = ledgers.filter((l) => l.category === "Revenues")
    const expenseAccounts = ledgers.filter((l) => l.category === "Expenses")

    const docContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Income Statement</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2c3e50; margin-bottom: 20px; text-align: center; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; background-color: #f8f9fa; padding: 8px; border-radius: 4px; }
          .item { display: flex; justify-content: space-between; padding: 4px 0; }
          .total { display: flex; justify-content: space-between; font-weight: bold; padding: 8px 0; border-top: 1px solid #dee2e6; }
        </style>
      </head>
      <body>
        <h1>Income Statement</h1>
        <div class="section">
          <div class="section-title">Revenue</div>
          ${revenueAccounts.map((acc) => `<div class="item"><span>${acc.accountName}</span><span>${formatCurrency(acc.balance || 0)}</span></div>`).join("")}
          <div class="total"><span>Total Revenue</span><span>${formatCurrency(financialSummary.totalRevenue)}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Expenses</div>
          ${expenseAccounts.map((acc) => `<div class="item"><span>${acc.accountName}</span><span>${formatCurrency(acc.balance || 0)}</span></div>`).join("")}
          <div class="total"><span>Total Expenses</span><span>${formatCurrency(financialSummary.totalExpenses)}</span></div>
        </div>
        <div class="total" style="font-size: 1.2em;">
          <span>Net Income</span><span>${formatCurrency(financialSummary.netProfit)}</span>
        </div>
      </body>
      </html>`

    const blob = new Blob([docContent], { type: "application/msword;charset=UTF-8" })
    saveAs(blob, "income_statement.doc")
  }

  const exportBalanceSheetToDOC = () => {
    const assetAccounts = ledgers.filter((l) => l.category === "Assets")
    const liabilityAccounts = ledgers.filter((l) => l.category === "Liabilities")
    const capitalAccounts = ledgers.filter((l) => l.category === "Capital")

    const docContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Balance Sheet</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #2c3e50; margin-bottom: 20px; text-align: center; }
          .section { margin-bottom: 20px; }
          .section-title { font-weight: bold; background-color: #f8f9fa; padding: 8px; border-radius: 4px; }
          .item { display: flex; justify-content: space-between; padding: 4px 0; }
          .total { display: flex; justify-content: space-between; font-weight: bold; padding: 8px 0; border-top: 1px solid #dee2e6; }
        </style>
      </head>
      <body>
        <h1>Balance Sheet</h1>
        <div class="section">
          <div class="section-title">Assets</div>
          ${assetAccounts.map((acc) => `<div class="item"><span>${acc.accountName}</span><span>${formatCurrency(acc.balance || 0)}</span></div>`).join("")}
          <div class="total"><span>Total Assets</span><span>${formatCurrency(financialSummary.totalAssets)}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Liabilities</div>
          ${liabilityAccounts.map((acc) => `<div class="item"><span>${acc.accountName}</span><span>${formatCurrency(acc.balance || 0)}</span></div>`).join("")}
          <div class="total"><span>Total Liabilities</span><span>${formatCurrency(financialSummary.totalLiabilities)}</span></div>
        </div>
        <div class="section">
          <div class="section-title">Capital</div>
          ${capitalAccounts.map((acc) => `<div class="item"><span>${acc.accountName}</span><span>${formatCurrency(acc.balance || 0)}</span></div>`).join("")}
          <div class="item"><span>Net Income</span><span>${formatCurrency(financialSummary.netProfit)}</span></div>
          <div class="total"><span>Total Capital</span><span>${formatCurrency(financialSummary.totalCapital + financialSummary.netProfit)}</span></div>
        </div>
      </body>
      </html>`

    const blob = new Blob([docContent], { type: "application/msword;charset=UTF-8" })
    saveAs(blob, "balance_sheet.doc")
  }

  const toggleNotification = (type) => {
    setNotifications((prev) => ({
      ...prev,
      [type]: !prev[type],
    }))
  }

  return (
    <div className={`max-w-4xl mx-auto space-y-6 ${isDark ? "text-white" : ""}`}>
      {/* Header */}
      <div
        className={`rounded-lg shadow-sm border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <div className="flex items-center space-x-3">
          <SettingsIcon className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className={`text-2xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>Settings</h1>
            <p className={`${isDark ? "text-gray-300" : "text-gray-600"}`}>
              Manage your account preferences and app settings
            </p>
          </div>
        </div>
      </div>

      {exportStatus && (
        <div
          className={`p-4 rounded-lg ${exportStatus.includes("successfully") ? "bg-green-50 text-green-700" : exportStatus.includes("Failed") ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"}`}
        >
          {exportStatus}
        </div>
      )}

      {/* General Preferences */}
      <div
        className={`rounded-lg shadow-sm border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>General Preferences</h2>

        <div className="flex items-center justify-between py-3">
          <div className="flex items-center space-x-3">
            {theme === "light" ? (
              <Sun className="h-5 w-5 text-yellow-500" />
            ) : (
              <Moon className="h-5 w-5 text-blue-500" />
            )}
            <div>
              <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Theme</p>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Choose your preferred theme</p>
            </div>
          </div>
          <button
            onClick={toggleTheme}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              theme === "dark" ? "bg-blue-600" : "bg-gray-200"
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                theme === "dark" ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>
      </div>

      {/* Notifications */}
      <div
        className={`rounded-lg shadow-sm border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Notifications</h2>

        <div className="space-y-4">
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              {notifications.lowBalanceWarning ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Low Balance Warning</p>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Get notified when account balances are low
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification("lowBalanceWarning")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.lowBalanceWarning ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.lowBalanceWarning ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between py-3">
            <div className="flex items-center space-x-3">
              {notifications.mismatchedEntries ? (
                <Bell className="h-5 w-5 text-green-500" />
              ) : (
                <BellOff className="h-5 w-5 text-gray-400" />
              )}
              <div>
                <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Mismatched Debit/Credit</p>
                <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                  Alert when journal entries don't balance
                </p>
              </div>
            </div>
            <button
              onClick={() => toggleNotification("mismatchedEntries")}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notifications.mismatchedEntries ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notifications.mismatchedEntries ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Data Management */}
      <div
        className={`rounded-lg shadow-sm border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Data Management</h2>
        <p className={`mb-4 ${isDark ? "text-gray-300" : "text-gray-600"}`}>
          Export your accounting data in various formats
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Trial Balance */}
          <div className={`border rounded-lg p-4 ${isDark ? "border-gray-600" : "border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Trial Balance</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleExport("CSV", "Trial Balance")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => handleExport("PDF", "Trial Balance")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </button>
              <button
                onClick={() => handleExport("DOC", "Trial Balance")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                <Download className="h-4 w-4 mr-2" />
                DOC
              </button>
            </div>
          </div>

          {/* Income Statement */}
          <div className={`border rounded-lg p-4 ${isDark ? "border-gray-600" : "border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Income Statement</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleExport("CSV", "Income Statement")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => handleExport("PDF", "Income Statement")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </button>
              <button
                onClick={() => handleExport("DOC", "Income Statement")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                <Download className="h-4 w-4 mr-2" />
                DOC
              </button>
            </div>
          </div>

          {/* Balance Sheet */}
          <div className={`border rounded-lg p-4 ${isDark ? "border-gray-600" : "border-gray-200"}`}>
            <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>Balance Sheet</h3>
            <div className="space-y-2">
              <button
                onClick={() => handleExport("CSV", "Balance Sheet")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-green-50 text-green-700 rounded hover:bg-green-100"
              >
                <Download className="h-4 w-4 mr-2" />
                CSV
              </button>
              <button
                onClick={() => handleExport("PDF", "Balance Sheet")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-red-50 text-red-700 rounded hover:bg-red-100"
              >
                <Download className="h-4 w-4 mr-2" />
                PDF
              </button>
              <button
                onClick={() => handleExport("DOC", "Balance Sheet")}
                className="w-full flex items-center justify-center px-3 py-2 text-sm bg-blue-50 text-blue-700 rounded hover:bg-blue-100"
              >
                <Download className="h-4 w-4 mr-2" />
                DOC
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* App Information */}
      <div
        className={`rounded-lg shadow-sm border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>App Information</h2>

        <div className="space-y-4">
          <div
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
          >
            <Info className="h-5 w-5 text-blue-600" />
            <div>
              <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>About FinanceFlow</p>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>
                Version 1.0.0 - Professional accounting software
              </p>
            </div>
          </div>

          <div
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
          >
            <Shield className="h-5 w-5 text-green-600" />
            <div>
              <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Privacy Policy</p>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Learn how we protect your data</p>
            </div>
          </div>

          <div
            className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
          >
            <Mail className="h-5 w-5 text-purple-600" />
            <div>
              <p className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>Privacy Policy</p>
              <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-600"}`}>Get help with your account</p>
            </div>
          </div>
        </div>
      </div>

      {/* Logout Section */}
      <div
        className={`rounded-lg shadow-sm border p-6 ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}
      >
        <h2 className={`text-lg font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>Account</h2>

        <button
          onClick={handleLogout}
          className="flex items-center space-x-3 px-4 py-3 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition-colors w-full md:w-auto"
        >
          <LogOut className="h-5 w-5" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  )
}

export default Settings;
