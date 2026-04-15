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
            $category = request_string('category');
            $productType = request_string('product_type');
            $search = request_string('search');

            if ($category) {
                $conditions[] = 'category = :category';
                $params['category'] = $category;
            }

            if ($productType) {
                $conditions[] = 'product_type = :product_type';
                $params['product_type'] = $productType;
            }

            if ($search) {
                $conditions[] = '(name LIKE :search OR description LIKE :search)';
                $params['search'] = '%' . $search . '%';
            }

            $sql = 'SELECT * FROM products';

            if ($conditions !== []) {
                $sql .= ' WHERE ' . implode(' AND ', $conditions);
            }

            $sql .= ' ORDER BY featured DESC, category ASC, name ASC';
            $statement = $pdo->prepare($sql);
            $statement->execute($params);
            respond($statement->fetchAll());
            break;

        case 'read':
            $statement = $pdo->prepare('SELECT * FROM products WHERE id = :id');
            $statement->execute(['id' => request_id()]);
            respond(fetch_one_or_fail($statement));
            break;

        case 'create':
            $payload = request_data();
            require_fields(['sku', 'name', 'description', 'category', 'product_type', 'price', 'stock'], $payload);
            $fields = pick_fields(
                ['sku', 'name', 'description', 'category', 'product_type', 'price', 'stock', 'featured', 'badge', 'image_path'],
                $payload
            );
            $id = insert_record($pdo, 'products', $fields);

            $statement = $pdo->prepare('SELECT * FROM products WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 201, 'Product created.');
            break;

        case 'update':
            $payload = request_data();
            $id = request_id();
            $fields = pick_fields(
                ['sku', 'name', 'description', 'category', 'product_type', 'price', 'stock', 'featured', 'badge', 'image_path'],
                $payload
            );
            update_record($pdo, 'products', $id, $fields);

            $statement = $pdo->prepare('SELECT * FROM products WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Product updated.');
            break;

        case 'delete':
            delete_record($pdo, 'products', request_id());
            respond(['deleted' => true], 200, 'Product deleted.');
            break;

        default:
            fail('Unsupported products action.', 404);
    }
} catch (PDOException $exception) {
    fail('Products request failed.', 500, ['exception' => $exception->getMessage()]);
}
