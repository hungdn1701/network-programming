# Bài toán ứng dụng: chat thời gian thực bằng WebSocket

Mã chạy được của phần “Bài toán ứng dụng: chat thời gian thực bằng WebSocket”: phòng chat bằng WebSocket. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên
slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Server dùng Jakarta WebSocket 2.2 với Tyrus 2.2.2 (bản cài đặt tham
chiếu) chạy trên Grizzly 4.0.2; client dùng `java.net.http.WebSocket` của JDK, không cần thư viện.

**Thư viện** (`lib/`, không commit; tải từ Maven Central):

```bash
mkdir -p lib && cd lib
M=https://repo1.maven.org/maven2
for a in tyrus-server tyrus-core tyrus-spi tyrus-client tyrus-container-grizzly-server tyrus-container-grizzly-client; do
  curl -O $M/org/glassfish/tyrus/$a/2.2.2/$a-2.2.2.jar
done
curl -O $M/jakarta/websocket/jakarta.websocket-api/2.2.0/jakarta.websocket-api-2.2.0.jar
curl -O $M/jakarta/websocket/jakarta.websocket-client-api/2.2.0/jakarta.websocket-client-api-2.2.0.jar
for a in grizzly-framework grizzly-http grizzly-http-server; do
  curl -O $M/org/glassfish/grizzly/$a/4.0.2/$a-4.0.2.jar
done
cd ..
```

SHA-1 đã đối chiếu với Maven Central (2026-10-24):

| File | SHA-1 |
|---|---|
| `tyrus-server-2.2.2.jar` | `48eacfe5412cf3e7b05a71d9a65a0fa7b86ccdc2` |
| `tyrus-core-2.2.2.jar` | `9050cfbe1623441cfc7cb534ca60db154650c279` |
| `tyrus-spi-2.2.2.jar` | `6a1952cd54d4fa1884fc0a5fe751afd2be6b549b` |
| `tyrus-client-2.2.2.jar` | `959d8c2f59d78c4f3526cae8b3ed6913ef94bf3c` |
| `tyrus-container-grizzly-server-2.2.2.jar` | `b2784d99ba8769285614cccfc422ceb3fb9ec3de` |
| `tyrus-container-grizzly-client-2.2.2.jar` | `6c0949eb71f430da64f8d54a5677db64d51efbbb` |
| `jakarta.websocket-api-2.2.0.jar` | `60e525188fdb42120506debd90ffd4e204fd6f24` |
| `jakarta.websocket-client-api-2.2.0.jar` | `cf7eafc1b929a80429c77e4450c6720a7de56814` |
| `grizzly-framework-4.0.2.jar` | `dd0f696cc6f09bdc6f57a3a1c0a70615544ffa67` |
| `grizzly-http-4.0.2.jar` | `52403f90c894105ffe541c690f0a662e0614d590` |
| `grizzly-http-server-4.0.2.jar` | `964ef18c55aea25633b12757863e2a3fae6d1190` |

Không dùng `websocket-ri-bundle`: bundle đó kèm phần tích hợp EJB của GlassFish và báo `NoClassDefFoundError:
jakarta/ejb/Singleton` khi chạy độc lập (đã thử).

```bash
javac --release 21 -encoding UTF-8 -cp "lib/*" -d out src/netlab/chat/*.java

java -cp "out;lib/*" netlab.chat.ChatServer                          # terminal 1 (Linux, macOS: "out:lib/*")
java -Dstdout.encoding=UTF-8 -cp out netlab.chat.ChatClient an       # terminal 2, 3, 4: an, binh, chi
```

Mỗi dòng gõ vào client là một tin; Ctrl+Z rồi Enter (Windows) hoặc Ctrl+D (Linux, macOS) để đóng. Kết quả trong `results/`
ghi từ một lần chạy có kịch bản: server chạy 14 giây; an, binh, chi là ba tiến trình riêng, nhận tin qua stdin theo mốc
thời gian (an gửi "chào cả nhóm", binh gửi "chào an", chi đóng, an gửi "chi vừa rời phòng", rồi an và binh đóng).

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `ChatEndpoint` | slide 3, 4 | `@ServerEndpoint("/chat")`; tập phiên `static` trong `ConcurrentHashMap` (mặc định mỗi phiên một đối tượng endpoint); `@OnOpen` thêm, `@OnMessage` gửi tới phiên khác, `@OnClose` xóa; gửi qua `getBasicRemote()` trong `synchronized` trên phiên đích |
| `ChatServer` | slide 5 | `org.glassfish.tyrus.server.Server` ở `localhost:9401`, gốc `/`; ẩn log INFO của thư viện |
| `ChatClient` | slide 5 | `java.net.http.WebSocket`: mỗi dòng stdin một `sendText`, hết stdin thì `sendClose` |

Quy định một thao tác gửi tại một thời điểm: Javadoc của `jakarta.websocket.RemoteEndpoint.Basic` — gửi khi kết nối đang bận
gửi message khác (ví dụ hai thread cùng gửi) có thể ném `IllegalStateException`.
