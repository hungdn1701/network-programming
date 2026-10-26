# INT1433 · Lập trình mạng (Network Programming)

> **Bản nháp** — đang biên soạn, chưa nghiệm thu.

TS. Đặng Ngọc Hùng · 3 tín chỉ · Tiếng Việt · Java 21

- Trang học phần: <https://hungdn1701.github.io/network-programming/> — khung nội dung, bản xem trước từng phần, slide
- Mã chạy được: thư mục [`code/`](code/), mỗi phần một thư mục `chapter-<chương>/<thứ tự>-<tên>`

## Chương 1. Tổng quan lập trình mạng

| | Phần | Phút | |
|---|---|---|---|
| 1 | Định danh: địa chỉ IP, tên miền, port và endpoint | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V02/) · [slide](https://hungdn1701.github.io/network-programming/V02/slide.pdf) · [mã](code/chapter-1/01-endpoint/) |
| 2 | Giao vận: TCP, UDP và mô hình ứng dụng mạng | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V03/) · [slide](https://hungdn1701.github.io/network-programming/V03/slide.pdf) · [mã](code/chapter-1/02-transport/) |
| 3 | Stream: byte stream, contract của read/write, decorator và buffer | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V04/) · [slide](https://hungdn1701.github.io/network-programming/V04/slide.pdf) · [mã](code/chapter-1/03-byte-stream/) |
| 4 | Stream: dữ liệu có kiểu với DataStream và ObjectStream | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V05/) · [slide](https://hungdn1701.github.io/network-programming/V05/slide.pdf) · [mã](code/chapter-1/04-typed-stream/) |
| 5 | Stream: character stream, charset và framing message | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V06/) · [slide](https://hungdn1701.github.io/network-programming/V06/slide.pdf) · [mã](code/chapter-1/05-charset-framing/) |
| 6 | Bài toán ứng dụng: nói HTTP bằng tay với NetCat | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V07/) · [slide](https://hungdn1701.github.io/network-programming/V07/slide.pdf) · [mã](code/chapter-1/06-protocol-spec/) |

## Chương 2. Lập trình socket TCP và đa luồng

| | Phần | Phút | |
|---|---|---|---|
| 1 | TCP: kết nối giữa client và server | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V08/) · [slide](https://hungdn1701.github.io/network-programming/V08/slide.pdf) · [mã](code/chapter-2/01-tcp-connection/) |
| 2 | TCP: timeout, half-close và lỗi kết nối | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V09/) · [slide](https://hungdn1701.github.io/network-programming/V09/slide.pdf) · [mã](code/chapter-2/02-timeout-halfclose/) |
| 3 | Bài toán ứng dụng: web server tối giản trên TCP | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V10/) · [slide](https://hungdn1701.github.io/network-programming/V10/slide.pdf) · [mã](code/chapter-2/03-web-server/) |
| 4 | Đa luồng: thread và race condition | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V11/) · [slide](https://hungdn1701.github.io/network-programming/V11/slide.pdf) · [mã](code/chapter-2/04-thread-race/) |
| 5 | Đa luồng: synchronized, happens-before và wait/notify | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V12/) · [slide](https://hungdn1701.github.io/network-programming/V12/slide.pdf) · [mã](code/chapter-2/05-sync/) |
| 6 | Đa luồng: Executor, thread pool và virtual thread | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V13/) · [slide](https://hungdn1701.github.io/network-programming/V13/slide.pdf) · [mã](code/chapter-2/06-executor/) |
| 7 | Bài toán ứng dụng: web server phục vụ nhiều client | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V14/) · [slide](https://hungdn1701.github.io/network-programming/V14/slide.pdf) · [mã](code/chapter-2/07-concurrent-web-server/) |

## Chương 3. Lập trình UDP và giao thức ứng dụng hiện đại

| | Phần | Phút | |
|---|---|---|---|
| 1 | UDP: datagram và DatagramSocket | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V15/) · [slide](https://hungdn1701.github.io/network-programming/V15/slide.pdf) · [mã](code/chapter-3/01-udp-datagram/) |
| 2 | Multicast: nhóm multicast, network interface và TTL | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V16/) · [slide](https://hungdn1701.github.io/network-programming/V16/slide.pdf) · [mã](code/chapter-3/02-multicast/) |
| 3 | Bài toán ứng dụng: truyền video theo nhóm multicast | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V17/) · [slide](https://hungdn1701.github.io/network-programming/V17/slide.pdf) · [mã](code/chapter-3/03-video-multicast/) |
| 4 | WebSocket: nâng cấp từ HTTP và giao tiếp hai chiều | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V18/) · [slide](https://hungdn1701.github.io/network-programming/V18/slide.pdf) · [mã](code/chapter-3/04-websocket/) |
| 5 | Bài toán ứng dụng: chat thời gian thực bằng WebSocket | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V19/) · [slide](https://hungdn1701.github.io/network-programming/V19/slide.pdf) · [mã](code/chapter-3/05-websocket-chat/) |
| 6 | HTTP/2: binary framing và multiplexing | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V20/) · [slide](https://hungdn1701.github.io/network-programming/V20/slide.pdf) · [mã](code/chapter-3/06-http2/) |
| 7 | HTTP/3: QUIC và giao thức trên UDP | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V21/) · [slide](https://hungdn1701.github.io/network-programming/V21/slide.pdf) · [mã](code/chapter-3/07-http3/) |

## Chương 4. Kỹ thuật lập trình phân tán

| | Phần | Phút | |
|---|---|---|---|
| 1 | RPC: lời gọi thủ tục từ xa và Java RMI | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V22/) · [slide](https://hungdn1701.github.io/network-programming/V22/slide.pdf) · [mã](code/chapter-4/01-rmi/) |
| 2 | RPC: truyền tham số, idempotency và truy cập đồng thời trong RMI | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V23/) · [slide](https://hungdn1701.github.io/network-programming/V23/slide.pdf) · [mã](code/chapter-4/02-rmi-update/) |
| 3 | Web service: SOAP, hợp đồng WSDL và message XML | 6′ | [xem trước](https://hungdn1701.github.io/network-programming/V24/) · [slide](https://hungdn1701.github.io/network-programming/V24/slide.pdf) · [mã](code/chapter-4/03-soap/) |
| 4 | Web service: REST, tài nguyên, phương thức HTTP và JSON | 6′ | [xem trước](https://hungdn1701.github.io/network-programming/V25/) · [slide](https://hungdn1701.github.io/network-programming/V25/slide.pdf) · [mã](code/chapter-4/04-rest/) |
| 5 | gRPC: Protocol Buffers và lời gọi unary | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V26/) · [slide](https://hungdn1701.github.io/network-programming/V26/slide.pdf) · [mã](code/chapter-4/05-grpc/) |
| 6 | gRPC: streaming, deadline và mã trạng thái | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V27/) · [slide](https://hungdn1701.github.io/network-programming/V27/slide.pdf) · [mã](code/chapter-4/06-grpc-streaming/) |
| 7 | Message broker: RabbitMQ, exchange, queue và binding | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V28/) · [slide](https://hungdn1701.github.io/network-programming/V28/slide.pdf) · [mã](code/chapter-4/07-rabbitmq/) |
| 8 | Bài toán ứng dụng: xử lý đơn hàng qua message broker | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V29/) · [slide](https://hungdn1701.github.io/network-programming/V29/slide.pdf) · [mã](code/chapter-4/08-order-events/) |

## Chương 5. Các chủ đề nâng cao

| | Phần | Phút | |
|---|---|---|---|
| 1 | Bảo mật: TLS và secure socket trong Java | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V30/) · [slide](https://hungdn1701.github.io/network-programming/V30/slide.pdf) · [mã](code/chapter-5/01-tls/) |
| 2 | Bảo mật: xác thực và phân quyền với OAuth 2.0 và JWT | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V31/) · [slide](https://hungdn1701.github.io/network-programming/V31/slide.pdf) · [mã](code/chapter-5/02-jwt/) |
| 3 | Hiệu năng: lời gọi không chặn với CompletableFuture và gRPC async stub | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V32/) · [slide](https://hungdn1701.github.io/network-programming/V32/slide.pdf) · [mã](code/chapter-5/03-async/) |
| 4 | Hiệu năng: NIO, Selector và mẫu Reactor | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V33/) · [slide](https://hungdn1701.github.io/network-programming/V33/slide.pdf) · [mã](code/chapter-5/04-nio/) |
| 5 | Độ tin cậy: retry, request ID và checksum trên UDP | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V34/) · [slide](https://hungdn1701.github.io/network-programming/V34/slide.pdf) · [mã](code/chapter-5/05-udp-reliable/) |
| 6 | Độ tin cậy: backoff, circuit breaker và health check | 7′ | [xem trước](https://hungdn1701.github.io/network-programming/V35/) · [slide](https://hungdn1701.github.io/network-programming/V35/slide.pdf) · [mã](code/chapter-5/06-resilience/) |
| 7 | Bài toán ứng dụng: giám sát cảm biến với MQTT và CoAP | 8′ | [xem trước](https://hungdn1701.github.io/network-programming/V36/) · [slide](https://hungdn1701.github.io/network-programming/V36/slide.pdf) · [mã](code/chapter-5/07-mqtt/) |

---

Repo này được sinh tự động từ nguồn biên soạn; không sửa trực tiếp. Cập nhật 2026-10-26.
