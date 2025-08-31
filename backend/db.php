<?php
$db_server = "localhost";
$db_user   = "root";
$db_pass   = "";
$db_name   = "db_financeflow";

$conn = mysqli_connect($db_server, $db_user, $db_pass);
if (!$conn) {
    die("Connection failed: " . mysqli_connect_error());
}

$sql = "CREATE DATABASE IF NOT EXISTS $db_name CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
if (!mysqli_query($conn, $sql)) {
    die("Error creating database: " . mysqli_error($conn));
}

mysqli_select_db($conn, $db_name);

$createJournalsTable = "
CREATE TABLE IF NOT EXISTS journals (
    id VARCHAR(100) PRIMARY KEY,
    date VARCHAR(100) NOT NULL,
    description TEXT,
    createdAt VARCHAR(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
if (!mysqli_query($conn, $createJournalsTable)) {
    die('Error creating journals table: ' . mysqli_error($conn));
}

$createTransactionsTable = "
CREATE TABLE IF NOT EXISTS transactions (
    id VARCHAR(100) PRIMARY KEY,
    journal_id VARCHAR(100) NOT NULL,
    accountName VARCHAR(255) NOT NULL,
    accountType VARCHAR(100) NOT NULL,
    debit DECIMAL(15,2) DEFAULT 0,
    credit DECIMAL(15,2) DEFAULT 0,
    openingBalance DECIMAL(15,2) DEFAULT 0,
    type VARCHAR(50) NOT NULL,
    FOREIGN KEY (journal_id) REFERENCES journals(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
";
if (!mysqli_query($conn, $createTransactionsTable)) {
    die('Error creating transactions table: ' . mysqli_error($conn));
}
?>
