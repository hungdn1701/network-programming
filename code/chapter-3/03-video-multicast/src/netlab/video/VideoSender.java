package netlab.video;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.InetAddress;
import java.net.MulticastSocket;
import java.nio.ByteBuffer;

/**
 * V17: nguồn phát video theo nhóm multicast. Phát 100 khung hình, 10 khung hình mỗi giây, tới nhóm 239.1.2.3, port
 * 9310; mỗi khung hình là một datagram gồm số thứ tự 4 byte và 1 000 byte dữ liệu (khung hình giả lập). TTL 1.
 *
 * <p>Chạy: {@code java -cp out netlab.video.VideoSender}
 */
public final class VideoSender {

    static final int PORT = 9310;
    static final int FRAME_BYTES = 1_000;  // dữ liệu một khung hình: datagram 1 004 byte, dưới MTU 1 500 của Ethernet

    public static void main(String[] args) throws IOException, InterruptedException {
        InetAddress group = InetAddress.getByName("239.1.2.3");
        try (MulticastSocket socket = new MulticastSocket()) {
            socket.setTimeToLive(1);
            long start = System.nanoTime();
            for (int seq = 1; seq <= 100; seq++) {
                ByteBuffer buf = ByteBuffer.allocate(4 + FRAME_BYTES);
                buf.putInt(seq);              // số thứ tự 4 byte, big-endian
                buf.put(frame(seq));          // dữ liệu khung hình
                socket.send(new DatagramPacket(buf.array(), buf.position(), group, PORT));
                if (seq % 20 == 0) {
                    System.out.printf("sent frame %d (%d bytes)%n", seq, buf.position());
                }
                long next = start + seq * 100_000_000L;  // 10 khung hình mỗi giây
                Thread.sleep(Math.max(0, (next - System.nanoTime()) / 1_000_000));
            }
        }
    }

    /** Khung hình giả lập: 1 000 byte cùng giá trị, đủ để máy nhận kiểm tra độ dài. */
    static byte[] frame(int seq) {
        byte[] data = new byte[FRAME_BYTES];
        java.util.Arrays.fill(data, (byte) seq);
        return data;
    }
}
