<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: *");


if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"));


switch ($method) {
    case "GET":
        include("fetchJournalEntries.php");
        echo json_encode(fetchJournalEntries(), JSON_PRETTY_PRINT);
        break;

    case "POST":
        include("saveJournalEntries.php");
        saveJournalEntries($data);
        echo json_encode(["message" => "Added journal"]);
        break;

    case "PUT":
        break;

    case 'DELETE':
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
?>



