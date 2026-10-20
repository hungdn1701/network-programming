# Bài toán ứng dụng: đặc tả và thử giao thức tra cứu

Đặc tả và công cụ thử của phần “Bài toán ứng dụng: đặc tả và thử giao thức tra cứu”. Kết quả trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11; curl 8.7.1 (Git Bash). Không cần thư viện ngoài.

- `PROTOCOL.md` — đặc tả giao thức tra cứu, bản 1.
- `NetCat` — NetCat tối giản bản Java, chạy trên mọi hệ điều hành có JDK 21. Mã socket bên trong học ở Chương 2.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/tools/*.java

# Thử bằng tay (run.sh): Terminal 1 đóng vai server, Terminal 2 đóng vai client
java -cp out netlab.tools.NetCat -l 9199
java -cp out netlab.tools.NetCat 127.0.0.1 9199

# Ghi lại một phiên theo kịch bản (tạo results/NetCat-server.txt, results/NetCat-client.txt)
java -cp out netlab.tools.NetCatSession

# Một trao đổi HTTP/1.1 thật (http-trace.sh); Windows PowerShell dùng curl.exe và -o NUL
curl -sv -o /dev/null http://example.com 2>&1 | head -14
```

Trên Windows, gõ tiếng Việt trong console cần `chcp 65001`. Trong bản ghi màn hình, dòng bắt đầu bằng `>` là
dòng gõ vào và gửi đi (NetCat chạy với `--echo`); dòng dài hơn 60 ký tự được in rút gọn, dữ liệu gửi vẫn đủ.
Kết quả curl chụp ngày 20/10/2026; địa chỉ của example.com có thể khác khi chạy lại.
