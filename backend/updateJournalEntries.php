<?php
include("db.php");

function updateJournalEntries($data) {
    global $conn;

    $journal_id       = (string)$data->entry->id;
    $journal_date     = (string)$data->entry->date;
    $journal_desc     = (string)$data->entry->description;
    $journal_created  = (string)$data->entry->createdAt;

    if (!$journal_id || !$journal_created) {
        echo json_encode(["error" => "Invalid journal data"]);
        return;
    }

    mysqli_begin_transaction($conn);

    try {
        $stmt = $conn->prepare("UPDATE journals SET date=?, description=? WHERE id=?");
        $stmt->bind_param("sss", $journal_date, $journal_desc, $journal_id);
        if (!$stmt->execute()) {
            throw new Exception("Failed to update journal: " . $stmt->error);
        }
        $stmt->close();

        $receivedIds = [];

        foreach ($data->entry->transactions as $txn) {
            $txnId          = (string)$txn->id;
            $accountName    = (string)$txn->accountName;
            $accountType    = (string)$txn->accountType;
            $debit          = (float)$txn->debit;
            $credit         = (float)$txn->credit;
            $openingBalance = (float)$txn->openingBalance;
            $type           = (string)$txn->type;

            $receivedIds[] = $txnId;


            $stmtUpdate = $conn->prepare("UPDATE transactions 
                SET accountName=?, accountType=?, debit=?, credit=?, openingBalance=?, type=? 
                WHERE id=? AND journal_id=?");
            $stmtUpdate->bind_param("ssdddsss", 
                $accountName, $accountType, $debit, $credit, $openingBalance, $type, $txnId, $journal_id);
            $stmtUpdate->execute();

            if ($stmtUpdate->affected_rows === 0) {

                $checkStmt = $conn->prepare("SELECT COUNT(*) FROM transactions WHERE id=? AND journal_id=?");
                $checkStmt->bind_param("ss", $txnId, $journal_id);
                $checkStmt->execute();
                $checkStmt->bind_result($count);
                $checkStmt->fetch();
                $checkStmt->close();

                if ($count == 0) {
   
                    $stmtInsert = $conn->prepare("INSERT INTO transactions 
                        (id, journal_id, accountName, accountType, debit, credit, openingBalance, type) 
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
                    $stmtInsert->bind_param("ssssddds", 
                        $txnId, $journal_id, $accountName, $accountType, $debit, $credit, $openingBalance, $type);
                    if (!$stmtInsert->execute()) {
                        throw new Exception("Failed to insert transaction: " . $stmtInsert->error);
                    }
                    $stmtInsert->close();
                }
            }
            $stmtUpdate->close();
        }

        if (!empty($receivedIds)) {
            $placeholders = implode(",", array_fill(0, count($receivedIds), "?"));
            $types = str_repeat("s", count($receivedIds)) . "s"; 
            $params = array_merge($receivedIds, [$journal_id]);

            $sql = "DELETE FROM transactions WHERE journal_id=? AND id NOT IN ($placeholders)";
            $sql = str_replace("journal_id=?", "journal_id=?", $sql);

            $params = array_merge([$journal_id], $receivedIds);

            $stmtDelete = $conn->prepare("DELETE FROM transactions WHERE journal_id=? AND id NOT IN ($placeholders)");
            $stmtDelete->bind_param($types, ...$params);
            if (!$stmtDelete->execute()) {
                throw new Exception("Failed to delete removed transactions: " . $stmtDelete->error);
            }
            $stmtDelete->close();
        }

        mysqli_commit($conn);
        echo json_encode(["message" => "Journal updated successfully"]);

    } catch (Exception $e) {
        mysqli_rollback($conn);
        echo json_encode(["error" => $e->getMessage()]);
    }

    mysqli_close($conn);
}
?>
