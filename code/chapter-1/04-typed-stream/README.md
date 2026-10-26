# Stream: dữ liệu có kiểu với DataStream và ObjectStream

Mã chạy được của phần “Stream: dữ liệu có kiểu với DataStream và ObjectStream”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/stream/*.java
java -cp out netlab.stream.DataStreamDemo
java -cp out netlab.stream.ObjectStreamDemo
java -cp out netlab.stream.WrongOrderDemo
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `DataStreamDemo` | slide 4 | Bản ghi đo của cảm biến: `writeInt(1001)` = `00 00 03 E9` (big-endian); nhiệt độ `27.5` kiểu double 8 byte; `writeUTF("P301")` có 2 byte độ dài; tổng 18 byte |
| `ObjectStreamDemo` | slide 5 | Serialization: 137 byte cho cùng bản ghi đo dạng đối tượng `SensorReading`; đối tượng đọc lại `equals` nhưng không `==` |
| `WrongOrderDemo` | slide 6 | Đọc sai thứ tự (double trước int) không báo lỗi, chỉ cho giá trị sai |

`ByteArrayOutputStream` đứng ở vị trí stream của socket để xem được từng byte. Không deserialize dữ liệu từ
nguồn không tin cậy.
