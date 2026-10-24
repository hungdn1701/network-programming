package netlab.multicast;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.MulticastSocket;
import java.net.NetworkInterface;
import java.net.SocketTimeoutException;

/**
 * V16: máy nhận multicast. Tham gia nhóm 239.1.2.3 trên một network interface rồi nhận datagram. Đối số: tên máy nhận
 * (in kèm mỗi dòng) và tên network interface (không bắt buộc; mặc định là interface của đường đi mặc định). Không nhận
 * được gì trong 3 giây thì dừng.
 *
 * <p>Chạy: {@code java -cp out netlab.multicast.MulticastReceiver r1 [tên interface]}
 */
public final class MulticastReceiver {

    public static void main(String[] args) throws IOException {
        String name = args.length > 0 ? args[0] : "r1";
        NetworkInterface nic = args.length > 1 ? NetworkInterface.getByName(args[1]) : defaultInterface();
        InetSocketAddress group = new InetSocketAddress("239.1.2.3", 9300);
        try (MulticastSocket socket = new MulticastSocket(9300)) {  // nhiều máy nhận cùng port: MulticastSocket cho phép
            socket.joinGroup(group, nic);  // tham gia nhóm trên đúng một network interface
            socket.setSoTimeout(3_000);
            System.out.println(name + ": joined 239.1.2.3 on " + nic.getName() + " (" + nic.getDisplayName() + ")");
            while (true) {
                DatagramPacket p = new DatagramPacket(new byte[512], 512);
                socket.receive(p);
                System.out.println(name + ": \"" + new String(p.getData(), 0, p.getLength(), UTF_8)
                        + "\" from " + p.getAddress().getHostAddress());
            }
        } catch (SocketTimeoutException e) {
            System.out.println(name + ": no datagram for 3 s, stop");
        }
    }

    /** Interface của đường đi mặc định: connect() một DatagramSocket (không gửi gói nào) rồi xem địa chỉ cục bộ. */
    static NetworkInterface defaultInterface() throws IOException {
        try (DatagramSocket probe = new DatagramSocket()) {
            probe.connect(InetAddress.getByName("192.0.2.1"), 9);
            return NetworkInterface.getByInetAddress(probe.getLocalAddress());
        }
    }
}
