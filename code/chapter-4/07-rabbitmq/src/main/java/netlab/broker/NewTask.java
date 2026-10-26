package netlab.broker;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.rabbitmq.client.Channel;
import com.rabbitmq.client.Connection;
import com.rabbitmq.client.ConnectionFactory;
import com.rabbitmq.client.MessageProperties;

/**
 * V28: producer của work queue, theo hướng dẫn chính thức của RabbitMQ (Tutorial 2, Work Queues). Giao một việc vào queue
 * task_queue rồi kết thúc: không chờ worker, không cần worker đang chạy. Mỗi dấu chấm trong message là một giây làm việc.
 *
 * <p>Chạy: {@code java -cp "target/classes;target/dependency/*" netlab.broker.NewTask First message.}
 */
public final class NewTask {

    static final String TASK_QUEUE_NAME = "task_queue";

    static ConnectionFactory factory() {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("127.0.0.1");  // RabbitMQ ở port 5672 (AMQP), tài khoản mặc định guest chỉ dùng được từ localhost
        return factory;
    }

    public static void main(String[] argv) throws Exception {
        try (Connection connection = factory().newConnection();
             Channel channel = connection.createChannel()) {
            channel.queueDeclare(TASK_QUEUE_NAME, true, false, false, null);  // durable: queue còn sau khi broker khởi động lại
            String message = String.join(" ", argv);
            channel.basicPublish("", TASK_QUEUE_NAME,  // exchange mặc định (tên rỗng): routing key là tên queue
                    MessageProperties.PERSISTENT_TEXT_PLAIN, message.getBytes(UTF_8));  // message persistent
            System.out.println(" [x] Sent '" + message + "'");
        }
    }
}
