import { useAuthState } from "react-firebase-hooks/auth"
import { Route, Routes, useLocation } from "react-router-dom"
import Dashboard from "./components/Dashboard"
import Home from "./components/Home"
import JournalEntries from "./components/JournalEntries"
import Ledger from "./components/Ledger"
import Navigation from "./components/Navigation"
import NotFound from "./components/NotFound"
import Payments from "./components/Payments"
import Profile from "./components/Profile"
import Receipts from "./components/Receipts"
import Reports from "./components/Reports"
import Settings from "./components/Settings"
import ProtectedRoute from "./context/AuthContext"
import { ThemeProvider, useTheme } from "./context/ThemeContext"
import auth from "./firebase/firebase.init"
import { useAccountingData } from "./hooks/useAccountingData"

function AppContent() {
  const location = useLocation()
  const [user, loading] = useAuthState(auth)
  const { isDark } = useTheme()
  const {
    journalEntries,
    ledgers,
    trialBalance,
    financialSummary,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    clearAllData,
  } = useAccountingData()

  const { processYearEnd } = useAccountingData()

  const validAuthenticatedRoutes = [
    "/dashboard",
    "/journal-entries",
    "/ledger",
    "/reports",
    "/receipts",
    "/payments",
    "/settings",
    "/profile",
  ]
  const isLandingPage = location.pathname === "/"
  const isExactValidRoute =
    validAuthenticatedRoutes.includes(location.pathname) || location.pathname.startsWith("/journal-entries/")
  const isInvalidRoute = !isLandingPage && !isExactValidRoute

  if (loading) return <p>Loading...</p>

  if (isInvalidRoute) {
    return <NotFound />
  }

  return (
    <div
      className={`min-h-screen ${!isLandingPage && user && isExactValidRoute ? (isDark ? "bg-gray-900" : "bg-gray-50") : "bg-gray-50"}`}
    >
      {!isLandingPage && user && isExactValidRoute && <Navigation />}

      <main
        className={!isLandingPage && user && isExactValidRoute ? "max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8" : ""}
      >
        <Routes>
          <Route path="/" element={<Home />} />

          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard financialSummary={financialSummary} recentEntries={journalEntries.slice(-10).reverse()} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/journal-entries/*"
            element={
              <ProtectedRoute>
                <JournalEntries
                  journalEntries={journalEntries}
                  ledgers={ledgers}
                  onAddEntry={addJournalEntry}
                  onUpdateEntry={updateJournalEntry}
                  onDeleteEntry={deleteJournalEntry}
                />
              </ProtectedRoute>
            }
          />
          <Route
            path="/ledger"
            element={
              <ProtectedRoute>
                <Ledger ledgers={ledgers} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/reports"
            element={
              <ProtectedRoute>
                <Reports financialSummary={financialSummary} ledgers={ledgers} trialBalance={trialBalance} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/receipts"
            element={
              <ProtectedRoute>
                <Receipts onAddEntry={addJournalEntry} existingLedgers={ledgers} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments onAddEntry={addJournalEntry} existingLedgers={ledgers} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings financialSummary={financialSummary} ledgers={ledgers} trialBalance={trialBalance} />
              </ProtectedRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <ProtectedRoute>
                <Profile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  )
}

export default App
