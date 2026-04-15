<?php

declare(strict_types=1);

require __DIR__ . '/api/bootstrap.php';

$pdo = db();
$action = request_action();

try {
    switch ($action) {
        case 'list':
            $statement = $pdo->query(
                <<<SQL
                SELECT
                    p.*,
                    c.code AS course_code,
                    c.name AS course_name,
                    c.category,
                    c.type AS course_type,
                    c.difficulty AS course_difficulty,
                    ROUND((p.accuracy + (100 - p.weak_score)) / 2, 2) AS progress_score
                FROM performance p
                INNER JOIN courses c ON c.id = p.course_id
                ORDER BY p.weak_score DESC, p.accuracy ASC, c.code ASC
                SQL
            );
            respond($statement->fetchAll());
            break;

        case 'read':
            $statement = $pdo->prepare(
                <<<SQL
                SELECT
                    p.*,
                    c.code AS course_code,
                    c.name AS course_name,
                    c.category,
                    c.type AS course_type,
                    c.difficulty AS course_difficulty,
                    ROUND((p.accuracy + (100 - p.weak_score)) / 2, 2) AS progress_score
                FROM performance p
                INNER JOIN courses c ON c.id = p.course_id
                WHERE p.id = :id
                SQL
            );
            $statement->execute(['id' => request_id()]);
            respond(fetch_one_or_fail($statement));
            break;

        case 'summary':
            $summary = [
                'average_accuracy' => (float) $pdo->query('SELECT ROUND(AVG(accuracy), 2) FROM performance')->fetchColumn(),
                'average_weak_score' => (float) $pdo->query('SELECT ROUND(AVG(weak_score), 2) FROM performance')->fetchColumn(),
                'high_risk_courses' => (int) $pdo->query('SELECT COUNT(*) FROM performance WHERE weak_score > 70')->fetchColumn(),
                'improving_courses' => (int) $pdo->query('SELECT COUNT(*) FROM performance WHERE accuracy >= 80 AND weak_score < 45')->fetchColumn(),
            ];
            respond($summary);
            break;

        case 'create':
            $payload = request_data();
            require_fields(['course_id', 'accuracy', 'weak_score'], $payload);
            $fields = pick_fields(['course_id', 'accuracy', 'weak_score'], $payload);
            $id = insert_record($pdo, 'performance', $fields);

            $statement = $pdo->prepare('SELECT * FROM performance WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 201, 'Performance record created.');
            break;

        case 'update':
            $payload = request_data();
            $id = request_id();
            $fields = pick_fields(['course_id', 'accuracy', 'weak_score'], $payload);
            update_record($pdo, 'performance', $id, $fields);

            $statement = $pdo->prepare('SELECT * FROM performance WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Performance record updated.');
            break;

        case 'delete':
            delete_record($pdo, 'performance', request_id());
            respond(['deleted' => true], 200, 'Performance record deleted.');
            break;

        default:
            fail('Unsupported performance action.', 404);
    }
} catch (PDOException $exception) {
    fail('Performance request failed.', 500, ['exception' => $exception->getMessage()]);
}
