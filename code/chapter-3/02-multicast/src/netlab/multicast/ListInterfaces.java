package netlab.multicast;

import java.net.NetworkInterface;
import java.net.SocketException;
import java.util.Collections;

/**
 * V16, đọc thêm: liệt kê các network interface đang bật, hỗ trợ multicast và có địa chỉ IPv4, để chọn interface cho
 * MulticastReceiver.
 *
 * <p>Chạy: {@code java -cp out netlab.multicast.ListInterfaces}
 */
public final class ListInterfaces {

    public static void main(String[] args) throws SocketException {
        for (NetworkInterface nic : Collections.list(NetworkInterface.getNetworkInterfaces())) {
            if (nic.isUp() && nic.supportsMulticast() && !nic.isLoopback()) {
                nic.inetAddresses()
                        .filter(a -> a.getAddress().length == 4)  // chỉ địa chỉ IPv4
                        .forEach(a -> System.out.println(nic.getName() + "  " + a.getHostAddress() + "  " + nic.getDisplayName()));
            }
        }
    }
}
