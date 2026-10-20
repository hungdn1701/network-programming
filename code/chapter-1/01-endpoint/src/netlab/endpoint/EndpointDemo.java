package netlab.endpoint;

import java.net.InetSocketAddress;

/**
 * V02, slide 5–6: InetSocketAddress ghép địa chỉ với port thành endpoint. Constructor phân giải tên ngay;
 * tên không phân giải được vẫn tạo được đối tượng, isUnresolved() trả true. Tạo được endpoint không cho
 * biết có chương trình nào đang chờ ở port đó.
 *
 * <p>Chạy: {@code java -cp out netlab.endpoint.EndpointDemo}
 */
public final class EndpointDemo {

    public static void main(String[] args) {
        var server = new InetSocketAddress("localhost", 9199);
        System.out.println(server + "  isUnresolved() = " + server.isUnresolved());

        // .invalid là tên miền dành riêng, không bao giờ phân giải được (RFC 6761)
        var unknown = new InetSocketAddress("lookup.invalid", 9199);
        System.out.println(unknown + "  isUnresolved() = " + unknown.isUnresolved());
    }
}
