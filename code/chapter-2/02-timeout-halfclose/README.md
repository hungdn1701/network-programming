# TCP: timeout, half-close và lỗi kết nối

Mã chạy được của phần “TCP: timeout, half-close và lỗi kết nối”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài. Mọi server dùng port 9199: chạy lần
lượt từng server, không chạy hai server cùng lúc.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/timeout/*.java

# Read timeout và connect timeout
java -cp out netlab.timeout.SilentServer                       # terminal 1: nhận kết nối, không trả lời
java -cp out netlab.timeout.TimeoutDemo 127.0.0.1 192.0.2.1    # terminal 2

# Half-close
java -cp out netlab.timeout.LineCountServer                    # terminal 1
java -cp out netlab.timeout.HalfCloseClient                    # terminal 2

# Read timeout không giới hạn cả yêu cầu
java -cp out netlab.timeout.SlowServer                         # terminal 1: mỗi giây một byte
java -cp out netlab.timeout.TimeoutDemo 127.0.0.1              # terminal 2
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `TimeoutDemo` | slide 5, 7 | `connect(endpoint, 3_000)` và `setSoTimeout(2_000)`; in tên lớp ngoại lệ, thông báo, thời gian đã chờ |
| `SilentServer` | slide 5 | server nhận kết nối nhưng không đọc, không ghi: client hết read timeout sau 2 giây |
| `HalfCloseClient`, `LineCountServer` | slide 6 | `flush()` rồi `shutdownOutput()`: server đọc được `null`, vẫn trả phản hồi `lines: 3` |
| `SlowServer` | slide 7 | mỗi giây một byte: read timeout 2 giây không lần nào hết hạn, cả phản hồi mất hơn 14 giây |

Địa chỉ `192.0.2.1` thuộc dải TEST-NET-1 dành cho tài liệu (RFC 5737): không máy nào trả lời, gói SYN không có phản
hồi. Mạng nào trả lời gói đó bằng ICMP thì kết quả có thể là `NoRouteToHostException` thay cho hết connect timeout.

Kết quả: `results/TimeoutDemo.txt` (cùng lúc với `SilentServer.txt`), `results/HalfCloseClient.txt` (cùng lúc với
`LineCountServer.txt`), `results/TimeoutDemo-slow.txt` (cùng lúc với `SlowServer.txt`). Thời gian đo trên máy biên soạn,
mỗi lần chạy lệch vài chục mili giây.

Thử bỏ dòng `out.flush()` trong `HalfCloseClient` rồi chạy lại: server in `sent: lines: 0`, vì `shutdownOutput()` không
flush buffer của `BufferedWriter` (đã thử trên máy biên soạn).

## Đọc thêm (không có trong bài giảng)

| Lớp | Cho thấy | Kết quả |
|---|---|---|
| `NoTimeoutConnect` | connect không có timeout tới `192.0.2.1`: chờ đến khi TCP của hệ điều hành thôi gửi lại SYN rồi ném `ConnectException: Connection timed out` (Windows 11: khoảng 21 giây; Linux mặc định khoảng 127 giây, theo `tcp_syn_retries` trong `man 7 tcp`) | `results/NoTimeoutConnect.txt` |
| `ResetServer` | `setSoLinger(true, 0)` rồi `close()`: TCP gửi RST thay cho FIN, client đang chờ phản hồi nhận `SocketException: Connection reset`. Đóng socket khi còn dữ liệu chưa đọc cũng làm TCP gửi RST (RFC 1122, mục 4.2.2.13) | `results/TimeoutDemo-reset.txt` |
| `TimeoutDemo` khi chưa có server | `ConnectException: Connection refused` sau vài chục mili giây | `results/TimeoutDemo-refused.txt` |

Hai bảng trên là nguồn của hình phân loại lỗi trên slide 3.
