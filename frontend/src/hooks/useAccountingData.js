import { useEffect, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { calculateFinancialSummary, generateLedgers, generateTrialBalance } from '../utils/accounting';
import axios from "axios"

const STORAGE_KEY = 'financeflow_journal_entries';

export const useAccountingData = () => {
  const [journalEntries, setJournalEntries] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [trialBalance, setTrialBalance] = useState([]);
  const [financialSummary, setFinancialSummary] = useState({
    totalRevenue: 0,
    totalExpenses: 0,
    netProfit: 0,
    totalAssets: 0,
    totalLiabilities: 0,
    totalCapital: 0
  });
  const [isLoaded, setIsLoaded] = useState(false);

  // Load data from database on mount
  const fetchData = async () => {
    try {
      const fetchResponse = await axios.get('http://localhost/Financial-Web-App/backend/journalsHandler.php');
      console.log("Raw Fetch response:", fetchResponse);

      if (fetchResponse.data) {
        const parsedEntries = fetchResponse.data;
        console.log('Parsed entries:', parsedEntries);

        console.log("Checking entry dates...");
        parsedEntries.forEach((e, i) => {
          const d = new Date(e.entry.date);
          if (isNaN(d)) {
            console.warn("Invalid date at index", i, "value:", e.entry.date);
          }
        });

        if (Array.isArray(parsedEntries)) {
          const normalizedEntries = parsedEntries.map(e => e.entry);
          setJournalEntries(normalizedEntries);
        }
      }
    } catch (error) {
      console.error('Error loading journal entries from backend:', error);
    }
    setIsLoaded(true);
  };

  useEffect(() => {
    console.log('Loading data from backend...');
    fetchData();
    }, []);


  // Update derived data when journal entries change
  useEffect(() => {
    // Don't save to localStorage during initial load
    if (!isLoaded) return;

    console.log('Updating derived data for entries:', journalEntries);
    const newLedgers = generateLedgers(journalEntries);
    const newTrialBalance = generateTrialBalance(newLedgers);
    const newFinancialSummary = calculateFinancialSummary(newLedgers);

    setLedgers(newLedgers);
    setTrialBalance(newTrialBalance);
    setFinancialSummary(newFinancialSummary);
  }, [journalEntries, isLoaded]);

  const addJournalEntry = async (entry) => {
     try {
          console.log('Adding journal entry:', entry);
          const addResponse = await axios.post('http://localhost/Financial-Web-App/backend/journalsHandler.php',{entry});
          console.log("Raw delete response:", addResponse);
          fetchData();
     }
     catch (error) {
          console.error("Error adding journal entry:", error);
          alert("Failed to add entry. Please try again.");
     }
  };

  const deleteJournalEntry = (id) => {
    setJournalEntries((prev) => {
      const exists = prev.some(entry => entry.id === id);
      if (!exists) console.warn('Tried to delete non-existent entry:', id);
      return prev.filter(entry => entry.id !== id);
    });
  };


  const updateJournalEntry = (updatedEntry) => {
    setJournalEntries((prev) =>
        prev.map((entry) =>
            entry.id === updatedEntry.id ? updatedEntry : entry
        )
    );
  };

  const clearAllData = () => {
    console.log('Clearing all data');
    setJournalEntries([]);
    localStorage.removeItem(STORAGE_KEY);
  };

  // const processYearEnd = () => {
  //   // 1. Create new ledgers with balances carried forward
  //   const newLedgers = ledgers.map(ledger => ({
  //     ...ledger,
  //     openingBalance: ledger.balance, // Carry forward the balance
  //     balance: ledger.balance,        // Keep same balance
  //     transactions: []                // Clear transactions
  //   }));

  //   // 2. Archive current year data
  //   const archiveData = {
  //     date: new Date().toISOString(),
  //     year: new Date().getFullYear(),
  //     journalEntries: [...journalEntries],
  //     ledgers: [...ledgers]
  //   };

  //   // 3. Update state
  //   setLedgers(newLedgers);
  //   setJournalEntries([]);
    
  //   // 4. Save to localStorage
  //   localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  //   localStorage.setItem(`${STORAGE_KEY}_archive_${new Date().getFullYear()}`, JSON.stringify(archiveData));

  //   return archiveData; // Return the archived data if needed
  // };

  return {
    journalEntries,
    ledgers,
    trialBalance,
    financialSummary,
    addJournalEntry,
    updateJournalEntry,
    deleteJournalEntry,
    clearAllData,
    //processYearEnd
  };
};