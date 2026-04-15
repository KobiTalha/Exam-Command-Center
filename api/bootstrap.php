<?php

declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Headers: Content-Type, X-Requested-With');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') === 'OPTIONS') {
    http_response_code(204);
    exit;
}

function config(): array
{
    static $config;

    if ($config === null) {
        $config = require __DIR__ . '/../config/database.php';
    }

    return $config;
}

function db(): PDO
{
    static $pdo;

    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $config = config();
    $dsn = sprintf(
        'mysql:host=%s;port=%d;dbname=%s;charset=%s',
        $config['host'],
        (int) $config['port'],
        $config['database'],
        $config['charset']
    );

    try {
        $pdo = new PDO(
            $dsn,
            $config['username'],
            $config['password'],
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
    } catch (PDOException $exception) {
        fail(
            'Database connection failed. Update config/database.php and import database/aiub_student_os.sql before using the app.',
            500,
            ['exception' => $exception->getMessage()]
        );
    }

    return $pdo;
}

function respond(mixed $data = null, int $status = 200, ?string $message = null, ?array $errors = null, bool $success = true): void
{
    http_response_code($status);

    echo json_encode(
        [
            'success' => $success,
            'data' => $data,
            'message' => $message,
            'errors' => $errors,
        ],
        JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
    );
    exit;
}

function fail(string $message, int $status = 400, ?array $errors = null): void
{
    respond(null, $status, $message, $errors, false);
}

function request_data(): array
{
    static $payload;

    if ($payload !== null) {
        return $payload;
    }

    $rawInput = file_get_contents('php://input') ?: '';
    $decoded = json_decode($rawInput, true);

    if (is_array($decoded)) {
        $payload = $decoded;
        return $payload;
    }

    $payload = $_POST ?: [];
    return $payload;
}

function request_action(string $default = 'list'): string
{
    $payload = request_data();
    $action = $_GET['action'] ?? $payload['action'] ?? $default;

    return strtolower(trim((string) $action));
}

function request_id(string $key = 'id'): int
{
    $payload = request_data();
    $value = $_GET[$key] ?? $payload[$key] ?? null;

    if ($value === null || !is_numeric((string) $value)) {
        fail(sprintf('A numeric %s is required.', $key));
    }

    return (int) $value;
}

function request_string(string $key, ?string $default = null): ?string
{
    $payload = request_data();
    $value = $_GET[$key] ?? $payload[$key] ?? $default;

    if ($value === null) {
        return null;
    }

    return trim((string) $value);
}

function request_int(string $key, ?int $default = null): ?int
{
    $payload = request_data();
    $value = $_GET[$key] ?? $payload[$key] ?? $default;

    if ($value === null || $value === '') {
        return $default;
    }

    if (!is_numeric((string) $value)) {
        fail(sprintf('%s must be numeric.', $key));
    }

    return (int) $value;
}

function request_bool(string $key, bool $default = false): bool
{
    $payload = request_data();
    $value = $_GET[$key] ?? $payload[$key] ?? $default;

    if (is_bool($value)) {
        return $value;
    }

    return in_array(strtolower((string) $value), ['1', 'true', 'yes', 'on'], true);
}

function require_fields(array $required, array $payload): void
{
    $missing = [];

    foreach ($required as $field) {
        if (!array_key_exists($field, $payload) || $payload[$field] === '' || $payload[$field] === null) {
            $missing[] = $field;
        }
    }

    if ($missing !== []) {
        fail('Missing required fields.', 422, ['missing' => $missing]);
    }
}

function pick_fields(array $allowed, array $payload): array
{
    $result = [];

    foreach ($allowed as $field) {
        if (array_key_exists($field, $payload)) {
            $result[$field] = $payload[$field];
        }
    }

    return $result;
}

function insert_record(PDO $pdo, string $table, array $fields): int
{
    $columns = array_keys($fields);
    $placeholders = array_map(static fn(string $column): string => ':' . $column, $columns);
    $statement = $pdo->prepare(
        sprintf(
            'INSERT INTO %s (%s) VALUES (%s)',
            $table,
            implode(', ', $columns),
            implode(', ', $placeholders)
        )
    );
    $statement->execute($fields);

    return (int) $pdo->lastInsertId();
}

function update_record(PDO $pdo, string $table, int $id, array $fields): void
{
    if ($fields === []) {
        fail('No update fields were provided.', 422);
    }

    $assignments = array_map(
        static fn(string $column): string => sprintf('%s = :%s', $column, $column),
        array_keys($fields)
    );

    $fields['id'] = $id;
    $statement = $pdo->prepare(
        sprintf('UPDATE %s SET %s WHERE id = :id', $table, implode(', ', $assignments))
    );
    $statement->execute($fields);
}

function delete_record(PDO $pdo, string $table, int $id): void
{
    $statement = $pdo->prepare(sprintf('DELETE FROM %s WHERE id = :id', $table));
    $statement->execute(['id' => $id]);
}

function fetch_one_or_fail(PDOStatement $statement, string $message = 'Requested record was not found.'): array
{
    $row = $statement->fetch();

    if (!$row) {
        fail($message, 404);
    }

    return $row;
}

function sql_date(string $value, string $fallback = 'today'): string
{
    try {
        return (new DateTimeImmutable($value))->format('Y-m-d');
    } catch (Throwable) {
        return (new DateTimeImmutable($fallback))->format('Y-m-d');
    }
}

function planner_topic(array $course, int $slotIndex, int $dayOffset): string
{
    $themes = [
        'AI priority review',
        'Problem-solving sprint',
        'Active recall deck',
        'Revision checkpoint',
        'Weak-area repair',
        'Timed practice block',
    ];

    if ($course['type'] === 'lab') {
        $themes = [
            'Lab rehearsal',
            'Observation notebook review',
            'Procedure walkthrough',
            'Practical checkpoint',
        ];
    }

    if ($course['type'] === 'elective') {
        $themes = [
            'Elective concept reinforcement',
            'Portfolio-ready practice',
            'Applied exploration session',
            'Case study reflection',
        ];
    }

    $theme = $themes[($slotIndex + $dayOffset) % count($themes)];

    return sprintf('%s - %s', $theme, $course['name']);
}

function planner_duration(array $course, int $slotIndex): int
{
    $duration = 60;

    if ($course['type'] === 'core') {
        $duration += 30;
    }

    if ((float) $course['weak_score'] > 70) {
        $duration += 30;
    }

    if ($course['difficulty'] === 'hard') {
        $duration += 15;
    }

    if ($slotIndex === 1) {
        $duration += 15;
    }

    return $duration;
}

function weighted_courses(PDO $pdo): array
{
    $statement = $pdo->query(
        <<<SQL
        SELECT
            c.id,
            c.code,
            c.name,
            c.category,
            c.type,
            c.difficulty,
            p.accuracy,
            p.weak_score
        FROM courses c
        INNER JOIN performance p ON p.course_id = c.id
        ORDER BY
            CASE WHEN c.type = 'core' THEN 0 WHEN c.type = 'lab' THEN 1 ELSE 2 END,
            p.weak_score DESC,
            CASE c.difficulty WHEN 'hard' THEN 0 WHEN 'medium' THEN 1 ELSE 2 END,
            c.code ASC
        SQL
    );

    $courses = $statement->fetchAll();
    $pool = [];

    foreach ($courses as $course) {
        $weight = 1;

        if ($course['type'] === 'core') {
            $weight += 2;
        }

        if ((float) $course['weak_score'] > 70) {
            $weight += 2;
        }

        if ($course['difficulty'] === 'hard') {
            $weight += 1;
        }

        for ($index = 0; $index < $weight; $index += 1) {
            $pool[] = $course;
        }
    }

    return $pool;
}

function regenerate_plan(PDO $pdo, string $startDate, int $days = 7): array
{
    $days = max(1, min($days, 21));
    $pool = weighted_courses($pdo);

    if ($pool === []) {
        fail('Courses and performance data are required before generating a study plan.', 422);
    }

    $endDate = (new DateTimeImmutable($startDate))->modify(sprintf('+%d days', $days - 1))->format('Y-m-d');

    $deleteStatement = $pdo->prepare(
        'DELETE FROM study_plan WHERE study_date BETWEEN :start_date AND :end_date AND status <> :status'
    );
    $deleteStatement->execute([
        'start_date' => $startDate,
        'end_date' => $endDate,
        'status' => 'completed',
    ]);

    $insertStatement = $pdo->prepare(
        'INSERT INTO study_plan (course_id, topic, study_date, duration, status) VALUES (:course_id, :topic, :study_date, :duration, :status)'
    );

    $created = [];

    for ($dayOffset = 0; $dayOffset < $days; $dayOffset += 1) {
        $studyDate = (new DateTimeImmutable($startDate))->modify(sprintf('+%d days', $dayOffset))->format('Y-m-d');
        $usedCourseIds = [];
        $slotCount = 4;

        for ($slotIndex = 0; $slotIndex < $slotCount; $slotIndex += 1) {
            $pointer = ($dayOffset * 7 + $slotIndex * 3) % count($pool);
            $attempts = 0;
            $course = $pool[$pointer];

            while (in_array($course['id'], $usedCourseIds, true) && $attempts < count($pool)) {
                $pointer = ($pointer + 1) % count($pool);
                $course = $pool[$pointer];
                $attempts += 1;
            }

            $usedCourseIds[] = (int) $course['id'];
            $payload = [
                'course_id' => (int) $course['id'],
                'topic' => planner_topic($course, $slotIndex, $dayOffset),
                'study_date' => $studyDate,
                'duration' => planner_duration($course, $slotIndex),
                'status' => $dayOffset === 0 && $slotIndex === 0 ? 'in-progress' : 'pending',
            ];

            $insertStatement->execute($payload);
            $payload['id'] = (int) $pdo->lastInsertId();
            $payload['course_code'] = $course['code'];
            $payload['course_name'] = $course['name'];
            $payload['course_type'] = $course['type'];
            $payload['course_difficulty'] = $course['difficulty'];
            $payload['weak_score'] = (float) $course['weak_score'];
            $created[] = $payload;
        }
    }

    return $created;
}
