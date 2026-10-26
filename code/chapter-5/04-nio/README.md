# Hiệu năng: NIO, Selector và mẫu Reactor

Mã chạy được của phần “Hiệu năng: NIO, Selector và mẫu Reactor”: echo server bằng NIO (một thread, Selector, mẫu Reactor), so với echo server thread-per-connection dưới
tải 5 000 kết nối — bài toán C10K (Dan Kegel, "The C10K problem", 1999: phục vụ mười nghìn kết nối cùng lúc trên một máy). Mọi đoạn
mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, CPU 8 lõi; client và server chạy trên cùng máy. Không cần thư viện ngoài.
Giao thức như echo server theo dòng của Chương 2: mỗi dòng nhận được được gửi lại nguyên văn.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/nio/*.java

# Một lần read chỉ nhận một phần dòng
java -cp out netlab.nio.NioEchoServer --trace                       # terminal 1: results/NioEchoServer-trace.txt
java -Dstdout.encoding=UTF-8 -cp out netlab.nio.SplitClient         # terminal 2: results/SplitClient.txt

# Tạo tải 5 000 kết nối, mỗi kết nối 20 dòng; dừng server, chờ khoảng 2 phút (TIME_WAIT), rồi chạy server tiếp theo
java -cp out netlab.nio.NioEchoServer                     # results/NioEchoServer.txt
java -cp out netlab.nio.LoadClient nio 5000 20            # results/LoadClient-nio.txt
java -cp out netlab.nio.ThreadEchoServer platform         # results/ThreadEchoServer-platform.txt
java -cp out netlab.nio.LoadClient platform 5000 20       # results/LoadClient-platform.txt
java -cp out netlab.nio.ThreadEchoServer virtual          # results/ThreadEchoServer-virtual.txt
java -cp out netlab.nio.LoadClient virtual 5000 20        # results/LoadClient-virtual.txt

# results/so-sanh.txt: dòng 5 000 kết nối của ba server, rồi dòng kết quả của LoadClient (gộp, không sửa)
grep -h "5000 open" results/NioEchoServer.txt results/ThreadEchoServer-platform.txt \
  results/ThreadEchoServer-virtual.txt > results/so-sanh.txt
cat results/LoadClient-nio.txt results/LoadClient-platform.txt results/LoadClient-virtual.txt >> results/so-sanh.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `NioEchoServer` | slide 4, 6 | `ServerSocketChannel` không chặn, đăng ký `OP_ACCEPT`; vòng `select()` duyệt `selectedKeys`, `it.remove()`; mỗi kết nối một `Connection` (buffer đọc 1 KB, hàng đợi dòng gửi lại); `read` → `flip` → tách dòng ở `\n`, giải mã UTF-8 khi đủ dòng → `compact`; ghi không hết thì đăng ký thêm `OP_WRITE` |
| `ThreadEchoServer` | slide 5 | thread-per-connection không giới hạn: `newThreadPerTaskExecutor` với platform thread, hoặc `newVirtualThreadPerTaskExecutor` |
| `LoadClient` | slide 5 | mở trước 5 000 kết nối, rồi mỗi kết nối (một virtual thread phía client) gửi lần lượt 20 dòng `hello`, chờ mỗi dòng được gửi lại; in thông lượng và độ trễ p50, p99 |
| `SplitClient` | slide 6 | gửi `hel` · `lo\nxi` · `n chào\n` cách nhau 500 ms (`setTcpNoDelay(true)` để mỗi mảnh đi ngay); chữ `à` là 2 byte UTF-8 |
| `Stats` | — | dòng thống kê: số kết nối mở, số platform thread đang sống (`ThreadMXBean.getThreadCount()`, không đếm virtual thread) |

Số platform thread gồm cả các thread nền của JVM (7 lúc server vừa chạy). Bản virtual thread có thêm carrier thread (mặc định
bằng số lõi) và thread nội bộ chờ sự kiện socket cho virtual thread; JDK 21 trên Windows dùng cùng cơ chế chờ sự kiện với Selector
(wepoll), nên `NioEchoServer` không phát sinh thread phụ khi số kết nối tăng.

Số liệu đổi theo máy và giữa các lần chạy; tỷ lệ giữ nguyên: NIO một vòng lặp có ít thread nhất nhưng chỉ dùng một lõi CPU, nên
thông lượng thấp hơn hai bản dùng nhiều thread. Độ trễ cao ở cả ba bản là thời gian xếp hàng: 5 000 client gửi liên tục, nên độ
trễ xấp xỉ 5 000 chia cho thông lượng.

Mỗi lần chạy `LoadClient` để lại khoảng 5 000 socket ở trạng thái TIME_WAIT phía client (client đóng trước); trên Windows, chờ
khoảng 2 phút giữa hai lần chạy (`netstat -an | findstr TIME_WAIT`) để không hết port tạm.

Ví dụ phụ: chargen (RFC 864, "character generator") là ví dụ NIO trong Harold, *Java Network Programming*, chương 11: server gửi
liên tục các dòng ký tự cho mỗi client, nên phải dùng cả sự kiện `OP_WRITE` và giữ vị trí ghi riêng cho từng kết nối. Bài tập tự
làm: viết chargen server bằng `Selector` theo cấu trúc của `NioEchoServer`.
