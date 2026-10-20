# Stream: byte stream, contract của read/write, decorator và buffer

Mã chạy được của phần “Stream: byte stream, contract của read/write, decorator và buffer”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/stream/*.java
java -cp out netlab.stream.ReadOnce
java -cp out netlab.stream.ReadLoop
java -cp out netlab.stream.FlushDemo
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `ChunkedInputStream` | slide 5–6 | Stream giả lập: 10 000 byte đến thành nhiều đợt (1460, 2920, 512, 1460, 3648 byte), như dữ liệu qua mạng |
| `ReadOnce` | slide 5 | SAI: gọi `read` một lần chỉ nhận phần đã đến (1460 trên 10 000 byte), không báo lỗi |
| `ReadLoop` | slide 6 | Gọi `read` đến khi trả -1, dùng giá trị trả về `n`: đủ 10 000 byte |
| `FlushDemo` | slide 7 | `BufferedOutputStream` (decorator) giữ byte trong buffer: 0 byte xuống dưới trước `flush()`, 6 byte sau |

Qua TCP thật, số byte mỗi lần `read` trả về phụ thuộc lúc dữ liệu đến và không đoán trước được.
