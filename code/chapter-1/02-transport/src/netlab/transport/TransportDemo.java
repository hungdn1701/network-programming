package netlab.transport;

import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.ServerSocket;
import java.net.Socket;

/**
 * V03, slide 5: mở sẵn một kết nối TCP và một endpoint UDP trên loopback để quan sát bằng netstat.
 * Mã socket học ở Chương 2 (TCP) và Chương 3 (UDP); ở phần này chỉ dùng để tạo trạng thái cần quan sát.
 *
 * <p>Chạy: {@code java -cp out netlab.transport.TransportDemo}, trong 30 giây chạy {@code observe.ps1}
 * ở terminal khác.
 */
public final class TransportDemo {

    public static void main(String[] args) throws Exception {
        InetAddress loopback = InetAddress.getLoopbackAddress();
        try (var listener = new ServerSocket(9199, 50, loopback);
             var client = new Socket(loopback, 9199);
             var accepted = listener.accept();
             var udp = new DatagramSocket(new InetSocketAddress(loopback, 9200))) {
            System.out.println("TCP: listening 9199, client " + client.getLocalPort() + " -> 9199; UDP: 9200");
            System.out.println("pid " + ProcessHandle.current().pid() + ", waiting 30 s");
            Thread.sleep(30_000);
        }
    }
}
