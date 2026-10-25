package netlab.reliable;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.util.Arrays;

/**
 * V34: client tra cứu UDP có retry. Mỗi yêu cầu mang một request ID; quá 300 ms chưa có phản hồi thì gửi lại cùng request
 * ID, tối đa 3 lần gửi (tổng thời gian chờ không quá 0,9 giây). Phản hồi có request ID khác (của yêu cầu cũ, đến muộn) bị bỏ
 * qua; datagram sai CRC32 bị bỏ như datagram mất.
 *
 * <p>Chạy (LossyUdpServer đang chạy): {@code java -Dstdout.encoding=UTF-8 -cp out netlab.reliable.ReliableLookupClient [số yêu cầu]}
 */
public final class ReliableLookupClient {

    static final int TIMEOUT_MS = 300;
    static final int MAX_SENDS = 3;

    private final DatagramSocket socket;
    private final InetSocketAddress server;
    private int nextId = 1;
    int sends;

    ReliableLookupClient(DatagramSocket socket, InetSocketAddress server) {
        this.socket = socket;
        this.server = server;
    }

    public static void main(String[] args) throws IOException {
        String[] all = {"hanoi", "huế", "sapa", "hanoi", "huế", "hanoi", "sapa", "huế", "hanoi", "huế"};
        String[] keys = Arrays.copyOf(all, args.length > 0 ? Integer.parseInt(args[0]) : all.length);
        try (DatagramSocket socket = new DatagramSocket()) {
            var client = new ReliableLookupClient(socket, new InetSocketAddress("127.0.0.1", 9199));
            int answered = 0;
            for (String key : keys) {
                int before = client.sends;
                String id = "id " + client.nextId;
                try {
                    String reply = client.lookup(key);
                    answered++;
                    System.out.printf("%-6s %-6s %-26s sends %d%n", id, key, reply, client.sends - before);
                } catch (IOException e) {
                    System.out.printf("%-6s %-6s %-26s sends %d%n", id, key, "(" + e.getMessage() + ")", client.sends - before);
                }
            }
            System.out.printf("%d requests, %d answered, %d datagrams sent%n", keys.length, answered, client.sends);
        }
    }

    String lookup(String key) throws IOException {
        int id = nextId++;
        byte[] request = new Message(id, key).encode();
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
