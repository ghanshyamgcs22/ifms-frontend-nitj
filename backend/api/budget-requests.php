<?php
// api/budget-requests.php - Updated without AO stage
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Accept');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/../config/database.php';

try {
    $db = getMongoDBConnection();
    $budgetRequestsCollection = $db->budget_requests;
    $projectsCollection = $db->projects;
    
    $method = $_SERVER['REQUEST_METHOD'];
    error_log("Budget Requests API - Method: $method");

    switch ($method) {
        case 'GET':
            if (isset($_GET['id']) && !empty($_GET['id'])) {
                $id = $_GET['id'];
                error_log("Fetching single budget request: $id");
                
                try {
                    $request = $budgetRequestsCollection->findOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
                    
                    if (!$request) {
                        http_response_code(404);
                        echo json_encode([
                            'success' => false,
                            'message' => 'Budget request not found'
                        ]);
                        break;
                    }
                    
                    $formatted = formatBudgetRequest($request);
                    
                    echo json_encode([
                        'success' => true,
                        'data' => $formatted
                    ]);
                } catch (Exception $e) {
                    http_response_code(400);
                    echo json_encode([
                        'success' => false,
                        'message' => 'Invalid request ID format'
                    ]);
                }
                break;
            }
            
            $stage = $_GET['stage'] ?? '';
            $status = $_GET['status'] ?? '';
            $gpNumber = $_GET['gpNumber'] ?? '';
            
            $filter = [];
            
            if (!empty($stage)) {
                $filter['currentStage'] = $stage;
            }
            
            if (!empty($status)) {
                $filter['status'] = $status;
            }
            
            if (!empty($gpNumber)) {
                $filter['gpNumber'] = $gpNumber;
            }
            
            error_log("Fetching budget requests with filter: " . json_encode($filter));
            
            $cursor = $budgetRequestsCollection->find($filter, ['sort' => ['createdAt' => -1]]);
            $requests = iterator_to_array($cursor);
            
            $formattedRequests = array_map('formatBudgetRequest', $requests);
            
            echo json_encode([
                'success' => true,
                'data' => array_values($formattedRequests),
                'count' => count($formattedRequests)
            ]);
            break;

        case 'POST':
            $rawData = file_get_contents('php://input');
            error_log("POST data: " . $rawData);
            
            $data = json_decode($rawData, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON: ' . json_last_error_msg());
            }
            
            $requiredFields = ['gpNumber', 'purpose', 'amount', 'projectType'];
            foreach ($requiredFields as $field) {
                if (!isset($data[$field]) || $data[$field] === '') {
                    throw new Exception("Missing required field: $field");
                }
            }
            
            $project = $projectsCollection->findOne(['gpNumber' => $data['gpNumber']]);
            
            if (!$project) {
                throw new Exception("Project not found with GP Number: " . $data['gpNumber']);
            }
            
            $document = [
                'gpNumber' => htmlspecialchars(strip_tags($data['gpNumber'])),
                'projectTitle' => $project['title'] ?? '',
                'piName' => $project['piName'] ?? '',
                'piEmail' => $project['piEmail'] ?? '',
                'department' => $project['department'] ?? '',
                'purpose' => htmlspecialchars(strip_tags($data['purpose'])),
                'description' => htmlspecialchars(strip_tags($data['description'] ?? '')),
                'amount' => floatval($data['amount']),
                'projectType' => htmlspecialchars(strip_tags($data['projectType'])),
                'invoiceNumber' => htmlspecialchars(strip_tags($data['invoiceNumber'] ?? '')),
                
                'status' => 'pending',
                'currentStage' => 'admin',
                
                'createdAt' => new MongoDB\BSON\UTCDateTime(),
                'updatedAt' => new MongoDB\BSON\UTCDateTime(),
                'piSubmittedAt' => new MongoDB\BSON\UTCDateTime(),
                
                'adminVerifiedAt' => null,
                'adminForwardedAt' => null,
                'adminRemarks' => '',
                'adminVerifiedBy' => '',
                
                'arApprovedAt' => null,
                'arRejectedAt' => null,
                'arRemarks' => '',
                'arApprovedBy' => '',
                
                'drApprovedAt' => null,
                'drRemarks' => '',
                'drApprovedBy' => '',
                
                'ao2ApprovedAt' => null,
                'ao2Remarks' => '',
                'ao2ApprovedBy' => '',
                
                'approvalHistory' => [
                    [
                        'stage' => 'created',
                        'action' => 'created',
                        'by' => $project['piName'] ?? 'PI',
                        'timestamp' => new MongoDB\BSON\UTCDateTime(),
                        'remarks' => 'Budget request created'
                    ]
                ]
            ];
            
            $result = $budgetRequestsCollection->insertOne($document);
            
            http_response_code(201);
            echo json_encode([
                'success' => true,
                'message' => 'Budget request created successfully',
                'id' => (string) $result->getInsertedId()
            ]);
            break;

        case 'PUT':
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                throw new Exception('Request ID is required');
            }
            
            $rawData = file_get_contents('php://input');
            $data = json_decode($rawData, true);
            
            if (json_last_error() !== JSON_ERROR_NONE) {
                throw new Exception('Invalid JSON: ' . json_last_error_msg());
            }
            
            $action = $data['action'] ?? '';
            $stage = $data['stage'] ?? '';
            $remarks = htmlspecialchars(strip_tags($data['remarks'] ?? ''));
            $by = htmlspecialchars(strip_tags($data['by'] ?? 'System'));
            
            error_log("Update action: $action, stage: $stage, by: $by");
            
            $request = $budgetRequestsCollection->findOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
            
            if (!$request) {
                throw new Exception('Budget request not found');
            }
            
            $updateData = [
                'updatedAt' => new MongoDB\BSON\UTCDateTime()
            ];
            
            $historyEntry = [
                'stage' => $stage,
                'action' => $action,
                'by' => $by,
                'timestamp' => new MongoDB\BSON\UTCDateTime(),
                'remarks' => $remarks
            ];
            
            // Handle different actions (REMOVED AO)
            switch ($action) {
                case 'forward':
                    if ($stage === 'admin') {
                        $updateData['adminVerifiedAt'] = new MongoDB\BSON\UTCDateTime();
                        $updateData['adminForwardedAt'] = new MongoDB\BSON\UTCDateTime();
                        $updateData['adminRemarks'] = $remarks;
                        $updateData['adminVerifiedBy'] = $by;
                        $updateData['currentStage'] = 'ar';
                        $updateData['status'] = 'admin_verified';
                        $historyEntry['action'] = 'verified_and_forwarded';
                    }
                    break;
                    
                case 'approve':
                    if ($stage === 'ar') {
                        $updateData['arApprovedAt'] = new MongoDB\BSON\UTCDateTime();
                        $updateData['arRemarks'] = $remarks;
                        $updateData['arApprovedBy'] = $by;
                        $updateData['currentStage'] = 'dr';
                        $updateData['status'] = 'ar_approved';
                    } elseif ($stage === 'dr') {
                        $updateData['drApprovedAt'] = new MongoDB\BSON\UTCDateTime();
                        $updateData['drRemarks'] = $remarks;
                        $updateData['drApprovedBy'] = $by;
                        $updateData['currentStage'] = 'ao2';
                        $updateData['status'] = 'dr_approved';
                    } elseif ($stage === 'ao2') {
                        $updateData['ao2ApprovedAt'] = new MongoDB\BSON\UTCDateTime();
                        $updateData['ao2Remarks'] = $remarks;
                        $updateData['ao2ApprovedBy'] = $by;
                        $updateData['currentStage'] = 'completed';
                        $updateData['status'] = 'approved';
                        $historyEntry['action'] = 'final_approved';
                    }
                    break;
                    
                case 'reject':
                    if ($stage === 'admin') {
                        $updateData['adminRemarks'] = $remarks;
                        $updateData['adminVerifiedBy'] = $by;
                    } elseif ($stage === 'ar') {
                        $updateData['arRejectedAt'] = new MongoDB\BSON\UTCDateTime();
                        $updateData['arRemarks'] = $remarks;
                        $updateData['arApprovedBy'] = $by;
                    } elseif ($stage === 'dr') {
                        $updateData['drRemarks'] = $remarks;
                        $updateData['drApprovedBy'] = $by;
                    } elseif ($stage === 'ao2') {
                        $updateData['ao2Remarks'] = $remarks;
                        $updateData['ao2ApprovedBy'] = $by;
                    }
                    $updateData['currentStage'] = 'rejected';
                    $updateData['status'] = 'rejected';
                    break;
            }
            
            $history = $request['approvalHistory'] ?? [];
            $history[] = $historyEntry;
            $updateData['approvalHistory'] = $history;
            
            $result = $budgetRequestsCollection->updateOne(
                ['_id' => new MongoDB\BSON\ObjectId($id)],
                ['$set' => $updateData]
            );
            
            if ($result->getModifiedCount() > 0 || $result->getMatchedCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Budget request updated successfully'
                ]);
            } else {
                throw new Exception('Failed to update budget request');
            }
            break;

        case 'DELETE':
            $id = $_GET['id'] ?? null;
            
            if (!$id) {
                throw new Exception('Request ID is required');
            }
            
            $result = $budgetRequestsCollection->deleteOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
            
            if ($result->getDeletedCount() > 0) {
                echo json_encode([
                    'success' => true,
                    'message' => 'Budget request deleted successfully'
                ]);
            } else {
                throw new Exception('Failed to delete budget request');
            }
            break;

        default:
            http_response_code(405);
            echo json_encode([
                'success' => false,
                'message' => 'Method not allowed'
            ]);
            break;
    }

} catch (Exception $e) {
    error_log("Budget Requests API Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}

function formatBudgetRequest($doc) {
    $formatted = (array) $doc;
    $formatted['id'] = (string) $doc['_id'];
    unset($formatted['_id']);
    
    $dateFields = [
        'createdAt', 'updatedAt', 'piSubmittedAt', 
        'adminVerifiedAt', 'adminForwardedAt', 
        'arApprovedAt', 'arRejectedAt', 
        'drApprovedAt', 
        'ao2ApprovedAt'
    ];
    
    foreach ($dateFields as $field) {
        if (isset($formatted[$field]) && $formatted[$field] instanceof MongoDB\BSON\UTCDateTime) {
            $formatted[$field] = $formatted[$field]->toDateTime()->format('Y-m-d H:i:s');
        }
    }
    
    if (isset($formatted['approvalHistory'])) {
        $history = [];
        foreach ($formatted['approvalHistory'] as $item) {
            $historyItem = (array)$item;
            if (isset($historyItem['timestamp']) && $historyItem['timestamp'] instanceof MongoDB\BSON\UTCDateTime) {
                $historyItem['timestamp'] = $historyItem['timestamp']->toDateTime()->format('Y-m-d H:i:s');
            }
            $history[] = $historyItem;
        }
        $formatted['approvalHistory'] = $history;
    }
    
    return $formatted;
}
?>