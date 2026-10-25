# Bài toán ứng dụng: thông báo bất đồng bộ qua message broker

Mã chạy được của phần “Bài toán ứng dụng: thông báo bất đồng bộ qua message broker”: thông báo bất đồng bộ qua RabbitMQ — publish/subscribe, work queue, routing theo topic, prefetch. Mọi
đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. RabbitMQ 4.3.6, `amqp-client` 5.37.0 qua Maven Wrapper; cách chạy RabbitMQ
(Docker, hoặc bản zip cho Windows như máy biên soạn) xem README của phần message broker trước.

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.notify.NotifyDemo --prefetch 1   # results/NotifyDemo-prefetch1.txt
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.notify.NotifyDemo                # prefetch không giới hạn: results/NotifyDemo-unlimited.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Notify` | slide 4 | exchange topic `lookup.notify`; `notify.log` và `notify.email` bind `entry.#` (mọi sự kiện), `notify.vn` bind `entry.vn.*`; queue durable, được purge mỗi lần chạy demo |
| `NotifyDemo` | slide 5, 6 | phát 6 sự kiện (`entry.vn.hanoi`, `entry.vn.hue`, `entry.jp.tokyo`, `entry.vn.sapa`, `entry.jp.osaka`, `entry.vn.dalat`); bốn consumer, mỗi consumer một channel: `log`, `vn-audit`, `email-1` (600 ms mỗi email), `email-2` (100 ms); `basicQos(prefetch)` cho hai worker email |

Kết quả một lần chạy (2026-10-25): prefetch 1 → `email-1` 1 email, `email-2` 5 email, gửi xong sau khoảng 0,6 giây; không giới hạn
prefetch → 3 và 3, gửi xong sau khoảng 1,8 giây (worker chậm giữ 3 message chưa ack). `log` luôn nhận 6, `vn-audit` luôn nhận 4.
Số mili giây thay đổi giữa các lần chạy; cách chia 3–3 (không giới hạn) và mỗi email chỉ gửi một lần thì ổn định.

Bốn consumer chạy chung một tiến trình cho gọn; với broker, mỗi channel là một consumer riêng, như khi chạy trong các tiến trình
riêng. Exchange topic với binding `entry.#` làm đúng việc của exchange fanout (mọi queue đã bind nhận một bản); dùng một exchange
topic cho phép thêm binding theo mẫu (`entry.vn.*`) mà không cần exchange thứ hai.
