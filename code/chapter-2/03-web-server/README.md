# Bài toán ứng dụng: web server tối giản trên TCP

Mã chạy được của phần “Bài toán ứng dụng: web server tối giản trên TCP”: web server tối giản, tuần tự — bài tập "Web Server" trong Kurose & Ross, *Computer Networking*
(Socket Programming Assignment 1); cùng ý với JHTTP trong Harold, *Java Network Programming*, chương 9. Mọi đoạn mã trên slide trích
từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, curl. Mã chính không cần thư viện ngoài. Integration test dùng **JUnit 5**
(JUnit Platform Console Launcher 1.12.2, một file jar): JUnit là framework kiểm thử chuẩn của Java, và phần này dạy integration
test. Chạy các lệnh trong thư mục này (server phục vụ file trong `www/`).

```bash
# Tải JUnit một lần (không commit vào repo)
mkdir -p lib && curl -o lib/junit-platform-console-standalone-1.12.2.jar \
  https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/1.12.2/junit-platform-console-standalone-1.12.2.jar

javac --release 21 -encoding UTF-8 -cp lib/junit-platform-console-standalone-1.12.2.jar -d out \
  src/netlab/web/*.java test/netlab/web/*.java

# Server tuần tự và ba request
java -cp out netlab.web.WebServer                      # terminal 1
curl -s -o /dev/null -w "%{http_code} %{content_type}
" http://127.0.0.1:9199/               # terminal 2: 200 text/html (www/index.html)
curl -s -o /dev/null -w "%{http_code} %{content_type}
" http://127.0.0.1:9199/nothing.html   # 404
curl -i http://127.0.0.1:9199/hello.txt                # 200, Content-Length: 6, in cả header và body

# Một client không gửi gì làm client sau phải chờ
java -cp out netlab.web.IdleClient                     # terminal 2
curl -s -o /dev/null -w 'HTTP %{http_code} after %{time_total} s\n' http://127.0.0.1:9199/hello.txt   # terminal 3, sau 1 giây

# Integration test (slide chỉ giữ phần cây kết quả: 11 dòng đầu)
java -jar lib/junit-platform-console-standalone-1.12.2.jar execute --disable-banner --disable-ansi-colors --details=tree \
  --include-engine=junit-jupiter -cp out --select-class netlab.web.WebServerTest | grep -v '^╷$' | grep -v '^$' | head -9
```

Trình duyệt cũng mở được `http://127.0.0.1:9199/`; trình duyệt thường giữ kết nối mở sau request (persistent connection) và hỏi
thêm `/favicon.ico` (nhận 404).

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `WebServer.serve()` | slide 4 | server tuần tự: vòng ngoài accept từng kết nối, read timeout 5 giây, lỗi của một kết nối không dừng server; log in 4-tuple |
| `WebServer.handle()` | slide 5 (lời đọc) | vòng trong: mỗi request là request line, các header, một dòng trống; một kết nối nhiều request (HTTP/1.1 persistent connection); dừng khi `readLine()` trả `null` |
| `WebServer.respond()`, `send()` | slide 5 | `GET` tìm file trong `www/` (`/` là `/index.html`): 200 kèm file, 404; request sai hoặc đường dẫn chứa `..`: 400; phương thức khác: 501; status line, `Content-Type`, `Content-Length`, dòng trống, body; mỗi dòng kết thúc bằng CRLF |
| `WebServerTest` | slide 6 | integration test JUnit 5: server thật ở loopback, port 0; sáu test |
| `IdleClient` | slide 7 | kết nối nhưng không gửi gì: curl đến sau 1 giây chờ khoảng 4 giây |

Kết quả: `results/WebServer.txt` (log của server, ba request curl), `results/curl.txt` (hai lần `curl -w` chỉ in mã trạng thái và loại nội dung, một lần `curl -i`; đã bỏ ký tự CR cho dễ đọc),
`results/WebServer-idle.txt`, `results/IdleClient.txt`, `results/curl-after-idle.txt`, `results/WebServerTest.txt`.

Server giản lược cho bài học: không giới hạn độ dài request line và số header, không xử lý query string, chỉ ba loại nội dung
(`.html`, `.txt`, còn lại `application/octet-stream`), kiểm tra đường dẫn bằng cách từ chối `..`. Web server thật (Jetty, Tomcat,
Nginx) xử lý đầy đủ các trường hợp này.
