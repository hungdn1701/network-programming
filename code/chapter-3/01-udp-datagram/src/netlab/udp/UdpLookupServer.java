package netlab.udp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.util.Map;

/**
 * V15: dịch vụ tra cứu, bản UDP. Mỗi datagram nhận được là một yêu cầu (một khóa, không cần LF: datagram giữ ranh giới);
 * server trả đúng một datagram về endpoint đã gửi. Không listen, không accept, không có kết nối.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.udp.UdpLookupServer}
 */
public final class UdpLookupServer {

    static final int MAX_DATAGRAM = 512;  // đủ cho khóa tối đa 256 byte và phản hồi
    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    public static void main(String[] args) throws IOException {
        try (DatagramSocket socket = new DatagramSocket(9199)) {  // UDP port 9199: không có listening socket
            System.out.println("UDP lookup on port 9199");
            byte[] buf = new byte[MAX_DATAGRAM];
            while (true) {
                DatagramPacket request = new DatagramPacket(buf, buf.length);  // mỗi vòng một packet đủ độ dài
                socket.receive(request);  // chờ và nhận đúng một datagram
                String key = new String(request.getData(), 0, request.getLength(), UTF_8);
                byte[] reply = reply(key).getBytes(UTF_8);
                socket.send(new DatagramPacket(reply, reply.length, request.getSocketAddress()));  // trả về nơi gửi
                System.out.println("from " + request.getSocketAddress() + ": " + request.getLength() + " bytes \""
                        + key + "\", replied " + reply.length + " bytes");
            }
        }
    }

    static String reply(String key) {
        if (key.isEmpty()) {
            return "ERR empty key";
        }
        String value = DATA.get(key);
        return value != null ? "OK " + value : "NOTFOUND";
    }
}
