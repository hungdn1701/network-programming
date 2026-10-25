package netlab.broker;

import com.rabbitmq.client.BuiltinExchangeType;
import com.rabbitmq.client.Channel;
import com.rabbitmq.client.ConnectionFactory;
import java.io.IOException;

/**
 * V28: tên exchange, queue, binding dùng chung cho producer và consumer. Khai báo trong AMQP là idempotent: khai báo lại một
 * exchange hay queue đã có với cùng tham số không đổi gì, nên cả hai bên đều khai báo trước khi dùng.
 */
final class Topology {

    static final String EXCHANGE = "lookup.events";    // exchange kiểu direct: chuyển theo đúng routing key
    static final String QUEUE = "lookup.updates";
    static final String ROUTING_KEY = "entry.updated";

    private Topology() {
    }

    static ConnectionFactory factory() {
        ConnectionFactory factory = new ConnectionFactory();
        factory.setHost("127.0.0.1");  // RabbitMQ ở port 5672 (AMQP), tài khoản mặc định guest chỉ dùng được từ localhost
        return factory;
    }

    static void declare(Channel channel) throws IOException {
        channel.exchangeDeclare(EXCHANGE, BuiltinExchangeType.DIRECT);
        channel.queueDeclare(QUEUE, true, false, false, null);  // durable: RabbitMQ 4.3 chặn queue thường không durable
        channel.queueBind(QUEUE, EXCHANGE, ROUTING_KEY);  // binding: message có routing key này vào queue này
    }
}
