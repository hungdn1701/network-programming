package netlab.udp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;

/**
 * V15: connected UDP socket. connect() trên DatagramSocket không gửi gói nào, không bắt tay: tới cả địa chỉ không ai trả
 * lời (192.0.2.1) cũng trả về ngay. Sau connect(), hệ điều hành chỉ chuyển cho socket các datagram từ đúng endpoint đó;
 * datagram từ endpoint khác bị bỏ.
 *
 * <p>Chạy: {@code java -cp out netlab.udp.ConnectedUdpDemo}
 */
public final class ConnectedUdpDemo {

    public static void main(String[] args) throws IOException {
        long start = System.nanoTime();
        try (DatagramSocket probe = new DatagramSocket()) {
            probe.connect(new InetSocketAddress("192.0.2.1", 9199));  // không gửi gì, không chờ phản hồi
            System.out.println("connect() to 192.0.2.1:9199 returned after " + (System.nanoTime() - start) / 1_000_000
                    + " ms, isConnected = " + probe.isConnected());
        }
        try (DatagramSocket server = new DatagramSocket(9301);
             DatagramSocket other = new DatagramSocket(9302);
             DatagramSocket client = new DatagramSocket()) {
            client.connect(new InetSocketAddress("127.0.0.1", 9301));  // chỉ nhận từ endpoint của server
            client.setSoTimeout(1_000);
            send(other, "from other endpoint", client);  // gửi tới client từ port 9302
            send(server, "from server", client);  // gửi tới client từ port 9301
            for (int i = 1; i <= 2; i++) {
                DatagramPacket p = new DatagramPacket(new byte[100], 100);
                try {
                    client.receive(p);
                    System.out.println("receive #" + i + ": \"" + new String(p.getData(), 0, p.getLength(), UTF_8)
                            + "\" from port " + p.getPort());
                } catch (SocketTimeoutException e) {
                    System.out.println("receive #" + i + ": nothing more (datagram from port 9302 was dropped)");
                }
            }
        }
    }

    static void send(DatagramSocket from, String text, DatagramSocket to) throws IOException {
        byte[] data = text.getBytes(UTF_8);
        from.send(new DatagramPacket(data, data.length, new InetSocketAddress("127.0.0.1", to.getLocalPort())));
    }
}
