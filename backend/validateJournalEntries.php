<?php
function validateJournalEntries($data) {
    $errors = [];

    if (!isset($data->entry->id) || empty($data->entry->id)) {
        $errors[] = "Journal ID is required.";
    }
    if (!isset($data->entry->date) || empty($data->entry->date)) {
        $errors[] = "Journal date is required.";
    } elseif (!preg_match("/^\d{4}-\d{2}-\d{2}$/", $data->entry->date)) {
        $errors[] = "Journal date must be in YYYY-MM-DD format.";
    }
    if (!isset($data->entry->createdAt) || empty($data->entry->createdAt)) {
        $errors[] = "CreatedAt timestamp is required.";
    }

    if (!isset($data->entry->transactions) || !is_array($data->entry->transactions) || count($data->entry->transactions) === 0) {
        $errors[] = "At least one transaction is required.";
    } else {
        $totalDebit = 0;
        $totalCredit = 0;

        foreach ($data->entry->transactions as $i => $transaction) {
            if (!isset($transaction->id) || empty($transaction->id)) {
                $errors[] = "Transaction ID missing at index $i.";
            }
            if (!isset($transaction->accountName) || empty(trim($transaction->accountName))) {
                $errors[] = "Transaction $i: Account Name is required.";
            }
            if (!isset($transaction->accountType) || empty(trim($transaction->accountType))) {
                $errors[] = "Transaction $i: Account Type is required.";
            }

            $debit  = isset($transaction->debit) ? (float)$transaction->debit : 0;
            $credit = isset($transaction->credit) ? (float)$transaction->credit : 0;

            if ($debit < 0 || $credit < 0) {
                $errors[] = "Transaction $i: Debit and Credit must be non-negative.";
            }
            if ($debit > 0 && $credit > 0) {
                $errors[] = "Transaction $i: Cannot have both debit and credit.";
            }

            $totalDebit  += $debit;
            $totalCredit += $credit;
        }

        if (abs($totalDebit - $totalCredit) > 0.001) {
            $errors[] = "Journal is not balanced. Debit = $totalDebit, Credit = $totalCredit.";
        }
    }

    if (!empty($errors)) {
        return ["valid" => false, "errors" => $errors];
    }
    return ["valid" => true];
}
?>
