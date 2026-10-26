package netlab.udp;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetSocketAddress;
import java.net.SocketTimeoutException;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;

/**
 * V15: client của bài UDP Pinger (Kurose và Ross, Socket Programming Assignment 2), bản Java. Gửi 10 datagram
 * "Ping &lt;số thứ tự&gt; &lt;thời điểm&gt;", mỗi lần chờ phản hồi tối đa 1 giây: có phản hồi thì in RTT, hết thời gian chờ thì
 * báo "request timed out". UDP không báo mất datagram, nên thời gian chờ do client tự đặt.
 *
 * <p>Chạy (sau PingServer): {@code java -cp out netlab.udp.PingClient}
 */
public final class PingClient {

    private static final DateTimeFormatter TIME = DateTimeFormatter.ofPattern("HH:mm:ss.SSS");

    public static void main(String[] args) throws IOException {
        var server = new InetSocketAddress("127.0.0.1", 12000);
        DatagramPacket reply = new DatagramPacket(new byte[1024], 1024);
        try (DatagramSocket socket = new DatagramSocket()) {  // port tạm do hệ điều hành cấp
            socket.setSoTimeout(1_000);  // UDP không báo mất datagram: client tự giới hạn thời gian chờ
            for (int seq = 1; seq <= 10; seq++) {
                byte[] data = ("Ping " + seq + " " + LocalTime.now().format(TIME)).getBytes(UTF_8);
                long start = System.nanoTime();
                socket.send(new DatagramPacket(data, data.length, server));  // gửi ngay, không bắt tay
                try {
                    socket.receive(reply);  // nhận một datagram
                    double rtt = (System.nanoTime() - start) / 1e6;
                    System.out.printf("%s, RTT %.2f ms%n", new String(reply.getData(), 0, reply.getLength(), UTF_8), rtt);
                } catch (SocketTimeoutException e) {
                    System.out.println("Ping " + seq + ": request timed out");
                }
            }
        }
    }
}
