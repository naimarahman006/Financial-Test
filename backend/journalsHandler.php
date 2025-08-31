<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: *");


$method = $_SERVER['REQUEST_METHOD'];
$data = json_decode(file_get_contents("php://input"));

if ($method === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($method === 'PUT' || $method === 'POST') {

    include("validateJournalEntries.php");
    $validation = validateJournalEntries($data);
    
    if (!$validation["valid"]){
        echo json_encode([
            "status" => "error",
            "errors" => $validation["errors"]
        ]);
        return;
    }
}



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
        include("updateJournalEntries.php");
        updateJournalEntries($data);
        echo json_encode(["message" => "Updated journal", "entry" => $data->entry]);
        break;

    case 'DELETE':
        include("deleteJournalEntry.php");
        if (!$data || !isset($data->id)) {
            http_response_code(400);
            echo json_encode(["error" => "Missing journal ID"]);
            break;
        }
        deleteJournalEntry($data);
        echo json_encode(["message" => "Deleted journal", "id" => $data->id]);
        break;

    default:
        http_response_code(405);
        echo json_encode(["error" => "Method not allowed"]);
}
?>



