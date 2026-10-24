# Đa luồng: thread và race condition

Mã chạy được của phần “Đa luồng: thread và race condition”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/`
(output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/threads/*.java

for i in 1 2 3; do java -cp out netlab.threads.CounterRace $i; done   # ba lần chạy, ba tiến trình JVM
java -cp out netlab.threads.InterruptDemo
java -cp out netlab.threads.StartVsRun
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `CounterRace` | slide 4 | hai thread cùng `requests++` một triệu lần: kết quả nhỏ hơn 2 000 000, khác nhau mỗi lần chạy |
| `InterruptDemo` | slide 5 | `interrupt()` khi worker đang `sleep`: `InterruptedException`, worker dọn dẹp rồi kết thúc |
| `StartVsRun` | slide 6 | `run()` chạy tác vụ trên `main`, `start()` tạo thread `worker`; `Thread.stop()` ném `UnsupportedOperationException` (từ Java 20) |

Phần `main` của `InterruptDemo` (không có trên slide):

```java
Thread worker = new Thread(InterruptDemo::waitForWork, "worker");
worker.start();
Thread.sleep(2_500);
worker.interrupt();  // yêu cầu dừng; worker tự quyết cách dừng
worker.join();
```

Mỗi lần chạy `CounterRace` là một tiến trình JVM mới. Bản thử đầu tiên chạy ba vòng trong cùng một tiến trình: hai lần
thử trên máy biên soạn, vòng thứ ba đều cho đúng 2 000 000 (nhiều khả năng do trình biên dịch JIT đã tối ưu vòng lặp sau
hai vòng đầu). Race condition vẫn còn, chỉ không lộ ra: một lần chạy thử cho kết quả đúng không chứng minh được mã đúng.
