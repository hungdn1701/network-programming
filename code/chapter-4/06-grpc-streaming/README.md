# gRPC: streaming, deadline và mã trạng thái

Mã chạy được của phần “gRPC: streaming, deadline và mã trạng thái”: gRPC streaming, deadline và mã trạng thái. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả
chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. grpc-java 1.84.3, protobuf 3.25.9, qua Maven Wrapper như phần gRPC trước
(`mvnw` tự tải Maven 3.9.16; `protobuf-maven-plugin` sinh mã từ `src/main/proto/lookup.proto` lúc build).

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.LookupServer              # terminal 1
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.PrefixClient hanoi.       # terminal 2: server streaming
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.PrefixClient hanoi. 1000  # deadline 1 giây
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.BidiClient                # bidirectional streaming
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.StatusDemo                # NOT_FOUND, UNAVAILABLE
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `src/main/proto/lookup.proto` | slide 4 | ba RPC: `Lookup` (unary), `Prefix` (`returns (stream Entry)`: server streaming), `LookupMany` (`stream` cả hai phía: bidirectional) |
| `LookupServer` | slide 5, 6 | `prefix`: duyệt `TreeMap.tailMap`, mỗi mục mô phỏng tốn 300 ms, gửi ngay bằng `onNext`; kiểm tra `ServerCallStreamObserver.isCancelled()` trước mỗi lần gửi; `lookup` báo khóa không có bằng `Status.NOT_FOUND`; `lookupMany` trả lời từng request ngay khi nhận |
| `PrefixClient` | slide 5, 6 | blocking stub trả `Iterator<Entry>`; `withDeadlineAfter(...)`; `StatusRuntimeException` với mã `DEADLINE_EXCEEDED` |
| `BidiClient` | slide 4 | async stub (`newStub`): gửi ba khóa cách nhau 300 ms qua `StreamObserver<LookupRequest>`, reply đến qua `StreamObserver<LookupReply>`, xen giữa các lần gửi |
| `StatusDemo` | slide 7 | `NOT_FOUND` (server chọn), `UNAVAILABLE` (không có server ở port 9198, thư viện báo); mọi lời gọi đặt deadline 2 giây |

Hai client gọi `Lookup` một lần trước khi đo, để thời gian thiết lập kết nối HTTP/2 không lẫn vào các mốc thời gian.
`results/LookupServer.txt` là log server trong cả hai lần chạy `PrefixClient`: lần đầu `completed, 5 entries`, lần có deadline
`cancelled by client after 3 entries`. Số mili giây thay đổi giữa các lần chạy; khoảng cách khoảng 300 ms giữa các mục và số mục
nhận được trước deadline thì ổn định.

gRPC mặc định không có deadline: lời gọi không đặt `withDeadlineAfter` chờ đến khi server trả lời hoặc kết nối hỏng. Với
grpc-java, lời gọi tạo ra trong lúc server đang xử lý một lời gọi khác (cùng `Context`) tự mang deadline của lời gọi đó và bị hủy
theo khi lời gọi đó bị hủy.
