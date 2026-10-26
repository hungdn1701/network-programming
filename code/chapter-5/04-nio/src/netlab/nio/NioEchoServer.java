package netlab.nio;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.IOException;
import java.net.InetSocketAddress;
import java.nio.ByteBuffer;
import java.nio.channels.SelectionKey;
import java.nio.channels.Selector;
import java.nio.channels.ServerSocketChannel;
import java.nio.channels.SocketChannel;
import java.util.ArrayDeque;
import java.util.Iterator;

/**
 * V33: echo server theo dòng (như Chương 2) bằng NIO, theo mẫu Reactor, cho bài toán C10K (Kegel): phục vụ hàng nghìn
 * kết nối mở cùng lúc. Một thread chạy vòng lặp Selector: chờ sự kiện sẵn sàng trên mọi channel,
 * rồi xử lý từng sự kiện (accept, read, write) mà không chặn. Mỗi kết nối giữ buffer đọc riêng và hàng đợi dòng gửi lại riêng.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.nio.NioEchoServer [--trace]}
 * <br>--trace: in mỗi lần read (số byte, số dòng đủ, số byte giữ lại).
 */
public final class NioEchoServer {

    /** Trạng thái của một kết nối: phần dòng đã nhận chưa đủ, và các dòng gửi lại chưa ghi xong. */
    static final class Connection {
        final ByteBuffer in = ByteBuffer.allocate(1024);
        final ArrayDeque<ByteBuffer> out = new ArrayDeque<>();
    }

    private static boolean trace;
    private static int open;

    public static void main(String[] args) throws IOException {
        trace = args.length > 0 && args[0].equals("--trace");
        Selector selector = Selector.open();
        ServerSocketChannel listener = ServerSocketChannel.open();
        listener.bind(new InetSocketAddress(9199), 1024);
        listener.configureBlocking(false);  // accept() không chặn
        listener.register(selector, SelectionKey.OP_ACCEPT);
        Stats.report("nio", open);
        while (true) {
            selector.select();  // chặn đến khi có ít nhất một channel sẵn sàng
            Iterator<SelectionKey> it = selector.selectedKeys().iterator();
            while (it.hasNext()) {
                SelectionKey key = it.next();
                it.remove();  // không xóa thì vòng sau key này bị xử lý lại
                try {
                    if (key.isAcceptable()) {
                        accept(listener, selector);
                    } else if (key.isReadable()) {
                        read(key);
                    } else if (key.isWritable()) {
                        write(key);
                    }
                } catch (IOException e) {  // lỗi của một kết nối chỉ đóng kết nối đó
                    if (key.channel() instanceof SocketChannel) {
                        close(key);
                    }
                }
            }
        }
    }

    static void accept(ServerSocketChannel listener, Selector selector) throws IOException {
        SocketChannel channel = listener.accept();
        if (channel == null) {
            return;
        }
        channel.configureBlocking(false);
        channel.register(selector, SelectionKey.OP_READ, new Connection());  // mỗi kết nối một Connection riêng
        if (++open % 1000 == 0) {
            Stats.report("nio", open);
        }
    }

    static void read(SelectionKey key) throws IOException {
        SocketChannel channel = (SocketChannel) key.channel();
        Connection c = (Connection) key.attachment();
        int n = channel.read(c.in);  // không chặn: trả về số byte đang có, có thể chỉ là một phần dòng
        if (n == -1) {  // client đã đóng chiều gửi
            close(key);
            return;
        }
        c.in.flip();  // chuyển buffer từ ghi sang đọc: limit = position, position = 0
        int lines = 0;
        for (int i = c.in.position(); i < c.in.limit(); i++) {
            if (c.in.get(i) == '\n') {  // đủ một dòng
                byte[] line = new byte[i - c.in.position()];
                c.in.get(line);
                c.in.get();  // bỏ '\n'
                c.out.add(UTF_8.encode(new String(line, UTF_8) + "\n"));  // đủ dòng mới giải mã, rồi gửi lại đúng dòng đó
                lines++;
            }
        }
        c.in.compact();  // giữ phần dòng chưa đủ ở đầu buffer, chờ lần read sau
        if (trace) {
            System.out.printf("read %d bytes, %d complete line(s), %d byte(s) kept%n", n, lines, c.in.position());
        }
        if (!c.in.hasRemaining()) {  // đầy buffer mà chưa thấy '\n': dòng quá dài
            close(key);
            return;
        }
        write(key);
    }

    static void write(SelectionKey key) throws IOException {
        SocketChannel channel = (SocketChannel) key.channel();
        Connection c = (Connection) key.attachment();
        while (!c.out.isEmpty()) {
            channel.write(c.out.peek());  // không chặn: có thể chỉ ghi được một phần
            if (c.out.peek().hasRemaining()) {
                key.interestOps(SelectionKey.OP_READ | SelectionKey.OP_WRITE);  // ghi tiếp khi socket sẵn sàng
                return;
            }
            c.out.poll();
        }
        key.interestOps(SelectionKey.OP_READ);
    }

    static void close(SelectionKey key) {
        key.cancel();
        try {
            key.channel().close();
        } catch (IOException ignored) {
            // đang đóng: không còn gì để xử lý
        }
        open--;
    }
}
