# Message broker: RabbitMQ, exchange, queue và binding

Mã chạy được của phần “Message broker: RabbitMQ, exchange, queue và binding”: dịch vụ tra cứu gửi sự kiện cập nhật qua RabbitMQ. Mọi đoạn mã trên slide trích từ thư mục này; mọi
kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. RabbitMQ 4.3.6 (AMQP 0-9-1, port 5672), thư viện `amqp-client` 5.37.0
qua Maven Wrapper (`mvnw` tự tải Maven 3.9.16).

**Chạy RabbitMQ.** Cách khuyên dùng là Docker:

```bash
docker run -d --name rabbitmq -p 5672:5672 rabbitmq:4.3        # tài khoản mặc định guest/guest, chỉ dùng từ localhost
docker exec rabbitmq rabbitmqctl list_queues name messages_ready messages_unacknowledged
```

Máy biên soạn không có Docker, nên `results/` được ghi với bản zip chính thức cho Windows: `rabbitmq-server-windows-4.3.6.zip`
(SHA-256 `48161b084f1257edc112b24fccda378cc3e83c8e4b94984801cd6651817981f1`) chạy trên Erlang/OTP 28.5.0.8, bản zip
`otp_win64_28.5.0.8.zip` (SHA-256 `f5f8d8179f3e8594d2f9bdb742f854db6671d9e06a89cf03a6beac79c91df07b`), đối chiếu digest trên GitHub
Releases của `rabbitmq/rabbitmq-server` và `erlang/otp` (2026-10-25). Biến môi trường: `ERLANG_HOME` trỏ thư mục OTP,
`RABBITMQ_NODE_IP_ADDRESS=127.0.0.1`, `ERL_EPMD_ADDRESS=127.0.0.1` (chỉ nghe trên loopback); chạy `sbin\rabbitmq-server.bat`.

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.broker.UpdateConsumer                     # terminal 1: chờ sự kiện
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.broker.UpdatePublisher sapa dalat hue     # terminal 2: gửi ba sự kiện

java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.broker.UpdateConsumer --auto-ack --crash-on dalat   # autoAck, chết ở dalat
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.broker.UpdateConsumer --crash-on dalat              # ack thủ công, chết ở dalat
```

Trong các file `results/`, dòng `$ UpdatePublisher ...`, `$ UpdateConsumer ...` là lệnh `java ... netlab.broker.<lớp> ...` như
trên, chạy lần lượt trong một terminal; `$ rabbitmqctl ...` là `rabbitmqctl -q list_queues ...` của RabbitMQ (cột cách nhau bằng
khoảng trắng).

| File | Dùng ở | Cho thấy |
|---|---|---|
| `Topology` | slide 4 | `exchangeDeclare` (direct `lookup.events`), `queueDeclare` (`lookup.updates`, durable), `queueBind` (routing key `entry.updated`); producer và consumer đều khai báo |
| `UpdatePublisher` | slide 4 | `basicPublish(exchange, routingKey, ...)`: gửi tới exchange, không biết queue |
| `UpdateConsumer` | slide 5–7 | `basicConsume`; xử lý 200 ms rồi `basicAck`; `--auto-ack`; `--crash-on <khóa>` tắt tiến trình (`Runtime.halt`) khi đang xử lý; `--max <n>` |
| `results/online-*.txt` | slide 5 (lời giảng) | consumer đang chạy nhận ngay ba sự kiện |
| `results/offline.txt` | slide 5 | consumer tắt: queue giữ 2 message; consumer chạy lại nhận đủ, queue về 0 |
| `results/autoack-crash.txt` | slide 6 | autoAck, chết ở dalat: queue còn 0, dalat và hue mất |
| `results/manual-crash.txt` | slide 7 | ack thủ công, chết ở dalat: queue còn 2, giao lại với cờ `redelivered` |

RabbitMQ 4.3 không cho tạo queue thường không durable (`transient_nonexcl_queues` bị chặn theo mặc định; khai báo queue với
`durable=false` làm broker đóng kết nối với lỗi 541), nên `lookup.updates` là queue durable. Message trong ví dụ không persistent:
khởi động lại broker thì queue còn, message mất (bài tập Mở rộng).

Với autoAck và không giới hạn prefetch, broker giao trước mọi message trong queue cho consumer; consumer chết thì cả message đang xử
lý lẫn các message đã giao nhưng chưa xử lý đều mất. Prefetch là chủ đề của phần tiếp theo.
