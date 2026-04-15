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
                    ci.id,
                    ci.product_id,
                    ci.quantity,
                    p.sku,
                    p.name,
                    p.description,
                    p.category,
                    p.product_type,
                    p.price,
                    p.stock,
                    p.badge,
                    p.image_path,
                    ROUND(ci.quantity * p.price, 2) AS line_total
                FROM cart_items ci
                INNER JOIN products p ON p.id = ci.product_id
                ORDER BY ci.id ASC
                SQL
            );
            $items = $statement->fetchAll();
            $total = array_reduce(
                $items,
                static fn(float $carry, array $item): float => $carry + (float) $item['line_total'],
                0.0
            );

            respond([
                'items' => $items,
                'count' => count($items),
                'total' => round($total, 2),
            ]);
            break;

        case 'add':
        case 'create':
            $payload = request_data();
            require_fields(['product_id'], $payload);
            $productId = (int) $payload['product_id'];
            $quantity = max(1, (int) ($payload['quantity'] ?? 1));

            $productStatement = $pdo->prepare('SELECT * FROM products WHERE id = :id');
            $productStatement->execute(['id' => $productId]);
            $product = fetch_one_or_fail($productStatement, 'Product was not found.');

            if ((int) $product['stock'] < 1) {
                fail(sprintf('%s is currently out of stock.', $product['name']), 422);
            }

            $existing = $pdo->prepare('SELECT * FROM cart_items WHERE product_id = :product_id');
            $existing->execute(['product_id' => $productId]);
            $cartRow = $existing->fetch();

            if ($cartRow) {
                $newQuantity = min((int) $product['stock'], (int) $cartRow['quantity'] + $quantity);
                $update = $pdo->prepare('UPDATE cart_items SET quantity = :quantity WHERE id = :id');
                $update->execute([
                    'quantity' => $newQuantity,
                    'id' => $cartRow['id'],
                ]);
            } else {
                insert_record($pdo, 'cart_items', [
                    'product_id' => $productId,
                    'quantity' => min((int) $product['stock'], $quantity),
                ]);
            }

            respond(['product_id' => $productId], 200, 'Cart updated.');
            break;

        case 'update':
            $payload = request_data();
            $id = request_id();
            $quantity = max(1, (int) ($payload['quantity'] ?? 1));
            $statement = $pdo->prepare(
                <<<SQL
                SELECT
                    ci.id,
                    p.stock,
                    p.name
                FROM cart_items ci
                INNER JOIN products p ON p.id = ci.product_id
                WHERE ci.id = :id
                SQL
            );
            $statement->execute(['id' => $id]);
            $cartItem = fetch_one_or_fail($statement, 'Cart item was not found.');

            if ($quantity > (int) $cartItem['stock']) {
                fail(sprintf('Only %d units of %s are available.', (int) $cartItem['stock'], $cartItem['name']), 422);
            }

            update_record($pdo, 'cart_items', $id, ['quantity' => $quantity]);
            respond(['id' => $id], 200, 'Cart item updated.');
            break;

        case 'remove':
        case 'delete':
            $itemId = request_int('id');
            $productId = request_int('product_id');

            if ($itemId) {
                delete_record($pdo, 'cart_items', $itemId);
            } elseif ($productId) {
                $statement = $pdo->prepare('DELETE FROM cart_items WHERE product_id = :product_id');
                $statement->execute(['product_id' => $productId]);
            } else {
                fail('A cart item id or product_id is required.', 422);
            }

            respond(['removed' => true], 200, 'Cart item removed.');
            break;

        case 'clear':
            $pdo->exec('DELETE FROM cart_items');
            respond(['cleared' => true], 200, 'Cart cleared.');
            break;

        default:
            fail('Unsupported cart action.', 404);
    }
} catch (PDOException $exception) {
    fail('Cart request failed.', 500, ['exception' => $exception->getMessage()]);
}
