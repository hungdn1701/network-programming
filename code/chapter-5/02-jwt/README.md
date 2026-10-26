# Bảo mật: xác thực và phân quyền với OAuth 2.0 và JWT

Mã chạy được của phần “Bảo mật: xác thực và phân quyền với OAuth 2.0 và JWT”: Petstore của phần REST kiểm tra access token dạng JWT, với scope `read:pets`, `write:pets` như đặc tả
OpenAPI của Swagger Petstore. Mọi đoạn mã trên slide trích từ thư
mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Không cần thư viện ngoài: chữ ký RS256 dùng `java.security.Signature`
(`SHA256withRSA`), Base64URL dùng `java.util.Base64`, API dùng `HttpServer` của JDK.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/jwt/*.java
java -cp out netlab.jwt.JwtDemo       # results/JwtDemo.txt
java -cp out netlab.jwt.PeekPayload   # results/PeekPayload.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Jwt` | slide 4 | `sign`: header `{"alg":"RS256","typ":"JWT"}`, chữ ký RSA trên `header.payload`; `verify`: kiểm tra `alg`, chữ ký bằng khóa công khai, rồi `exp` |
| `AuthorizationServer` | — | giữ cặp khóa RSA 2048 bit, cấp token với claim `sub`, `scope`, `iat`, `exp`; đăng nhập và quy trình authorization code chỉ có ở hình |
| `ApiServer` | slide 5 | Petstore `/pet/{petId}` (id, name, status): GET mở; PUT cần `Authorization: Bearer <JWT>`: token thiếu hoặc không hợp lệ → 401 (kèm `WWW-Authenticate: Bearer`), thiếu scope `write:pets` → 403 |
| `JwtDemo` | slide 5 | năm request `PUT /pet/10` đổi status thành `sold`: không token, token hợp lệ, token hết hạn, payload bị sửa (từ token chỉ đọc, giữ chữ ký cũ), token chỉ có `read:pets` |
| `PeekPayload` | slide 6 | giải mã header và payload chỉ bằng Base64URL, không cần khóa |
| `Json` | — | JSON tối thiểu (đối tượng phẳng, chuỗi và số nguyên) |

Authorization server và API chạy trong cùng tiến trình cho gọn; API chỉ nhận khóa công khai (`ApiServer(PublicKey)`), như khi
chạy riêng và lấy khóa công khai từ authorization server (thường qua JWKS). Dự án thật dùng thư viện JWT có sẵn (Nimbus JOSE + JWT,
jjwt) và authorization server có sẵn (Keycloak, dịch vụ đám mây); thứ tự kiểm tra như `Jwt.verify`: thuật toán, chữ ký, thời hạn,
rồi mới tới quyền.

Giá trị `iat`, `exp` trong `results/PeekPayload.txt` là thời điểm lúc chạy (giây kể từ 1970-01-01 UTC), nên đổi mỗi lần chạy.
