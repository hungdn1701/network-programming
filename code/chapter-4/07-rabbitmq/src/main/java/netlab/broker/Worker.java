package netlab.broker;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.DeliverCallback;
import java.util.List;
import java.util.concurrent.CountDownLatch;

/**
 * V28: consumer của work queue, theo hướng dẫn chính thức của RabbitMQ (Tutorial 2, Work Queues): nhận việc từ task_queue, làm
 * (một giây cho mỗi dấu chấm), làm xong mới ack. Thêm các tùy chọn để chạy theo kịch bản: {@code --auto-ack} (broker xóa message
 * ngay khi giao), {@code --crash-on <message>} (tắt hẳn tiến trình khi đang làm việc đó), {@code --max <n>} (dừng sau n việc).
 *
 * <p>Chạy: {@code java -cp "target/classes;target/dependency/*" netlab.broker.Worker [tùy chọn]}
 */
public final class Worker {

    public static void main(String[] argv) throws Exception {
        List<String> opts = List.of(argv);
        boolean autoAck = opts.contains("--auto-ack");
        String crashOn = opts.contains("--crash-on") ? opts.get(opts.indexOf("--crash-on") + 1) : null;
        int max = opts.contains("--max") ? Integer.parseInt(opts.get(opts.indexOf("--max") + 1)) : Integer.MAX_VALUE;

        Connection connection = NewTask.factory().newConnection();
        Channel channel = connection.createChannel();
        channel.queueDeclare(NewTask.TASK_QUEUE_NAME, true, false, false, null);
        System.out.println(" [*] Waiting for messages" + (autoAck ? " (autoAck)" : " (manual ack)"));
        channel.basicQos(1);  // ack thủ công: mỗi lần chỉ nhận một việc chưa ack
        CountDownLatch done = new CountDownLatch(max);
        DeliverCallback deliverCallback = (consumerTag, delivery) -> {
            String message = new String(delivery.getBody(), UTF_8);
            System.out.println(" [x] Received '" + message + "'" + (delivery.getEnvelope().isRedeliver() ? " (redelivered)" : ""));
            if (message.equals(crashOn)) {
                System.out.println(" [!] crash while working on '" + message + "'");
                Runtime.getRuntime().halt(1);  // tiến trình chết giữa chừng, chưa kịp ack
            }
            doWork(message);
            System.out.println(" [x] Done");
            if (!autoAck) {
                channel.basicAck(delivery.getEnvelope().getDeliveryTag(), false);  // làm xong mới ack
            }
            done.countDown();
        };
        channel.basicConsume(NewTask.TASK_QUEUE_NAME, autoAck, deliverCallback, consumerTag -> { });
        done.await();
        connection.close();
    }

    private static void doWork(String task) {
        for (char ch : task.toCharArray()) {
            if (ch == '.') {
                try {
                    Thread.sleep(1000);  // mỗi dấu chấm: một giây làm việc
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                }
            }
        }
    }
}
