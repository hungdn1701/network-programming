# Bài toán ứng dụng: giám sát cảm biến với MQTT và CoAP

Mã chạy được của phần “Bài toán ứng dụng: giám sát cảm biến với MQTT và CoAP”: giám sát cảm biến qua MQTT bằng thư viện Eclipse Paho: retained message, last will, và QoS 1 giao
trùng. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Eclipse Paho `org.eclipse.paho.client.mqttv3` 1.2.5 (MQTT 3.1.1) qua Maven
Wrapper. Mã chạy với mọi MQTT broker ở `127.0.0.1:1883`, không cần đăng nhập:

- **Mosquitto qua Docker** (cách đề nghị cho người học):
  `docker run --rm -p 1883:1883 eclipse-mosquitto:2 mosquitto -c /mosquitto-no-auth.conf`
- **Không có Docker:** HiveMQ Community Edition (chạy bằng Java 11 trở lên): tải bản zip ở
  <https://github.com/hivemq/hivemq-community-edition/releases>, giải nén, chạy `bin/run.bat` (Windows) hoặc `bin/run.sh`.
  Kết quả trong `results/` ghi với HiveMQ CE 2026.5, cấu hình nghe ở `127.0.0.1:1883`, mỗi demo trên một broker vừa khởi động.

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...
CP="target/classes;target/dependency/*"                                 # Linux, macOS: "target/classes:target/dependency/*"

# Dashboard vào sau: retained message, last will
java -cp "$CP" netlab.iot.Sensor 101 5 --crash &                         # cảm biến phòng 101: 5 lần đo rồi "mất điện"
java -cp "$CP" netlab.iot.Sensor 102 6 &                                 # cảm biến phòng 102: 6 lần đo rồi dừng có chủ đích
sleep 2.5
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.iot.Dashboard 6           # results/Dashboard.txt

# QoS 1 giao trùng (chạy trên broker vừa khởi động)
java -Dstdout.encoding=UTF-8 -cp "$CP" netlab.iot.AlertDemo             # results/AlertDemo.txt
```

| Lớp | Dùng ở | Cho thấy |
|---|---|---|
| `Sensor` | slide 5 | `setWill(phong/<phòng>/trang-thai, "offline", QoS 1, retained)`; publish `online`; mỗi giây publish nhiệt độ tới `phong/<phòng>/nhiet-do` với QoS 0, retained; `--crash`: `Runtime.halt` sau lần đo cuối (không có DISCONNECT) |
| `Dashboard` | slide 5 | subscribe `phong/+/nhiet-do` (QoS 0) và `phong/+/trang-thai` (QoS 1); in thời điểm, topic, nội dung, cờ retained |
| `AlertDemo` | slide 6 | dịch vụ cảnh báo: `setManualAcks(true)`, clean session = false, subscribe `canh-bao/#` QoS 1; xử lý A1 rồi đóng kết nối trước PUBACK (`disconnectForcibly`); kết nối lại cùng client ID → broker giao lại A1 với `dup=true`, dịch vụ bỏ qua nhờ tập ID đã xử lý |

Theo MQTT 3.1.1, message giao cho subscriber vì nó vừa subscribe (message retained) mang cờ RETAIN = 1; message giao cho subscriber
đang có mang cờ RETAIN = 0, kể cả khi bên publish đặt retained. Vì vậy chỉ các dòng ở giây 0 có `(retained)`. Dòng `offline` của
phòng 101 là last will do broker publish khi socket của cảm biến đóng mà không có DISCONNECT; dòng `offline` của phòng 102 do chính
cảm biến publish trước khi ngắt kết nối.

Khi kết nối lại với clean session = false, broker phải giao lại các message QoS 1 chưa được ack, với cờ DUP = 1 (MQTT 3.1.1, mục
4.4). HiveMQ CE và Mosquitto giao lại ngay khi client kết nối lại. Moquette 0.17 (đã thử khi chuẩn bị) giao lại sau khoảng 5 giây
và không bật cờ RETAIN cho message retained, nên không dùng cho phần này.
