# Hiệu năng: NIO, Selector và mẫu Reactor

Mã chạy được của phần “Hiệu năng: NIO, Selector và mẫu Reactor”: server tra cứu bằng NIO (một thread, Selector, mẫu Reactor), so với server thread-per-connection
dưới tải 5 000 kết nối. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật,
không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, CPU 8 lõi; client và server chạy trên cùng máy. Không cần thư viện ngoài.
Giao thức tra cứu như Chương 2: mỗi yêu cầu một dòng (khóa), mỗi phản hồi một dòng (`OK <giá trị>`, `NOTFOUND`, `ERR ...`).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/nio/*.java

# Một lần read chỉ nhận một phần dòng
java -Dstdout.encoding=UTF-8 -cp out netlab.nio.NioLookupServer --trace   # terminal 1: results/NioLookupServer-trace.txt
java -Dstdout.encoding=UTF-8 -cp out netlab.nio.SplitClient               # terminal 2: results/SplitClient.txt

# Tạo tải 5 000 kết nối, mỗi kết nối 20 yêu cầu; dừng server rồi chạy server tiếp theo
java -Dstdout.encoding=UTF-8 -cp out netlab.nio.NioLookupServer                 # results/NioLookupServer.txt
java -cp out netlab.nio.LoadClient nio 5000 20                                  # results/LoadClient-nio.txt
java -Dstdout.encoding=UTF-8 -cp out netlab.nio.ThreadLookupServer platform     # results/ThreadLookupServer-platform.txt
java -cp out netlab.nio.LoadClient platform 5000 20                             # results/LoadClient-platform.txt
java -Dstdout.encoding=UTF-8 -cp out netlab.nio.ThreadLookupServer virtual      # results/ThreadLookupServer-virtual.txt
java -cp out netlab.nio.LoadClient virtual 5000 20                              # results/LoadClient-virtual.txt

# results/so-sanh.txt: dòng 5 000 kết nối của ba server, rồi dòng kết quả của LoadClient (gộp, không sửa)
grep -h "5000 open" results/NioLookupServer.txt results/ThreadLookupServer-platform.txt \
  results/ThreadLookupServer-virtual.txt > results/so-sanh.txt
cat results/LoadClient-nio.txt results/LoadClient-platform.txt results/LoadClient-virtual.txt >> results/so-sanh.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `NioLookupServer` | slide 4, 6 | `ServerSocketChannel` không chặn, đăng ký `OP_ACCEPT`; vòng `select()` duyệt `selectedKeys`, `it.remove()`; mỗi kết nối một `Connection` (buffer đọc 1 KB, hàng đợi phản hồi); `read` → `flip` → tách dòng ở `\n` → `compact`; ghi không hết thì đăng ký thêm `OP_WRITE` |
| `ThreadLookupServer` | slide 5 | thread-per-connection không giới hạn: `newThreadPerTaskExecutor` với platform thread, hoặc `newVirtualThreadPerTaskExecutor` |
| `LoadClient` | slide 5 | mở trước 5 000 kết nối, rồi mỗi kết nối (một virtual thread phía client) gửi 20 yêu cầu lần lượt; in thông lượng và độ trễ p50, p99 |
| `SplitClient` | slide 6 | gửi `han` · `oi\nhu` · `ế\n` cách nhau 500 ms (`setTcpNoDelay(true)` để mỗi mảnh đi ngay) |
| `Lookup` | — | phản hồi của giao thức tra cứu; dòng thống kê: số kết nối mở, số platform thread đang sống (`ThreadMXBean.getThreadCount()`, không đếm virtual thread) |

Số platform thread gồm cả các thread nền của JVM (7 lúc server vừa chạy). Bản virtual thread có thêm carrier thread (mặc định
bằng số lõi) và thread nội bộ chờ sự kiện socket cho virtual thread; JDK 21 trên Windows dùng cùng cơ chế chờ sự kiện với Selector
(wepoll), nên `NioLookupServer` không phát sinh thread phụ khi số kết nối tăng.

Số liệu đổi theo máy và giữa các lần chạy; tỷ lệ giữ nguyên: NIO một vòng lặp có ít thread nhất nhưng chỉ dùng một lõi CPU, nên
thông lượng thấp hơn hai bản dùng nhiều thread. Độ trễ cao ở cả ba bản là thời gian xếp hàng: 5 000 client gửi liên tục, nên độ
trễ xấp xỉ 5 000 chia cho thông lượng.

Mỗi lần chạy `LoadClient` để lại khoảng 5 000 socket ở trạng thái TIME_WAIT phía client (client đóng trước); trên Windows, chờ
khoảng 2 phút giữa hai lần chạy (`netstat -an | findstr TIME_WAIT`) để không hết port tạm.
