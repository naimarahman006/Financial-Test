<?php
include("db.php");

function deleteJournalEntry($data) {
    global $conn;

    $journal_id = isset($data->id) ? (string)$data->id : null;

    if (!$journal_id) {
        echo json_encode(["error" => "No journal ID provided"]);
        return;
    }

    mysqli_begin_transaction($conn);

    try {
        $stmt = $conn->prepare("DELETE FROM transactions WHERE journal_id = ?");
        $stmt->bind_param("s", $journal_id);
        if (!$stmt->execute()) {
            throw new Exception("Failed to delete transactions: " . $stmt->error);
        }
        $stmt->close();

        $stmt = $conn->prepare("DELETE FROM journals WHERE id = ?");
        $stmt->bind_param("s", $journal_id);
        if (!$stmt->execute()) {
            throw new Exception("Failed to delete journal: " . $stmt->error);
        }

        if ($stmt->affected_rows === 0) {
            throw new Exception("No journal found with ID: " . $journal_id);
        }

        $stmt->close();

        mysqli_commit($conn);

        echo json_encode(["message" => "Journal deleted successfully", "id" => $journal_id]);

    } catch (Exception $e) {
        mysqli_rollback($conn);
        echo json_encode(["error" => $e->getMessage()]);
    }

    mysqli_close($conn);
}
?>
