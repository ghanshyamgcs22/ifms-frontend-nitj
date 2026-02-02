<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config/database.php';

use MongoDB\BSON\ObjectId;
use MongoDB\BSON\UTCDateTime;

$db = getMongoDBConnection();
$collection = $db->project_heads;

$method = $_SERVER['REQUEST_METHOD'];

$id = $_GET['id'] ?? null;

/* ===================== GET ===================== */
if ($method === 'GET') {
    if ($id) {
        $head = $collection->findOne(['_id' => new ObjectId($id)]);
        if (!$head) {
            http_response_code(404);
            echo json_encode(['success' => false, 'message' => 'Not found']);
            exit;
        }

        $head['id'] = (string)$head['_id'];
        unset($head['_id']);

        echo json_encode(['success' => true, 'data' => $head]);
        exit;
    }

    $cursor = $collection->find([], ['sort' => ['created_at' => -1]]);
    $data = [];

    foreach ($cursor as $doc) {
        $doc['id'] = (string)$doc['_id'];
        unset($doc['_id']);
        $data[] = $doc;
    }

    echo json_encode(['success' => true, 'data' => $data, 'count' => count($data)]);
    exit;
}

/* ===================== POST ===================== */
if ($method === 'POST') {
    $input = json_decode(file_get_contents("php://input"), true);

    if (!$input || empty($input['name']) || empty($input['type'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Name and type required']);
        exit;
    }

    if (!in_array($input['type'], ['recurring', 'non-recurring'])) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid type']);
        exit;
    }

    $exists = $collection->findOne(['name' => $input['name']]);
    if ($exists) {
        http_response_code(409);
        echo json_encode(['success' => false, 'message' => 'Already exists']);
        exit;
    }

    $doc = [
        'name' => trim($input['name']),
        'type' => $input['type'],
        'created_at' => new UTCDateTime(),
        'updated_at' => new UTCDateTime()
    ];

    $res = $collection->insertOne($doc);

    echo json_encode([
        'success' => true,
        'message' => 'Created',
        'id' => (string)$res->getInsertedId()
    ]);
    exit;
}

/* ===================== PUT ===================== */
if ($method === 'PUT') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID required']);
        exit;
    }

    $input = json_decode(file_get_contents("php://input"), true);
    if (!$input) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'Invalid JSON']);
        exit;
    }

    $update = ['updated_at' => new UTCDateTime()];

    if (!empty($input['name'])) $update['name'] = trim($input['name']);
    if (!empty($input['type'])) $update['type'] = $input['type'];

    $collection->updateOne(
        ['_id' => new ObjectId($id)],
        ['$set' => $update]
    );

    echo json_encode(['success' => true, 'message' => 'Updated']);
    exit;
}

/* ===================== DELETE ===================== */
if ($method === 'DELETE') {
    if (!$id) {
        http_response_code(400);
        echo json_encode(['success' => false, 'message' => 'ID required']);
        exit;
    }

    $res = $collection->deleteOne(['_id' => new ObjectId($id)]);

    if ($res->getDeletedCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Deleted']);
    } else {
        http_response_code(404);
        echo json_encode(['success' => false, 'message' => 'Not found']);
    }
    exit;
}

http_response_code(405);
echo json_encode(['success' => false, 'message' => 'Method not allowed']);
