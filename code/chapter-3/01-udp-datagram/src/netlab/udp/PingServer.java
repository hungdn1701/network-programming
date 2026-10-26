package netlab.udp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.util.Random;

/**
 * V15: server của bài UDP Pinger (Kurose và Ross, Socket Programming Assignment 2), bản Java. Một DatagramSocket ở
 * port 12000; mỗi vòng nhận một datagram và trả lại nội dung viết hoa về đúng endpoint đã gửi. Như bản gốc, server
 * mô phỏng mất datagram: bỏ không trả lời khi số ngẫu nhiên từ 0 đến 10 nhỏ hơn 4. Seed cố định để lần chạy nào cũng
 * mất đúng các datagram như nhau.
 *
 * <p>Chạy: {@code java -cp out netlab.udp.PingServer}
 */
public final class PingServer {

    public static void main(String[] args) throws IOException {
        var random = new Random(7);  // seed cố định: kết quả lặp lại được
        try (DatagramSocket socket = new DatagramSocket(12000)) {  // UDP port 12000: không có listening socket
            System.out.println("UDP ping server on port 12000");
            byte[] buf = new byte[1024];
            while (true) {
                DatagramPacket request = new DatagramPacket(buf, buf.length);
                socket.receive(request);  // chờ và nhận đúng một datagram
                String message = new String(request.getData(), 0, request.getLength(), UTF_8);
                if (random.nextInt(11) < 4) {  // mô phỏng mất datagram, như bản gốc của bài
                    System.out.println("from " + request.getSocketAddress() + ": " + message + " -> dropped");
                    continue;
                }
                byte[] reply = message.toUpperCase().getBytes(UTF_8);
                socket.send(new DatagramPacket(reply, reply.length, request.getSocketAddress()));  // trả về nơi gửi
                System.out.println("from " + request.getSocketAddress() + ": " + message + " -> replied");
            }
        }
    }
}
