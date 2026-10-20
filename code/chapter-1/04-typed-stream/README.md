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
| `DataStreamDemo` | slide 4 | `writeInt(9199)` = `00 00 23 EF` (big-endian); double 8 byte; `writeUTF` có 2 byte độ dài; tổng 19 byte |
| `ObjectStreamDemo` | slide 5 | Serialization: 100 byte cho một yêu cầu chứa chuỗi 5 ký tự; đối tượng đọc lại `equals` nhưng không `==` |
| `WrongOrderDemo` | slide 6 | Đọc sai thứ tự không báo lỗi, chỉ cho giá trị sai |

`ByteArrayOutputStream` đứng ở vị trí stream của socket để xem được từng byte. Không deserialize dữ liệu từ
nguồn không tin cậy.
