# Bài toán ứng dụng: web server phục vụ nhiều client

Mã chạy được của phần “Bài toán ứng dụng: web server phục vụ nhiều client”: web server đồng thời (thread-per-connection), nối tiếp web server tuần tự ở “Bài toán ứng dụng: web server tối giản trên TCP” — phần đa luồng của
bài tập "Web Server" trong Kurose & Ross, *Computer Networking*. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output
thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, CPU 8 lõi, curl. Không cần thư viện ngoài. Chạy các lệnh trong thư mục
này (server phục vụ file trong `www/`, giống “Bài toán ứng dụng: web server tối giản trên TCP”).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/concurrent/*.java

# Client chậm không còn chặn client khác (server dùng pool 8 thread)
java -cp out netlab.concurrent.ConcurrentWebServer pool                                # terminal 1
java -cp out netlab.concurrent.IdleClient                                              # terminal 2
curl -s -o /dev/null -w 'HTTP %{http_code} after %{time_total} s\n' http://127.0.0.1:9199/hello.txt   # terminal 3, sau 1 giây

# Tạo tải 200 kết nối, mỗi kết nối giữ 1 giây: lần lượt với pool và với virtual thread
java -cp out netlab.concurrent.ConcurrentWebServer pool                                # terminal 1
java -cp out netlab.concurrent.LoadClient pool                                         # terminal 2
java -cp out netlab.concurrent.ConcurrentWebServer virtual                             # terminal 1, sau khi dừng server cũ
java -cp out netlab.concurrent.LoadClient virtual                                      # terminal 2

# Dừng server khi còn kết nối mở (server và client trong một chương trình)
java -cp out netlab.concurrent.ShutdownDemo
```

Server chạy bằng `ConcurrentWebServer` dừng có trật tự khi nhấn Ctrl+C (shutdown hook gọi `stop`).

| Lớp, phương thức | Dùng ở | Cho thấy |
|---|---|---|
| `ConcurrentWebServer.serve()` | slide 4, 7 | vòng accept chỉ nhận kết nối, giao mỗi kết nối cho executor; phân biệt `SocketException` do dừng server với lỗi thật bằng cờ `stopping` |
| `ConcurrentWebServer.main()` | slide 5 | chọn executor: pool 8 platform thread (hàng đợi 200, `CallerRunsPolicy`) hoặc mỗi kết nối một virtual thread |
| `ConcurrentWebServer.stop()` | slide 6 | graceful shutdown ba bước |
| `IdleClient`, curl | slide 4 | curl đến sau một client chậm nhận response sau khoảng 24 ms (server tuần tự ở “Bài toán ứng dụng: web server tối giản trên TCP”: khoảng 4 giây) |
| `LoadClient` | slide 5 | 200 client cùng lúc gửi `GET /hello.txt`, mỗi client giữ kết nối 1 giây: pool 8 thread xong sau khoảng 25 giây, virtual thread sau gần 1,4 giây |
| `ShutdownDemo` | slide 6 | ba bước dừng với một kết nối đang mở (persistent connection sau một request); client đọc được `null` |

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
