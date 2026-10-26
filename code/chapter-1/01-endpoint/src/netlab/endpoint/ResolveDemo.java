package netlab.endpoint;

import java.net.Inet6Address;
import java.net.InetAddress;
import java.net.UnknownHostException;

/**
 * V02, slide 4: bản tối giản của nslookup (Harold, Java Network Programming, ch. 4). Với mỗi tên trên dòng lệnh,
 * getAllByName hỏi resolver của hệ điều hành (file hosts, DNS) và trả mọi địa chỉ của tên; in kèm loại địa chỉ.
 * Tên không phân giải được làm getAllByName ném UnknownHostException (bài tập Mở rộng: bắt ngoại lệ, in thông báo).
 *
 * <p>Chạy: {@code java -cp out netlab.endpoint.ResolveDemo localhost ptit.edu.vn www.google.com}
 */
public final class ResolveDemo {

    public static void main(String[] args) throws UnknownHostException {
        for (String name : args) {
            for (InetAddress address : InetAddress.getAllByName(name)) {
                String type = address instanceof Inet6Address ? "IPv6" : "IPv4";
                System.out.println(name + " -> " + address.getHostAddress() + "  " + type);
            }
        }
    }
}
