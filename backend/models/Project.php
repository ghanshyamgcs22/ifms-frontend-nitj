<?php
class Project {
    private $collection;

    public function __construct($db) {
        $this->collection = $db->projects;
    }

    // Generate unique GP Number
    private function generateGPNumber() {
        $year = date('Y');

        $lastProject = $this->collection->findOne(
            [],
            ['sort' => ['createdAt' => -1]]
        );

        if ($lastProject && isset($lastProject['gpNumber'])) {
            $parts = explode('/', $lastProject['gpNumber']);
            $lastNumber = intval(end($parts));
            $newNumber = $lastNumber + 1;
        } else {
            $newNumber = 1;
        }

        return sprintf("GP/%s/%03d", $year, $newNumber);
    }

    public function create($data) {
        try {
            if (!$data || !is_array($data)) {
                throw new Exception("Invalid JSON data received");
            }

            $gpNumber = $this->generateGPNumber();

            $startDate = new MongoDB\BSON\UTCDateTime();
            $endDate = null;

            if (!empty($data['duration'])) {
                $months = intval($data['duration']);
                $endDateTime = new DateTime();
                $endDateTime->modify("+{$months} months");
                $endDate = new MongoDB\BSON\UTCDateTime($endDateTime->getTimestamp() * 1000);
            }

            $document = [
                'gpNumber' => $gpNumber,
                'title' => htmlspecialchars(strip_tags($data['title'] ?? '')),
                'projectType' => !empty($data['projectType'])
                    ? htmlspecialchars(strip_tags($data['projectType']))
                    : 'non-recurring',
                'piName' => htmlspecialchars(strip_tags($data['piName'] ?? '')),
                'piEmail' => filter_var($data['piEmail'] ?? '', FILTER_VALIDATE_EMAIL) ? $data['piEmail'] : '',
                'department' => htmlspecialchars(strip_tags($data['department'] ?? '')),
                'duration' => intval($data['duration'] ?? 12),
                'proposedBudget' => floatval($data['proposedBudget'] ?? 0),
                'description' => htmlspecialchars(strip_tags($data['description'] ?? '')),
                'sanctionedAmount' => floatval($data['sanctionedAmount'] ?? 0),
                'releasedAmount' => floatval($data['releasedAmount'] ?? 0),
                'status' => htmlspecialchars(strip_tags($data['status'] ?? 'pending')),
                'startDate' => $startDate,
                'endDate' => $endDate,
                'createdAt' => new MongoDB\BSON\UTCDateTime(),
                'updatedAt' => new MongoDB\BSON\UTCDateTime()
            ];

            if (!$document['title'] || !$document['piName'] || !$document['piEmail']) {
                throw new Exception("Invalid project data: missing required fields");
            }

            $result = $this->collection->insertOne($document);

            return [
                'insertedId' => (string) $result->getInsertedId(),
                'gpNumber' => $gpNumber
            ];

        } catch (Exception $e) {
            error_log("MongoDB insert failed: " . $e->getMessage());
            throw new Exception("MongoDB insert failed: " . $e->getMessage());
        }
    }

    public function getAll() {
        $cursor = $this->collection->find([], ['sort' => ['createdAt' => -1]]);
        return iterator_to_array($cursor);
    }

    public function search($searchTerm = "", $status = "") {
        $filter = [];

        if (!empty($searchTerm)) {
            $filter['$or'] = [
                ['title' => ['$regex' => $searchTerm, '$options' => 'i']],
                ['gpNumber' => ['$regex' => $searchTerm, '$options' => 'i']],
                ['piName' => ['$regex' => $searchTerm, '$options' => 'i']],
                ['department' => ['$regex' => $searchTerm, '$options' => 'i']]
            ];
        }

        if (!empty($status)) {
            $filter['status'] = $status;
        }

        $cursor = $this->collection->find($filter, ['sort' => ['createdAt' => -1]]);
        return iterator_to_array($cursor);
    }

    public function getOne($id) {
        return $this->collection->findOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
    }

    public function update($id, $data) {
        $updateData = [
            '$set' => [
                'title' => htmlspecialchars(strip_tags($data['title'])),
                'projectType' => htmlspecialchars(strip_tags($data['projectType'])),
                'piName' => htmlspecialchars(strip_tags($data['piName'])),
                'piEmail' => filter_var($data['piEmail'], FILTER_VALIDATE_EMAIL) ? $data['piEmail'] : '',
                'department' => htmlspecialchars(strip_tags($data['department'])),
                'duration' => intval($data['duration']),
                'proposedBudget' => floatval($data['proposedBudget']),
                'description' => htmlspecialchars(strip_tags($data['description'])),
                'sanctionedAmount' => floatval($data['sanctionedAmount']),
                'releasedAmount' => floatval($data['releasedAmount']),
                'status' => htmlspecialchars(strip_tags($data['status'])),
                'updatedAt' => new MongoDB\BSON\UTCDateTime()
            ]
        ];

        $result = $this->collection->updateOne(
            ['_id' => new MongoDB\BSON\ObjectId($id)],
            $updateData
        );

        return $result->getModifiedCount() > 0;
    }

    public function delete($id) {
        $result = $this->collection->deleteOne(['_id' => new MongoDB\BSON\ObjectId($id)]);
        return $result->getDeletedCount() > 0;
    }

    public static function formatDocument($doc) {
        if ($doc === null) return null;

        $formatted = (array) $doc;
        $formatted['id'] = (string) $doc['_id'];
        unset($formatted['_id']);

        foreach (['createdAt', 'updatedAt', 'startDate', 'endDate'] as $field) {
            if (isset($formatted[$field]) && $formatted[$field]) {
                $formatted[$field] = $formatted[$field]->toDateTime()->format('Y-m-d H:i:s');
            }
        }

        return $formatted;
    }
}
?>