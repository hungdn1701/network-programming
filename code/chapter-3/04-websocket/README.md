# WebSocket: nâng cấp từ HTTP và giao tiếp hai chiều

Mã chạy được của phần “WebSocket: nâng cấp từ HTTP và giao tiếp hai chiều”: WebSocket, handshake và frame. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy
trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11, curl 8.21.0 của Windows (`C:\Windows\System32\curl.exe`). Không cần
thư viện ngoài: server viết trên `ServerSocket`, client dùng `java.net.http.WebSocket` của JDK.

```bash
javac --release 21 -encoding UTF-8 -d out src/netlab/ws/*.java

java -cp out netlab.ws.MiniWebSocketServer     # terminal 1: port 9400
java -cp out netlab.ws.EchoClient              # terminal 2

# handshake bằng curl, với khóa mẫu của RFC 6455 (mục 1.3); -o NUL bỏ phần frame sau handshake
curl -s -v -o NUL --max-time 2 -H "Connection: Upgrade" -H "Upgrade: websocket" -H "Sec-WebSocket-Version: 13" \
     -H "Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==" http://127.0.0.1:9400/chat
```

`results/curl-handshake.txt` là các dòng `>` (request) và `<` (response) của lệnh curl trên (lọc bỏ dòng `*` thông tin
kết nối, bỏ CR cuối dòng); curl kết thúc với mã 28 sau 2 giây vì server giữ kết nối mở sau handshake.

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `MiniWebSocketServer` | slide 5, 6 (log), 7 | đọc header từng byte (không `BufferedReader`), kiểm `Upgrade: websocket`, tính `Sec-WebSocket-Accept` = base64(SHA-1(key + GUID)), trả `101`; gửi frame `welcome` trước khi client gửi gì; trả lại text, trả pong cho ping, đáp close |
| `Frame` | slide 4, 6 (log) | cấu trúc frame RFC 6455 mục 5.2: FIN, opcode, mask, độ dài 7 bit (126: 2 byte sau, 127: 8 byte sau), mask 4 byte của client |
| `EchoClient` | slide 6 | `HttpClient.newWebSocketBuilder().buildAsync(...)`, `Listener.onText`/`onPong`, `sendText`, `sendPing`, `sendClose(NORMAL_CLOSURE)` |

Kiểm chứng: với khóa mẫu `dGhlIHNhbXBsZSBub25jZQ==`, server trả `s3pPLMBiTxaQ9kYGzzhZRbK+xOo=`, đúng giá trị mẫu của RFC
6455. Frame `welcome` từ server dài 9 byte (`81 07` + 7 byte), khớp số byte curl nhận được sau handshake.

Server chỉ để minh họa: một kết nối mỗi lần, không kiểm tra `Sec-WebSocket-Version`, không ghép frame phân mảnh (FIN = 0),
không gửi ping. Phần chat dùng thư viện Jakarta WebSocket.
