package netlab.udp;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.time.Instant;

/**
 * V15: một truy vấn SNTP (RFC 4330) tới time server thật. Request và reply đều là một datagram 48 byte tới port 123;
 * byte đầu 0x1B = LI 0, phiên bản 3, chế độ 3 (client). Transmit Timestamp nằm ở byte 40–47: 4 byte đầu là số giây
 * kể từ 1900-01-01. Đối số thứ hai là kích thước buffer nhận: buffer 16 byte làm reply bị cắt, receive() không báo lỗi,
 * và phần thời gian ở cuối datagram bị mất.
 *
 * <p>Chạy: {@code java -cp out netlab.udp.SntpClient time.google.com [kích thước buffer]}
 */
public final class SntpClient {

    private static final int NTP_PACKET = 48;  // độ dài datagram SNTP không xác thực, theo đặc tả
    private static final long SECONDS_1900_TO_1970 = 2_208_988_800L;

    public static void main(String[] args) throws IOException {
        String host = args.length > 0 ? args[0] : "time.google.com";
        int bufferSize = args.length > 1 ? Integer.parseInt(args[1]) : NTP_PACKET;
        try (DatagramSocket socket = new DatagramSocket()) {
            socket.setSoTimeout(3_000);
            byte[] request = new byte[NTP_PACKET];
            request[0] = 0x1B;  // LI = 0, phiên bản 3, chế độ 3: client (RFC 4330)
            socket.send(new DatagramPacket(request, request.length, new InetSocketAddress(host, 123)));
            DatagramPacket reply = new DatagramPacket(new byte[bufferSize], bufferSize);
            socket.receive(reply);  // dài hơn buffer thì bị cắt, không báo lỗi
            System.out.print("buffer " + bufferSize + ": received " + reply.getLength() + " bytes");
            if (reply.getLength() < NTP_PACKET) {  // chỉ biết thiếu nhờ đặc tả ghi rõ 48 byte
                System.out.println(", no Transmit Timestamp (bytes 40-47)");
                return;
            }
            long seconds = ByteBuffer.wrap(reply.getData(), 40, 4).getInt() & 0xFFFF_FFFFL;  // giây kể từ 1900
            System.out.println(", server time " + Instant.ofEpochSecond(seconds - SECONDS_1900_TO_1970));
        }
    }
}
