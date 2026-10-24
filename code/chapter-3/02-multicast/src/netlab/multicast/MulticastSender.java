package netlab.multicast;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetAddress;
import java.net.MulticastSocket;

/**
 * V16: nguồn phát multicast. Gửi 5 datagram tới nhóm 239.1.2.3, port 9300, mỗi 500 ms; TTL 1: datagram không đi qua
 * router nào, chỉ ở trong mạng cục bộ. Mỗi datagram gửi một lần, mọi máy đã tham gia nhóm đều nhận.
 *
 * <p>Chạy: {@code java -cp out netlab.multicast.MulticastSender}
 */
public final class MulticastSender {

    public static void main(String[] args) throws IOException, InterruptedException {
        InetAddress group = InetAddress.getByName("239.1.2.3");  // địa chỉ nhóm multicast
        try (MulticastSocket socket = new MulticastSocket()) {
            socket.setTimeToLive(1);  // TTL 1: không qua router nào
            for (int i = 1; i <= 5; i++) {
                byte[] data = ("tick " + i).getBytes(UTF_8);
                socket.send(new DatagramPacket(data, data.length, group, 9300));  // gửi một lần cho cả nhóm
                System.out.println("sent \"tick " + i + "\" to 239.1.2.3:9300");
                Thread.sleep(500);
            }
        }
    }
}
