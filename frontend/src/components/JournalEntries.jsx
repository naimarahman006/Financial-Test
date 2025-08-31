import { ArrowLeft, FileText, Plus } from "lucide-react"
import React, { useState } from "react"
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom"
import { formatCurrency, sortTransactionsByDate } from "../utils/accounting"
import JournalEntryForm from "./JournalEntryForm"

function EditJournalEntry({ journalEntries, ledgers, onUpdateEntry }) {
  const { id } = useParams()
  const navigate = useNavigate()

  const entryToEdit = journalEntries.find((entry) => entry.id === id)

  if (!entryToEdit) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            to="/journal-entries"
            className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Journal Entries
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">
            <strong>Entry not found:</strong> The journal entry you're trying to edit doesn't exist.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4">
        <Link
          to="/journal-entries"
          className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Journal Entries
        </Link>
      </div>
      <JournalEntryForm
        initialEntry={entryToEdit}
        onSaveEntry={(entry) => {
          onUpdateEntry(entry)
          navigate("/journal-entries")
        }}
        isEditing={true}
        existingLedgers={ledgers}
      />
    </div>
  )
}

// --- Main JournalEntries Component ---
function JournalEntries({ journalEntries, ledgers, onAddEntry, onUpdateEntry, onDeleteEntry }) {
  const navigate = useNavigate()

  const handleDelete = (id) => {
    if (window.confirm("Are you sure you want to delete this journal entry?")) {
      onDeleteEntry(id)
    }
  }

  const JournalEntriesList = () => {
    const [expandedIndex, setExpandedIndex] = useState(null)
    const [searchTerm, setSearchTerm] = useState("")
    const [startDate, setStartDate] = useState("")
    const [endDate, setEndDate] = useState("")

    const groupJournalEntries = (entries) => {
      const groups = {}

      entries.forEach((entry) => {
        const key = `${entry.date}|${entry.description}`
        if (!groups[key]) {
          groups[key] = {
            id: entry.id,
            date: entry.date,
            description: entry.description,
            transactions: [],
          }
        }
        groups[key].transactions.push(...entry.transactions)
      })

      return Object.values(groups)
    }

    // Sort journal entries by date before grouping them
    const sortedEntries = sortTransactionsByDate(journalEntries)
    const groupedEntries = groupJournalEntries(sortedEntries)

    const filteredEntries = groupedEntries.filter((group) => {
      const groupDate = new Date(group.date).toISOString().slice(0, 10)
      const inDateRange = (!startDate || groupDate >= startDate) && (!endDate || groupDate <= endDate)
      const matchesSearch = searchTerm
        ? group.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
          group.transactions.some((t) => t.accountName.toLowerCase().includes(searchTerm.toLowerCase()))
        : true

      return inDateRange && matchesSearch
    })

    return (
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Journal Entries</h2>
            <Link
              to="/journal-entries/new"
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Journal Entry
            </Link>
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-2">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border border-gray-300 px-3 py-2 rounded-md text-sm  min-w-[660px]"
              placeholder="Search by description or account"
            />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="border border-gray-300 px-2 py-2 rounded-md text-sm w-40"
              placeholder="From"
            />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="border border-gray-300 px-2 py-2 rounded-md text-sm w-40"
              placeholder="To"
            />
            {(searchTerm || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchTerm("")
                  setStartDate("")
                  setEndDate("")
                }}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm w-40"
              >
                Clear
              </button>
            )}
          </div>

          {filteredEntries.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 text-lg mb-2">No journal entries found.</p>
              <p className="text-gray-400 text-sm mb-6">Try adjusting your search filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-gray-700">Net Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredEntries.map((group, idx) => {
                    const totalDebit = group.transactions.reduce((sum, t) => sum + t.debit, 0)
                    const totalCredit = group.transactions.reduce((sum, t) => sum + t.credit, 0)
                    const netAmount = Math.abs(totalDebit)
                    const isExpanded = expandedIndex === idx

                    return (
                      <React.Fragment key={`${group.id}-${group.date}`}>
                        <tr
                          className={`cursor-pointer transition ${isExpanded ? "bg-gray-200" : "hover:bg-gray-100"}`}
                          onClick={() => setExpandedIndex(isExpanded ? null : idx)}
                        >
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {new Date(group.date).toLocaleDateString("en-BD")}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">{group.description}</td>
                          <td className="px-4 py-3 text-right text-sm font-bold text-gray-900">
                            {formatCurrency(netAmount)}
                          </td>
                        </tr>
                        {isExpanded && (
                          <tr className="bg-gray-50">
                            <td colSpan={3} className="px-4 pt-2 pb-4">
                              <table className="w-full text-sm border rounded-md mb-3">
                                <thead className="bg-gray-100 text-gray-600">
                                  <tr>
                                    <th className="px-3 py-2 text-left">Type</th>
                                    <th className="px-3 py-2 text-left">Account</th>
                                    <th className="px-3 py-2 text-right">Amount</th>
                                    <th className="px-3 py-2 text-right">Opening Balance</th> {/* Added OB column */}
                                  </tr>
                                </thead>
                                <tbody>
                                  {(() => {
                                    const debits = group.transactions.filter((t) => t.debit > 0)
                                    const credits = group.transactions.filter((t) => t.credit > 0)
                                    return (
                                      <>
                                        {debits.map((t, i) => (
                                          <tr key={`debit-${i}`} className="border-t">
                                            {i === 0 && (
                                              <td rowSpan={debits.length} className="px-3 py-2 font-medium">
                                                Debit
                                              </td>
                                            )}
                                            <td className="px-3 py-2">{t.accountName}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency(t.debit)}</td>
                                            <td className="px-3 py-2 text-right">
                                              {formatCurrency(t.openingBalance || 0)}
                                            </td>{" "}
                                            {/* Show OB */}
                                          </tr>
                                        ))}
                                        {credits.map((t, i) => (
                                          <tr key={`credit-${i}`} className="border-t">
                                            {i === 0 && (
                                              <td rowSpan={credits.length} className="px-3 py-2 font-medium">
                                                Credit
                                              </td>
                                            )}
                                            <td className="px-3 py-2">{t.accountName}</td>
                                            <td className="px-3 py-2 text-right">{formatCurrency(t.credit)}</td>
                                            <td className="px-3 py-2 text-right">
                                              {formatCurrency(t.openingBalance || 0)}
                                            </td>{" "}
                                            {/* Show OB */}
                                          </tr>
                                        ))}
                                      </>
                                    )
                                  })()}
                                </tbody>
                              </table>

                              <div className="flex gap-4 justify-center mt-4">
                                <button
                                  onClick={() => navigate(`/journal-entries/edit/${group.id}`)}
                                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-md text-sm"
                                >
                                  Edit
                                </button>
                                <button
                                  onClick={() => handleDelete(group.id)}
                                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm"
                                >
                                  Delete
                                </button>
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
          )}
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route path="/" element={<JournalEntriesList />} />
      <Route
        path="/new"
        element={
          <div className="max-w-4xl mx-auto space-y-6">
            <div className="flex items-center gap-4">
              <Link
                to="/journal-entries"
                className="flex items-center px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Journal Entries
              </Link>
            </div>
            <JournalEntryForm
              onSaveEntry={(entry) => {
                onAddEntry(entry)
                navigate("/journal-entries")
              }}
              existingLedgers={ledgers}
            />
          </div>
        }
      />
      <Route
        path="/edit/:id"
        element={<EditJournalEntry journalEntries={journalEntries} ledgers={ledgers} onUpdateEntry={onUpdateEntry} />}
      />
    </Routes>
  )
}

export default JournalEntries;
