package netlab.orders;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.MessageProperties;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.concurrent.CountDownLatch;

/**
 * V29: dịch vụ đặt hàng phát 6 sự kiện đặt hàng; bốn consumer nhận theo ba mẫu: analytics thống kê (publish/subscribe), hai worker
 * gửi email xác nhận (work queue, email-1 xử lý mỗi message 600 ms, email-2 xử lý 100 ms), warehouse là kho Hà Nội (routing theo
 * topic). Mỗi consumer một channel riêng, như các tiến trình riêng; chạy chung một tiến trình cho gọn. Đối số --prefetch n đặt
 * prefetch cho hai worker email (0: không giới hạn, mặc định của RabbitMQ).
 *
 * <p>Chạy: {@code java -cp "target/classes;target/dependency/*" netlab.orders.OrderDemo --prefetch 1}
 */
public final class OrderDemo {

    private static final List<String> ORDERS = List.of(
            "order.hn.1001", "order.hn.1002", "order.hcm.1003", "order.hn.1004", "order.hcm.1005", "order.hn.1006");

    private static final Map<String, List<String>> received = new ConcurrentHashMap<>();
    private static final CountDownLatch emailDone = new CountDownLatch(ORDERS.size());
    private static final CountDownLatch otherDone = new CountDownLatch(ORDERS.size() + 4);  // analytics: 6, warehouse: 4

    public static void main(String[] args) throws Exception {
        int prefetch = args.length > 1 && args[0].equals("--prefetch") ? Integer.parseInt(args[1]) : 0;
        try (Connection connection = Orders.factory().newConnection()) {
            try (Channel setup = connection.createChannel()) {
                Orders.declare(setup);
            }
            consume(connection, "analytics", "orders.analytics", 0, 0, otherDone);
            consume(connection, "warehouse", "orders.hanoi", 0, 0, otherDone);
            consume(connection, "email-1", "orders.email", prefetch, 600, emailDone);  // worker chậm
            consume(connection, "email-2", "orders.email", prefetch, 100, emailDone);  // worker nhanh

            long start = System.nanoTime();
            try (Channel producer = connection.createChannel()) {
                for (String routingKey : ORDERS) {  // routing key mang vùng và mã đơn: order.hn.1001
                    producer.basicPublish(Orders.EXCHANGE, routingKey, MessageProperties.TEXT_PLAIN,
                            ("order placed " + routingKey).getBytes(UTF_8));
                }
            }
            emailDone.await();
            long ms = (System.nanoTime() - start) / 1_000_000;
            otherDone.await();
            System.out.println("published " + ORDERS.size() + " orders, email prefetch " + (prefetch == 0 ? "unlimited" : prefetch));
            for (String name : List.of("analytics", "warehouse", "email-1", "email-2")) {
                List<String> ids = received.getOrDefault(name, List.of());
                System.out.printf("  %-9s %d: %s%n", name, ids.size(), String.join(" ", ids));
            }
            System.out.println("  all email sent after " + ms + " ms");
        }
    }

    private static void consume(Connection connection, String name, String queue, int prefetch, long workMillis,
                                CountDownLatch done) throws Exception {
        Channel channel = connection.createChannel();
        if (prefetch > 0) {
            channel.basicQos(prefetch);  // tối đa prefetch message chưa ack giao cho consumer này
        }
        channel.basicConsume(queue, false, (tag, delivery) -> {
            String key = delivery.getEnvelope().getRoutingKey();
            sleep(workMillis);  // mô phỏng xử lý (gửi email)
            received.computeIfAbsent(name, n -> new CopyOnWriteArrayList<>()).add(key.substring(key.lastIndexOf('.') + 1));
            channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);
            done.countDown();
        }, tag -> { });
    }

    private static void sleep(long millis) {
        try {
            Thread.sleep(millis);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }
}
