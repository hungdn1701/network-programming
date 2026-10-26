# TCP: kết nối giữa client và server

Mã chạy được của phần “TCP: kết nối giữa client và server”: echo server và client (dịch vụ Echo, RFC 862; chương trình đầu tiên của Stevens, *Unix Network
Programming*, chương 5). Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên
slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần Maven hay thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/endpoint/*.java src/netlab/echo/*.java

# Terminal 1: server mở port 9199 và chờ
java -cp out netlab.echo.EchoServer

# Terminal 2: client kết nối, gửi "hello", in dòng server gửi lại
java -cp out netlab.echo.EchoClient

# Chạy client khi chưa có server: ConnectException (connection refused)
java -cp out netlab.echo.EchoClient
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `EchoServer` | slide 4 | passive open: `new ServerSocket(9199)` rồi `accept()`; connected socket có local port 9199; gửi lại đúng dòng nhận được (RFC 862 gửi lại mọi byte; bản này theo dòng cho gọn) |
| `EchoClient` | slide 5–6 | active open: `new Socket("127.0.0.1", 9199)`; cùng một kết nối, hai phía thấy hai port đổi chỗ; không có server thì bị từ chối ngay |

Kết quả: `results/EchoServer.txt`, `results/EchoClient.txt` (chạy cùng lúc, hai terminal),
`results/EchoClient-refused.txt` (chạy khi chưa có server). Client port do hệ điều hành cấp
(ephemeral port), mỗi lần chạy một khác.

## Đọc thêm (không có trong bài giảng)

Các chi tiết này đúng và hữu ích khi viết chương trình thật, nhưng không cần cho lần đầu gặp TCP.
Một số sẽ quay lại ở các phần sau.

| Lớp | Cho thấy | Quay lại ở |
|---|---|---|
| `ResolveDemo` | `getAllByName("localhost")` có thể trả cả IPv4 và IPv6; `InetSocketAddress` tạo từ tên không resolve được vẫn tạo được, lỗi chỉ hiện ở `connect()`; ghi log endpoint bằng `getHostString()` để tránh reverse lookup | “Định danh: địa chỉ IP, tên miền, port và endpoint” (phân giải tên), “TCP: timeout, half-close và lỗi kết nối” (connect có timeout) |
| `RefusedDemo` | connection refused đến sau vài chục mili giây dù timeout 3000 ms: kernel phía kia trả RST ngay | “TCP: timeout, half-close và lỗi kết nối” |
| `ThreeClients` | một listening socket, ba connected socket cùng local port 9199, khác remote port | “Bài toán ứng dụng: web server tối giản trên TCP” |
| `SlideSnippets` | tham số tường minh của `ServerSocket`: port (0 = hệ điều hành cấp), backlog (chỉ là đề nghị), bind address (wildcard hay `127.0.0.1`) | “Bài toán ứng dụng: web server tối giản trên TCP” (port 0), “Đa luồng: Executor, thread pool và virtual thread” (hàng đợi đầy) |

`ThreeClients` bind port 9199 trên `127.0.0.1`; `RefusedDemo` cần port 9198 không có service nào nghe.
