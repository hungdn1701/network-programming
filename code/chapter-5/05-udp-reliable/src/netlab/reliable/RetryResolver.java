package netlab.reliable;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.util.Arrays;

/**
 * V34: client truy vấn kiểu DNS qua UDP, có retry như resolver (RFC 1035 mục 4.2.1: hết thời gian chờ thì gửi lại). Mỗi truy
 * vấn mang một request ID 16 bit; quá 300 ms chưa có phản hồi thì gửi lại cùng request ID, tối đa 3 lần gửi (tổng thời gian chờ
 * không quá 0,9 giây). Phản hồi có request ID khác (của yêu cầu cũ, đến muộn) bị bỏ
 * qua; datagram sai CRC32 bị bỏ như datagram mất.
 *
 * <p>Chạy (LossyUdpServer đang chạy): {@code java -Dstdout.encoding=UTF-8 -cp out netlab.reliable.RetryResolver [số truy vấn]}
 */
public final class RetryResolver {

    static final int TIMEOUT_MS = 300;
    static final int MAX_SENDS = 3;

    private final DatagramSocket socket;
    private final InetSocketAddress server;
    private int nextId = 1;
    int sends;

    RetryResolver(DatagramSocket socket, InetSocketAddress server) {
        this.socket = socket;
        this.server = server;
    }

    public static void main(String[] args) throws IOException {
        String[] all = {"web.example", "mail.example", "nothing.example", "web.example", "mail.example", "web.example",
                "nothing.example", "mail.example", "web.example", "mail.example"};
        String[] names = Arrays.copyOf(all, args.length > 0 ? Integer.parseInt(args[0]) : all.length);
        try (DatagramSocket socket = new DatagramSocket()) {
            var client = new RetryResolver(socket, new InetSocketAddress("127.0.0.1", 9199));
            int answered = 0;
            for (String name : names) {
                int before = client.sends;
                String id = "id " + client.nextId;
                try {
                    String reply = client.resolve(name);
                    answered++;
                    System.out.printf("%-6s %-16s %-26s sends %d%n", id, name, reply, client.sends - before);
                } catch (IOException e) {
                    System.out.printf("%-6s %-16s %-26s sends %d%n", id, name, "(" + e.getMessage() + ")", client.sends - before);
                }
            }
            System.out.printf("%d queries, %d answered, %d datagrams sent%n", names.length, answered, client.sends);
        }
    }

    String resolve(String name) throws IOException {
        int id = nextId++;
        byte[] request = new Message(id, name).encode();
        DatagramPacket packet = new DatagramPacket(new byte[Message.MAX_DATAGRAM], Message.MAX_DATAGRAM);
        for (int send = 1; send <= MAX_SENDS; send++) {
            socket.send(new DatagramPacket(request, request.length, server));  // gửi lại: cùng request ID
            sends++;
            long deadline = System.nanoTime() + TIMEOUT_MS * 1_000_000L;
            while (true) {
                long left = (deadline - System.nanoTime()) / 1_000_000;
                if (left <= 0) {
                    break;  // hết 300 ms của lần gửi này
                }
                socket.setSoTimeout((int) left);
                try {
                    socket.receive(packet);
                } catch (SocketTimeoutException e) {
                    break;
                }
                Message reply;
                try {
                    reply = Message.decode(packet.getData(), packet.getLength());
                } catch (Message.CorruptException e) {
                    System.out.println("       dropped datagram: " + e.getMessage());  // như datagram mất: chờ tiếp
                    continue;
                }
                if (reply.id() != id) {
                    System.out.println("       ignored late reply of id " + reply.id());  // phản hồi của yêu cầu cũ
                    continue;
                }
                return reply.text();
            }
        }
        throw new IOException("no reply after " + MAX_SENDS + " sends");
    }
}
