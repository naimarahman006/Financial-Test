<?php
    include("db.php");

    function fetchJournalEntries(){
        global $conn;

        $sql = "SELECT * FROM journals";
        $result = mysqli_query($conn, $sql);

        $entries = [];

        if (mysqli_num_rows($result) > 0) {
            while ($rows1 = mysqli_fetch_assoc($result)) {

                $sql1 = "SELECT * FROM transactions WHERE journal_id = '" . $rows1['id'] . "'";
                $result1 = mysqli_query($conn, $sql1);

                $transactions = [];
                if (mysqli_num_rows($result1) > 0) {
                    while ($rows = mysqli_fetch_assoc($result1)) {
                        $transactions[] = [
                            "id" => (string)$rows["id"],
                            "accountName" => (string)$rows["accountName"],
                            "accountType" => (string)$rows["accountType"],
                            "debit" => (double)$rows["debit"],
                            "credit" => (double)$rows["credit"],
                            "openingBalance" => (double)$rows["openingBalance"],
                            "type" => (string)$rows["type"]
                        ];
                    }
                }

                if ($rows1["id"] != null){
                    $entries[] = [
                        "entry" => [
                            "id" => $rows1["id"],
                            "date" => $rows1["date"],
                            "description" => $rows1["description"],
                            "transactions" => $transactions,
                            "createdAt" => $rows1["createdAt"]
                        ]
                    ];
                }
            }
        }

        mysqli_close($conn);
        return $entries;
    }

?>
