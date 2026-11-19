/* ============================================================================
 * INT1433/workbench/lessons.js — 12 Mô phỏng tương tác 2.5D (Lập trình mạng)
 * ============================================================================
 * Phủ đủ 5 chương của INT1433/plan.yaml, bám sát INT1433/glossary.yaml và
 * INT1433/classic-examples.md (Java 21 LTS, Stevens UNP, Kurose & Ross, RFC).
 * ============================================================================ */
(function (global) {
  'use strict';
  const D = global.IsoDSL;

  const LESSONS = [
    /* ========================================================================
     * CHƯƠNG 1 — 1. PHÂN GIẢI TÊN DNS & ENDPOINT
     * ======================================================================== */
    {
      id: 'dns-endpoint',
      ch: 1,
      videos: ['V02', 'V03'],
      videoHref: '../V02/index.html',
      videoTitle: 'Định danh: địa chỉ IP, tên miền, port và endpoint',
      title: 'Phân giải tên DNS & Endpoint',
      summary: 'Từ tên miền ptit.edu.vn tới cặp địa chỉ IP và port xác định đúng tiến trình server.',
      minutes: 7,
      level: 'Cơ bản',
      ref: 'Chương 1 · Định danh và tầng giao vận',
      metrics: [
        { id: 'rtt', label: 'ĐỘ TRỄ TRA CỨU' },
        { id: 'ips', label: 'BẢN GHI IP' },
        { id: 'ep', label: 'ENDPOINT ĐÍCH' },
        { id: 'proto', label: 'GIAO VẬN' }
      ],
      legend: ['req', 'res', 'msg'],
      goals: [
        { text: 'Phân biệt tên miền, địa chỉ IP, port 16 bit và endpoint', step: 0 },
        { text: 'Hiểu chuỗi phân giải tên từ cache cục bộ tới DNS resolver', step: 1 },
        { text: 'Thấy một tên miền có thể trả về nhiều địa chỉ IPv4/IPv6', step: 2 },
        { text: 'Xác định đúng tiến trình đích nhờ cặp IP + port (InetSocketAddress)', step: 3 }
      ],
      steps: [
        {
          short: 'Tên miền ban đầu',
          chapter: 'setup',
          title: 'Ứng dụng chỉ có tên miền và port dịch vụ',
          body: [
            'Chương trình Java muốn gọi tới <code>ptit.edu.vn</code> ở port <code>443</code>, nhưng tầng mạng IP không định tuyến theo chuỗi chữ mà chỉ định tuyến theo <b>địa chỉ IP</b>.',
            'Lớp <code>InetAddress.getAllByName()</code> là cầu nối để đổi tên miền sang danh sách địa chỉ IP trước khi tạo socket.'
          ],
          callout: {
            kind: 'insight',
            text: '<b>Endpoint</b> = địa chỉ IP + port 16 bit (0–65535). Địa chỉ IP chỉ đúng máy trong mạng; port chỉ đúng tiến trình đang lắng nghe trên máy đó.'
          },
          metrics: {
            rtt: { val: '0 ms', level: '' },
            ips: { val: 'Chưa biết', level: 'warn' },
            ep: { val: 'ptit.edu.vn:443', level: '' },
            proto: { val: 'UDP :53', level: '' }
          },
          scene: {
            entities: {
              cli: D.dev(-10, 0, 'Client Java 21', { tags: [{ text: 'InetAddress.getAllByName', tone: 'blue' }] }),
              cache: D.block(0, 0, { color: 'gray', glyph: 'cache', label: ['OS DNS Cache'], sub: 'Trống (miss)', tags: [{ text: 'Chưa có bản ghi', tone: 'amber' }] }),
              srv: D.srv(11, 0, ['ptit.edu.vn'], { color: 'blue', sub: 'HTTPS :443', tags: [{ text: 'Chưa biết IP', tone: 'gray' }] })
            },
            links: {
              c_ca: D.link('cli', 'cache', { label: 'Tra cache cục bộ' })
            },
            flows: [D.flow(['c_ca'], { rate: 1.4, kind: 'req' })]
          }
        },
        {
          short: 'Hỏi DNS Resolver',
          chapter: 'technique',
          title: 'Gửi truy vấn UDP tới DNS Resolver ở port 53',
          body: [
            'Khi cache hệ điều hành không có bản ghi hoặc TTL đã hết hạn, thư viện chuẩn gửi một datagram UDP tới <b>DNS Resolver</b> (port <code>53</code>) để hỏi bản ghi <code>A</code> (IPv4) và <code>AAAA</code> (IPv6).',
            'Resolver có thể trả ngay từ cache của nhà mạng hoặc truy vấn đệ quy từ Root → TLD <code>.vn</code> → Authoritative DNS.'
          ],
          callout: {
            kind: 'tip',
            text: 'DNS dùng <b>UDP</b> làm mặc định vì mỗi truy vấn hỏi đáp rất ngắn, chỉ cần một vòng đi về (1 RTT) thay vì bắt tay kết nối.'
          },
          changes: [
            '+ Gửi truy vấn DNS A/AAAA qua UDP port 53',
            '~ Resolver kiểm tra bản ghi thẩm quyền cho ptit.edu.vn'
          ],
          metrics: {
            rtt: { val: '18 ms', level: 'good' },
            ips: { val: 'Đang phân giải', level: 'warn' },
            ep: { val: 'Resolver :53', level: '' },
            proto: { val: 'UDP datagram', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Client Java 21'),
              dns: D.srv(0, 3.5, ['DNS Resolver'], { color: 'orange', glyph: 'globe', sub: 'UDP port 53', tags: [{ text: 'Truy vấn A / AAAA', tone: 'amber' }] }),
              auth: D.srv(11, 3.5, ['Authoritative DNS'], { color: 'purple', glyph: 'database', sub: 'Miền .edu.vn' }),
              srv: D.srv(11, -4, ['ptit.edu.vn'], { color: 'blue', sub: 'Chờ kết nối :443' })
            },
            links: {
              c_d: D.link('cli', 'dns', { label: 'Query ptit.edu.vn' }),
              d_a: D.link('dns', 'auth', { label: 'Hỏi bản ghi A/AAAA' })
            },
            flows: [
              D.flow(['c_d', 'd_a'], { rate: 1.8, kind: 'req' }),
              D.flow(['d_a'], { rate: 1.1, kind: 'msg' })
            ]
          }
        },
        {
          short: 'Trả về nhiều IP',
          chapter: 'technique',
          title: 'Một tên miền có thể ánh xạ sang nhiều địa chỉ IP',
          body: [
            'Với các dịch vụ lớn như <code>www.google.com</code> hay <code>ptit.edu.vn</code>, DNS trả về danh sách nhiều địa chỉ IPv4/IPv6 kèm thời gian sống <b>TTL</b> để cân bằng tải và dự phòng.',
            'Kết quả được lưu vào cache cục bộ trong thời hạn TTL giúp các lời gọi tiếp theo gần như tức thì.'
          ],
          changes: [
            '+ Trả về danh sách địa chỉ IP kèm TTL',
            '+ Nạp bản ghi vào OS DNS Cache'
          ],
          metrics: {
            rtt: { val: '18 ms (lần 2: <1 ms)', level: 'good' },
            ips: { val: 'IPv4 + IPv6', level: 'good' },
            ep: { val: '203.162.x.y:443', level: 'good' },
            proto: { val: 'DNS Response', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Client Java 21', { tags: [{ text: 'Nhận danh sách IP', tone: 'green' }] }),
              dns: D.srv(0, 3.5, ['DNS Resolver'], { color: 'green', glyph: 'globe', sub: 'Cache TTL = 300 s' }),
              srv1: D.srv(11, 3.5, ['Endpoint #1'], { color: 'blue', sub: 'IPv4 :443' }),
              srv2: D.srv(11, -3.5, ['Endpoint #2'], { color: 'teal', sub: 'IPv6 :443' })
            },
            links: {
              d_c: D.link('dns', 'cli', { label: 'A + AAAA + TTL', tone: 'green' })
            },
            flows: [D.flow(['d_c'], { rate: 1.8, kind: 'res' })]
          }
        },
        {
          short: 'Định tuyến đúng port',
          chapter: 'summary',
          title: 'Cùng một địa chỉ IP, port phân tách từng tiến trình server',
          body: [
            'Client ghép địa chỉ IP vừa phân giải với port đích tạo thành <code>InetSocketAddress</code> và mở kết nối tới server.',
            'Trên cùng một máy có địa chỉ IP duy nhất, hệ điều hành dựa vào <b>số port đích</b> (ví dụ <code>443</code> cho HTTPS, <code>53</code> cho DNS, <code>8080</code> cho dịch vụ web nội bộ) để chuyển dữ liệu tới đúng socket.'
          ],
          callout: {
            kind: 'insight',
            text: 'Bốn thông tin <code>(client IP, client port, server IP, server port)</code> tạo thành <b>4-tuple</b> phân biệt mọi kết nối TCP đang đồng thời chạy trên cùng một máy.'
          },
          metrics: {
            rtt: { val: '< 1 ms (cache)', level: 'good' },
            ips: { val: 'Đã xác định', level: 'good' },
            ep: { val: 'IP : 443', level: 'good' },
            proto: { val: 'TCP Socket', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Client :51420', { tags: [{ text: 'Ephemeral port', tone: 'paper' }] }),
              host: D.zone(4, 15, -7, 7, 'CÙNG MỘT MÁY (1 ĐỊA CHỈ IP)', { tone: 'blue' }),
              p443: D.srv(9.5, 4, ['HTTPS Server'], { color: 'green', sub: 'Port 443', tags: [{ text: 'Đúng đích', tone: 'green' }] }),
              p8080: D.srv(9.5, -3.5, ['API Server'], { color: 'gray', sub: 'Port 8080' })
            },
            links: {
              c_443: D.link('cli', 'p443', { label: 'IP : 443', tone: 'green' })
            },
            flows: [D.flow(['c_443'], { rate: 2.0, kind: 'req' })]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 1 — 2. BYTE STREAM & FRAMING MESSAGE
     * ======================================================================== */
    {
      id: 'stream-framing',
      ch: 1,
      videos: ['V04', 'V05', 'V06', 'V07'],
      videoHref: '../V06/index.html',
      videoTitle: 'Stream: character stream, charset và framing message',
      title: 'Byte Stream & Framing Message',
      summary: 'Vì sao TCP không giữ ranh giới message và hai cách đóng khung kinh điển: CRLF và tiền tố độ dài.',
      minutes: 8,
      level: 'Cơ bản',
      ref: 'Chương 1 · Stream, charset và framing',
      metrics: [
        { id: 'chunk', label: 'KÍCH THƯỚC ĐỌC' },
        { id: 'bound', label: 'RANH GIỚI MESSAGE' },
        { id: 'charset', label: 'CHARSET' },
        { id: 'risk', label: 'RỦI RO DÍNH GÓI' }
      ],
      legend: ['req', 'msg', 'heavy', 'res'],
      goals: [
        { text: 'Hiểu bản chất TCP là một byte stream liên tục, không giữ ranh giới mỗi lần write', step: 0 },
        { text: 'Nhận diện lỗi ghép dính hoặc cắt nửa message khi read() trả về từng đoạn nhỏ', step: 1 },
        { text: 'Áp dụng framing bằng dấu phân cách CRLF (kiểu HTTP/1.1, SMTP)', step: 2 },
        { text: 'Áp dụng framing bằng tiền tố độ dài (Content-Length / DataStream) an toàn cho dữ liệu nhị phân', step: 3 }
      ],
      steps: [
        {
          short: 'Ghi hai message',
          chapter: 'setup',
          title: 'Bên gửi gọi write() hai lần liên tiếp trên byte stream',
          body: [
            'Ứng dụng gọi <code>out.write("GET /")</code> rồi gọi tiếp <code>out.write(" HTTP/1.1")</code>. Trên bề mặt mã nguồn có hai lời gọi tách biệt.',
            'Nhưng bên dưới, tầng giao vận TCP coi tất cả là <b>một dãy byte liên tục</b> chảy vào buffer gửi của nhân hệ điều hành.'
          ],
          metrics: {
            chunk: { val: '2 lần write()', level: '' },
            bound: { val: 'Không bảo toàn', level: 'warn' },
            charset: { val: 'UTF-8', level: 'good' },
            risk: { val: 'Cao nếu thiếu framing', level: 'warn' }
          },
          scene: {
            entities: {
              send: D.srv(-11, 0, ['Bên gửi'], { color: 'blue', glyph: 'code', sub: 'OutputStream', tags: [{ text: '2 lần write()', tone: 'blue' }] }),
              buf: D.queue(0, 0, 'TCP Send Buffer', { n: 5, slots: 6, color: 'orange', tags: [{ text: 'Dãy byte liên tục', tone: 'amber' }] }),
              recv: D.srv(11, 0, ['Bên nhận'], { color: 'teal', glyph: 'code', sub: 'InputStream.read()' })
            },
            links: {
              s_b: D.link('send', 'buf', { label: 'Ghi byte nối đuôi' }),
              b_r: D.link('buf', 'recv', { label: 'TCP byte stream' })
            },
            flows: [D.flow(['s_b', 'b_r'], { rate: 1.8, kind: 'req' })]
          }
        },
        {
          short: 'Cắt mảnh & dính gói',
          chapter: 'problem',
          title: 'Một lần read() có thể trả về nửa message hoặc hai message dính nhau',
          body: [
            'Theo contract của <code>InputStream.read(byte[])</code>, phương thức chỉ bảo đảm đọc ít nhất 1 byte khi có dữ liệu, không hứa trả trọn một message.',
            'Nếu mạng chia gói nhỏ (MTU) hoặc gom gói (Nagle), bên nhận đọc một lượt có thể gặp nửa chữ tiếng Việt UTF-8 hoặc hai lệnh dính liền nhau.'
          ],
          callout: {
            kind: 'warn',
            text: 'Không bao giờ giả định 1 lần <code>write()</code> bằng 1 lần <code>read()</code> trên TCP. Cần vòng lặp đọc kết hợp quy tắc <b>framing</b> rõ ràng.'
          },
          changes: [
            '! Gói tin bị cắt giữa chừng hoặc gộp hai message làm một',
            '! Đọc sai charset làm hỏng ký tự có dấu UTF-8'
          ],
          metrics: {
            chunk: { val: '1..N byte tùy mạng', level: 'bad' },
            bound: { val: 'Mất ranh giới', level: 'bad' },
            charset: { val: 'Cần khóa UTF-8', level: 'warn' },
            risk: { val: 'Dính gói / cắt chữ', level: 'bad' }
          },
          scene: {
            entities: {
              send: D.srv(-11, 0, ['Bên gửi'], { color: 'blue', sub: 'Msg A + Msg B' }),
              net: D.srv(0, 0, ['Mạng IP / MTU'], { color: 'red', glyph: 'alert', heat: 0.7, sub: 'Cắt & gom segment', tags: [{ text: 'A1 | A2+B1 | B2', tone: 'red' }] }),
              recv: D.srv(11, 0, ['Bên nhận'], { color: 'red', sub: 'read() trả về cắt mảnh', tags: [{ text: 'Parse thất bại!', tone: 'red' }] })
            },
            links: {
              s_n: D.link('send', 'net', { label: 'Byte stream' }),
              n_r: D.link('net', 'recv', { label: 'Đoạn không đều', tone: 'red', fail: 0.2 })
            },
            flows: [D.flow(['s_n', 'n_r'], { rate: 2.6, kind: 'heavy' })]
          }
        },
        {
          short: 'Framing dấu kết thúc',
          chapter: 'technique',
          title: 'Cách 1: Dấu phân cách CRLF (kiểu HTTP/1.1 và SMTP)',
          body: [
            'Với giao thức văn bản, hai bên thống nhất một ký tự kết thúc khung — ví dụ <code>\\r\\n</code> (CRLF) cho từng dòng header và một dòng trống <code>\\r\\n\\r\\n</code> kết thúc phần header của HTTP/1.1.',
            'Bên nhận bọc <code>BufferedInputStream</code> + <code>InputStreamReader(in, UTF_8)</code> đọc đến khi gặp đúng dấu kết thúc, kèm giới hạn độ dài tối đa (trả lỗi <code>414</code> nếu quá dài).'
          ],
          changes: [
            '+ Bọc BufferedReader với charset StandardCharsets.UTF_8',
            '+ Tách đúng từng dòng lệnh kết thúc bằng CRLF'
          ],
          metrics: {
            chunk: { val: 'Theo dòng CRLF', level: 'good' },
            bound: { val: 'Rõ ràng (văn bản)', level: 'good' },
            charset: { val: 'UTF-8 tường minh', level: 'good' },
            risk: { val: 'Tránh chứa CRLF bên trong', level: 'warn' }
          },
          scene: {
            entities: {
              send: D.srv(-11, 0, ['Client HTTP/1.1'], { color: 'blue', sub: 'GET / HTTP/1.1\\r\\n' }),
              frame: D.block(0, 0, { color: 'green', glyph: 'layers', label: ['Delimiter Framing'], sub: 'Tách theo \\r\\n', tags: [{ text: 'Dễ thử bằng NetCat', tone: 'green' }] }),
              recv: D.srv(11, 0, ['Server Parser'], { color: 'green', sub: 'BufferedReader + UTF-8' })
            },
            links: {
              s_f: D.link('send', 'frame', { label: 'Header + CRLF', tone: 'green' }),
              f_r: D.link('frame', 'recv', { label: 'Từng dòng nguyên vẹn', tone: 'green' })
            },
            flows: [D.flow(['s_f', 'f_r'], { rate: 1.8, kind: 'msg' })]
          }
        },
        {
          short: 'Tiền tố độ dài',
          chapter: 'summary',
          title: 'Cách 2: Tiền tố độ dài (Length-Prefix & Content-Length)',
          body: [
            'Khi truyền dữ liệu nhị phân (ảnh, file, bản ghi cảm biến) mà nội dung có thể chứa mọi giá trị byte kể cả <code>\\r\\n</code>, bên gửi ghi trước <b>độ dài N byte</b> (4 byte int bằng <code>DataOutputStream</code> hoặc header <code>Content-Length</code>), rồi mới ghi đúng N byte thân.',
            'Bên nhận đọc N trước rồi gọi <code>readNBytes(N)</code> để gom đủ từng byte, tuyệt đối không nhầm ranh giới.'
          ],
          callout: {
            kind: 'tip',
            text: 'HTTP/1.1 kết hợp cả hai: <b>CRLF</b> cho phần header và <b>Content-Length</b> (tiền tố độ dài) cho phần thân message.'
          },
          metrics: {
            chunk: { val: 'readNBytes(len)', level: 'good' },
            bound: { val: 'Chính xác tuyệt đối', level: 'good' },
            charset: { val: 'Hỗ trợ cả nhị phân', level: 'good' },
            risk: { val: '0% dính gói', level: 'good' }
          },
          scene: {
            entities: {
              send: D.srv(-11, 0, ['DataOutputStream'], { color: 'blue', sub: 'writeInt(N) + N bytes' }),
              frame: D.block(0, 0, { color: 'purple', glyph: 'code', label: ['[4B Length | Payload]'], sub: 'Không cần quét byte', tags: [{ text: 'An toàn nhị phân', tone: 'violet' }] }),
              recv: D.srv(11, 0, ['DataInputStream'], { color: 'green', sub: 'readInt() → readNBytes(N)' })
            },
            links: {
              s_f: D.link('send', 'frame', { label: 'Header 4 byte + Body', tone: 'green' }),
              f_r: D.link('frame', 'recv', { label: 'Message nguyên vẹn', tone: 'green' })
            },
            flows: [D.flow(['s_f', 'f_r'], { rate: 1.8, kind: 'res' })]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 2 — 3. BẮT TAY 3 BƯỚC TCP & HALF-CLOSE
     * ======================================================================== */
    {
      id: 'tcp-handshake',
      ch: 2,
      videos: ['V08', 'V09'],
      videoHref: '../V08/index.html',
      videoTitle: 'TCP: kết nối giữa client và server',
      title: 'Bắt tay 3 bước TCP, Timeout & Half-Close',
      summary: 'Vòng đời socket TCP: ServerSocket accept(), hàng đợi backlog, timeout chống treo và shutdownOutput().',
      minutes: 8,
      level: 'Cơ bản',
      ref: 'Chương 2 · Lập trình socket TCP',
      metrics: [
        { id: 'state', label: 'TRẠNG THÁI TCP' },
        { id: 'sock', label: 'SOCKET TẠI SERVER' },
        { id: 'timeout', label: 'CHỐNG TREO' },
        { id: 'dir', label: 'CHIỀU DỮ LIỆU' }
      ],
      legend: ['req', 'res', 'ping', 'kill'],
      goals: [
        { text: 'Phân biệt ServerSocket (chỉ lắng nghe) và Socket phiên riêng do accept() trả về', step: 0 },
        { text: 'Nắm trọn 3 bước SYN → SYN-ACK → ACK và hàng đợi backlog của nhân', step: 1 },
        { text: 'Đặt connect timeout và read timeout (SO_TIMEOUT) để client không treo vô hạn', step: 2 },
        { text: 'Dùng half-close (shutdownOutput) để báo EOF một chiều mà vẫn đọc phản hồi', step: 3 }
      ],
      steps: [
        {
          short: 'Lắng nghe kết nối',
          chapter: 'setup',
          title: 'ServerSocket mở port và chờ trong trạng thái LISTEN',
          body: [
            'Echo Server khởi tạo <code>new ServerSocket(9000)</code> để gắn vào port <code>9000</code> và gọi <code>accept()</code>. Lúc này <code>ServerSocket</code> <b>không truyền dữ liệu</b> mà chỉ đóng vai trò lễ tân nhận khách.',
            'Nhân hệ điều hành tạo sẵn hàng đợi <b>backlog</b> chứa các kết nối đang hoàn tất bắt tay.'
          ],
          metrics: {
            state: { val: 'LISTEN', level: '' },
            sock: { val: '1 ServerSocket', level: '' },
            timeout: { val: 'Chưa đặt', level: 'warn' },
            dir: { val: 'Chờ SYN', level: '' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Echo Client', { tags: [{ text: 'Chuẩn bị connect()', tone: 'paper' }] }),
              ss: D.srv(3, 3.5, ['ServerSocket'], { color: 'blue', sub: 'LISTEN :9000', tags: [{ text: 'Chỉ nhận kết nối', tone: 'blue' }] }),
              q: D.queue(3, -3.5, 'Kernel Backlog Queue', { n: 0, slots: 5, color: 'gray' })
            },
            links: {
              ss_q: D.link('ss', 'q', { label: 'Chờ accept()', dashed: true })
            },
            flows: []
          }
        },
        {
          short: 'Bắt tay 3 bước',
          chapter: 'technique',
          title: 'SYN → SYN-ACK → ACK và accept() trả về Socket riêng',
          body: [
            'Client gọi <code>connect()</code>: nhân gửi <code>SYN</code>, server đáp <code>SYN-ACK</code>, client xác nhận <code>ACK</code>. Kết nối hoàn tất vào hàng đợi <code>ESTABLISHED</code>.',
            'Lúc này <code>accept()</code> mới lấy kết nối ra và trả về một đối tượng <b><code>Socket</code> mới</b> trao đổi dữ liệu trực tiếp với client, còn <code>ServerSocket</code> quay lại tiếp tục lắng nghe.'
          ],
          callout: {
            kind: 'insight',
            text: '<code>ServerSocket</code> chỉ giữ vai trò lắng nghe; mọi byte echo đi qua đối tượng <code>Socket</code> phiên riêng gắn với đúng cặp 4-tuple của client.'
          },
          changes: [
            '+ Hoàn tất bắt tay 3 bước SYN / SYN-ACK / ACK',
            '+ accept() trả về Socket phiên làm việc độc lập'
          ],
          metrics: {
            state: { val: 'ESTABLISHED', level: 'good' },
            sock: { val: 'ServerSocket + 1 Socket', level: 'good' },
            timeout: { val: 'Mặc định 21 s OS', level: 'warn' },
            dir: { val: 'Song công (Full-duplex)', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Client Socket', { tags: [{ text: 'ESTABLISHED', tone: 'green' }] }),
              ss: D.srv(0, 5, ['ServerSocket'], { color: 'gray', sub: 'Tiếp tục LISTEN :9000' }),
              worker: D.srv(10, 0, ['Session Socket'], { color: 'green', sub: 'Trả về từ accept()', tags: [{ text: 'Trao đổi dữ liệu trực tiếp', tone: 'green' }] })
            },
            links: {
              c_w: D.link('cli', 'worker', { label: 'SYN / ACK + Dữ liệu', tone: 'green' }),
              ss_w: D.link('ss', 'worker', { label: 'accept() tạo ra', dashed: true })
            },
            flows: [
              D.flow(['c_w'], { rate: 2.0, kind: 'req' }),
              D.flow(['c_w'], { rate: 1.5, kind: 'res' })
            ]
          }
        },
        {
          short: 'Timeout chống treo',
          chapter: 'problem',
          title: 'Server im lặng hoặc từ chối: cần connect timeout và SO_TIMEOUT',
          body: [
            'Nếu không đặt thời hạn, lời gọi <code>connect()</code> tới địa chỉ không phản hồi có thể treo tới 21 giây (Windows), còn <code>read()</code> khi server đứng hình sẽ <b>treo vô hạn</b>.',
            'Cần gọi <code>socket.connect(addr, 3000)</code> và <code>socket.setSoTimeout(2000)</code> để nhận <code>SocketTimeoutException</code> kịp thời thay vì làm kẹt toàn bộ ứng dụng.'
          ],
          callout: {
            kind: 'warn',
            text: 'Lưu ý: <code>SO_TIMEOUT</code> đo khoảng lặng giữa hai lần nhận dữ liệu. Một server rỉ ra 1 byte mỗi giây sẽ không kích hoạt <code>SO_TIMEOUT</code> 2 giây — cần thêm tổng hạn thời gian (deadline).'
          },
          changes: [
            '+ connect(endpoint, 3000) giới hạn thời gian bắt tay',
            '+ setSoTimeout(2000) chặn read() treo vô hạn'
          ],
          metrics: {
            state: { val: 'TIMEOUT / REFUSED', level: 'bad' },
            sock: { val: 'Bị chặn nếu thiếu hạn', level: 'warn' },
            timeout: { val: 'Connect 3s · Read 2s', level: 'good' },
            dir: { val: 'Ngắt an toàn', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Echo Client', { tags: [{ text: 'SO_TIMEOUT = 2 s', tone: 'amber' }] }),
              guard: D.block(0, 0, { color: 'amber', glyph: 'shield', label: ['Bộ đếm Timeout'], sub: 'SocketTimeoutException' }),
              hang: D.srv(11, 0, ['Server bị treo'], { color: 'red', heat: 0.85, sub: 'Không gửi phản hồi', tags: [{ text: 'Im lặng > 2 s', tone: 'red' }] })
            },
            links: {
              c_g: D.link('cli', 'guard', { label: 'read() có hẹn giờ' }),
              g_h: D.link('guard', 'hang', { label: 'Mất phản hồi', tone: 'red', fail: 0.7 })
            },
            flows: [D.flow(['c_g', 'g_h'], { rate: 1.6, kind: 'kill', fail: 0.7 })]
          }
        },
        {
          short: 'Half-Close gửi file',
          chapter: 'summary',
          title: 'Half-Close: shutdownOutput() báo hết dữ liệu mà vẫn đọc tiếp',
          body: [
            'Trong Echo Client chế độ gửi cả tệp (Stevens UNP §6.6), nếu gọi <code>close()</code> ngay sau khi gửi xong thì chiều đọc cũng bị đóng — client mất phần phản hồi còn đang bay về.',
            'Gọi <code>socket.shutdownOutput()</code> chỉ gửi gói <code>FIN</code> đóng chiều ghi (server nhận <code>EOF = -1</code>), trong khi chiều đọc vẫn mở để nhận nốt toàn bộ dữ liệu echo về rồi mới đóng hẳn.'
          ],
          metrics: {
            state: { val: 'FIN_WAIT_2 (Half-Close)', level: 'good' },
            sock: { val: 'Đóng ghi · Mở đọc', level: 'good' },
            timeout: { val: 'Đủ hạn 2 s', level: 'good' },
            dir: { val: 'Server → Client còn mở', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Echo Client', { tags: [{ text: 'shutdownOutput() → FIN', tone: 'violet' }] }),
              srv: D.srv(10, 0, ['Echo Server'], { color: 'green', sub: 'Đọc thấy EOF (-1)', tags: [{ text: 'Trả nốt dữ liệu rồi FIN', tone: 'green' }] })
            },
            links: {
              c_s: D.link('cli', 'srv', { label: 'Chiều ghi: đã gửi FIN', dashed: true, tone: 'gray' }),
              s_c: D.link('srv', 'cli', { label: 'Chiều đọc: vẫn nhận echo', tone: 'green' })
            },
            flows: [D.flow(['s_c'], { rate: 2.0, kind: 'res' })]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 2 — 4. WEB SERVER ĐA LUỒNG: TUẦN TỰ → POOL → VIRTUAL THREAD
     * ======================================================================== */
    {
      id: 'tcp-concurrency',
      ch: 2,
      videos: ['V10', 'V11', 'V12', 'V13', 'V14'],
      videoHref: '../V13/index.html',
      videoTitle: 'Đa luồng: Executor, thread pool và virtual thread',
      title: 'Web Server: Tuần tự → Thread Pool → Virtual Thread',
      summary: 'Từ web server tuần tự nghẽn cổ chai, qua race condition và thread pool tới 10 000 kết nối bằng Virtual Thread (Java 21).',
      minutes: 9,
      level: 'Trung bình',
      ref: 'Chương 2 · Đa luồng và khả năng phục vụ đồng thời',
      metrics: [
        { id: 'conn', label: 'KẾT NỐI ĐỒNG THỜI' },
        { id: 'wait', label: 'CHỜ PHẢN HỒI' },
        { id: 'ram', label: 'CHI PHÍ THREAD' },
        { id: 'safe', label: 'ĐỒNG BỘ HÓA' }
      ],
      legend: ['req', 'res', 'heavy'],
      goals: [
        { text: 'Thấy rõ nhược điểm của server tuần tự khi một client chậm chặn toàn bộ hàng chờ', step: 0 },
        { text: 'Nhận diện race condition trên biến đếm dùng chung và cách khóa critical section', step: 1 },
        { text: 'Hiểu ExecutorService (Thread Pool) giới hạn số thread hệ điều hành để tránh cạn RAM', step: 2 },
        { text: 'So sánh Virtual Thread (JEP 444) chạy 200 kết nối giữ 1 s chỉ mất ~1,2 s trên 8 lõi', step: 3 }
      ],
      steps: [
        {
          short: 'Server tuần tự',
          chapter: 'problem',
          title: 'Một client chậm giữ kết nối khiến mọi client sau chờ 4 giây',
          body: [
            'Ở web server tuần tự, một vòng lặp duy nhất vừa <code>accept()</code> vừa đọc/ghi trọn phiên làm việc của từng client.',
            'Khi Client #1 chậm 4 giây, Client #2 dù chỉ tải tệp <code>index.html</code> nhỏ xíu vẫn phải nằm chờ trong hàng đợi backlog cho tới khi Client #1 xong hẳn.'
          ],
          metrics: {
            conn: { val: '1 kết nối / lúc', level: 'bad' },
            wait: { val: '3 983 ms', level: 'bad' },
            ram: { val: '1 OS thread', level: 'good' },
            safe: { val: 'Không tranh chấp', level: 'good' }
          },
          scene: {
            entities: {
              c1: D.dev(-11, 3.5, 'Client #1 (chậm 4 s)', { tags: [{ text: 'Đang chiếm server', tone: 'red' }] }),
              c2: D.dev(-11, -3.5, 'Client #2 (nhanh)', { tags: [{ text: 'Bị chờ 3 983 ms!', tone: 'amber' }] }),
              srv: D.srv(6, 0, ['Web Server Tuần tự'], { color: 'red', heat: 0.8, sub: '1 thread duy nhất', cpu: 0.95 })
            },
            links: {
              l1: D.link('c1', 'srv', { label: 'Giữ kết nối 4 s', tone: 'red' }),
              l2: D.link('c2', 'srv', { label: 'Chờ trong backlog', dashed: true, tone: 'amber' })
            },
            flows: [D.flow(['l1'], { rate: 0.8, kind: 'heavy' })]
          }
        },
        {
          short: 'Đa luồng & Race',
          chapter: 'problem',
          title: 'Tách thread riêng cho mỗi kết nối — nhưng cẩn thận Race Condition',
          body: [
            'Mỗi kết nối mới được giao cho một worker thread xử lý song song: Client #2 chỉ còn mất <b>3 ms</b> thay vì gần 4 giây.',
            'Tuy nhiên, nếu các thread cùng tăng bộ đếm lượt truy cập <code>count++</code> mà không có <code>synchronized</code> hoặc <code>AtomicLong</code>, thao tác đọc–cộng–ghi đè lẫn nhau làm hụt hàng trăm nghìn lượt.'
          ],
          callout: {
            kind: 'warn',
            text: 'Bảo vệ <b>critical section</b> bằng <code>synchronized</code>, <code>ReentrantLock</code> hoặc <code>AtomicLong</code>; với hàng đợi producer–consumer dùng <code>BlockingQueue</code> thay vì tự viết <code>wait/notify</code>.'
          },
          changes: [
            '+ Phản hồi Client #2 giảm từ 3 983 ms → 3 ms',
            '! Cần đồng bộ hóa tài nguyên dùng chung để tránh mất lượt đếm'
          ],
          metrics: {
            conn: { val: 'Song song', level: 'good' },
            wait: { val: '3 ms', level: 'good' },
            ram: { val: '~1 MB / OS thread', level: 'warn' },
            safe: { val: 'Cần Atomic / Lock', level: 'warn' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -8, -3, 3, 6, 'Nhiều client'),
              t1: D.srv(0, 4, ['Worker Thread 1'], { color: 'blue', sub: 'count++' }),
              t2: D.srv(0, -4, ['Worker Thread 2'], { color: 'blue', sub: 'count++' }),
              cnt: D.block(11, 0, { color: 'amber', glyph: 'lock', label: ['Bộ đếm chung'], sub: 'AtomicLong / synchronized', tags: [{ text: 'Critical section', tone: 'amber' }] })
            },
            links: {
              c_1: D.link('cli', 't1', { label: 'HTTP GET' }),
              c_2: D.link('cli', 't2', { label: 'HTTP GET' }),
              t1_c: D.link('t1', 'cnt', { label: 'Cập nhật an toàn', tone: 'green' }),
              t2_c: D.link('t2', 'cnt', { label: 'Cập nhật an toàn', tone: 'green' })
            },
            flows: [
              D.flow(['c_1', 't1_c'], { rate: 1.6, kind: 'req' }),
              D.flow(['c_2', 't2_c'], { rate: 1.6, kind: 'req' })
            ]
          }
        },
        {
          short: 'Thread Pool cố định',
          chapter: 'technique',
          title: 'ExecutorService (Pool 8 thread): Chặn bùng nổ bộ nhớ nhưng nghẽn khi chờ I/O',
          body: [
            'Tạo không giới hạn thread hệ điều hành sẽ làm cạn RAM khi hàng nghìn client đổ vào. <code>Executors.newFixedThreadPool(8)</code> giới hạn đúng 8 worker và đưa yêu cầu thừa vào hàng đợi công việc.',
            'Nhưng với tác vụ mạng chờ I/O lâu (ví dụ 200 kết nối giữ 1 giây), 8 OS thread bị chiếm cứng trong lúc chờ I/O nên mất tới <b>25,5 giây</b> để giải quyết hết.'
          ],
          changes: [
            '+ Chặn cạn RAM nhờ hàng đợi giới hạn và chính sách bão hòa',
            '~ 200 kết nối × 1 s trên pool 8 thread mất 25,5 s'
          ],
          metrics: {
            conn: { val: '200 kết nối (8 chạy)', level: 'warn' },
            wait: { val: '25,5 giây', level: 'warn' },
            ram: { val: 'Ổn định (8 OS thread)', level: 'good' },
            safe: { val: 'An toàn', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -8, -3, 3, 12, '200 kết nối đồng thời'),
              q: D.queue(-1, 0, 'Task Queue (192 chờ)', { n: 6, slots: 6, color: 'orange', tags: [{ text: 'Đầy hàng chờ I/O', tone: 'amber' }] }),
              pool: D.srv(10, 0, ['FixedThreadPool(8)'], { color: 'amber', sub: '8 OS thread đang block I/O', cpu: 0.22, tags: [{ text: 'CPU rảnh mà vẫn nghẽn!', tone: 'amber' }] })
            },
            links: {
              c_q: D.link('cli', 'q', { label: '200 request' }),
              q_p: D.link('q', 'pool', { label: 'Lấy 8 tác vụ / đợt', tone: 'amber' })
            },
            flows: [D.flow(['c_q', 'q_p'], { rate: 2.2, kind: 'heavy' })]
          }
        },
        {
          short: 'Virtual Thread (Java 21)',
          chapter: 'summary',
          title: 'Virtual Thread (JEP 444): Khi block I/O tự nhường carrier thread',
          body: [
            'Với <code>Executors.newVirtualThreadPerTaskExecutor()</code> của Java 21, mỗi kết nối vẫn viết mã blocking đơn giản nhưng chạy trên <b>virtual thread</b> siêu nhẹ do JVM lập lịch lên 8 <b>carrier thread</b>.',
            'Mỗi khi một virtual thread chờ đọc socket, JVM lập tức gỡ nó khỏi carrier để phục vụ kết nối khác: 200 kết nối giữ 1 giây hoàn tất chỉ sau <b>1,2 giây</b> (10 000 tác vụ chỉ mất 1,1 giây).'
          ],
          callout: {
            kind: 'tip',
            text: 'Virtual thread tỏa sáng cho bài toán <b>I/O-bound</b> (socket, HTTP, DB). Không tăng tốc tác vụ thuần tính toán CPU-bound và cần tránh ghim carrier (pinning) quá lâu trong khối <code>synchronized</code> chứa I/O.'
          },
          metrics: {
            conn: { val: '200 → 10 000+ kết nối', level: 'good' },
            wait: { val: '1,2 giây', level: 'good' },
            ram: { val: 'Vài KB / virtual thread', level: 'good' },
            safe: { val: 'Graceful shutdown', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -8, -3, 3, 14, '200+ kết nối đồng thời'),
              vt: D.block(0, 0, { color: 'green', glyph: 'layers', label: ['JVM Virtual Threads'], sub: 'Tự unmount khi chờ I/O', tags: [{ text: '1,2 s cho 200 kết nối', tone: 'green' }] }),
              cpu: D.srv(11, 0, ['8 Carrier Threads'], { color: 'teal', glyph: 'cpu', sub: '8 lõi CPU làm việc liên tục', cpu: 0.72 })
            },
            links: {
              c_v: D.link('cli', 'vt', { label: '1 virtual thread / client', tone: 'green' }),
              v_c: D.link('vt', 'cpu', { label: 'Ghép kênh M:N', tone: 'green' })
            },
            flows: [
              D.flow(['c_v', 'v_c'], { rate: 3.0, kind: 'req' }),
              D.flow(['v_c'], { rate: 2.2, kind: 'res' })
            ]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 3 — 5. UDP PINGER & MULTICAST
     * ======================================================================== */
    {
      id: 'udp-multicast',
      ch: 3,
      videos: ['V15', 'V16', 'V17'],
      videoHref: '../V15/index.html',
      videoTitle: 'UDP: datagram và DatagramSocket',
      title: 'UDP Datagram, Pinger & Multicast',
      summary: 'Truyền từng datagram độc lập không cần bắt tay, đo RTT, chấp nhận mất gói và phát một-tới-nhiều bằng Multicast.',
      minutes: 7,
      level: 'Cơ bản',
      ref: 'Chương 3 · UDP và Multicast',
      metrics: [
        { id: 'setup', label: 'THIẾT LẬP KẾT NỐI' },
        { id: 'bound', label: 'RANH GIỚI GÓI' },
        { id: 'loss', label: 'MẤT GÓI (PINGER)' },
        { id: 'bw', label: 'BĂNG THÔNG PHÁT' }
      ],
      legend: ['ping', 'res', 'kill', 'msg'],
      goals: [
        { text: 'Hiểu đặc tính không kết nối và giữ nguyên ranh giới datagram của UDP', step: 0 },
        { text: 'Quan sát UDP Pinger đo RTT và dùng timeout 1 giây phát hiện gói bị mất', step: 1 },
        { text: 'Thấy lãng phí băng thông khi phát video unicast cho N người xem', step: 2 },
        { text: 'Hiểu cơ chế Multicast (nhóm 224.0.0.0–239.255.255.255) và tham số TTL', step: 3 }
      ],
      steps: [
        {
          short: 'Datagram độc lập',
          chapter: 'setup',
          title: 'UDP gửi thẳng từng DatagramPacket không cần bắt tay',
          body: [
            'Khác với TCP, <code>DatagramSocket</code> không có <code>accept()</code> hay bắt tay 3 bước. Mỗi lần gọi <code>send(packet)</code> gửi đi một <b>datagram</b> độc lập mang sẵn địa chỉ IP và port đích.',
            'Một lần <code>receive()</code> nhận đúng một datagram (hoặc cắt bớt nếu buffer nhận quá nhỏ — như truy vấn SNTP 48 byte cần buffer tối thiểu 48 byte).'
          ],
          metrics: {
            setup: { val: '0 RTT (gửi ngay)', level: 'good' },
            bound: { val: 'Giữ nguyên từng gói', level: 'good' },
            loss: { val: '0% (lý tưởng)', level: 'good' },
            bw: { val: '1-tới-1', level: '' }
          },
          scene: {
            entities: {
              cli: D.dev(-10, 0, 'UDP Client', { tags: [{ text: 'DatagramPacket 48B', tone: 'blue' }] }),
              srv: D.srv(10, 0, ['SNTP / Ping Server'], { color: 'teal', sub: 'UDP port 12000', tags: [{ text: 'Không lưu trạng thái', tone: 'paper' }] })
            },
            links: {
              c_s: D.link('cli', 'srv', { label: 'Gửi thẳng datagram', tone: 'green' }),
              s_c: D.link('srv', 'cli', { label: 'Phản hồi 1 gói', dashed: true })
            },
            flows: [
              D.flow(['c_s'], { rate: 1.6, kind: 'ping' }),
              D.flow(['s_c'], { rate: 1.4, kind: 'res' })
            ]
          }
        },
        {
          short: 'UDP Pinger mất gói',
          chapter: 'problem',
          title: 'UDP Pinger: Gói mất im lặng — ứng dụng tự đặt timeout đo RTT',
          body: [
            'Trong bài toán kinh điển <b>UDP Pinger</b> (Kurose & Ross), <code>PingServer</code> chủ động bỏ khoảng 30–40% datagram (ví dụ mất Ping 1 và Ping 4) để mô phỏng mạng chập chờn.',
            'UDP không tự gửi lại; client buộc phải đặt <code>setSoTimeout(1000)</code> để kết luận gói đã mất và tiếp tục gửi gói tiếp theo mà không bị treo.'
          ],
          callout: {
            kind: 'insight',
            text: 'Không có đảm bảo đến nơi hay đúng thứ tự là <b>cố ý</b> của UDP: đổi lại độ trễ cực thấp, không bị tắc đầu hàng (head-of-line blocking) khi truyền thoại hay video thời gian thực.'
          },
          changes: [
            '! Ping #1 và Ping #4 rơi giữa đường không có thông báo lỗi',
            '+ Client bắt SocketTimeoutException sau 1 000 ms và đi tiếp'
          ],
          metrics: {
            setup: { val: '0 RTT', level: 'good' },
            bound: { val: 'Giữ nguyên', level: 'good' },
            loss: { val: '2/10 gói mất (timeout)', level: 'warn' },
            bw: { val: 'Nhẹ, không retransmit', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'PingClient', { tags: [{ text: 'Timeout = 1 000 ms', tone: 'amber' }] }),
              net: D.block(0, 0, { color: 'red', glyph: 'alert', label: ['Mạng mất gói'], sub: 'Rơi Ping #1, #4', heat: 0.55 }),
              srv: D.srv(11, 0, ['PingServer :12000'], { color: 'blue', sub: 'Trả PONG viết hoa' })
            },
            links: {
              c_n: D.link('cli', 'net', { label: '10 gói PING' }),
              n_s: D.link('net', 'srv', { label: 'Đến 8 gói', tone: 'amber', fail: 0.35 }),
              s_c: D.link('srv', 'cli', { label: 'Đo RTT ~2 ms', tone: 'green', dashed: true })
            },
            flows: [
              D.flow(['c_n', 'n_s'], { rate: 2.0, kind: 'ping', fail: 0.35 }),
              D.flow(['s_c'], { rate: 1.2, kind: 'res' })
            ]
          }
        },
        {
          short: 'Unicast quá tải',
          chapter: 'problem',
          title: 'Phát video cho nhiều người xem bằng Unicast làm nhân bản băng thông N lần',
          body: [
            'Nếu một server phát dòng video 4 Mbps tới 50 màn hình trong phòng học bằng unicast riêng lẻ, server phải gửi ra <b>50 bản sao giống hệt nhau</b> = 200 Mbps trên cùng một đường trục.',
            'Băng thông nguồn và CPU đóng gói tăng tuyến tính theo số lượng người nhận.'
          ],
          metrics: {
            setup: { val: 'N đích riêng', level: 'warn' },
            bound: { val: 'Datagram', level: 'good' },
            loss: { val: 'Tắc nghẽn đường trục', level: 'bad' },
            bw: { val: 'N × 4 Mbps (lãng phí)', level: 'bad' }
          },
          scene: {
            entities: {
              src: D.srv(-11, 0, ['Nguồn phát Video'], { color: 'red', heat: 0.85, cpu: 0.92, sub: 'Nhân bản N lần', tags: [{ text: 'Nghẽn băng thông!', tone: 'red' }] }),
              r1: D.dev(10, 5, 'Máy nhận #1'),
              r2: D.dev(10, 0, 'Máy nhận #2'),
              r3: D.dev(10, -5, 'Máy nhận #N')
            },
            links: {
              l1: D.link('src', 'r1', { label: 'Bản sao 1 (4 Mbps)', tone: 'red' }),
              l2: D.link('src', 'r2', { label: 'Bản sao 2 (4 Mbps)', tone: 'red' }),
              l3: D.link('src', 'r3', { label: 'Bản sao N (4 Mbps)', tone: 'red' })
            },
            flows: [
              D.flow(['l1'], { rate: 2.2, kind: 'heavy' }),
              D.flow(['l2'], { rate: 2.2, kind: 'heavy' }),
              D.flow(['l3'], { rate: 2.2, kind: 'heavy' })
            ]
          }
        },
        {
          short: 'Multicast & TTL',
          chapter: 'summary',
          title: 'Multicast: Nguồn gửi đúng 1 bản tới địa chỉ nhóm, router nhân bản ở nhánh cuối',
          body: [
            'Các máy nhận dùng <code>MulticastSocket.joinGroup()</code> gia nhập chung một địa chỉ nhóm (ví dụ <code>239.0.0.1</code>) trên đúng <code>NetworkInterface</code>.',
            'Nguồn phát chỉ gửi <b>1 datagram duy nhất</b> (kèm giới hạn bước nhảy <b>TTL</b> — ví dụ <code>TTL = 1</code> gói chỉ đi trong LAN nội bộ), router mạng tự nhân bản tới đúng các nhánh có thành viên đăng ký.'
          ],
          metrics: {
            setup: { val: 'joinGroup(239.0.0.1)', level: 'good' },
            bound: { val: '1 khung / datagram', level: 'good' },
            loss: { val: 'TTL = 1 (giữ trong LAN)', level: 'good' },
            bw: { val: '1 × 4 Mbps (cố định)', level: 'good' }
          },
          scene: {
            entities: {
              src: D.srv(-11, 0, ['Nguồn phát Video'], { color: 'green', cpu: 0.18, sub: 'Gửi 1 lần tới 239.0.0.1', tags: [{ text: 'TTL = 1', tone: 'green' }] }),
              rt: D.lb(0, 0, ['Switch / Router'], { color: 'teal', sub: 'Nhân bản theo nhóm IGMP' }),
              r1: D.dev(11, 5, 'Thành viên #1'),
              r2: D.dev(11, 0, 'Thành viên #2'),
              r3: D.dev(11, -5, 'Thành viên #N')
            },
            links: {
              s_r: D.link('src', 'rt', { label: '1 dòng 4 Mbps', tone: 'green' }),
              r_1: D.link('rt', 'r1', { label: 'joinGroup', tone: 'green' }),
              r_2: D.link('rt', 'r2', { label: 'joinGroup', tone: 'green' }),
              r_3: D.link('rt', 'r3', { label: 'joinGroup', tone: 'green' })
            },
            flows: [
              D.flow(['s_r', 'r_1'], { rate: 1.6, kind: 'msg' }),
              D.flow(['s_r', 'r_2'], { rate: 1.6, kind: 'msg' }),
              D.flow(['s_r', 'r_3'], { rate: 1.6, kind: 'msg' })
            ]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 3 — 6. WEBSOCKET UPGRADE & CHAT THỜI GIAN THỰC
     * ======================================================================== */
    {
      id: 'websocket-realtime',
      ch: 3,
      videos: ['V18', 'V19'],
      videoHref: '../V18/index.html',
      videoTitle: 'WebSocket: nâng cấp từ HTTP và giao tiếp hai chiều',
      title: 'WebSocket: Nâng cấp từ HTTP & Chat Hai Chiều',
      summary: 'Vì sao HTTP polling tốn header, cách nâng cấp kết nối 101 Switching Protocols (RFC 6455) và truyền frame hai chiều.',
      minutes: 7,
      level: 'Cơ bản',
      ref: 'Chương 3 · WebSocket (RFC 6455)',
      metrics: [
        { id: 'over', label: 'HEADER MỖI TIN' },
        { id: 'lat', label: 'ĐỘ TRỄ TIN NHẮN' },
        { id: 'mode', label: 'CHẾ ĐỘ KẾT NỐI' },
        { id: 'status', label: 'MÃ TRẠNG THÁI' }
      ],
      legend: ['req', 'res', 'msg', 'ping'],
      goals: [
        { text: 'Thấy sự lãng phí của HTTP polling khi client liên tục hỏi "có tin mới chưa?"', step: 0 },
        { text: 'Hiểu cơ chế HTTP Upgrade với Sec-WebSocket-Key và phản hồi 101 Switching Protocols', step: 1 },
        { text: 'Quan sát server chủ động đẩy frame hai chiều tức thì cho cả phòng chat', step: 2 },
        { text: 'Biết cách giữ kết nối sống bằng frame Ping/Pong và đóng gọn bằng Close frame', step: 3 }
      ],
      steps: [
        {
          short: 'Giới hạn HTTP Polling',
          chapter: 'problem',
          title: 'HTTP truyền thống: Server không thể tự đẩy tin — Client phải hỏi liên tục',
          body: [
            'Trong HTTP/1.1 thuần túy, chỉ client mới được chủ động gửi request. Muốn cập nhật tin nhắn chat, trình duyệt phải gọi <code>GET /messages</code> mỗi 1 giây.',
            'Hàng trăm byte HTTP header lặp đi lặp lại trên mỗi lần hỏi rỗng, tạo tải thừa cho server và độ trễ trung bình 0,5–1 giây.'
          ],
          metrics: {
            over: { val: '~600 B / lần hỏi', level: 'bad' },
            lat: { val: '500–1 000 ms', level: 'warn' },
            mode: { val: 'Request / Response', level: 'warn' },
            status: { val: '200 OK (rỗng)', level: 'warn' }
          },
          scene: {
            entities: {
              cli: D.dev(-10, 0, 'Trình duyệt Chat', { tags: [{ text: 'Hỏi mỗi 1 giây', tone: 'amber' }] }),
              srv: D.srv(10, 0, ['HTTP Server'], { color: 'amber', cpu: 0.78, sub: '95% request trả rỗng' })
            },
            links: {
              q: D.link('cli', 'srv', { label: 'GET /messages (600B header)', tone: 'amber' }),
              r: D.link('srv', 'cli', { label: '200 OK []', dashed: true })
            },
            flows: [
              D.flow(['q'], { rate: 2.8, kind: 'req' }),
              D.flow(['r'], { rate: 2.4, kind: 'res' })
            ]
          }
        },
        {
          short: 'Bắt tay Upgrade 101',
          chapter: 'technique',
          title: 'HTTP Upgrade: Nâng cấp đúng kết nối TCP sẵn có sang WebSocket',
          body: [
            'Client gửi một yêu cầu HTTP/1.1 mang header <code>Upgrade: websocket</code> và khóa ngẫu nhiên <code>Sec-WebSocket-Key</code>.',
            'Server ghép khóa đó với chuỗi GUID chuẩn của RFC 6455, băm <code>SHA-1</code> + <code>Base64</code> để trả về <code>101 Switching Protocols</code> kèm <code>Sec-WebSocket-Accept</code>. Từ đây kết nối chuyển sang giao thức WebSocket.'
          ],
          changes: [
            '+ Dùng chung port 80/443 đi qua firewall dễ dàng',
            '+ Đổi giao thức ngay trên socket TCP đang mở (101 Switching Protocols)'
          ],
          metrics: {
            over: { val: '1 lần bắt tay HTTP', level: 'good' },
            lat: { val: '1 RTT nâng cấp', level: 'good' },
            mode: { val: 'Upgrade → WebSocket', level: 'good' },
            status: { val: '101 Switching Protocols', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'WebSocket Client', { tags: [{ text: 'Sec-WebSocket-Key', tone: 'blue' }] }),
              hs: D.block(0, 0, { color: 'violet', glyph: 'shield', label: ['RFC 6455 Upgrade'], sub: 'SHA-1 + Base64' }),
              srv: D.srv(11, 0, ['Chat Server'], { color: 'green', sub: '101 Switching Protocols' })
            },
            links: {
              c_h: D.link('cli', 'hs', { label: 'GET /chat Upgrade' }),
              h_s: D.link('hs', 'srv', { label: 'Xác thực khóa' }),
              s_c: D.link('srv', 'cli', { label: '101 Sec-WebSocket-Accept', tone: 'green', dashed: true })
            },
            flows: [
              D.flow(['c_h', 'h_s'], { rate: 1.5, kind: 'req' }),
              D.flow(['s_c'], { rate: 1.5, kind: 'res' })
            ]
          }
        },
        {
          short: 'Frame hai chiều tức thì',
          chapter: 'technique',
          title: 'Song công thực sự: Server đẩy tin nhắn tới mọi thành viên phòng chat',
          body: [
            'Sau khi nâng cấp, hai bên trao đổi các <b>frame WebSocket</b> gọn nhẹ (header chỉ <b>2–14 byte</b>, chiều client → server có mask 4 byte chống đầu độc proxy cache).',
            'Khi người dùng A gửi một tin, Chat Server lập tức duyệt tập phiên đang mở và đẩy thẳng frame tới B và C với độ trễ chỉ vài mili giây.'
          ],
          metrics: {
            over: { val: '2–14 byte / frame', level: 'good' },
            lat: { val: '< 15 ms (tức thì)', level: 'good' },
            mode: { val: 'Song công (Full-duplex)', level: 'good' },
            status: { val: 'OPEN', level: 'good' }
          },
          scene: {
            entities: {
              a: D.dev(-11, 0, 'Người dùng A', { tags: [{ text: 'Frame 6B header (masked)', tone: 'blue' }] }),
              hub: D.srv(0, 0, ['Chat Room Server'], { color: 'green', sub: 'ConcurrentHashMap phiên' }),
              b: D.dev(11, 4, 'Người dùng B'),
              c: D.dev(11, -4, 'Người dùng C')
            },
            links: {
              a_h: D.link('a', 'hub', { label: 'Text Frame: "Chào lớp"', tone: 'green' }),
              h_b: D.link('hub', 'b', { label: 'Push ngay lập tức', tone: 'green' }),
              h_c: D.link('hub', 'c', { label: 'Push ngay lập tức', tone: 'green' })
            },
            flows: [
              D.flow(['a_h', 'h_b'], { rate: 2.0, kind: 'msg' }),
              D.flow(['a_h', 'h_c'], { rate: 2.0, kind: 'msg' })
            ]
          }
        },
        {
          short: 'Ping/Pong & Đóng gọn',
          chapter: 'summary',
          title: 'Duy trì kết nối đường dài bằng Ping/Pong và phát hiện ngắt nửa chừng',
          body: [
            'Kết nối WebSocket mở lâu có thể bị NAT hoặc proxy cắt im lặng khi không có tin nhắn. Server định kỳ gửi <b>Ping frame</b> và yêu cầu client trả <b>Pong frame</b> để giữ sống và phát hiện phiên chết.',
            'Khi người dùng rời phòng, hai bên gửi <b>Close frame</b> kèm mã trạng thái chuẩn (ví dụ <code>1000 Normal Closure</code>) để giải phóng tài nguyên sạch sẽ.'
          ],
          metrics: {
            over: { val: '2 byte Ping/Pong', level: 'good' },
            lat: { val: 'Giám sát sức khỏe', level: 'good' },
            mode: { val: 'Keep-alive + Clean Close', level: 'good' },
            status: { val: '1000 Normal', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-10, 0, 'WebSocket Client', { tags: [{ text: 'Tự trả Pong + Reconnect', tone: 'green' }] }),
              srv: D.srv(10, 0, ['Chat Server'], { color: 'teal', sub: 'Heartbeat định kỳ 30 s', tags: [{ text: 'Dọn phiên chết', tone: 'paper' }] })
            },
            links: {
              ping: D.link('srv', 'cli', { label: 'Ping frame (0x9)', tone: 'green' }),
              pong: D.link('cli', 'srv', { label: 'Pong frame (0xA)', dashed: true })
            },
            flows: [
              D.flow(['ping'], { rate: 1.5, kind: 'ping' }),
              D.flow(['pong'], { rate: 1.5, kind: 'res' })
            ]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 3 — 7. HTTP/1.1 → HTTP/2 MULTIPLEXING → HTTP/3 QUIC
     * ======================================================================== */
    {
      id: 'http2-http3-quic',
      ch: 3,
      videos: ['V20', 'V21'],
      videoHref: '../V20/index.html',
      videoTitle: 'HTTP/2: binary framing và multiplexing',
      title: 'Tiến hóa HTTP: HTTP/1.1 → HTTP/2 → HTTP/3 (QUIC)',
      summary: 'Giải bài toán tắc đầu hàng ở tầng ứng dụng bằng HTTP/2 multiplexing và triệt tiêu tắc đầu hàng ở tầng TCP bằng QUIC trên UDP.',
      minutes: 8,
      level: 'Trung bình',
      ref: 'Chương 3 · HTTP/2 (RFC 9113) & HTTP/3 (RFC 9000/9114)',
      metrics: [
        { id: 'conn', label: 'SỐ KẾT NỐI' },
        { id: 'hol', label: 'TẮC ĐẦU HÀNG (HOL)' },
        { id: 'hs', label: 'BẮT TAY KẾT NỐI' },
        { id: 'mig', label: 'ĐỔI MẠNG WIFI→4G' }
      ],
      legend: ['req', 'res', 'msg', 'kill'],
      goals: [
        { text: 'Hiểu vì sao HTTP/1.1 phải mở 6 kết nối TCP song song để tránh chờ tuần tự', step: 0 },
        { text: 'Nắm cơ chế binary framing, stream ID và multiplexing của HTTP/2 trên 1 kết nối TCP', step: 1 },
        { text: 'Nhận diện tắc đầu hàng tầng TCP khi 1 gói tin bị mất chặn toàn bộ các stream HTTP/2', step: 2 },
        { text: 'Hiểu cách QUIC (HTTP/3 trên UDP) cô lập từng stream, giảm bắt tay và giữ phiên bằng Connection ID', step: 3 }
      ],
      steps: [
        {
          short: 'HTTP/1.1 tuần tự',
          chapter: 'problem',
          title: 'HTTP/1.1: Một yêu cầu chậm chặn cả kết nối TCP',
          body: [
            'Trên một kết nối HTTP/1.1, request sau phải chờ request trước nhận xong phản hồi (Application-level Head-of-Line Blocking).',
            'Trình duyệt buộc phải mở <b>6 kết nối TCP song song</b> tới cùng một host — tốn 6 lần bắt tay TCP + TLS và lặp lại header văn bản cồng kềnh.'
          ],
          metrics: {
            conn: { val: '6 TCP / host', level: 'warn' },
            hol: { val: 'Tắc ở tầng HTTP', level: 'bad' },
            hs: { val: 'TCP + TLS (2–3 RTT)', level: 'warn' },
            mig: { val: 'Đứt kết nối', level: 'bad' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Trình duyệt'),
              pipe: D.queue(0, 0, '1 Kết nối TCP (tuần tự)', { n: 5, slots: 6, color: 'red', tags: [{ text: 'JS nặng chặn CSS & ảnh', tone: 'red' }] }),
              srv: D.srv(11, 0, ['Web Server HTTP/1.1'], { color: 'amber', sub: 'Trả lần lượt từng tệp' })
            },
            links: {
              c_p: D.link('cli', 'pipe', { label: 'GET app.js → style.css' }),
              p_s: D.link('pipe', 'srv', { label: 'Chờ từng phản hồi', tone: 'red' })
            },
            flows: [D.flow(['c_p', 'p_s'], { rate: 1.4, kind: 'heavy' })]
          }
        },
        {
          short: 'HTTP/2 Multiplexing',
          chapter: 'technique',
          title: 'HTTP/2: Chia nhỏ thành Binary Frame và ghép kênh nhiều stream trên 1 TCP',
          body: [
            'HTTP/2 giữ nguyên ngữ nghĩa GET/POST nhưng thay định dạng văn bản bằng <b>lớp khung nhị phân (binary framing)</b> và nén header bằng <b>HPACK</b>.',
            'Nhiều <b>stream</b> mang ID riêng (<code>Stream 1</code>, <code>Stream 3</code>, <code>Stream 5</code>) xen kẽ các frame trên <b>một kết nối TCP duy nhất</b> — giải quyết triệt để tắc đầu hàng ở tầng ứng dụng.'
          ],
          changes: [
            '+ Nén header HPACK giảm kích thước đáng kể',
            '+ Multiplexing nhiều tài nguyên song song trên 1 kết nối TCP'
          ],
          metrics: {
            conn: { val: '1 TCP duy nhất', level: 'good' },
            hol: { val: 'Hết tắc tầng HTTP', level: 'good' },
            hs: { val: 'TCP + TLS (2 RTT)', level: 'warn' },
            mig: { val: 'Đứt khi đổi IP', level: 'warn' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'HttpClient HTTP/2', { tags: [{ text: 'HPACK nén header', tone: 'green' }] }),
              mux: D.block(0, 0, { color: 'green', glyph: 'layers', label: ['Binary Framing'], sub: 'Stream 1 · 3 · 5 xen kẽ', tags: [{ text: '1 TCP duy nhất', tone: 'green' }] }),
              srv: D.srv(11, 0, ['Web Server HTTP/2'], { color: 'blue', sub: 'Giải mã theo Stream ID' })
            },
            links: {
              c_m: D.link('cli', 'mux', { label: 'Frame S1, S3, S5', tone: 'green' }),
              m_s: D.link('mux', 'srv', { label: 'Multiplexing trên 1 TCP', tone: 'green' })
            },
            flows: [
              D.flow(['c_m', 'm_s'], { rate: 2.6, kind: 'req' }),
              D.flow(['m_s'], { rate: 2.0, kind: 'msg' })
            ]
          }
        },
        {
          short: 'Tắc tầng TCP của HTTP/2',
          chapter: 'problem',
          title: 'Khi mạng mất 1 gói TCP: Toàn bộ stream HTTP/2 phải đứng chờ',
          body: [
            'Vì tầng dưới vẫn là <b>TCP</b> — giao thức bắt buộc giao byte theo đúng thứ tự toàn cục — chỉ cần 1 gói tin của <code>Stream 1</code> bị rơi trên mạng di động yếu, nhân hệ điều hành sẽ giữ lại tất cả các gói đến sau của <code>Stream 3</code> và <code>Stream 5</code>.',
            'Đây là <b>TCP Head-of-Line Blocking</b>: HTTP/2 không thể tự vượt qua giới hạn của TCP.'
          ],
          callout: {
            kind: 'warn',
            text: 'Trên mạng mất gói 2–5% (4G/Wi-Fi yếu), HTTP/2 chạy trên 1 kết nối TCP đôi khi còn chậm hơn cả 6 kết nối TCP của HTTP/1.1.'
          },
          metrics: {
            conn: { val: '1 TCP (mất 1 gói)', level: 'bad' },
            hol: { val: 'Tắc ở tầng TCP!', level: 'bad' },
            hs: { val: '2 RTT', level: 'warn' },
            mig: { val: 'Đứt khi đổi IP', level: 'bad' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Thiết bị di động', { tags: [{ text: 'Mạng 4G mất gói', tone: 'red' }] }),
              tcp: D.block(0, 0, { color: 'red', heat: 0.85, glyph: 'alert', label: ['TCP Buffer bị chặn'], sub: 'Mất gói S1 → giữ cả S3, S5', tags: [{ text: 'TCP HOL Blocking', tone: 'red' }] }),
              srv: D.srv(11, 0, ['Web Server HTTP/2'], { color: 'amber', sub: 'Chờ truyền lại gói S1' })
            },
            links: {
              c_t: D.link('cli', 'tcp', { label: 'Mất 1 segment TCP', tone: 'red', fail: 0.45 }),
              t_s: D.link('tcp', 'srv', { label: 'S3, S5 bị giữ chờ', dashed: true, tone: 'red' })
            },
            flows: [D.flow(['c_t'], { rate: 2.0, kind: 'kill', fail: 0.45 })]
          }
        },
        {
          short: 'HTTP/3 trên QUIC',
          chapter: 'summary',
          title: 'QUIC (HTTP/3 trên UDP): Stream độc lập, 1-RTT/0-RTT và Connection Migration',
          body: [
            '<b>QUIC</b> xây dựng cơ chế tin cậy, kiểm soát tắc nghẽn và tích hợp sẵn <b>TLS 1.3</b> ngay trên <b>UDP</b>. Mỗi stream có thứ tự riêng: mất gói ở <code>Stream 1</code> không hề chặn <code>Stream 3</code> và <code>Stream 5</code>.',
            'Hơn nữa, QUIC định danh phiên bằng <b>Connection ID</b> thay vì 4-tuple IP/port, nên điện thoại chuyển từ Wi-Fi sang 4G vẫn giữ nguyên kết nối không phải bắt tay lại.'
          ],
          metrics: {
            conn: { val: 'QUIC trên UDP :443', level: 'good' },
            hol: { val: 'Không còn HOL!', level: 'good' },
            hs: { val: '1-RTT (0-RTT nối lại)', level: 'good' },
            mig: { val: 'Giữ phiên (Conn ID)', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'HTTP/3 Client', { tags: [{ text: 'Wi-Fi → 4G mượt mà', tone: 'green' }] }),
              s1: D.block(0, 4.5, { color: 'amber', glyph: 'wifi', label: ['QUIC Stream 1'], sub: 'Truyền lại riêng S1' }),
              s2: D.block(0, -4.5, { color: 'green', glyph: 'wifi', label: ['QUIC Stream 3 & 5'], sub: 'Chạy tiếp không chờ!', tags: [{ text: 'Độc lập theo stream', tone: 'green' }] }),
              srv: D.srv(11, 0, ['HTTP/3 Server'], { color: 'green', sub: 'TLS 1.3 tích hợp · QPACK' })
            },
            links: {
              c_1: D.link('cli', 's1', { label: 'Mất gói chỉ ảnh hưởng S1', tone: 'amber', fail: 0.3 }),
              c_2: D.link('cli', 's2', { label: 'UDP + Conn ID', tone: 'green' }),
              s2_srv: D.link('s2', 'srv', { label: 'Giao ngay không nghẽn', tone: 'green' }),
              s1_srv: D.link('s1', 'srv', { label: 'Retransmit riêng S1', dashed: true })
            },
            flows: [
              D.flow(['c_2', 's2_srv'], { rate: 2.6, kind: 'res' }),
              D.flow(['c_1', 's1_srv'], { rate: 1.2, kind: 'ping', fail: 0.3 })
            ]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 4 — 8. TIẾN HÓA LỜI GỌI TỪ XA: RMI → REST → gRPC
     * ======================================================================== */
    {
      id: 'rpc-rest-grpc',
      ch: 4,
      videos: ['V22', 'V23', 'V24', 'V25', 'V26', 'V27'],
      videoHref: '../V26/index.html',
      videoTitle: 'gRPC: Protocol Buffers và lời gọi unary',
      title: 'Lời gọi từ xa: RMI → REST → gRPC Streaming',
      summary: 'So sánh Java RMI (đồng nhất ngôn ngữ), REST/JSON (mở cho web) và gRPC/Protobuf trên HTTP/2 (hợp đồng chặt, streaming).',
      minutes: 9,
      level: 'Trung bình',
      ref: 'Chương 4 · RPC, RMI, REST và gRPC',
      metrics: [
        { id: 'fmt', label: 'ĐỊNH DẠNG DỮ LIỆU' },
        { id: 'contract', label: 'HỢP ĐỒNG API' },
        { id: 'lang', label: 'ĐA NGÔN NGỮ' },
        { id: 'stream', label: 'KIỂU GỌI' }
      ],
      legend: ['req', 'res', 'msg'],
      goals: [
        { text: 'Hiểu cơ chế Stub/Skeleton của Java RMI và bài toán idempotency khi gọi lại', step: 0 },
        { text: 'Phân biệt tư duy tài nguyên (Resource + HTTP method + JSON) của REST (Petstore)', step: 1 },
        { text: 'Thấy sức mạnh hợp đồng .proto và mã hóa nhị phân varint của gRPC (RouteGuide)', step: 2 },
        { text: 'Phân biệt 4 chế độ gRPC (Unary, Server/Client/Bidirectional Streaming) kèm Deadline', step: 3 }
      ],
      steps: [
        {
          short: 'Java RMI & Idempotency',
          chapter: 'setup',
          title: 'Java RMI: Gọi phương thức từ xa qua Stub như đối tượng nội bộ',
          body: [
            'Client tra <b>RMI Registry</b> lấy <b>Stub</b> của đối tượng từ xa <code>BankAccount</code> rồi gọi <code>transfer()</code>. Stub tự đóng gói tham số bằng Java Serialization gửi sang server.',
            'Nhưng lời gọi qua mạng có thể mất phản hồi: gọi lại <code>transfer()</code> lần 2 sẽ trừ tiền hai lần trừ khi đi kèm <b>idempotency key</b> và khóa đồng bộ số dư.'
          ],
          callout: {
            kind: 'warn',
            text: 'Lời gọi từ xa <b>không bao giờ</b> giống hoàn toàn lời gọi cục bộ: mạng có thể chậm, đứt giữa chừng, và Java RMI chỉ chạy giữa các chương trình Java.'
          },
          metrics: {
            fmt: { val: 'Java Serialization', level: 'warn' },
            contract: { val: 'Interface java.rmi.Remote', level: '' },
            lang: { val: 'Chỉ Java ↔ Java', level: 'bad' },
            stream: { val: 'Unary đồng bộ', level: '' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'RMI Client', { tags: [{ text: 'Idempotency-Key', tone: 'amber' }] }),
              reg: D.srv(0, 5, ['RMI Registry'], { color: 'orange', glyph: 'search', sub: 'Tra cứu Stub :1099' }),
              srv: D.srv(11, 0, ['BankAccount Server'], { color: 'blue', sub: 'synchronized + Idempotency' })
            },
            links: {
              c_r: D.link('cli', 'reg', { label: 'lookup("Bank")', dashed: true }),
              c_s: D.link('cli', 'srv', { label: 'Stub → transfer(key, 500)' }),
              s_c: D.link('srv', 'cli', { label: 'Số dư mới', tone: 'green', dashed: true })
            },
            flows: [
              D.flow(['c_s'], { rate: 1.6, kind: 'req' }),
              D.flow(['s_c'], { rate: 1.4, kind: 'res' })
            ]
          }
        },
        {
          short: 'REST + JSON (Petstore)',
          chapter: 'technique',
          title: 'REST: Độc lập ngôn ngữ nhờ tài nguyên URL, phương thức HTTP và JSON',
          body: [
            'Thay vì RPC gắn với Java hay XML nặng nề kiểu SOAP, <b>REST</b> (ví dụ kinh điển <b>Petstore</b>) mô hình hóa tài nguyên <code>/pet/{id}</code> với ngữ nghĩa chuẩn <code>GET</code>, <code>POST</code>, <code>PUT</code>, <code>DELETE</code> và mã trạng thái HTTP.',
            'Payload <code>application/json</code> dễ đọc bằng mắt, tương thích trực tiếp với trình duyệt, ứng dụng di động và mọi ngôn ngữ.'
          ],
          changes: [
            '+ Giao tiếp mở đa ngôn ngữ trên nền HTTP chuẩn',
            '+ Tận dụng cache HTTP, mã lỗi 200/201/404/409 rõ ràng'
          ],
          metrics: {
            fmt: { val: 'JSON (UTF-8 văn bản)', level: 'good' },
            contract: { val: 'OpenAPI / RFC 9110', level: 'good' },
            lang: { val: 'Mọi nền tảng & Web', level: 'good' },
            stream: { val: 'Request / Response', level: '' }
          },
          scene: {
            entities: {
              web: D.dev(-11, 3.5, 'Web / Mobile Client'),
              py: D.dev(-11, -3.5, 'Python / curl Client'),
              api: D.srv(2, 0, ['Petstore REST API'], { color: 'green', glyph: 'gateway', sub: 'GET/POST/PUT /pet/{id}', tags: [{ text: 'Stateless + JSON', tone: 'green' }] }),
              db: D.db(12, 0, 'Pet DB', { color: 'purple' })
            },
            links: {
              w_a: D.link('web', 'api', { label: 'GET /pet/101' }),
              p_a: D.link('py', 'api', { label: 'POST /pet (JSON)' }),
              a_d: D.link('api', 'db', { label: 'CRUD', tone: 'green' })
            },
            flows: [
              D.flow(['w_a', 'a_d'], { rate: 1.8, kind: 'req' }),
              D.flow(['p_a', 'a_d'], { rate: 1.4, kind: 'msg' })
            ]
          }
        },
        {
          short: 'gRPC & Protocol Buffers',
          chapter: 'technique',
          title: 'gRPC: Hợp đồng .proto sinh mã tự động + mã hóa nhị phân siêu gọn',
          body: [
            'Trong giao tiếp nội bộ hiệu năng cao giữa các dịch vụ, JSON tốn băng thông vì lặp lại tên trường. <b>gRPC</b> (ví dụ chính thức <b>RouteGuide</b>) định nghĩa hợp đồng trong <code>route_guide.proto</code> rồi dùng <code>protoc</code> sinh stub cho Java, Go, Python, C++.',
            '<b>Protocol Buffers</b> mã hóa theo số thẻ (field tag) và số nguyên biến đổi <b>varint</b> — nhỏ hơn JSON nhiều lần và giải mã cực nhanh trên HTTP/2.'
          ],
          metrics: {
            fmt: { val: 'Protobuf nhị phân', level: 'good' },
            contract: { val: 'route_guide.proto chặt', level: 'good' },
            lang: { val: 'Sinh mã đa ngôn ngữ', level: 'good' },
            stream: { val: 'Unary trên HTTP/2', level: 'good' }
          },
          scene: {
            entities: {
              proto: D.block(-11, 4.5, { color: 'violet', glyph: 'code', label: ['route_guide.proto'], sub: 'Hợp đồng nguồn duy nhất' }),
              cli: D.srv(-11, -3, ['gRPC Client Stub'], { color: 'blue', sub: 'GetFeature(Point)' }),
              h2: D.block(0, 0, { color: 'teal', glyph: 'layers', label: ['Protobuf + HTTP/2'], sub: 'Nhị phân varint', tags: [{ text: 'Gọn & kiểm kiểu lúc biên dịch', tone: 'green' }] }),
              srv: D.srv(11, 0, ['RouteGuide Server'], { color: 'green', sub: '8 địa danh Hà Nội' })
            },
            links: {
              pr_c: D.link('proto', 'cli', { label: 'protoc sinh stub', dashed: true }),
              c_h: D.link('cli', 'h2', { label: 'Point(lat, lon)', tone: 'green' }),
              h_s: D.link('h2', 'srv', { label: 'Binary frame', tone: 'green' })
            },
            flows: [D.flow(['c_h', 'h_s'], { rate: 2.2, kind: 'req' })]
          }
        },
        {
          short: 'gRPC Streaming & Deadline',
          chapter: 'summary',
          title: 'Streaming hai chiều trên HTTP/2 và Deadline xuyên dịch vụ',
          body: [
            'Nhờ chạy trực tiếp trên HTTP/2, gRPC hỗ trợ cả 4 chế độ: <b>Unary</b> (<code>GetFeature</code>), <b>Server Streaming</b> (<code>ListFeatures</code>), <b>Client Streaming</b> (<code>RecordRoute</code>) và <b>Bidirectional Streaming</b> (<code>RouteChat</code>).',
            'Mọi lời gọi production đều phải gắn <b>Deadline</b> (mốc thời gian tối đa): nếu quá hạn, cả hai phía nhận mã chuẩn <code>DEADLINE_EXCEEDED</code> và dừng xử lý thừa.'
          ],
          metrics: {
            fmt: { val: 'Protobuf Streams', level: 'good' },
            contract: { val: '4 kiểu RPC + Status', level: 'good' },
            lang: { val: 'Đa ngôn ngữ', level: 'good' },
            stream: { val: 'Bi-directional + Deadline', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.srv(-11, 0, ['gRPC Client'], { color: 'blue', sub: 'withDeadlineAfter(2s)', tags: [{ text: 'Truyền deadline', tone: 'amber' }] }),
              s1: D.block(0, 4, { color: 'green', glyph: 'layers', label: ['Server/Client Stream'], sub: 'ListFeatures / RecordRoute' }),
              s2: D.block(0, -4, { color: 'violet', glyph: 'layers', label: ['Bidirectional Stream'], sub: 'RouteChat song công' }),
              srv: D.srv(11, 0, ['RouteGuide Server'], { color: 'green', sub: 'OK / NOT_FOUND / DEADLINE' })
            },
            links: {
              c_1: D.link('cli', 's1', { label: 'Stream điểm GPS', tone: 'green' }),
              s1_s: D.link('s1', 'srv', { label: 'Nhiều message / 1 RPC', tone: 'green' }),
              c_2: D.link('cli', 's2', { label: 'Gửi nhận đồng thời', tone: 'green' }),
              s2_s: D.link('s2', 'srv', { label: '2 chiều HTTP/2', tone: 'green' })
            },
            flows: [
              D.flow(['c_1', 's1_s'], { rate: 2.0, kind: 'req' }),
              D.flow(['c_2', 's2_s'], { rate: 2.2, kind: 'msg' })
            ]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 4 — 9. MESSAGE BROKER: RABBITMQ EXCHANGE, QUEUE & ĐƠN HÀNG
     * ======================================================================== */
    {
      id: 'rabbitmq-broker',
      ch: 4,
      videos: ['V28', 'V29'],
      videoHref: '../V28/index.html',
      videoTitle: 'Message broker: RabbitMQ, exchange, queue và binding',
      title: 'Message Broker: RabbitMQ Exchange, Queue & Ack',
      summary: 'Tách rời producer và consumer bằng RabbitMQ: Work Queue, Manual Ack chống mất việc và định tuyến Topic Exchange cho bài toán đơn hàng.',
      minutes: 8,
      level: 'Trung bình',
      ref: 'Chương 4 · Giao tiếp bất đồng bộ qua Message Broker',
      metrics: [
        { id: 'ex', label: 'LOẠI EXCHANGE' },
        { id: 'ack', label: 'XÁC NHẬN (ACK)' },
        { id: 'qos', label: 'PREFETCH (QOS)' },
        { id: 'dur', label: 'BỀN VỮNG' }
      ],
      legend: ['req', 'msg', 'res', 'kill'],
      goals: [
        { text: 'Phân biệt Producer không gửi thẳng vào Queue mà gửi qua Exchange + Routing Key', step: 0 },
        { text: 'Hiểu Manual Ack (basicAck) và Durable Queue giữ đơn hàng khi worker gặp sự cố', step: 1 },
        { text: 'Áp dụng basicQos(1) chia tải công bằng (Fair Dispatch) giữa worker nhanh và chậm', step: 2 },
        { text: 'Thiết kế Topic Exchange (order.#, order.hn.*) phục vụ đồng thời email, kho và phân tích', step: 3 }
      ],
      steps: [
        {
          short: 'Exchange → Binding → Queue',
          chapter: 'setup',
          title: 'Kiến trúc cốt lõi của AMQP: Producer chỉ biết Exchange',
          body: [
            'Trong RabbitMQ, <b>Producer</b> không bao giờ đẩy message trực tiếp vào hàng đợi. Nó gửi message kèm <code>routing key</code> tới một <b>Exchange</b>.',
            'Exchange dựa vào các luật <b>Binding</b> để sao chép hoặc định tuyến message vào đúng các <b>Queue</b> đã đăng ký.'
          ],
          metrics: {
            ex: { val: 'Direct / Fanout / Topic', level: '' },
            ack: { val: 'Đang thiết lập', level: '' },
            qos: { val: 'Mặc định', level: '' },
            dur: { val: 'Queue bền vững', level: 'good' }
          },
          scene: {
            entities: {
              pub: D.srv(-11, 0, ['Order Producer'], { color: 'blue', sub: 'publish(exchange, key)' }),
              ex: D.lb(0, 0, ['RabbitMQ Exchange'], { color: 'orange', sub: 'Khớp luật Binding' }),
              q1: D.queue(10, 4, 'orders.email', { n: 3, slots: 6, color: 'green' }),
              q2: D.queue(10, -4, 'orders.analytics', { n: 2, slots: 6, color: 'purple' })
            },
            links: {
              p_e: D.link('pub', 'ex', { label: 'Message + routing key' }),
              e_1: D.link('ex', 'q1', { label: 'Binding 1', tone: 'green' }),
              e_2: D.link('ex', 'q2', { label: 'Binding 2', tone: 'green' })
            },
            flows: [
              D.flow(['p_e', 'e_1'], { rate: 1.6, kind: 'msg' }),
              D.flow(['p_e', 'e_2'], { rate: 1.6, kind: 'msg' })
            ]
          }
        },
        {
          short: 'Manual Ack & Durable',
          chapter: 'problem',
          title: 'Worker sập giữa chừng: Manual Ack bảo đảm không mất đơn hàng',
          body: [
            'Nếu bật <code>autoAck = true</code>, RabbitMQ xóa message ngay khi vừa đẩy ra khỏi queue — worker sập giữa lúc đang gửi email là mất luôn đơn hàng.',
            'Đặt <code>autoAck = false</code> kết hợp queue <code>durable = true</code> và message <code>PERSISTENT_TEXT_PLAIN</code>: khi <code>email-1</code> chết mà chưa gọi <code>basicAck()</code>, broker tự động giao lại việc cho <code>email-2</code>.'
          ],
          callout: {
            kind: 'insight',
            text: 'Manual Ack cho bảo đảm <b>at-least-once</b>: không mất việc, nhưng consumer có thể nhận lại message cũ nên cần xử lý <b>idempotent</b>.'
          },
          changes: [
            '! Worker email-1 dừng đột ngột trước khi gọi basicAck()',
            '+ Broker tự trả message lại hàng đợi và giao cho email-2'
          ],
          metrics: {
            ex: { val: 'Work Queue', level: 'good' },
            ack: { val: 'Manual basicAck()', level: 'good' },
            qos: { val: 'Unacked bảo vệ', level: 'good' },
            dur: { val: 'Durable + Persistent', level: 'good' }
          },
          scene: {
            entities: {
              q: D.queue(-10, 0, 'task_queue (Durable)', { n: 4, slots: 6, color: 'orange', tags: [{ text: 'Giữ bản sao đĩa', tone: 'amber' }] }),
              w1: D.srv(3, 4.5, ['Worker email-1'], { color: 'red', dead: 0.85, sub: 'Sập trước khi Ack' }),
              w2: D.srv(3, -4.5, ['Worker email-2'], { color: 'green', sub: 'Nhận lại & basicAck()', tags: [{ text: 'Không mất đơn!', tone: 'green' }] })
            },
            links: {
              q_1: D.link('q', 'w1', { label: 'Mất kết nối', tone: 'red', dashed: true, fail: 0.9 }),
              q_2: D.link('q', 'w2', { label: 'Giao lại (redelivered)', tone: 'green' })
            },
            flows: [
              D.flow(['q_1'], { rate: 0.8, kind: 'kill', fail: 0.9 }),
              D.flow(['q_2'], { rate: 1.8, kind: 'msg' })
            ]
          }
        },
        {
          short: 'Fair Dispatch (QoS)',
          chapter: 'technique',
          title: 'basicQos(1): Không dồn việc vào worker đang bận xử lý đơn nặng',
          body: [
            'Mặc định RabbitMQ chia vòng tròn (round-robin) mù quáng: nếu mọi đơn lẻ đều nặng còn đơn chẵn đều nhẹ, một worker sẽ bị dồn đống còn worker kia ngồi không.',
            'Đặt <code>channel.basicQos(1)</code> báo broker chỉ giao tối đa <b>1 message chưa ack</b> cho mỗi worker — worker nào xong trước nhận việc tiếp theo ngay.'
          ],
          metrics: {
            ex: { val: 'Work Queue', level: 'good' },
            ack: { val: 'Manual Ack', level: 'good' },
            qos: { val: 'prefetchCount = 1', level: 'good' },
            dur: { val: 'Durable', level: 'good' }
          },
          scene: {
            entities: {
              q: D.queue(-10, 0, 'orders.email', { n: 3, slots: 6, color: 'orange', tags: [{ text: 'basicQos(1)', tone: 'green' }] }),
              w1: D.srv(5, 4, ['Worker chậm'], { color: 'amber', cpu: 0.9, sub: 'Đang giữ 1 việc nặng' }),
              w2: D.srv(5, -4, ['Worker nhanh'], { color: 'green', cpu: 0.45, sub: 'Rảnh → nhận ngay việc kế', tags: [{ text: 'Chia tải công bằng', tone: 'green' }] })
            },
            links: {
              q_1: D.link('q', 'w1', { label: '1 unacked (chờ)', dashed: true }),
              q_2: D.link('q', 'w2', { label: 'Đẩy việc liên tục', tone: 'green' })
            },
            flows: [D.flow(['q_2'], { rate: 2.4, kind: 'msg' })]
          }
        },
        {
          short: 'Topic Exchange đơn hàng',
          chapter: 'summary',
          title: 'Bài toán đơn hàng: Topic Exchange định tuyến linh hoạt theo mẫu khóa',
          body: [
            'Khi một đơn hàng ở Hà Nội được tạo với routing key <code>order.hn.1001</code>, <b>Topic Exchange</b> dùng ký tự đại diện <code>*</code> (1 từ) và <code>#</code> (0 hoặc nhiều từ) để phân phối đồng thời:',
            '• <code>orders.hanoi</code> (binding <code>order.hn.*</code>) xử lý kho Hà Nội · <code>orders.email</code> gửi thư xác nhận · <code>orders.analytics</code> (binding <code>order.#</code>) nhận mọi sự kiện để thống kê.'
          ],
          metrics: {
            ex: { val: 'Topic Exchange', level: 'good' },
            ack: { val: 'Manual Ack + Idempotent', level: 'good' },
            qos: { val: 'Fair Dispatch', level: 'good' },
            dur: { val: 'Tách rời hoàn toàn', level: 'good' }
          },
          scene: {
            entities: {
              pub: D.srv(-12, 0, ['Order Service'], { color: 'blue', sub: 'key = order.hn.1001' }),
              ex: D.lb(-2, 0, ['orders.topic'], { color: 'orange', sub: 'Topic Exchange' }),
              qhn: D.queue(9, 5.5, 'orders.hanoi', { n: 2, slots: 5, color: 'green', tags: [{ text: 'order.hn.*', tone: 'green' }] }),
              qem: D.queue(9, 0, 'orders.email', { n: 3, slots: 5, color: 'blue', tags: [{ text: 'order.#', tone: 'blue' }] }),
              qan: D.queue(9, -5.5, 'orders.analytics', { n: 2, slots: 5, color: 'purple', tags: [{ text: 'order.#', tone: 'violet' }] })
            },
            links: {
              p_e: D.link('pub', 'ex', { label: 'order.hn.1001' }),
              e_h: D.link('ex', 'qhn', { label: 'Khớp vùng HN', tone: 'green' }),
              e_e: D.link('ex', 'qem', { label: 'Khớp mọi đơn', tone: 'green' }),
              e_a: D.link('ex', 'qan', { label: 'Thống kê tổng', tone: 'green' })
            },
            flows: [
              D.flow(['p_e', 'e_h'], { rate: 1.6, kind: 'msg' }),
              D.flow(['p_e', 'e_e'], { rate: 1.6, kind: 'msg' }),
              D.flow(['p_e', 'e_a'], { rate: 1.6, kind: 'msg' })
            ]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 5 — 10. BẢO MẬT TLS 1.3 & CHUỖI CHỨNG CHỈ X.509
     * ======================================================================== */
    {
      id: 'tls-security',
      ch: 5,
      videos: ['V30', 'V31'],
      videoHref: '../V30/index.html',
      videoTitle: 'Bảo mật: TLS và secure socket trong Java',
      title: 'TLS 1.3 Handshake, Chuỗi Chứng Chỉ & OAuth 2.0/JWT',
      summary: 'Bảo vệ đường truyền bằng TLS 1.3 (1-RTT), xác minh chứng chỉ X.509 chống giả mạo và phân quyền API bằng JWT.',
      minutes: 8,
      level: 'Trung bình',
      ref: 'Chương 5 · Bảo mật mạng (RFC 8446, RFC 6749/7519)',
      metrics: [
        { id: 'conf', label: 'BẢO MẬT DỮ LIỆU' },
        { id: 'auth', label: 'XÁC MINH SERVER' },
        { id: 'hs', label: 'BẮT TAY TLS 1.3' },
        { id: 'perm', label: 'PHÂN QUYỀN API' }
      ],
      legend: ['req', 'res', 'kill', 'msg'],
      goals: [
        { text: 'Thấy rủi ro nghe lén trên đường truyền plaintext TCP khi thiếu TLS', step: 0 },
        { text: 'Hiểu TLS 1.3 bắt tay 1-RTT: trao đổi khóa đối xứng (ECDHE) và kiểm tra chuỗi chứng chỉ X.509', step: 1 },
        { text: 'Nhận diện 4 lỗi chứng chỉ kinh điển (expired, wrong.host, self-signed, untrusted-root)', step: 2 },
        { text: 'Kết hợp TLS (bảo vệ đường truyền) với OAuth 2.0 / JWT (xác thực và scope ở tầng ứng dụng)', step: 3 }
      ],
      steps: [
        {
          short: 'Plaintext dễ nghe lén',
          chapter: 'problem',
          title: 'TCP không mã hóa: Kẻ đứng giữa đọc trọn mật khẩu và token',
          body: [
            'Trên kết nối TCP thuần, toàn bộ HTTP header, mật khẩu đăng nhập hay chuỗi JSON đi qua mạng dưới dạng chữ rõ.',
            'Một điểm nghe lén trung gian (Tap / Wi-Fi công cộng) không chỉ đọc được dữ liệu mà còn có thể sửa đổi phản hồi trên đường truyền.'
          ],
          metrics: {
            conf: { val: 'Chữ rõ (nguy hiểm)', level: 'bad' },
            auth: { val: 'Không xác minh', level: 'bad' },
            hs: { val: 'Không có TLS', level: 'bad' },
            perm: { val: 'Lộ token nếu có', level: 'bad' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Client Java'),
              tap: D.block(0, 0, { color: 'red', heat: 0.85, glyph: 'alert', label: ['Kẻ nghe lén (MITM)'], sub: 'Đọc rõ Authorization!', tags: [{ text: 'Plaintext bị lộ', tone: 'red' }] }),
              srv: D.srv(11, 0, ['API Server :80'], { color: 'amber', sub: 'HTTP không mã hóa' })
            },
            links: {
              c_t: D.link('cli', 'tap', { label: 'GET /pet (chữ rõ)', tone: 'red' }),
              t_s: D.link('tap', 'srv', { label: 'Chuyển tiếp / sửa gói', tone: 'red' })
            },
            flows: [D.flow(['c_t', 't_s'], { rate: 1.8, kind: 'kill' })]
          }
        },
        {
          short: 'TLS 1.3 & Chuỗi X.509',
          chapter: 'technique',
          title: 'Bắt tay TLS 1.3 (1-RTT): Xác minh chuỗi chứng chỉ tới Root CA tin cậy',
          body: [
            'Khi gọi <code>https://ptit.edu.vn</code>, Client gửi <code>ClientHello</code> kèm khóa công khai tạm (ECDHE). Server trả về <code>ServerHello</code> + chứng chỉ <b>X.509</b> (ví dụ chuỗi GlobalSign) + chữ ký xác thực.',
            'JVM đối chiếu chuỗi chứng chỉ với <b>TrustStore</b> cài sẵn, kiểm tra đúng tên miền (SAN/Hostname) và hạn dùng, rồi hai bên dùng chung khóa phiên đối xứng (AES-GCM) mã hóa toàn bộ bản ghi.'
          ],
          changes: [
            '+ Mọi bản ghi qua mạng được mã hóa và gắn thẻ toàn vẹn (AEAD)',
            '+ Trao khóa ECDHE bảo đảm Forward Secrecy'
          ],
          metrics: {
            conf: { val: 'Mã hóa AES-GCM', level: 'good' },
            auth: { val: 'X.509 → Root CA', level: 'good' },
            hs: { val: '1-RTT (TLS 1.3)', level: 'good' },
            perm: { val: 'Bảo vệ đường truyền', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'SSLSocket Client', { tags: [{ text: 'TrustStore JVM', tone: 'blue' }] }),
              ca: D.block(0, 5, { color: 'violet', glyph: 'shield', label: ['Root CA Tin cậy'], sub: 'Chuỗi X.509 hợp lệ' }),
              tls: D.block(0, -1.5, { color: 'green', glyph: 'lock', label: ['Kênh mã hóa TLS 1.3'], sub: 'Khóa phiên AES-GCM' }),
              srv: D.srv(11, 0, ['ptit.edu.vn :443'], { color: 'green', sub: 'Chứng chỉ X.509 + Private Key' })
            },
            links: {
              c_ca: D.link('cli', 'ca', { label: 'Kiểm chữ ký CA', dashed: true }),
              c_t: D.link('cli', 'tls', { label: 'ClientHello (ECDHE)', tone: 'green' }),
              t_s: D.link('tls', 'srv', { label: 'Bản ghi mã hóa', tone: 'green' })
            },
            flows: [
              D.flow(['c_t', 't_s'], { rate: 2.0, kind: 'req' }),
              D.flow(['t_s'], { rate: 1.5, kind: 'res' })
            ]
          }
        },
        {
          short: 'Bốn lỗi chứng chỉ',
          chapter: 'problem',
          title: 'Ngắt kết nối ngay khi chứng chỉ hết hạn, sai tên miền hoặc tự ký lạ',
          body: [
            'Thử nghiệm với <code>badssl.com</code> cho thấy 4 lỗi bắt buộc phải chặn: <code>expired</code> (hết hạn), <code>wrong.host</code> (sai tên miền), <code>self-signed</code> (tự ký chưa tin cậy), và <code>untrusted-root</code>.',
            '<b>Tuyệt đối không tắt xác minh chứng chỉ</b> trong mã nguồn; với server tự ký khi thực hành nội bộ, hãy xuất chứng chỉ bằng <code>keytool</code> và nạp vào <code>client-trust.p12</code>.'
          ],
          callout: {
            kind: 'warn',
            text: 'Bỏ qua kiểm tra <code>TrustManager</code> hay <code>HostnameVerifier</code> khiến toàn bộ lớp mã hóa TLS trở nên vô nghĩa trước tấn công giả mạo.'
          },
          metrics: {
            conf: { val: 'Ngắt trước khi gửi tin', level: 'good' },
            auth: { val: 'Từ chối chứng chỉ lỗi', level: 'bad' },
            hs: { val: 'SSLHandshakeException', level: 'bad' },
            perm: { val: 'Không rò rỉ dữ liệu', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'TlsCheck Client'),
              chk: D.block(0, 0, { color: 'amber', glyph: 'shield', label: ['Xác minh X.509'], sub: 'Hạn · Tên miền · Chuỗi CA', tags: [{ text: 'Chặn ngay lập tức', tone: 'red' }] }),
              bad: D.srv(11, 0, ['badssl.com'], { color: 'red', heat: 0.75, sub: 'expired / wrong.host' })
            },
            links: {
              c_k: D.link('cli', 'chk', { label: 'Kiểm chứng chỉ' }),
              k_b: D.link('chk', 'bad', { label: 'SSLHandshakeException', tone: 'red', fail: 0.9 })
            },
            flows: [D.flow(['c_k', 'k_b'], { rate: 1.6, kind: 'kill', fail: 0.9 })]
          }
        },
        {
          short: 'TLS + OAuth 2.0 / JWT',
          chapter: 'summary',
          title: 'Bảo vệ hai lớp: TLS bọc đường truyền, JWT mang danh tính & scope',
          body: [
            'TLS bảo vệ đường truyền nhưng không cho server biết <b>người dùng nào</b> được phép sửa tài nguyên. Ứng dụng Petstore kết hợp <b>OAuth 2.0 + JWT</b> (ký bằng <code>RS256</code>) đặt trong header <code>Authorization: Bearer …</code>.',
            'Resource Server kiểm tra chữ ký bằng khóa công khai, kiểm tra hạn <code>exp</code> và đối chiếu quyền <code>write:pets</code> trước khi cho phép <code>PUT /pet/101</code>.'
          ],
          metrics: {
            conf: { val: 'TLS 1.3 đầu cuối', level: 'good' },
            auth: { val: 'X.509 + Chữ ký RS256', level: 'good' },
            hs: { val: 'Stateless JWT verify', level: 'good' },
            perm: { val: 'Scope write:pets', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Petstore Client', { tags: [{ text: 'Bearer JWT (RS256)', tone: 'blue' }] }),
              as: D.srv(0, 5, ['Authorization Server'], { color: 'purple', glyph: 'lock', sub: 'Cấp JWT + JWKS' }),
              rs: D.srv(11, 0, ['Petstore API (HTTPS)'], { color: 'green', glyph: 'shield', sub: 'Kiểm RS256 + scope write:pets', tags: [{ text: '200 OK', tone: 'green' }] })
            },
            links: {
              c_a: D.link('cli', 'as', { label: 'Lấy Access Token', dashed: true }),
              c_r: D.link('cli', 'rs', { label: 'HTTPS + Bearer JWT', tone: 'green' }),
              a_r: D.link('as', 'rs', { label: 'Public Key (JWKS)', dashed: true })
            },
            flows: [D.flow(['c_r'], { rate: 2.0, kind: 'req' })]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 5 — 11. NIO SELECTOR & BÀI TOÁN C10K (REACTOR)
     * ======================================================================== */
    {
      id: 'nio-selector-c10k',
      ch: 5,
      videos: ['V32', 'V33'],
      videoHref: '../V33/index.html',
      videoTitle: 'Hiệu năng: NIO, Selector và mẫu Reactor',
      title: 'NIO Selector, Non-Blocking I/O & Bài toán C10K',
      summary: 'Vì sao mô hình 1 thread/kết nối vấp bài toán C10K và cách 1 event-loop Selector + ByteBuffer quản lý hàng nghìn kênh đồng thời.',
      minutes: 8,
      level: 'Nâng cao',
      ref: 'Chương 5 · Hiệu năng mạng (java.nio & Reactor)',
      metrics: [
        { id: 'c10k', label: 'KẾT NỐI ĐỒNG THỜI' },
        { id: 'th', label: 'SỐ OS THREAD' },
        { id: 'mode', label: 'CHẾ ĐỘ KÊNH' },
        { id: 'evt', label: 'CƠ CHẾ ĐÁNH THỨC' }
      ],
      legend: ['req', 'res', 'msg', 'heavy'],
      goals: [
        { text: 'Hiểu nút thắt của bài toán C10K khi mở 10 000 OS thread đồng thời', step: 0 },
        { text: 'Nắm cơ chế Selector giám sát tập kênh không chặn (OP_ACCEPT, OP_READ, OP_WRITE)', step: 1 },
        { text: 'Hiểu vòng đời flip() / clear() của ByteBuffer khi đọc ghi không chặn', step: 2 },
        { text: 'Biết kết hợp Reactor event-loop với worker pool (hoặc CompletableFuture) cho tác vụ nặng', step: 3 }
      ],
      steps: [
        {
          short: 'Bài toán C10K',
          chapter: 'problem',
          title: '10 000 kết nối nhàn rỗi: 10 000 OS thread làm kiệt RAM và chuyển ngữ cảnh',
          body: [
            'Trong bài toán <b>C10K</b> (Kegel), phần lớn trong số 10 000 kết nối đang mở chỉ ngồi chờ người dùng gửi gói tiếp theo, không hề có dữ liệu.',
            'Nếu mỗi kết nối giữ một OS thread (~1 MB stack), server ngốn ngay ~10 GB RAM và hệ điều hành tốn tài nguyên chuyển ngữ cảnh (context switch) cho hàng nghìn thread đang ngủ.'
          ],
          metrics: {
            c10k: { val: '10 000 kết nối', level: 'warn' },
            th: { val: '10 000 OS thread', level: 'bad' },
            mode: { val: 'Blocking I/O', level: 'bad' },
            evt: { val: 'Ngủ trên từng read()', level: 'bad' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -7.5, -3.5, 3.5, 16, '10 000 kết nối mở'),
              srv: D.srv(6, 0, ['Blocking Server'], { color: 'red', heat: 0.9, cpu: 0.96, sub: '~10 GB RAM stack · Context Switch', tags: [{ text: 'Nghẽn C10K!', tone: 'red' }] })
            },
            links: {
              c_s: D.link('cli', 'srv', { label: '1 OS thread / 1 socket', tone: 'red' })
            },
            flows: [D.flow(['c_s'], { rate: 3.0, kind: 'heavy' })]
          }
        },
        {
          short: 'Selector Event-Loop',
          chapter: 'technique',
          title: 'Một thread Event-Loop + Selector hỏi nhân hệ điều hành kênh nào sẵn sàng',
          body: [
            'Đặt mọi <code>SocketChannel</code> ở chế độ không chặn (<code>configureBlocking(false)</code>) và đăng ký vào một <b><code>Selector</code></b> (dùng <code>epoll</code>/<code>kqueue</code>/<code>IOCP</code> dưới nhân).',
            'Lời gọi <code>selector.select()</code> chỉ đánh thức event-loop cho đúng vài chục kênh <b>thực sự có dữ liệu</b> (<code>OP_ACCEPT</code>, <code>OP_READ</code>, <code>OP_WRITE</code>) thay vì quét mù 10 000 kênh.'
          ],
          changes: [
            '- Giảm từ 10 000 OS thread xuống 1 thread event-loop',
            '+ Nhân hệ điều hành chỉ báo các kênh sẵn sàng sự kiện'
          ],
          metrics: {
            c10k: { val: '10 000 kết nối', level: 'good' },
            th: { val: '1 Selector thread', level: 'good' },
            mode: { val: 'Non-Blocking Channel', level: 'good' },
            evt: { val: 'OP_ACCEPT / OP_READ', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -8, -3.5, 3.5, 16, '10 000 SocketChannel'),
              sel: D.lb(0, 0, ['NIO Selector'], { color: 'teal', sub: 'select() → tập ready keys', tags: [{ text: 'epoll / IOCP', tone: 'green' }] }),
              loop: D.srv(11, 0, ['Event-Loop Thread'], { color: 'green', cpu: 0.28, sub: 'Chỉ xử lý kênh có dữ liệu' })
            },
            links: {
              c_s: D.link('cli', 'sel', { label: 'Đăng ký không chặn', tone: 'green' }),
              s_l: D.link('sel', 'loop', { label: 'SelectedKeys (chỉ kênh sẵn)', tone: 'green' })
            },
            flows: [D.flow(['c_s', 's_l'], { rate: 2.2, kind: 'req' })]
          }
        },
        {
          short: 'ByteBuffer flip/clear',
          chapter: 'technique',
          title: 'Đọc ghi theo kênh qua ByteBuffer: position, limit và trạng thái đọc dở',
          body: [
            'Khác với stream đọc thẳng một chiều, NIO trao đổi dữ liệu qua <b><code>ByteBuffer</code></b> hai chiều: đọc từ kênh vào buffer → gọi <code>flip()</code> để chuyển sang chế độ ghi ra → xử lý xong gọi <code>compact()</code> hoặc <code>clear()</code>.',
            'Vì <code>read()</code> không chặn có thể trả về một phần message rồi quay lại ngay, mỗi <code>SelectionKey</code> đính kèm (<code>attach</code>) buffer riêng của kết nối đó.'
          ],
          metrics: {
            c10k: { val: 'Buffer gắn theo kết nối', level: 'good' },
            th: { val: '1 thread (không block)', level: 'good' },
            mode: { val: 'Channel ↔ ByteBuffer', level: 'good' },
            evt: { val: 'flip() / compact()', level: 'good' }
          },
          scene: {
            entities: {
              ch: D.srv(-11, 0, ['SocketChannel'], { color: 'blue', sub: 'read(buf) trả ngay' }),
              buf: D.block(0, 0, { color: 'violet', glyph: 'memory', label: ['ByteBuffer'], sub: 'pos · limit · cap', tags: [{ text: 'attach vào SelectionKey', tone: 'violet' }] }),
              out: D.srv(11, 0, ['Echo Writer'], { color: 'green', sub: 'flip() → write(buf)' })
            },
            links: {
              c_b: D.link('ch', 'buf', { label: 'Ghi byte vào buffer' }),
              b_o: D.link('buf', 'out', { label: 'flip() rồi ghi ra kênh', tone: 'green' })
            },
            flows: [D.flow(['c_b', 'b_o'], { rate: 1.8, kind: 'msg' })]
          }
        },
        {
          short: 'Mẫu Reactor & Worker',
          chapter: 'summary',
          title: 'Quy tắc vàng của Reactor: Không bao giờ chạy việc nặng trên Event-Loop',
          body: [
            'Nếu một yêu cầu chạy tính toán nặng hoặc gọi cơ sở dữ liệu ngay trên thread event-loop, toàn bộ 9 999 kết nối còn lại sẽ bị đứng hình ngay lập tức.',
            'Mẫu <b>Reactor</b> (nền tảng của Netty, NGINX, Redis) giao việc đọc/ghi mạng cho 1–N event-loop cực nhanh và đẩy tác vụ nặng sang <b>Worker Pool / CompletableFuture</b> xử lý bất đồng bộ.'
          ],
          metrics: {
            c10k: { val: 'Hàng chục nghìn kết nối', level: 'good' },
            th: { val: 'Event-Loop + Worker', level: 'good' },
            mode: { val: 'Reactor bất đồng bộ', level: 'good' },
            evt: { val: 'Tách I/O khỏi CPU nặng', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -8, -3, 3, 14, 'Hàng nghìn client'),
              ev: D.lb(-1, 0, ['Reactor Event-Loop'], { color: 'green', sub: 'Chỉ làm I/O không chặn' }),
              wk: D.srv(11, 3.5, ['Worker Pool'], { color: 'blue', sub: 'Xử lý nghiệp vụ / DB' }),
              cf: D.srv(11, -3.5, ['CompletableFuture'], { color: 'purple', sub: 'Gọi song song dịch vụ ngoài' })
            },
            links: {
              c_e: D.link('cli', 'ev', { label: 'I/O không chặn', tone: 'green' }),
              e_w: D.link('ev', 'wk', { label: 'Giao việc nặng' }),
              e_c: D.link('ev', 'cf', { label: 'Async stub / fan-out' })
            },
            flows: [
              D.flow(['c_e', 'e_w'], { rate: 2.0, kind: 'req' }),
              D.flow(['c_e', 'e_c'], { rate: 1.8, kind: 'msg' })
            ]
          }
        }
      ]
    },

    /* ========================================================================
     * CHƯƠNG 5 — 12. ĐỘ TIN CẬY: RETRY, BACKOFF/JITTER, CIRCUIT BREAKER & MQTT
     * ======================================================================== */
    {
      id: 'reliability-mqtt',
      ch: 5,
      videos: ['V34', 'V35', 'V36'],
      videoHref: '../V35/index.html',
      videoTitle: 'Độ tin cậy: backoff, circuit breaker và health check',
      title: 'Độ tin cậy: Retry, Backoff/Jitter, Circuit Breaker & MQTT',
      summary: 'Giữ ứng dụng sống sót khi mạng lỗi: Request ID + CRC32 trên UDP, chống bão retry bằng Exponential Backoff + Jitter, Circuit Breaker và QoS của MQTT.',
      minutes: 9,
      level: 'Nâng cao',
      ref: 'Chương 5 · Độ tin cậy mạng và IoT (MQTT)',
      metrics: [
        { id: 'retry', label: 'CHIẾN LƯỢC RETRY' },
        { id: 'cb', label: 'CIRCUIT BREAKER' },
        { id: 'dup', label: 'CHỐNG TRÙNG LẶP' },
        { id: 'qos', label: 'MQTT QOS' }
      ],
      legend: ['req', 'res', 'kill', 'msg'],
      goals: [
        { text: 'Biết cách xây dựng độ tin cậy tầng ứng dụng trên UDP bằng Request ID 16 bit và CRC32', step: 0 },
        { text: 'Thấy hiểm họa "thundering herd" khi retry đều nhau và tác dụng của Exponential Backoff + Jitter', step: 1 },
        { text: 'Hiểu 3 trạng thái CLOSED → OPEN → HALF_OPEN của Circuit Breaker (Resilience4j)', step: 2 },
        { text: 'Phân biệt 3 mức QoS 0 / 1 / 2 của MQTT cho mạng cảm biến IoT chập chờn', step: 3 }
      ],
      steps: [
        {
          short: 'Tin cậy trên UDP',
          chapter: 'setup',
          title: 'Request ID + Checksum CRC32: Tự xây độ tin cậy kiểu DNS trên UDP',
          body: [
            'Khi gọi truy vấn kiểu DNS trên UDP mất gói, client gắn một <b>Request ID 16 bit</b> để ghép đúng phản hồi và thêm mã kiểm tra <b>CRC32</b> phát hiện gói hỏng bit.',
            'Hết timeout, client gửi lại đúng Request ID đó; nếu phản hồi cũ đến trễ không khớp ID hiện tại thì bỏ qua.'
          ],
          metrics: {
            retry: { val: 'Gửi lại kèm Request ID', level: 'good' },
            cb: { val: 'CLOSED', level: 'good' },
            dup: { val: 'Ghép đúng ID 16 bit', level: 'good' },
            qos: { val: 'At-least-once UDP', level: '' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'RetryResolver', { tags: [{ text: 'txId=0x4A12 + CRC32', tone: 'blue' }] }),
              srv: D.srv(10, 0, ['UDP Name Server'], { color: 'teal', sub: 'Kiểm CRC32 · Trả txId' })
            },
            links: {
              q: D.link('cli', 'srv', { label: 'Query txId=0x4A12', tone: 'amber', fail: 0.3 }),
              r: D.link('srv', 'cli', { label: 'Reply txId=0x4A12 + IP', tone: 'green', dashed: true })
            },
            flows: [
              D.flow(['q'], { rate: 1.8, kind: 'req', fail: 0.3 }),
              D.flow(['r'], { rate: 1.3, kind: 'res' })
            ]
          }
        },
        {
          short: 'Backoff & Jitter',
          chapter: 'problem',
          title: 'Tránh bão Retry (Thundering Herd) bằng Exponential Backoff + Jitter',
          body: [
            'Khi dịch vụ thanh toán vừa chập chờn 2 giây, nếu 500 client đồng loạt retry đúng sau 1 s, 2 s, 4 s thì từng đợt sóng tải sẽ đánh sập lại server vừa hồi phục.',
            '<b>Exponential Backoff + Full Jitter</b> giãn thời gian chờ tăng theo lũy thừa kèm độ lệch ngẫu nhiên (<code>random(0, cap)</code>), rải đều các lần thử lại và luôn gắn <code>Idempotency-Key</code> để không thanh toán trùng.'
          ],
          callout: {
            kind: 'tip',
            text: 'Công thức khuyến nghị của AWS Architecture Blog: <b>Full Jitter</b> giúp giảm mạnh cả tổng số lần gọi lẫn thời gian hoàn tất dưới tải cao.'
          },
          changes: [
            '+ Giãn nhịp retry 100 ms → 200 ms → 400 ms kèm ngẫu nhiên (Jitter)',
            '+ Gắn Idempotency-Key bảo vệ thao tác không lũy đẳng'
          ],
          metrics: {
            retry: { val: 'Exp. Backoff + Jitter', level: 'good' },
            cb: { val: 'CLOSED', level: 'good' },
            dup: { val: 'Idempotency-Key', level: 'good' },
            qos: { val: 'Trải đều lưu lượng', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -8, -3, 3, 10, '500 Client thanh toán'),
              jit: D.block(0, 0, { color: 'green', glyph: 'gear', label: ['Backoff + Jitter'], sub: 'Rải đều thời điểm retry', tags: [{ text: 'Không dồn sóng tải', tone: 'green' }] }),
              pay: D.srv(11, 0, ['Payment Service'], { color: 'blue', cpu: 0.52, sub: 'Hồi phục ổn định' })
            },
            links: {
              c_j: D.link('cli', 'jit', { label: 'Thử lại ngẫu nhiên' }),
              j_p: D.link('jit', 'pay', { label: 'Idempotency-Key', tone: 'green' })
            },
            flows: [D.flow(['c_j', 'j_p'], { rate: 1.8, kind: 'req' })]
          }
        },
        {
          short: 'Circuit Breaker',
          chapter: 'technique',
          title: 'Circuit Breaker: Ngắt mạch (OPEN) để fail-fast khi đích đã hỏng hẳn',
          body: [
            'Nếu dịch vụ đích đã sập hoàn toàn, tiếp tục retry chỉ làm tắc thêm thread và tăng độ trễ. <b>Circuit Breaker</b> (Resilience4j) theo dõi tỷ lệ lỗi trong cửa sổ trượt:',
            'Khi vượt ngưỡng, mạch chuyển sang <b>OPEN</b> (trả fallback tức thì trong 1 ms), hết thời gian chờ chuyển sang <b>HALF_OPEN</b> thả vài yêu cầu thăm dò (kết hợp <code>/health</code>) trước khi khép lại <b>CLOSED</b>.'
          ],
          metrics: {
            retry: { val: 'Tạm dừng khi OPEN', level: 'good' },
            cb: { val: 'OPEN → HALF_OPEN', level: 'warn' },
            dup: { val: 'Fail-fast < 1 ms', level: 'good' },
            qos: { val: 'Bảo vệ hệ thống gọi', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 0, 'Client gọi thanh toán'),
              cb: D.block(0, 0, { color: 'amber', glyph: 'shield', label: ['Circuit Breaker'], sub: 'OPEN → trả Fallback ngay', tags: [{ text: 'Ngắt mạch bảo vệ', tone: 'amber' }] }),
              pay: D.srv(11, 0, ['Payment Service'], { color: 'red', dead: 0.85, sub: 'Đang hỏng · Chờ hồi phục' })
            },
            links: {
              c_b: D.link('cli', 'cb', { label: 'Yêu cầu → Fallback ngay', tone: 'amber' }),
              b_p: D.link('cb', 'pay', { label: 'Đã ngắt (chỉ probe HALF_OPEN)', dashed: true, tone: 'red' })
            },
            flows: [D.flow(['c_b'], { rate: 2.0, kind: 'res' })]
          }
        },
        {
          short: 'MQTT cho IoT (QoS 0/1/2)',
          chapter: 'summary',
          title: 'Giám sát cảm biến với MQTT: Nhẹ, Publish/Subscribe và 3 mức QoS',
          body: [
            'Thiết bị IoT có pin yếu và kết nối chập chờn. <b>MQTT</b> dùng header tối thiểu chỉ <b>2 byte</b> qua một <b>MQTT Broker</b> (Mosquitto) theo mô hình Publish/Subscribe phân cấp topic (<code>sensors/room301/temp</code>).',
            'Tùy dữ liệu mà chọn mức bảo đảm: <b>QoS 0</b> (bắn rồi quên, nhiệt độ định kỳ), <b>QoS 1</b> (<code>PUBLISH</code> + <code>PUBACK</code> — ít nhất một lần), <b>QoS 2</b> (4 bước <code>PUBREC/PUBREL/PUBCOMP</code> — đúng một lần cho lệnh quan trọng).'
          ],
          metrics: {
            retry: { val: 'Tự nối lại + LWT', level: 'good' },
            cb: { val: 'Keep-alive broker', level: 'good' },
            dup: { val: 'QoS 1/2 chọn theo nhu cầu', level: 'good' },
            qos: { val: 'QoS 0 · QoS 1 · QoS 2', level: 'good' }
          },
          scene: {
            entities: {
              iot: D.block(-11, 0, { color: 'teal', glyph: 'wifi', label: ['Cảm biến phòng P301'], sub: 'Header MQTT chỉ 2B', tags: [{ text: 'PUBLISH QoS 1', tone: 'green' }] }),
              brk: D.srv(0, 0, ['Mosquitto Broker'], { color: 'orange', glyph: 'queue', sub: 'Topic sensors/+/temp' }),
              dash: D.dev(11, 4, 'Bảng giám sát'),
              alrt: D.srv(11, -4, ['Dịch vụ cảnh báo'], { color: 'purple', sub: 'Subscribe sensors/+/temp' })
            },
            links: {
              i_b: D.link('iot', 'brk', { label: 'PUBLISH / PUBACK', tone: 'green' }),
              b_d: D.link('brk', 'dash', { label: 'Nhiệt độ 27,5°C', tone: 'green' }),
              b_a: D.link('brk', 'alrt', { label: 'Kiểm ngưỡng nóng', tone: 'green' })
            },
            flows: [
              D.flow(['i_b', 'b_d'], { rate: 1.8, kind: 'msg' }),
              D.flow(['i_b', 'b_a'], { rate: 1.8, kind: 'msg' })
            ]
          }
        }
      ]
    }
  ];

  /* Bổ sung đủ 12 bài (hiện đang có 9 bài ở trên? Kiểm tra lại: dns-endpoint (1),
     stream-framing (2), tcp-handshake (3), tcp-concurrency (4), udp-multicast (5),
     websocket-realtime (6), http2-http3-quic (7), rpc-rest-grpc (8),
     rabbitmq-broker (9), tls-security (10), nio-selector-c10k (11),
     reliability-mqtt (12) — ĐỦ ĐÚNG 12 BÀI TRẢI ĐỀU CẢ 5 CHƯƠNG!) */

  global.ELEARNING_COURSE = {
    courseId: 'INT1433',
    code: 'INT1433',
    title: 'Lập trình mạng',
    titleEn: 'Network Programming',
    instructor: 'TS. Đặng Ngọc Hùng',
    modules: [
      { ch: 1, title: 'Tổng quan lập trình mạng', color: 'blue' },
      { ch: 2, title: 'Lập trình socket TCP và đa luồng', color: 'green' },
      { ch: 3, title: 'UDP và giao thức ứng dụng hiện đại', color: 'amber' },
      { ch: 4, title: 'Kỹ thuật lập trình phân tán', color: 'violet' },
      { ch: 5, title: 'Các chủ đề nâng cao', color: 'red' }
    ],
    lessons: LESSONS
  };
})(typeof window !== 'undefined' ? window : globalThis);
