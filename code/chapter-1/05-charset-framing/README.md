# Stream: character stream, charset và framing message

Mã chạy được của phần “Stream: character stream, charset và framing message”. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ
`results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài. Kết quả có chữ tiếng Việt nên
chạy với `-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/stream/*.java
java -Dstdout.encoding=UTF-8 -cp out netlab.stream.CharsetDemo
java -Dstdout.encoding=UTF-8 -cp out netlab.stream.LineFramingDemo
java -Dstdout.encoding=UTF-8 -cp out netlab.stream.LengthPrefixDemo
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `CharsetDemo` | slide 4 | "Hà Nội\n" = 10 byte UTF-8; đọc bằng UTF-8 đúng, bằng windows-1252 sai, không ngoại lệ |
| `LineFramingDemo` | slide 5 | Hai message liền nhau trong một khối byte; `readLine()` tách tại LF |
| `LengthPrefixDemo` | slide 6 | Tiền tố độ dài `00 00 00 05` cho "huế" (3 ký tự, 5 byte); `readFully` đọc đủ |
