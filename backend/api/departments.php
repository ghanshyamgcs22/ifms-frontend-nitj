<?php
// backend/api/departments.php

// ------------------- Headers for CORS -------------------
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ------------------- Include Database -------------------
require_once __DIR__ . '/../config/database.php';

// ------------------- Read JSON input -------------------
$input = json_decode(file_get_contents('php://input'), true);

// ------------------- Departments API Class -------------------
class DepartmentsAPI {
    private $collection;

    public function __construct() {
        $db = getMongoDBConnection();
        $this->collection = $db->departments; // MongoDB collection name
    }

    // GET all departments
    public function getAllDepartments() {
        try {
            $departments = $this->collection->find()->toArray();
            echo json_encode([
                "success" => true,
                "data" => $departments
            ]);
        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error fetching departments: " . $e->getMessage()
            ]);
        }
    }

    // POST: create a new department
    public function createDepartment($data) {
        try {
            // Validate required field
            if (!isset($data['name']) || empty($data['name'])) {
                http_response_code(400);
                echo json_encode([
                    "success" => false,
                    "message" => "Department name is required"
                ]);
                return;
            }

            // Build department document
          // Build department document
$department = [
    'name' => $data['name'],
    'hodName' => isset($data['hodName']) ? $data['hodName'] : null,
    'hodEmail' => isset($data['hodEmail']) ? $data['hodEmail'] : null,
    'createdAt' => new MongoDB\BSON\UTCDateTime()
];

            $result = $this->collection->insertOne($department);

            echo json_encode([
                "success" => true,
                "id" => (string)$result->getInsertedId()
            ]);

        } catch (Exception $e) {
            http_response_code(500);
            echo json_encode([
                "success" => false,
                "message" => "Error creating department: " . $e->getMessage()
            ]);
        }
    }
}

// ------------------- Handle Requests -------------------
$api = new DepartmentsAPI();

switch ($_SERVER['REQUEST_METHOD']) {
    case 'GET':
        $api->getAllDepartments();
        break;

    case 'POST':
        $api->createDepartment($input);
        break;

    default:
        http_response_code(405);
        echo json_encode([
            "success" => false,
            "message" => "Method not allowed"
        ]);
        break;
}
