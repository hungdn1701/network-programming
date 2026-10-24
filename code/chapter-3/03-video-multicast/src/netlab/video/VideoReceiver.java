package netlab.video;

import java.io.IOException;
import java.net.DatagramPacket;
import java.net.DatagramSocket;
import java.net.InetAddress;
import java.net.InetSocketAddress;
import java.net.MulticastSocket;
import java.net.NetworkInterface;
import java.net.SocketTimeoutException;
import java.nio.ByteBuffer;
import java.util.Random;

/**
 * V17: máy nhận video. Tham gia nhóm 239.1.2.3, port 9310; theo dõi số thứ tự, phát hiện khoảng trống, bỏ khung hình
 * thiếu và tiếp tục. Sau khung hình đầu, không nhận được gì trong 2 giây thì in thống kê rồi dừng.
 *
 * <p>Đối số: tên máy nhận và tỉ lệ mất gói mô phỏng (không bắt buộc, ví dụ 0.05). Mạng cục bộ hiếm khi mất gói, nên
 * máy nhận có thể tự bỏ một phần datagram đã nhận, chọn ngẫu nhiên với seed cố định, để thấy cách xử lý khoảng trống.
 *
 * <p>Chạy: {@code java -cp out netlab.video.VideoReceiver r2 0.05}
 */
public final class VideoReceiver {

    public static void main(String[] args) throws IOException {
        String name = args.length > 0 ? args[0] : "r1";
        double lossRate = args.length > 1 ? Double.parseDouble(args[1]) : 0;
        Random loss = new Random(name.hashCode());  // seed cố định: lần chạy lặp lại cho cùng kết quả mô phỏng

        InetSocketAddress group = new InetSocketAddress("239.1.2.3", VideoSender.PORT);
        NetworkInterface nic = defaultInterface();
        int expected = -1;      // số thứ tự khung hình chờ nhận tiếp theo; -1: chưa nhận khung hình nào
        int received = 0, lost = 0;
        try (MulticastSocket socket = new MulticastSocket(VideoSender.PORT)) {
            socket.joinGroup(group, nic);
            socket.setSoTimeout(10_000);  // chờ nguồn tối đa 10 giây; sau khung hình đầu: 2 giây
            while (true) {
                DatagramPacket p = new DatagramPacket(new byte[1_500], 1_500);  // đủ cho datagram lớn nhất của nguồn
                try {
                    socket.receive(p);
                } catch (SocketTimeoutException e) {
                    break;
                }
                if (loss.nextDouble() < lossRate) {
                    continue;  // mô phỏng mất gói: bỏ datagram như thể nó không tới
                }
                int seq = ByteBuffer.wrap(p.getData(), 0, 4).getInt();
                if (expected == -1) {
                    System.out.printf("%s: first frame %d%n", name, seq);  // tham gia khi đang phát: bắt đầu từ đây
                    socket.setSoTimeout(2_000);
                } else if (seq > expected) {
                    lost += seq - expected;
                    System.out.printf("%s: gap %d -> %d, lost %d frame(s)%n", name, expected - 1, seq, seq - expected);
                } else if (seq < expected) {
                    System.out.printf("%s: late frame %d, dropped%n", name, seq);  // đến muộn: không còn giá trị
                    continue;
                }
                show(seq, p.getLength() - 4);
                received++;
                expected = seq + 1;
            }
        }
        System.out.printf("%s: received %d frames, lost %d (%.1f%%)%n",
                name, received, lost, received + lost == 0 ? 0 : 100.0 * lost / (received + lost));
    }

    /** "Hiển thị" khung hình: ở đây chỉ kiểm tra độ dài; ứng dụng thật giải mã và vẽ khung hình. */
    static void show(int seq, int length) {
        if (length != VideoSender.FRAME_BYTES) {
            throw new IllegalStateException("frame " + seq + ": " + length + " bytes");
        }
    }

    static NetworkInterface defaultInterface() throws IOException {
        try (DatagramSocket probe = new DatagramSocket()) {
            probe.connect(InetAddress.getByName("192.0.2.1"), 9);
            return NetworkInterface.getByInetAddress(probe.getLocalAddress());
        }
    }
}
