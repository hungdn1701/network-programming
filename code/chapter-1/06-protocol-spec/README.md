# Bài toán ứng dụng: nói HTTP bằng tay với NetCat

Nói HTTP/1.1 bằng tay với NetCat, ở cả vai client lẫn vai server. Kết quả trên slide lấy từ `results/` (output thật,
không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11; curl 8.7.1 (Git Bash). Không cần thư viện ngoài. Vai client cần
kết nối Internet tới `ptit.edu.vn`, port 80.

- `NetCat` — NetCat tối giản bản Java, chạy trên mọi hệ điều hành có JDK 21. Tùy chọn `--crlf` kết thúc mỗi dòng gửi đi
  bằng CRLF, như HTTP/1.1 quy định (RFC 9112). Mã socket bên trong học ở Chương 2.
- `requests/` — request và response đã soạn sẵn, dùng khi ghi phiên thay cho gõ tay.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/tools/*.java

# Vai client (run.sh): gõ request, kết thúc bằng một dòng trống
java -cp out netlab.tools.NetCat --crlf ptit.edu.vn 80
#   GET / HTTP/1.1
#   Host: ptit.edu.vn
#   Connection: close
#   (dòng trống)

# Vai server (run.sh): Terminal 1 lắng nghe, Terminal 2 chạy curl; đọc request của curl rồi gõ response
java -cp out netlab.tools.NetCat --crlf -l 9199
curl -i http://127.0.0.1:9199/hello.txt
#   HTTP/1.1 200 OK
#   Content-Type: text/plain
#   Content-Length: 7
#   (dòng trống)
#   hello

# curl -v với cùng web server (http-trace.sh); Windows PowerShell dùng curl.exe và -o NUL
curl -sv -o /dev/null http://ptit.edu.vn 2>&1 | head -14

# Ghi lại mọi phiên trên slide vào results/ (record.sh)
sh record.sh
```

| Kết quả | Phiên |
|---|---|
| `results/NetCat-client.txt` | vai client: request đúng đặc tả, server trả 301 kèm `Location` |
| `results/NetCat-nohost.txt` | request thiếu header `Host`: server trả 400 Bad Request |
| `results/NetCat-lf.txt` | gửi chỉ LF (không có `--crlf`): nginx vẫn trả 301, vì RFC 9112 mục 2.2 cho phép bên nhận chấp nhận LF |
| `results/NetCat-server.txt`, `results/curl-i.txt` | vai server: request của curl, response gõ tay; curl in ra `hello` |
| `results/curl-v.txt` | `curl -v`: request curl gửi và đầu response |

`Content-Length: 7` của response gõ tay gồm năm chữ cái của `hello` và hai byte CRLF, vì NetCat gửi dòng `hello` kèm CRLF.
Trong bản ghi màn hình, dòng bắt đầu bằng `>` là dòng gõ vào và gửi đi (NetCat chạy với `--echo`); dòng rỗng in thành
`(empty line)`. Trên Windows, gõ tiếng Việt trong console cần `chcp 65001`.

Kết quả chạy ngày 26/10/2026, web server của ptit.edu.vn là nginx 1.24.0; địa chỉ IP, header `Date` và `Server` có thể
khác khi chạy lại.
