package netlab.notify;

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
 * V29: dịch vụ tra cứu phát 6 sự kiện cập nhật; bốn consumer nhận theo ba mẫu: log (publish/subscribe), hai worker gửi email
 * (work queue, email-1 xử lý mỗi message 600 ms, email-2 xử lý 100 ms), vn-audit (routing theo topic). Mỗi consumer một channel
 * riêng, như các tiến trình riêng; chạy chung một tiến trình cho gọn. Đối số --prefetch n đặt prefetch cho hai worker email
 * (0: không giới hạn, mặc định của RabbitMQ).
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.notify.NotifyDemo --prefetch 1}
 */
public final class NotifyDemo {

    private static final List<String> EVENTS = List.of(
            "entry.vn.hanoi", "entry.vn.hue", "entry.jp.tokyo", "entry.vn.sapa", "entry.jp.osaka", "entry.vn.dalat");

    private static final Map<String, List<String>> received = new ConcurrentHashMap<>();
    private static final CountDownLatch emailDone = new CountDownLatch(EVENTS.size());
    private static final CountDownLatch otherDone = new CountDownLatch(EVENTS.size() + 4);  // log: 6, vn-audit: 4

    public static void main(String[] args) throws Exception {
        int prefetch = args.length > 1 && args[0].equals("--prefetch") ? Integer.parseInt(args[1]) : 0;
        try (Connection connection = Notify.factory().newConnection()) {
            try (Channel setup = connection.createChannel()) {
                Notify.declare(setup);
            }
            consume(connection, "log", "notify.log", 0, 0, otherDone);
            consume(connection, "vn-audit", "notify.vn", 0, 0, otherDone);
            consume(connection, "email-1", "notify.email", prefetch, 600, emailDone);  // worker chậm
            consume(connection, "email-2", "notify.email", prefetch, 100, emailDone);  // worker nhanh

            long start = System.nanoTime();
            try (Channel producer = connection.createChannel()) {
                for (String routingKey : EVENTS) {  // routing key mang quốc gia và khóa: entry.vn.hanoi
                    producer.basicPublish(Notify.EXCHANGE, routingKey, MessageProperties.TEXT_PLAIN,
                            ("updated " + routingKey).getBytes(UTF_8));
                }
            }
            emailDone.await();
            long ms = (System.nanoTime() - start) / 1_000_000;
            otherDone.await();
            System.out.println("published " + EVENTS.size() + " events, email prefetch " + (prefetch == 0 ? "unlimited" : prefetch));
            for (String name : List.of("log", "vn-audit", "email-1", "email-2")) {
                List<String> keys = received.getOrDefault(name, List.of());
                System.out.printf("  %-8s %d: %s%n", name, keys.size(), String.join(" ", keys));
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
