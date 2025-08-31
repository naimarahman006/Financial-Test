<?php
    include("db.php");

    function saveJournalEntries($data) {
        global $conn;

        $journal_id = (string)$data->entry->id;
        $journal_date = (string)$data->entry->date;
        $journal_description = (string)$data->entry->description;
        $journal_createdAt = (string)$data->entry->createdAt;

        mysqli_begin_transaction($conn);

        try {
            $stmt = $conn->prepare("INSERT INTO journals (id, date, description, createdAt) VALUES (?, ?, ?, ?)");
            $stmt->bind_param("ssss", $journal_id, $journal_date, $journal_description, $journal_createdAt);

            if (!$stmt->execute()) {
                throw new Exception("Failed to insert journal: " . $stmt->error);
            }
            $stmt->close();

            $stmt = $conn->prepare("INSERT INTO transactions (id, journal_id, accountName, accountType, debit, credit, openingBalance, type) 
                                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)");

            foreach ($data->entry->transactions as $transaction) {
                $accountId = (string)$transaction->id;
                $journalId = $journal_id;
                $accountName = (string)$transaction->accountName;
                $accountType = (string)$transaction->accountType;
                $debit = (float)$transaction->debit;
                $credit = (float)$transaction->credit;
                $openingBalance = (float)$transaction->openingBalance;
                $type = (string)$transaction->type;

                $stmt->bind_param("ssssddds", $accountId, $journalId, $accountName, $accountType, $debit, $credit, $openingBalance, $type);

                if (!$stmt->execute()) {
                    throw new Exception("Failed to insert transaction: " . $stmt->error);
                }
            }
            $stmt->close();

            mysqli_commit($conn);


        } catch (Exception $e) {
            mysqli_rollback($conn);
        }

        mysqli_close($conn);

    }
?>
