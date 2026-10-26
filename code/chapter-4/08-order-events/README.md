# Bài toán ứng dụng: xử lý đơn hàng qua message broker

Mã chạy được của phần “Bài toán ứng dụng: xử lý đơn hàng qua message broker”: xử lý đơn hàng hướng sự kiện qua RabbitMQ — publish/subscribe, work queue, routing theo topic,
prefetch. Các mẫu theo hướng dẫn chính thức của RabbitMQ (Tutorials 2–5) và Hohpe & Woolf, *Enterprise Integration Patterns*. Mọi
đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. RabbitMQ 4.3.6, `amqp-client` 5.37.0 qua Maven Wrapper; cách chạy RabbitMQ
(Docker, hoặc bản zip cho Windows như máy biên soạn) xem README của phần message broker trước.

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -cp "$CP" netlab.orders.OrderDemo --prefetch 1   # results/OrderDemo-prefetch1.txt
java -cp "$CP" netlab.orders.OrderDemo                # prefetch không giới hạn: results/OrderDemo-unlimited.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Orders` | slide 4 | exchange topic `orders`; `orders.analytics` và `orders.email` bind `order.#` (mọi đơn hàng), `orders.hanoi` bind `order.hn.*` (kho Hà Nội); queue durable, được purge mỗi lần chạy demo |
| `OrderDemo` | slide 5, 6 | dịch vụ đặt hàng phát 6 sự kiện (`order.hn.1001`, `order.hn.1002`, `order.hcm.1003`, `order.hn.1004`, `order.hcm.1005`, `order.hn.1006`); bốn consumer, mỗi consumer một channel: `analytics`, `warehouse`, `email-1` (600 ms mỗi email), `email-2` (100 ms); `basicQos(prefetch)` cho hai worker email |

Kết quả một lần chạy (2026-10-25): prefetch 1 → `email-1` 1 email, `email-2` 5 email, gửi xong sau khoảng 0,6 giây; không giới hạn
prefetch → 3 và 3, gửi xong sau khoảng 1,9 giây (worker chậm giữ 3 message chưa ack). `analytics` luôn nhận 6, `warehouse` luôn
nhận 4. Số mili giây thay đổi giữa các lần chạy; cách chia 3–3 (không giới hạn) và mỗi email chỉ gửi một lần thì ổn định.

Bốn consumer chạy chung một tiến trình cho gọn; với broker, mỗi channel là một consumer riêng, như khi chạy trong các tiến trình
riêng. Exchange topic với binding `order.#` làm đúng việc của exchange fanout (mọi queue đã bind nhận một bản); dùng một exchange
topic cho phép thêm binding theo mẫu (`order.hn.*`, sau này `order.hcm.*` cho kho TP.HCM) mà không cần exchange thứ hai.
