# Bài toán ứng dụng: dịch vụ tra cứu qua TCP

Mã chạy được của phần “Bài toán ứng dụng: dịch vụ tra cứu qua TCP”: dịch vụ tra cứu qua TCP theo đặc tả giao thức tra cứu, bản 1 (`PROTOCOL.md` của “Bài toán ứng dụng: đặc tả và thử giao thức tra cứu”). Mọi
đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Mã chính không cần thư viện ngoài. Integration test dùng
**JUnit 5** (JUnit Platform Console Launcher 1.12.2, một file jar): JUnit là framework kiểm thử chuẩn của Java, và phần
này dạy integration test. Kết quả có chữ tiếng Việt nên chạy với `-Dstdout.encoding=UTF-8` (console Windows: chạy
`chcp 65001` trước).

```bash
# Tải JUnit một lần (không commit vào repo)
mkdir -p lib && curl -o lib/junit-platform-console-standalone-1.12.2.jar \
  https://repo1.maven.org/maven2/org/junit/platform/junit-platform-console-standalone/1.12.2/junit-platform-console-standalone-1.12.2.jar

javac --release 21 -encoding UTF-8 -cp lib/junit-platform-console-standalone-1.12.2.jar -d out \
  src/netlab/lookup/*.java test/netlab/lookup/*.java

# Server tuần tự và client
java -Dstdout.encoding=UTF-8 -cp out netlab.lookup.LookupServer            # terminal 1
java -Dstdout.encoding=UTF-8 -cp out netlab.lookup.LookupClient            # terminal 2: các trường hợp thử của đặc tả
java -Dstdout.encoding=UTF-8 -cp out netlab.lookup.LookupClient atlantis   # client thứ hai
java -Dstdout.encoding=UTF-8 -cp out netlab.lookup.LookupClient hanoi      # client thứ ba

# Một client không gửi gì làm client sau phải chờ
java -cp out netlab.lookup.IdleClient                                      # terminal 2
java -Dstdout.encoding=UTF-8 -cp out netlab.lookup.LookupClient hanoi      # terminal 3, sau đó khoảng 1 giây

# Integration test (slide chỉ giữ phần cây kết quả: 11 dòng đầu)
java -Dstdout.encoding=UTF-8 -jar lib/junit-platform-console-standalone-1.12.2.jar execute --disable-banner \
  --disable-ansi-colors --details=tree --include-engine=junit-jupiter -cp out \
  --select-class netlab.lookup.LookupServerTest | head -11
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `LookupServer.serve()` | slide 4 | server tuần tự: vòng ngoài accept từng kết nối, read timeout 5 giây, lỗi của một kết nối không dừng server; log in 4-tuple |
| `LookupServer.handle()` | slide 5 | vòng trong: mỗi dòng một khóa, mỗi khóa một dòng phản hồi, flush ngay; dừng khi `readLine()` trả `null` |
| `LookupServer.reply()` | (README) | ba dạng phản hồi và hai mã lỗi của đặc tả |
| `LookupClient` | slide 5 | các trường hợp thử của đặc tả, thêm khóa có dấu `huế`, trên một kết nối |
| `LookupServerTest` | slide 6 | integration test JUnit 5: server thật ở loopback, port 0; sáu test |
| `IdleClient` | slide 7 | kết nối nhưng không gửi gì: client đến sau 1 giây chờ gần 4 giây |

Phương thức `reply`, phần ánh xạ đặc tả:

```java
static String reply(String key) {
    if (key.isEmpty()) {
        return "ERR empty key";
    }
    if (key.getBytes(UTF_8).length > MAX_LINE_BYTES) {
        return "ERR line too long";
    }
    String value = DATA.get(key);
    return value != null ? "OK " + value : "NOTFOUND";
}
```

Server kiểm độ dài **sau khi** `readLine()` đã đọc cả dòng; cách dừng đọc ngay ở byte thứ 257 là chủ đề nâng cao của phần.
`readLine()` nhận cả LF, CR và CRLF, nên client gửi CRLF vẫn được phục vụ (test `crlfIsAccepted`).

Kết quả: `results/LookupServer.txt` cùng lúc với `LookupClient.txt`, `LookupClient-2.txt`, `LookupClient-3.txt`;
`results/LookupServer-idle.txt` cùng lúc với `IdleClient.txt`, `LookupClient-after-idle.txt`;
`results/LookupServerTest.txt`. Port client (ephemeral port) và thời gian khác nhau giữa các lần chạy.

Test chạy server trên một thread riêng (`server.start()`) để server và test chạy cùng lúc; thread học ở nhóm đa luồng.
