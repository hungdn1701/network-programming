package netlab.udp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;

/**
 * V15: datagram giữ ranh giới. Hai lần send liên tiếp là hai datagram; bên nhận gọi receive() hai lần, mỗi lần nhận
 * đúng một datagram, không bao giờ ghép thành một (khác byte stream của TCP).
 *
 * <p>Chạy: {@code java -cp out netlab.udp.BoundaryDemo}
 */
public final class BoundaryDemo {

    public static void main(String[] args) throws IOException {
        try (DatagramSocket receiver = new DatagramSocket(9303); DatagramSocket sender = new DatagramSocket()) {
            for (String message : new String[] {"Ping 1", "Ping 2"}) {  // hai lần send liên tiếp
                byte[] data = message.getBytes(UTF_8);
                sender.send(new DatagramPacket(data, data.length, new InetSocketAddress("127.0.0.1", 9303)));
            }
            byte[] buf = new byte[512];
            DatagramPacket packet = new DatagramPacket(buf, buf.length);
            for (int i = 1; i <= 2; i++) {
                receiver.receive(packet);  // mỗi lần đúng một datagram
                System.out.println("receive #" + i + ": " + packet.getLength() + " bytes \""
                        + new String(packet.getData(), 0, packet.getLength(), UTF_8) + "\"");
            }
        }
    }
}
