package netlab.reliable;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.SocketAddress;
import java.util.HashMap;
import java.util.Map;
import java.util.Random;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

/**
 * V34: server tra cứu UDP giả lập mạng xấu. Với mỗi yêu cầu nhận được: 30% bỏ (như datagram mất), 15% trả lời trễ 450 ms,
 * 10% làm hỏng một byte của phản hồi trước khi gửi (lỗi mà checksum 16 bit của UDP không bắt được), còn lại trả lời ngay.
 * Server đếm số lần xử lý mỗi request ID: gửi lại làm server xử lý một yêu cầu nhiều lần (at-least-once).
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.reliable.LossyUdpServer [seed]}
 */
public final class LossyUdpServer {

    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    public static void main(String[] args) throws IOException {
        Random random = new Random(args.length > 0 ? Long.parseLong(args[0]) : 5);  // seed cố định: chạy lại cho cùng kịch bản
        ScheduledExecutorService late = Executors.newSingleThreadScheduledExecutor();
        Map<Integer, Integer> processed = new HashMap<>();  // request ID → số lần xử lý
        try (DatagramSocket socket = new DatagramSocket(9199)) {
            System.out.println("lossy UDP lookup on port 9199: loss 30%, late 15%, corrupt 10%");
            byte[] buf = new byte[Message.MAX_DATAGRAM];
            while (true) {
                DatagramPacket packet = new DatagramPacket(buf, buf.length);
                socket.receive(packet);
                Message request;
                try {
                    request = Message.decode(packet.getData(), packet.getLength());
                } catch (Message.CorruptException e) {
                    System.out.println("dropped datagram: " + e.getMessage());
                    continue;
                }
                double fate = random.nextDouble();
                if (fate < 0.30) {
                    System.out.printf("id %d: request lost%n", request.id());
                    continue;
                }
                int times = processed.merge(request.id(), 1, Integer::sum);
                byte[] reply = new Message(request.id(), reply(request.text())).encode();
                SocketAddress client = packet.getSocketAddress();
                if (fate < 0.45) {
                    System.out.printf("id %d: processed (time %d), reply sent 450 ms late%n", request.id(), times);
                    late.schedule(() -> send(socket, reply, client), 450, TimeUnit.MILLISECONDS);
                } else if (fate < 0.55) {
                    reply[5] ^= 0x01;  // đổi một bit của nội dung: CRC32 bên nhận sẽ không khớp
                    System.out.printf("id %d: processed (time %d), reply corrupted%n", request.id(), times);
                    send(socket, reply, client);
                } else {
                    System.out.printf("id %d: processed (time %d), replied%n", request.id(), times);
                    send(socket, reply, client);
                }
            }
        }
    }

    static String reply(String key) {
        String value = DATA.get(key);
        return value != null ? "OK " + value : "NOTFOUND";
    }

    private static void send(DatagramSocket socket, byte[] data, SocketAddress to) {
        try {
            socket.send(new DatagramPacket(data, data.length, to));
        } catch (IOException e) {
            System.out.println("send failed: " + e.getMessage());
        }
    }
}
