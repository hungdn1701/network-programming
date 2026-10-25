# Web service: REST, tài nguyên, phương thức HTTP và JSON

Mã chạy được của phần “Web service: REST, tài nguyên, phương thức HTTP và JSON”: dịch vụ tra cứu dạng REST, bằng `HttpServer` và `HttpClient` của JDK. Mọi đoạn mã trên slide trích
từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài: server dùng `com.sun.net.httpserver.HttpServer`
(module `jdk.httpserver`), client dùng `java.net.http.HttpClient`. Kết quả có chữ tiếng Việt nên chạy với
`-Dstdout.encoding=UTF-8` (console Windows: chạy `chcp 65001` trước).

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/rest/*.java

java -Dstdout.encoding=UTF-8 -cp out netlab.rest.RestServer    # terminal 1
java -Dstdout.encoding=UTF-8 -cp out netlab.rest.RestClient    # terminal 2

curl -i http://127.0.0.1:9199/entries/hanoi                     # thử bằng curl
curl -i -X PUT -H "Content-Type: application/json" -d '{"value":"Thị trấn vùng cao"}' http://127.0.0.1:9199/entries/sapa
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `RestServer` | slide 4 | `createContext("/entries/", ...)`; khóa lấy từ URI, thao tác theo phương thức (`GET`, `PUT`, `DELETE`; khác → 405 kèm header `Allow`); mã trạng thái 200, 201, 204, 400, 404; thân JSON; virtual thread cho mỗi request |
| `RestClient` | slide 5, 6 | `HttpRequest.newBuilder(...).method(...)`; đọc `statusCode()` trước thân; PUT, DELETE gọi hai lần: 201 rồi 200, 204 rồi 404 |
| `Json` | — | JSON tối thiểu (đối tượng phẳng, giá trị chuỗi) vì JDK 21 chưa có thư viện JSON; dự án thật dùng Jackson hoặc Gson |

`results/curl-size.txt`: thân response của `GET /entries/hanoi` là 53 byte (so với 250 byte của response SOAP ở phần trước).

| Thao tác | Request | Thành công | Lỗi |
|---|---|---|---|
| tra cứu | `GET /entries/{key}` | 200 + `{"key":…,"value":…}` | 404 |
| tạo hoặc thay | `PUT /entries/{key}` + `{"value":…}` | 201 (tạo mới), 200 (thay) | 400 (thiếu `value`, JSON sai) |
| xóa | `DELETE /entries/{key}` | 204, không có thân | 404 |
| phương thức khác | — | — | 405 + `Allow: GET, PUT, DELETE` |

Khóa có dấu được mã hóa phần trăm trong URI (`/entries/hu%E1%BA%BF`); `getPath()` trả khóa đã giải mã.
