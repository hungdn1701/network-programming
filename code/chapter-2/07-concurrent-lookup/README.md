# Bài toán ứng dụng: server tra cứu phục vụ nhiều client

Mã chạy được của phần “Bài toán ứng dụng: server tra cứu phục vụ nhiều client”: server tra cứu đồng thời (thread-per-connection) theo đặc tả giao thức tra cứu, bản 1
(`PROTOCOL.md` của “Bài toán ứng dụng: đặc tả và thử giao thức tra cứu”). Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output
thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, CPU 8 lõi. Không cần thư viện ngoài. Kết quả có chữ tiếng Việt nên
chạy với `-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/concurrent/*.java

# Client chậm không còn chặn client khác (server dùng pool 8 thread)
java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.ConcurrentLookupServer pool     # terminal 1
java -cp out netlab.concurrent.IdleClient                                              # terminal 2
java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.LookupClient hanoi              # terminal 3, sau khoảng 1 giây

# Tạo tải 200 kết nối, mỗi kết nối giữ 1 giây: lần lượt với pool và với virtual thread
java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.ConcurrentLookupServer pool     # terminal 1
java -cp out netlab.concurrent.LoadClient pool                                         # terminal 2
java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.ConcurrentLookupServer virtual  # terminal 1, sau khi dừng server cũ
java -cp out netlab.concurrent.LoadClient virtual                                      # terminal 2

# Dừng server khi còn kết nối mở (server và client trong một chương trình)
java -Dstdout.encoding=UTF-8 -cp out netlab.concurrent.ShutdownDemo
```

Server chạy bằng `ConcurrentLookupServer` dừng có trật tự khi nhấn Ctrl+C (shutdown hook gọi `stop`).

| Lớp, phương thức | Dùng ở | Cho thấy |
|---|---|---|
| `ConcurrentLookupServer.serve()` | slide 4, 7 | vòng accept chỉ nhận kết nối, giao mỗi kết nối cho executor; phân biệt `SocketException` do dừng server với lỗi thật bằng cờ `stopping` |
| `ConcurrentLookupServer.main()` | slide 5 | chọn executor: pool 8 platform thread (hàng đợi 200, `CallerRunsPolicy`) hoặc mỗi kết nối một virtual thread |
| `ConcurrentLookupServer.stop()` | slide 6 | graceful shutdown ba bước |
| `IdleClient`, `LookupClient` | slide 4 | client đến sau một client chậm nhận phản hồi sau 3 ms (server tuần tự ở “Bài toán ứng dụng: dịch vụ tra cứu qua TCP”: gần 4 giây) |
| `LoadClient` | slide 5 | 200 client cùng lúc, mỗi client giữ kết nối 1 giây: pool 8 thread xong sau khoảng 25 giây, virtual thread sau hơn 1 giây |
| `ShutdownDemo` | slide 6 | ba bước dừng với một kết nối đang mở; client đọc được `null` |

Phương thức `serveConnection` (không có trên slide), tác vụ của một kết nối:

```java
void serveConnection(Socket connected) {
    open.add(connected);
    String remote = "remote port " + connected.getPort();
    try (connected) {
        connected.setSoTimeout(5_000);  // vẫn cần read timeout: client không gửi gì vẫn giữ kết nối
        log.accept("accepted " + remote);
        int requests = handle(connected);
        log.accept("closed " + remote + ", requests: " + requests);
    } catch (IOException e) {
        log.accept("connection error, " + remote + ": " + e.getMessage());
    } finally {
        open.remove(connected);
        synchronized (this) {  // critical section ngắn: chỉ tăng bộ đếm, không có I/O
            served++;
        }
    }
}
```

Listening socket của `main` mở với backlog 200, đủ chỗ cho 200 kết nối của bài tạo tải: với backlog mặc định (50), các kết
nối vượt quá có thể bị từ chối khi pool 8 thread chưa kịp nhận. Kết quả tạo tải là một lần chạy trên máy biên soạn; thời
gian khác nhau giữa các máy, nhưng tỉ lệ (pool 8 thread phục vụ 8 kết nối mỗi giây) giữ nguyên.

Giới hạn đã biết: nếu `accept()` trả về một kết nối đúng lúc executor vừa `shutdown()`, tác vụ bị từ chối (với
`CallerRunsPolicy` thì bị bỏ qua) và socket đó chỉ được đóng khi tiến trình kết thúc. Bài tập mở rộng có thể xử lý thêm
trường hợp này.
