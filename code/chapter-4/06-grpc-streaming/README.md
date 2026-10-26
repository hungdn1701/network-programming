# gRPC: streaming, deadline và mã trạng thái

Mã chạy được của phần “gRPC: streaming, deadline và mã trạng thái”: RouteGuide đầy đủ (ví dụ mẫu của gRPC, `grpc-java/examples/routeguide`) với bốn kiểu RPC, deadline và
mã trạng thái. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ
lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. grpc-java 1.84.3, protobuf 3.25.9, qua Maven Wrapper như phần gRPC trước
(`mvnw` tự tải Maven 3.9.16; `protobuf-maven-plugin` sinh mã từ `src/main/proto/route_guide.proto` lúc build). Kết quả có chữ
tiếng Việt nên chạy với `-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.RouteGuideServer   # terminal 1
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.ListClient         # terminal 2: server streaming
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.ListClient 1000    # deadline 1 giây
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.RouteClient        # client streaming, bidirectional streaming
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.stream.StatusDemo         # INVALID_ARGUMENT, UNAVAILABLE
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `src/main/proto/route_guide.proto` | slide 4 | hợp đồng như bản gốc: `GetFeature` (unary), `ListFeatures` (`returns (stream Feature)`: server streaming), `RecordRoute` (`stream Point`: client streaming), `RouteChat` (`stream` cả hai phía: bidirectional); message `Point`, `Rectangle`, `Feature`, `RouteNote`, `RouteSummary` |
| `Features` | — | tám địa danh ở Hà Nội như phần trước (tọa độ từ OpenStreetMap, © OpenStreetMap contributors, ODbL) |
| `RouteGuideServer` | slide 5, 6 | theo server mẫu: `listFeatures` duyệt danh sách, bỏ điểm ngoài hình chữ nhật, mỗi địa danh mô phỏng tốn 300 ms, gửi ngay bằng `onNext`, kiểm tra `ServerCallStreamObserver.isCancelled()` trước mỗi lần gửi; `getFeature` báo vĩ độ ngoài [-90, 90] bằng `Status.INVALID_ARGUMENT`; `recordRoute` đếm điểm, địa danh, cộng quãng đường (haversine) rồi trả `RouteSummary` khi client gửi xong; `routeChat` gửi lại các ghi chú trước đó ở cùng điểm |
| `ListClient` | slide 5, 6 | blocking stub trả `Iterator<Feature>`; `withDeadlineAfter(...)`; `StatusRuntimeException` với mã `DEADLINE_EXCEEDED` |
| `RouteClient` | slide 4 | async stub (`newStub`): `RecordRoute` gửi 4 điểm (Văn Miếu → Lăng Bác → Trấn Quốc → Long Biên) cách nhau 400 ms, nhận tổng kết sau `onCompleted`; `RouteChat` gửi 4 ghi chú, ghi chú cũ ở cùng điểm đến xen giữa các lần gửi |
| `StatusDemo` | slide 7 | `INVALID_ARGUMENT` (vĩ độ 105.7871, kinh độ và vĩ độ bị đổi chỗ như ở phần trước; server chọn mã), `UNAVAILABLE` (không có server ở port 9198, thư viện báo); mọi lời gọi đặt deadline 2 giây |

Hai client gọi `GetFeature` một lần trước khi đo, để thời gian thiết lập kết nối HTTP/2 không lẫn vào các mốc thời gian.
`results/RouteGuideServer.txt` là log server trong cả hai lần chạy `ListClient`: lần đầu `completed, 6 features`, lần có deadline
`cancelled by client after 3 features`. Số mili giây thay đổi giữa các lần chạy; khoảng cách khoảng 300 ms giữa các địa danh và số
địa danh nhận được trước deadline thì ổn định. `elapsed_time` của `RouteSummary` tính bằng giây nguyên, như bản gốc.

gRPC mặc định không có deadline: lời gọi không đặt `withDeadlineAfter` chờ đến khi server trả lời hoặc kết nối hỏng. Với
grpc-java, lời gọi tạo ra trong lúc server đang xử lý một lời gọi khác (cùng `Context`) tự mang deadline của lời gọi đó và bị hủy
theo khi lời gọi đó bị hủy.
