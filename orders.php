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
                    o.*,
                    COUNT(oi.id) AS item_count
                FROM orders o
                LEFT JOIN order_items oi ON oi.order_id = o.id
                GROUP BY o.id
                ORDER BY o.order_date DESC, o.id DESC
                SQL
            );
            respond($statement->fetchAll());
            break;

        case 'read':
            $id = request_id();
            $orderStatement = $pdo->prepare('SELECT * FROM orders WHERE id = :id');
            $orderStatement->execute(['id' => $id]);
            $order = fetch_one_or_fail($orderStatement, 'Order was not found.');

            $itemsStatement = $pdo->prepare(
                <<<SQL
                SELECT
                    oi.*,
                    p.name,
                    p.category,
                    p.product_type
                FROM order_items oi
                INNER JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = :order_id
                ORDER BY oi.id ASC
                SQL
            );
            $itemsStatement->execute(['order_id' => $id]);

            respond([
                'order' => $order,
                'items' => $itemsStatement->fetchAll(),
            ]);
            break;

        case 'create':
            $payload = request_data();
            require_fields(['customer_name', 'customer_email'], $payload);

            $cartStatement = $pdo->query(
                <<<SQL
                SELECT
                    ci.product_id,
                    ci.quantity,
                    p.name,
                    p.price,
                    p.stock
                FROM cart_items ci
                INNER JOIN products p ON p.id = ci.product_id
                ORDER BY ci.id ASC
                SQL
            );
            $cartItems = $cartStatement->fetchAll();

            if ($cartItems === []) {
                fail('Cart is empty. Add products before checkout.', 422);
            }

            $total = 0.0;
            foreach ($cartItems as $item) {
                if ((int) $item['stock'] < (int) $item['quantity']) {
                    fail(sprintf('Not enough stock available for %s.', $item['name']), 422);
                }

                $total += (float) $item['price'] * (int) $item['quantity'];
            }

            $pdo->beginTransaction();

            $orderId = insert_record($pdo, 'orders', [
                'customer_name' => $payload['customer_name'],
                'customer_email' => $payload['customer_email'],
                'customer_phone' => $payload['customer_phone'] ?? '',
                'campus' => $payload['campus'] ?? 'AIUB Campus',
                'delivery_note' => $payload['delivery_note'] ?? '',
                'total_amount' => round($total, 2),
                'status' => $payload['status'] ?? 'placed',
                'order_date' => (new DateTimeImmutable('now'))->format('Y-m-d H:i:s'),
            ]);

            $orderItemStatement = $pdo->prepare(
                'INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES (:order_id, :product_id, :quantity, :unit_price, :line_total)'
            );
            $stockStatement = $pdo->prepare('UPDATE products SET stock = stock - :quantity WHERE id = :product_id');

            foreach ($cartItems as $item) {
                $lineTotal = round((float) $item['price'] * (int) $item['quantity'], 2);
                $orderItemStatement->execute([
                    'order_id' => $orderId,
                    'product_id' => $item['product_id'],
                    'quantity' => $item['quantity'],
                    'unit_price' => $item['price'],
                    'line_total' => $lineTotal,
                ]);

                $stockStatement->execute([
                    'quantity' => $item['quantity'],
                    'product_id' => $item['product_id'],
                ]);
            }

            $pdo->exec('DELETE FROM cart_items');
            $pdo->commit();

            $statement = $pdo->prepare('SELECT * FROM orders WHERE id = :id');
            $statement->execute(['id' => $orderId]);
            respond(fetch_one_or_fail($statement), 201, 'Order placed successfully.');
            break;

        case 'update':
            $payload = request_data();
            $id = request_id();
            $fields = pick_fields(
                ['customer_name', 'customer_email', 'customer_phone', 'campus', 'delivery_note', 'total_amount', 'status'],
                $payload
            );
            update_record($pdo, 'orders', $id, $fields);

            $statement = $pdo->prepare('SELECT * FROM orders WHERE id = :id');
            $statement->execute(['id' => $id]);
            respond(fetch_one_or_fail($statement), 200, 'Order updated.');
            break;

        case 'delete':
            $id = request_id();
            $pdo->beginTransaction();
            $statement = $pdo->prepare('DELETE FROM order_items WHERE order_id = :order_id');
            $statement->execute(['order_id' => $id]);
            delete_record($pdo, 'orders', $id);
            $pdo->commit();
            respond(['deleted' => true], 200, 'Order deleted.');
            break;

        default:
            fail('Unsupported orders action.', 404);
    }
} catch (PDOException $exception) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }

    fail('Orders request failed.', 500, ['exception' => $exception->getMessage()]);
}
