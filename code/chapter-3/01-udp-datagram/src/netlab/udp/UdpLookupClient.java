package netlab.udp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;

/**
 * V15: client tra cứu qua UDP. Gửi khóa trong một datagram, chờ một datagram phản hồi. Đối số thứ hai là kích thước
 * buffer nhận (mặc định 512): buffer nhỏ hơn datagram thì phần dư bị bỏ, receive() không báo lỗi.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.udp.UdpLookupClient hanoi [kích thước buffer]}
 */
public final class UdpLookupClient {

    public static void main(String[] args) throws IOException {
        String key = args.length > 0 ? args[0] : "hanoi";
        int bufferSize = args.length > 1 ? Integer.parseInt(args[1]) : 512;
        try (DatagramSocket socket = new DatagramSocket()) {  // port tạm do hệ điều hành cấp
            socket.setSoTimeout(2_000);  // UDP không báo mất datagram: client tự giới hạn thời gian chờ
            byte[] data = key.getBytes(UTF_8);
            socket.send(new DatagramPacket(data, data.length, new InetSocketAddress("127.0.0.1", 9199)));
            DatagramPacket reply = new DatagramPacket(new byte[bufferSize], bufferSize);
            socket.receive(reply);  // nhận một datagram; dài hơn buffer thì bị cắt
            System.out.println("buffer " + bufferSize + " bytes: \""
                    + new String(reply.getData(), 0, reply.getLength(), UTF_8) + "\" (" + reply.getLength() + " bytes)");
        }
    }
}
