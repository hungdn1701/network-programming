# Message broker: RabbitMQ, exchange, queue và binding

Mã chạy được của phần “Message broker: RabbitMQ, exchange, queue và binding”: work queue theo hướng dẫn chính thức của RabbitMQ (Tutorial 2, Work Queues: `NewTask`, `Worker`).
Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

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
java -cp "$CP" netlab.broker.Worker                          # terminal 1: chờ việc
java -cp "$CP" netlab.broker.NewTask First message.          # terminal 2: giao việc (mỗi dấu chấm một giây)
java -cp "$CP" netlab.broker.NewTask Second message..

java -cp "$CP" netlab.broker.Worker --auto-ack --crash-on "Second message.."   # autoAck, chết khi đang làm việc thứ hai
java -cp "$CP" netlab.broker.Worker --crash-on "Second message.."              # ack thủ công, chết khi đang làm việc thứ hai
```

Trong các file `results/`, dòng `$ NewTask ...`, `$ Worker ...` là lệnh `java ... netlab.broker.<lớp> ...` như trên, chạy lần lượt
trong một terminal; `$ rabbitmqctl ...` là `rabbitmqctl -q list_queues ...` của RabbitMQ (cột cách nhau bằng khoảng trắng).

| File | Dùng ở | Cho thấy |
|---|---|---|
| `NewTask` | slide 4 | như bản gốc: `queueDeclare("task_queue", durable=true, ...)`; `basicPublish("", "task_queue", PERSISTENT_TEXT_PLAIN, ...)`: exchange mặc định (tên rỗng, kiểu direct, mọi queue tự có binding theo tên queue); một việc mỗi lần chạy |
| `Worker` | slide 5–7 | như bản gốc: `basicQos(1)`, `basicConsume` với ack thủ công, `doWork` ngủ một giây mỗi dấu chấm, làm xong mới `basicAck`; thêm để chạy theo kịch bản: `--auto-ack`, `--crash-on <message>` tắt tiến trình (`Runtime.halt`) khi đang làm việc đó, `--max <n>`, và in `(redelivered)` khi cờ redeliver bật |
| `results/offline.txt` | slide 5 | Worker chưa chạy: queue giữ 2 message; Worker chạy lại nhận đủ, queue về 0 |
| `results/autoack-crash-setup.txt`, `autoack-crash.txt` | slide 6 | giao ba việc; autoAck, chết ở việc thứ hai: queue còn 0, việc thứ hai và thứ ba mất |
| `results/manual-crash-setup.txt`, `manual-crash.txt` | slide 7 | giao ba việc; ack thủ công, chết ở việc thứ hai: queue còn 2; việc thứ hai giao lại với cờ `redelivered`, việc thứ ba chưa từng được giao nên không có cờ |

Với ack thủ công, `basicQos(1)` giới hạn mỗi consumer giữ một message chưa ack (prefetch), nên khi Worker chết, việc thứ ba vẫn
nằm trong queue. Với autoAck, giới hạn prefetch không áp dụng: broker giao trước mọi message trong queue cho consumer; consumer
chết thì cả message đang xử lý lẫn các message đã giao nhưng chưa xử lý đều mất.

RabbitMQ 4.3 không cho tạo queue thường không durable (`transient_nonexcl_queues` bị chặn theo mặc định; khai báo queue với
`durable=false` làm broker đóng kết nối với lỗi 541); `task_queue` của bản gốc vốn đã durable. Ba loại exchange ở slide 3 theo các
ví dụ log của Tutorial 3–5 (`logs` fanout, `direct_logs`, `topic_logs`); phần này không chạy lại các ví dụ đó.
