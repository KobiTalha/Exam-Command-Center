<?php

declare(strict_types=1);

require __DIR__ . '/api/bootstrap.php';

$pdo = db();
$action = request_action();

try {
    switch ($action) {
        case 'list':
        case 'queue':
            $conditions = [];
            $params = [];
            $limit = max(1, min(request_int('limit', 24) ?? 24, 120));
            $offset = max(0, request_int('offset', 0) ?? 0);
            $courseId = request_int('course_id');
            $difficulty = request_string('difficulty');
            $search = request_string('search');
            $dueOnly = $action === 'queue' || request_bool('due_only', false);

            if ($courseId) {
                $conditions[] = 'f.course_id = :course_id';
                $params['course_id'] = $courseId;
            }

            if ($difficulty) {
                $conditions[] = 'f.difficulty = :difficulty';
                $params['difficulty'] = $difficulty;
            }

            if ($search) {
                $conditions[] = '(f.question LIKE :search OR f.answer LIKE :search)';
                $params['search'] = '%' . $search . '%';
            }

            if ($dueOnly) {
                $conditions[] = '(f.next_review IS NULL OR f.next_review <= CURDATE())';
            }

            $sql = <<<SQL
                SELECT
                    f.*,
                    c.code AS course_code,
                    c.name AS course_name,
                    c.category,
                    c.type AS course_type
                FROM flashcards f
                INNER JOIN courses c ON c.id = f.course_id
            SQL;

            if ($conditions !== []) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }

            $sql .= ' ORDER BY (f.next_review IS NULL OR f.next_review <= CURDATE()) DESC, f.next_review ASC, f.id ASC LIMIT :limit OFFSET :offset';
            $statement = $pdo->prepare($sql);

            foreach ($params as $key => $value) {
                $statement->bindValue(':' . $key, $value);
            }

            $statement->bindValue(':limit', $limit, PDO::PARAM_INT);
            $statement->bindValue(':offset', $offset, PDO::PARAM_INT);
            $statement->execute();
            $cards = $statement->fetchAll();

            if ($action === 'queue' && $cards === []) {
                $fallbackSql = <<<SQL
                    SELECT
                        f.*,
                        c.code AS course_code,
                        c.name AS course_name,
                        c.category,
                        c.type AS course_type
                    FROM flashcards f
                    INNER JOIN courses c ON c.id = f.course_id
                SQL;

                if ($courseId) {
                    $fallbackSql .= ' WHERE f.course_id = :fallback_course_id';
                }

                $fallbackSql .= ' ORDER BY f.next_review ASC, f.id ASC LIMIT :fallback_limit';
                $fallback = $pdo->prepare($fallbackSql);

                if ($courseId) {
                    $fallback->bindValue(':fallback_course_id', $courseId, PDO::PARAM_INT);
                }

                $fallback->bindValue(':fallback_limit', $limit, PDO::PARAM_INT);
                $fallback->execute();
                $cards = $fallback->fetchAll();
            }

            respond($cards);
            break;

        case 'read':
            $statement = $pdo->prepare(
                <<<SQL
                SELECT
                    f.*,
                    c.code AS course_code,
                    c.name AS course_name,
                    c.category,
                    c.type AS course_type
                FROM flashcards f
                INNER JOIN courses c ON c.id = f.course_id
                WHERE f.id = :id
                SQL
            );
            $statement->execute(['id' => request_id()]);
            respond(fetch_one_or_fail($statement));
            break;

        case 'summary':
            $statement = $pdo->query(
                <<<SQL
                SELECT
                    c.id AS course_id,
                    c.code,
                    c.name,
                    c.category,
                    c.type,
                    c.difficulty AS course_difficulty,
                    COUNT(f.id) AS total_cards,
                    SUM(CASE WHEN f.next_review IS NULL OR f.next_review <= CURDATE() THEN 1 ELSE 0 END) AS due_cards,
                    SUM(CASE WHEN f.difficulty = 'easy' THEN 1 ELSE 0 END) AS easy_cards,
                    SUM(CASE WHEN f.difficulty = 'medium' THEN 1 ELSE 0 END) AS medium_cards,
                    SUM(CASE WHEN f.difficulty = 'hard' THEN 1 ELSE 0 END) AS hard_cards
                FROM courses c
                LEFT JOIN flashcards f ON f.course_id = c.id
                GROUP BY c.id, c.code, c.name, c.category, c.type, c.difficulty
                ORDER BY due_cards DESC, c.code ASC
                SQL
            );
            respond($statement->fetchAll());
            break;

        case 'create':
            $payload = request_data();
            require_fields(['course_id', 'question', 'answer', 'difficulty'], $payload);
            $fields = pick_fields(
                ['course_id', 'question', 'answer', 'difficulty', 'next_review', 'last_reviewed'],
                $payload
            );
            $id = insert_record($pdo, 'flashcards', $fields);

            $statement = $pdo->prepare('SELECT * FROM flashcards WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 201, 'Flashcard created.');
            break;

        case 'update':
            $payload = request_data();
            $id = request_id();
            $fields = pick_fields(
                ['course_id', 'question', 'answer', 'difficulty', 'next_review', 'last_reviewed'],
                $payload
            );
            update_record($pdo, 'flashcards', $id, $fields);

            $statement = $pdo->prepare('SELECT * FROM flashcards WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Flashcard updated.');
            break;

        case 'review':
            $payload = request_data();
            $id = request_id();
            $reviewDifficulty = strtolower((string) ($payload['difficulty'] ?? 'medium'));
            $intervalMap = ['hard' => 1, 'medium' => 2, 'easy' => 4];

            if (!array_key_exists($reviewDifficulty, $intervalMap)) {
                fail('Flashcard review difficulty must be hard, medium, or easy.', 422);
            }

            $statement = $pdo->prepare('SELECT * FROM flashcards WHERE id = :id');
            $statement->execute(['id' => $id]);
            $flashcard = fetch_one_or_fail($statement, 'Flashcard to review was not found.');

            $update = $pdo->prepare(
                'UPDATE flashcards SET difficulty = :difficulty, last_reviewed = CURDATE(), next_review = DATE_ADD(CURDATE(), INTERVAL :days DAY) WHERE id = :id'
            );
            $update->bindValue(':difficulty', $reviewDifficulty);
            $update->bindValue(':days', $intervalMap[$reviewDifficulty], PDO::PARAM_INT);
            $update->bindValue(':id', $id, PDO::PARAM_INT);
            $update->execute();

            $performanceUpdate = $pdo->prepare(
                <<<SQL
                UPDATE performance
                SET
                    accuracy = LEAST(
                        100,
                        accuracy + CASE :accuracy_difficulty
                            WHEN 'hard' THEN 0.2
                            WHEN 'medium' THEN 0.8
                            ELSE 1.4
                        END
                    ),
                    weak_score = GREATEST(
                        0,
                        weak_score + CASE :weak_difficulty
                            WHEN 'hard' THEN 1.5
                            WHEN 'medium' THEN -1.0
                            ELSE -2.5
                        END
                    )
                WHERE course_id = :course_id
                SQL
            );
            $performanceUpdate->execute([
                'accuracy_difficulty' => $reviewDifficulty,
                'weak_difficulty' => $reviewDifficulty,
                'course_id' => $flashcard['course_id'],
            ]);

            $statement = $pdo->prepare('SELECT * FROM flashcards WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Flashcard reviewed.');
            break;

        case 'delete':
            delete_record($pdo, 'flashcards', request_id());
            respond(['deleted' => true], 200, 'Flashcard deleted.');
            break;

        default:
            fail('Unsupported flashcards action.', 404);
    }
} catch (PDOException $exception) {
    fail('Flashcards request failed.', 500, ['exception' => $exception->getMessage()]);
}
