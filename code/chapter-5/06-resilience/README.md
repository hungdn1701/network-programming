# Độ tin cậy: backoff, circuit breaker và health check

Mã chạy được của phần “Độ tin cậy: backoff, circuit breaker và health check”: client gọi một dịch vụ thanh toán không ổn định, có exponential backoff, jitter và circuit breaker;
dịch vụ có health check. Mọi đoạn
mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, CPU 8 lõi. Không cần thư viện ngoài: server dùng `HttpServer` của JDK, client
dùng `java.net.http.HttpClient`. Dịch vụ và client chạy trong cùng một chương trình (port 9199), để điều khiển chính xác lúc dịch vụ lỗi.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/resilience/*.java
java -cp out netlab.resilience.CircuitBreakerDemo   # results/CircuitBreakerDemo.txt
java -cp out netlab.resilience.RetryStormDemo       # results/RetryStormDemo.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `PaymentService` | slide 4, 5, 6 | `POST /payments` kèm header `Idempotency-Key` (thanh toán không idempotent; key đã thấy thì trả lại khoản cũ, 200, thay vì tạo khoản mới, 201); `schedule(from, until)` đặt khoảng thời gian lỗi, như hệ thống ngân hàng phía sau không truy cập được: thanh toán trả 503, `GET /health` trả 503 `{"status":"DOWN"}`, ngoài khoảng đó 200 `{"status":"UP"}` |
| `CircuitBreaker` | slide 4 | ba trạng thái `CLOSED`, `OPEN`, `HALF_OPEN`; `allowRequest` chuyển `OPEN` → `HALF_OPEN` khi hết thời gian chờ; `onFailure` mở khi đủ ngưỡng lỗi liên tiếp hoặc khi lời gọi thử lỗi |
| `CircuitBreakerDemo` | slide 4, 5 | gửi một thanh toán mỗi 400 ms, dịch vụ lỗi từ giây 1,0 đến 3,4; ngưỡng 3 lỗi, chờ 1 giây; mỗi dòng: thời điểm, trạng thái lúc gọi, kết quả, trạng thái sau, kết quả health check |
| `Backoff` | slide 6 | `min(cap, base · 2^attempt)`; full jitter: số ngẫu nhiên trong `[0, giá trị đó)` |
| `RetryStormDemo` | slide 6 | thí nghiệm của Brooker, "Exponential Backoff And Jitter" (AWS Architecture Blog): 100 client cùng gửi thanh toán, mỗi đơn một idempotency key, khi dịch vụ lỗi 1 400 ms, retry đến khi thành công: chờ cố định 100 ms, backoff, backoff có jitter; in tổng số request, số request trong 100 ms đông nhất kể từ lúc dịch vụ hồi phục, thời điểm client cuối cùng thành công, số khoản thanh toán đã tạo (luôn 100: retry không tạo khoản trùng) |

Trước khi đo, mỗi client gửi một request khi dịch vụ còn tốt để mở sẵn kết nối, rồi 100 client cùng bắt đầu (`CountDownLatch`).
Số liệu của `RetryStormDemo` đổi đôi chút giữa các lần chạy (thời gian phản hồi khác nhau làm lịch gọi lại lệch vài mili giây);
tỷ lệ giữ nguyên: backoff giảm tổng số request so với chờ cố định; không có jitter thì gần như cả 100 client quay lại trong cùng 100
ms khi dịch vụ hồi phục, có jitter thì chỉ khoảng 10–20.

Mỗi client dùng `SplittableRandom` với seed là số thứ tự client. Không dùng `new Random(c)` với các seed liên tiếp 0, 1, 2…: giá trị
đầu tiên của các đối tượng đó gần như bằng nhau, nên jitter của 100 client gần như trùng nhau.

Circuit breaker ở đây là bản tối giản cho một client gọi tuần tự. Thư viện thật (Resilience4j) đếm lỗi theo cửa sổ (số lời gọi hoặc
thời gian), giới hạn số lời gọi thử ở trạng thái half-open, và an toàn khi nhiều thread cùng gọi.
