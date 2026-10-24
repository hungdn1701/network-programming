# Đa luồng: synchronized, happens-before và wait/notify

Mã chạy được của phần “Đa luồng: synchronized, happens-before và wait/notify”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/`
(output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/sync/*.java

for i in 1 2 3; do java -cp out netlab.sync.CounterSafe $i; done
java -cp out netlab.sync.BufferDemo
java -cp out netlab.sync.IfInsteadOfWhile
java -cp out netlab.sync.StopFlag
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `CounterSafe` | slide 5 | `increment()` và `get()` là `synchronized`: hai thread, mỗi thread một triệu lần, luôn đúng 2 000 000 |
| `BoundedBuffer` | slide 6 | hàng đợi có giới hạn: `put()`, `take()` dùng `wait()` trong `while` và `notifyAll()` |
| `BufferDemo` | slide 6 | hàng đợi 2 phần tử, worker xử lý mỗi kết nối 300 ms: acceptor chờ khoảng 300 ms ở kết nối thứ tư và thứ năm |
| `IfInsteadOfWhile` | slide 7 | `take()` dùng `if`: `notifyAll()` đánh thức hai worker cho một phần tử, worker còn lại nhận `NoSuchElementException` |

`BufferDemo` ghi thời điểm của mỗi sự kiện rồi in theo thứ tự thời gian sau khi hai thread kết thúc: in ngay từ hai
thread thì các dòng có thể lẫn thứ tự, dễ đọc sai.

## Đọc thêm (không có trên slide)

| Lớp | Cho thấy | Kết quả |
|---|---|---|
| `StopFlag` | worker lặp đọc biến thường `plainStop` không dừng sau khi `main` đặt `true` (chạy thử nhiều lần trên máy biên soạn, lần nào cũng vậy); worker đọc biến `volatile` dừng ngay. Kết quả được nhắc trong lời giảng ở slide 3 (happens-before) | `results/StopFlag.txt` |

Kết quả của `StopFlag` với biến thường **không được bảo đảm** theo hướng nào: mô hình bộ nhớ Java chỉ nói không có gì
bảo đảm worker thấy giá trị mới. Trên HotSpot của JDK 21, worker không bao giờ thấy, nhiều khả năng vì trình biên dịch
JIT đã đưa lần đọc biến ra ngoài vòng lặp (phép tối ưu này hợp lệ khi không có happens-before). Đổi thân vòng lặp (ví dụ gọi `Thread.onSpinWait()`) có thể làm worker dừng: đã thử, và đó
vẫn là mã sai.
