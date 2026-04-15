<?php

declare(strict_types=1);

require __DIR__ . '/api/bootstrap.php';

$pdo = db();
$action = request_action();

try {
    switch ($action) {
        case 'list':
            $conditions = [];
            $params = [];

            $search = request_string('search');
            $category = request_string('category');
            $type = request_string('type');
            $difficulty = request_string('difficulty');

            if ($search) {
                $conditions[] = '(code LIKE :search OR name LIKE :search)';
                $params['search'] = '%' . $search . '%';
            }

            if ($category) {
                $conditions[] = 'category = :category';
                $params['category'] = $category;
            }

            if ($type) {
                $conditions[] = 'type = :type';
                $params['type'] = $type;
            }

            if ($difficulty) {
                $conditions[] = 'difficulty = :difficulty';
                $params['difficulty'] = $difficulty;
            }

            $sql = 'SELECT * FROM courses';

            if ($conditions !== []) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }

            $sql .= ' ORDER BY category ASC, code ASC';

            $statement = $pdo->prepare($sql);
            $statement->execute($params);
            respond($statement->fetchAll());
            break;

        case 'read':
            $statement = $pdo->prepare('SELECT * FROM courses WHERE id = :id');
            $statement->execute(['id' => request_id()]);
            respond(fetch_one_or_fail($statement));
            break;

        case 'stats':
            $stats = [
                'total_courses' => (int) $pdo->query('SELECT COUNT(*) FROM courses')->fetchColumn(),
                'core_courses' => (int) $pdo->query("SELECT COUNT(*) FROM courses WHERE type = 'core'")->fetchColumn(),
                'lab_courses' => (int) $pdo->query("SELECT COUNT(*) FROM courses WHERE type = 'lab'")->fetchColumn(),
                'elective_courses' => (int) $pdo->query("SELECT COUNT(*) FROM courses WHERE type = 'elective'")->fetchColumn(),
                'categories' => $pdo->query('SELECT category, COUNT(*) AS total FROM courses GROUP BY category ORDER BY category ASC')->fetchAll(),
            ];
            respond($stats);
            break;

        case 'create':
            $payload = request_data();
            require_fields(['code', 'name', 'category', 'type', 'difficulty'], $payload);
            $fields = pick_fields(['code', 'name', 'category', 'type', 'difficulty'], $payload);
            $id = insert_record($pdo, 'courses', $fields);

            $statement = $pdo->prepare('SELECT * FROM courses WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 201, 'Course created.');
            break;

        case 'update':
            $payload = request_data();
            $id = request_id();
            $fields = pick_fields(['code', 'name', 'category', 'type', 'difficulty'], $payload);
            update_record($pdo, 'courses', $id, $fields);

            $statement = $pdo->prepare('SELECT * FROM courses WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Course updated.');
            break;

        case 'delete':
            delete_record($pdo, 'courses', request_id());
            respond(['deleted' => true], 200, 'Course deleted.');
            break;

        default:
            fail('Unsupported courses action.', 404);
    }
} catch (PDOException $exception) {
    fail('Courses request failed.', 500, ['exception' => $exception->getMessage()]);
}
