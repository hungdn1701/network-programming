# Web service: REST, tài nguyên, phương thức HTTP và JSON

Mã chạy được của phần “Web service: REST, tài nguyên, phương thức HTTP và JSON”: Petstore dạng REST, bằng `HttpServer` và `HttpClient` của JDK — theo Swagger Petstore, ví dụ mẫu đi
kèm đặc tả OpenAPI. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật,
không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài: server dùng `com.sun.net.httpserver.HttpServer`
(module `jdk.httpserver`), client dùng `java.net.http.HttpClient`.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/rest/*.java

java -cp out netlab.rest.RestServer    # terminal 1
java -cp out netlab.rest.RestClient    # terminal 2

curl -i http://127.0.0.1:9199/pet/10                                               # thử bằng curl
curl -i -X POST -H "Content-Type: application/json" -d '{"name":"rex"}' http://127.0.0.1:9199/pet
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `RestServer` | slide 4 | `createContext("/pet", ...)`; `POST /pet` cấp id từ bộ đếm, trả 201 kèm `Location`; với `/pet/{petId}`: id lấy từ URI, thao tác theo phương thức (`GET`, `PUT`, `DELETE`; khác → 405 kèm header `Allow`); mã trạng thái 200, 201, 204, 400, 404, 405; thân JSON; virtual thread cho mỗi request |
| `RestClient` | slide 5, 6 | `HttpRequest.newBuilder(...).method(...)`; đọc `statusCode()` trước thân; POST hai lần tạo hai con vật (id 11, 12), PUT hai lần cùng trạng thái, DELETE hai lần: 204 rồi 404 |
| `Json` | — | JSON tối thiểu (đối tượng phẳng; ghi số hoặc chuỗi, đọc chuỗi) vì JDK 21 chưa có thư viện JSON; dự án thật dùng Jackson hoặc Gson |

`results/curl-size.txt`: thân response của `GET /pet/10` là 46 byte (so với 259 byte của response SOAP chỉ mang một con số ở
phần trước).

| Thao tác | Request | Thành công | Lỗi |
|---|---|---|---|
| đọc | `GET /pet/{petId}` | 200 + `{"id":…,"name":…,"status":…}` | 400 (id không phải số), 404 |
| thêm | `POST /pet` + `{"name":…,"status":…}` | 201 + `Location: /pet/{id}` | 400 (thiếu `name`, JSON sai) |
| thay | `PUT /pet/{petId}` + `{"name":…,"status":…}` | 200 | 400, 404 |
| xóa | `DELETE /pet/{petId}` | 204, không có thân | 404 |
| phương thức khác | — | — | 405 + `Allow` |

**Khác với Swagger Petstore** (đặc tả OpenAPI 3 ở `https://petstore3.swagger.io/api/v3/openapi.json`, đối chiếu 2026-10-25):
con vật chỉ giữ ba trường `id`, `name`, `status` (bỏ `category`, `photoUrls`, `tags`); `POST /pet` do server cấp id và trả 201
kèm `Location`, `PUT` nhắm vào `/pet/{petId}` thay vì `/pet` có id trong thân, `DELETE` trả 204 — theo ngữ nghĩa phương thức và
mã trạng thái của RFC 9110. Đặc tả Petstore còn có `GET /pet/findByStatus` (bài tập mở rộng) và scope OAuth `read:pets`,
`write:pets` (dùng lại ở phần về OAuth 2.0 và JWT).
