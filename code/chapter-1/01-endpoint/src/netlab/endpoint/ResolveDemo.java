package netlab.endpoint;

import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * V02, slide 4: một tên có thể ứng với nhiều địa chỉ. getAllByName hỏi resolver của hệ điều hành
 * (file hosts, DNS) và trả mọi địa chỉ của tên.
 *
 * <p>Chạy: {@code java -cp out netlab.endpoint.ResolveDemo}
 */
public final class ResolveDemo {

    public static void main(String[] args) throws UnknownHostException {
        InetAddress[] addresses = InetAddress.getAllByName("localhost");
        for (InetAddress address : addresses) {
            System.out.println("localhost -> " + address.getHostAddress());
        }
    }
}
