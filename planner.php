<?php

declare(strict_types=1);

require __DIR__ . '/api/bootstrap.php';

$pdo = db();
$action = request_action();

try {
    switch ($action) {
        case 'list':
            $startDate = sql_date(request_string('start_date', 'today') ?? 'today');
            $days = max(1, min(request_int('days', 7) ?? 7, 31));
            $endDate = (new DateTimeImmutable($startDate))->modify(sprintf('+%d days', $days - 1))->format('Y-m-d');

            $statement = $pdo->prepare(
                <<<SQL
                SELECT
                    sp.*,
                    c.code AS course_code,
                    c.name AS course_name,
                    c.category,
                    c.type AS course_type,
                    c.difficulty AS course_difficulty,
                    p.accuracy,
                    p.weak_score
                FROM study_plan sp
                INNER JOIN courses c ON c.id = sp.course_id
                LEFT JOIN performance p ON p.course_id = c.id
                WHERE sp.study_date BETWEEN :start_date AND :end_date
                ORDER BY sp.study_date ASC, FIELD(sp.status, 'in-progress', 'pending', 'completed'), sp.duration DESC, c.code ASC
                SQL
            );
            $statement->execute([
                'start_date' => $startDate,
                'end_date' => $endDate,
            ]);
            respond($statement->fetchAll());
            break;

        case 'summary':
            $summary = [
                'pending' => (int) $pdo->query("SELECT COUNT(*) FROM study_plan WHERE status = 'pending'")->fetchColumn(),
                'in_progress' => (int) $pdo->query("SELECT COUNT(*) FROM study_plan WHERE status = 'in-progress'")->fetchColumn(),
                'completed' => (int) $pdo->query("SELECT COUNT(*) FROM study_plan WHERE status = 'completed'")->fetchColumn(),
                'today_duration' => (int) $pdo->query('SELECT COALESCE(SUM(duration), 0) FROM study_plan WHERE study_date = CURDATE()')->fetchColumn(),
            ];
            respond($summary);
            break;

        case 'generate':
            $payload = request_data();
            $startDate = sql_date((string) ($payload['start_date'] ?? 'today'));
            $days = max(1, min((int) ($payload['days'] ?? 7), 21));
            $pdo->beginTransaction();
            $created = regenerate_plan($pdo, $startDate, $days);
            $pdo->commit();
            respond($created, 200, 'Study plan regenerated.');
            break;

        case 'create':
            $payload = request_data();
            require_fields(['course_id', 'topic', 'study_date', 'duration', 'status'], $payload);
            $fields = pick_fields(['course_id', 'topic', 'study_date', 'duration', 'status'], $payload);
            $fields['study_date'] = sql_date((string) $fields['study_date']);
            $id = insert_record($pdo, 'study_plan', $fields);

            $statement = $pdo->prepare('SELECT * FROM study_plan WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 201, 'Study plan item created.');
            break;

        case 'update':
            $payload = request_data();
            $id = request_id();
            $fields = pick_fields(['course_id', 'topic', 'study_date', 'duration', 'status'], $payload);

            if (isset($fields['study_date'])) {
                $fields['study_date'] = sql_date((string) $fields['study_date']);
            }

            update_record($pdo, 'study_plan', $id, $fields);
            $statement = $pdo->prepare('SELECT * FROM study_plan WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Study plan item updated.');
            break;

        case 'toggle':
            $payload = request_data();
            $id = request_id();
            $status = strtolower((string) ($payload['status'] ?? 'completed'));
            $allowed = ['pending', 'in-progress', 'completed'];

            if (!in_array($status, $allowed, true)) {
                fail('Planner status must be pending, in-progress, or completed.', 422);
            }

            $statement = $pdo->prepare('SELECT * FROM study_plan WHERE id = :id');
            $statement->execute(['id' => $id]);
            $planItem = fetch_one_or_fail($statement, 'Study plan item was not found.');

            $update = $pdo->prepare('UPDATE study_plan SET status = :status WHERE id = :id');
            $update->execute([
                'status' => $status,
                'id' => $id,
            ]);

            if ($status === 'completed') {
                $performanceUpdate = $pdo->prepare(
                    'UPDATE performance SET accuracy = LEAST(100, accuracy + 0.8), weak_score = GREATEST(0, weak_score - 1.7) WHERE course_id = :course_id'
                );
                $performanceUpdate->execute(['course_id' => $planItem['course_id']]);
            }

            $statement = $pdo->prepare(
                <<<SQL
                SELECT
                    sp.*,
                    c.code AS course_code,
                    c.name AS course_name,
                    c.category,
                    c.type AS course_type,
                    c.difficulty AS course_difficulty
                FROM study_plan sp
                INNER JOIN courses c ON c.id = sp.course_id
                WHERE sp.id = :id
                SQL
            );
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Study plan item updated.');
            break;

        case 'delete':
            delete_record($pdo, 'study_plan', request_id());
            respond(['deleted' => true], 200, 'Study plan item deleted.');
            break;

        default:
            fail('Unsupported planner action.', 404);
    }
} catch (PDOException $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fail('Planner request failed.', 500, ['exception' => $exception->getMessage()]);
}
