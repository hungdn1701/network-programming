/* ============================================================================
 * INT1433/workbench/lessons.js — 12 Mô phỏng tương tác 2.5D (Lập trình mạng)
 * ============================================================================
 * Phủ đủ 5 chương của INT1433/plan.yaml, bám sát INT1433/glossary.yaml và
 * INT1433/classic-examples.md (Java 21 LTS, Stevens UNP, Kurose & Ross, RFC).
 * Thiết kế trực quan kết hợp 2.5D System Design & Protocol Explorer:
 * router, firewall, cloud, rack, frame (mổ xẻ gói tin/trạng thái), panel, zone.
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
              cli: D.dev(-11, 2.2, 'Client Java 21', { sub: '192.168.1.10', halo: 'blue', tags: [{ text: 'getAllByName()', tone: 'blue' }] }),
              cache: D.block(-2, 2.2, { color: 'gray', glyph: 'cache', label: ['OS DNS Cache'], sub: 'Trống (miss)', tags: [{ text: 'Chưa có bản ghi', tone: 'amber' }] }),
              rt: D.router(5.5, 2.2, 'Router LAN', { sub: '192.168.1.1', color: 'teal' }),
              srv: D.rack(12.5, 2.2, 'ptit.edu.vn', { color: 'blue', sub: 'HTTPS :443', tags: [{ text: 'Chưa biết IP', tone: 'gray' }] }),
              fr: D.frame(0.5, -4.6, 'Yêu cầu kết nối từ ứng dụng Java', [
                { label: 'Tên miền', sub: 'ptit.edu.vn', tone: 'blue', active: true },
                { label: 'Port đích', sub: ':443 (HTTPS)', tone: 'teal' },
                { label: 'Địa chỉ IP', sub: '? (cần hỏi DNS)', tone: 'amber' }
              ], { icon: 'globe', note: 'Tầng mạng IP chỉ định tuyến theo địa chỉ số, chưa hiểu tên miền' })
            },
            links: {
              c_ca: D.link('cli', 'cache', { label: 'Tra cache OS' }),
              ca_rt: D.link('cache', 'rt', { label: 'Cache miss → ra LAN', style: 'dashed', tone: 'amber' }),
              rt_s: D.link('rt', 'srv', { label: 'Chưa có IP đích', style: 'off' })
            },
            flows: [D.flow(['c_ca'], { rate: 1.5, kind: 'req' })]
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
              cli: D.dev(-12, 2.2, 'Client Java 21', { sub: '192.168.1.10' }),
              rt: D.router(-5, 2.2, 'Router LAN', { sub: 'NAT ra WAN', color: 'teal' }),
              dns: D.block(3, 4.2, { color: 'orange', glyph: 'globe', label: ['DNS Resolver'], sub: 'UDP :53', tags: [{ text: 'Truy vấn A/AAAA', tone: 'amber' }] }),
              auth: D.db(12, 4.2, 'Authoritative DNS', { color: 'purple', sub: 'Miền .edu.vn' }),
              tr: D.panel(-0.5, -3.2, 'Vết gói tin DNS (UDP :53)', [
                '> 192.168.1.10 → 8.8.8.8:53  Query A ptit.edu.vn (75 B)',
                '~ Resolver → Authoritative .edu.vn  Hỏi bản ghi A + AAAA',
                '# Giao vận UDP: 1 RTT không cần bắt tay 3 bước'
              ], { icon: 'packet' })
            },
            links: {
              c_r: D.link('cli', 'rt', { label: 'UDP :53' }),
              r_d: D.link('rt', 'dns', { label: 'Query ptit.edu.vn' }),
              d_a: D.link('dns', 'auth', { label: 'Đệ quy A / AAAA' })
            },
            flows: [
              D.flow(['c_r', 'r_d', 'd_a'], { rate: 1.8, kind: 'req' }),
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
            rtt: { val: '18 ms (sau <1 ms)', level: 'good' },
            ips: { val: 'IPv4 + IPv6', level: 'good' },
            ep: { val: '203.162.x.y:443', level: 'good' },
            proto: { val: 'DNS Response', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 2.5, 'Client Java 21', { halo: 'green', tags: [{ text: 'Nạp vào OS Cache', tone: 'green' }] }),
              dns: D.block(-1, 2.5, { color: 'green', glyph: 'globe', label: ['DNS Resolver'], sub: 'Cache TTL = 300 s' }),
              srv1: D.rack(10.5, 5.2, 'Endpoint #1', { color: 'blue', sub: 'IPv4 :443' }),
              srv2: D.rack(10.5, -0.5, 'Endpoint #2', { color: 'teal', sub: 'IPv6 :443' }),
              fr: D.frame(-0.5, -5.0, 'Bản ghi phản hồi DNS (Response)', [
                { label: 'Bản ghi A', sub: '203.162.x.1 (IPv4)', tone: 'blue', active: true },
                { label: 'Bản ghi AAAA', sub: '2401:d800::1 (IPv6)', tone: 'teal' },
                { label: 'TTL', sub: '300 giây (lưu cache)', tone: 'green' }
              ], { icon: 'globe' })
            },
            links: {
              d_c: D.link('dns', 'cli', { label: 'A + AAAA + TTL', tone: 'green' }),
              d_1: D.link('dns', 'srv1', { label: 'Ánh xạ IPv4', style: 'dashed' }),
              d_2: D.link('dns', 'srv2', { label: 'Ánh xạ IPv6', style: 'dashed' })
            },
            flows: [D.flow(['d_c'], { rate: 1.9, kind: 'res' })]
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
              cli: D.dev(-12, 2.5, 'Client :51420', { halo: 'green', tags: [{ text: 'Ephemeral port', tone: 'paper' }] }),
              rt: D.router(-4, 2.5, 'Router / NAT', { color: 'teal', sub: 'Định tuyến IP' }),
              host: D.zone(3.2, 13.8, -2.0, 9.0, 'CÙNG 1 MÁY · 1 ĐỊA CHỈ IP', { tone: 'blue' }),
              p443: D.rack(8.5, 4.8, 'HTTPS Server', { color: 'green', sub: 'Port 443', tags: [{ text: 'Đúng đích', tone: 'green' }] }),
              p8080: D.rack(8.5, 0.2, 'API Server', { color: 'gray', sub: 'Port 8080' }),
              fr: D.frame(0, -5.2, '4-Tuple định danh duy nhất phiên TCP', [
                { label: 'Client IP', sub: '192.168.1.10', tone: 'paper' },
                { label: 'Client Port', sub: ':51420', tone: 'blue' },
                { label: 'Server IP', sub: '203.162.x.1', tone: 'paper' },
                { label: 'Server Port', sub: ':443 (HTTPS) ✓', tone: 'green', active: true }
              ], { icon: 'packet' })
            },
            links: {
              c_r: D.link('cli', 'rt', { label: 'Gói TCP', tone: 'green' }),
              r_443: D.link('rt', 'p443', { label: 'Đích :443', tone: 'green' })
            },
            flows: [D.flow(['c_r', 'r_443'], { rate: 2.0, kind: 'req' })]
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
              send: D.dev(-11, 2.2, 'Bên gửi', { sub: 'OutputStream', halo: 'blue', tags: [{ text: '2 lần write()', tone: 'blue' }] }),
              buf: D.queue(0, 2.2, 'TCP Send Buffer', { n: 5, slots: 6, color: 'orange', tags: [{ text: 'Dãy byte nối đuôi', tone: 'amber' }] }),
              recv: D.rack(11, 2.2, 'Bên nhận', { color: 'teal', glyph: 'code', sub: 'InputStream' }),
              fr: D.frame(0, -4.6, 'Dãy byte liên tục trong TCP Buffer (không có vách ngăn)', [
                { label: 'G E T', sub: 'write #1', tone: 'blue' },
                { label: '␣ /', sub: 'write #1', tone: 'blue' },
                { label: '␣ H T T P', sub: 'write #2', tone: 'amber' },
                { label: '/ 1 . 1', sub: 'write #2', tone: 'amber' }
              ], { icon: 'binary', note: 'Nhân TCP ghép mọi byte vào một dòng duy nhất' })
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
              send: D.dev(-11, 2.2, 'Bên gửi', { sub: 'Msg A + Msg B' }),
              net: D.cloud(0, 2.2, ['Mạng IP / MTU'], { color: 'red', glyph: 'alert', heat: 0.7, sub: 'Cắt & gom segment', tags: [{ text: 'Nagle / MTU', tone: 'red' }] }),
              recv: D.rack(11, 2.2, 'Bên nhận', { color: 'red', heat: 0.45, sub: 'read() mảnh vỡ', tags: [{ text: 'Parse thất bại!', tone: 'red' }] }),
              fr: D.frame(0, -4.5, 'Kết quả 3 lần gọi InputStream.read() thực tế', [
                { label: 'read() #1', sub: 'Nửa đầu A1', tone: 'amber' },
                { label: 'read() #2', sub: 'A2 + B1 (dính gói!)', tone: 'red', active: true },
                { label: 'read() #3', sub: 'Đuôi B2', tone: 'amber' }
              ], { icon: 'packet', pointers: [{ idx: 1, label: 'Ranh giới bị trộn lẫn!', tone: 'red' }] })
            },
            links: {
              s_n: D.link('send', 'net', { label: 'Byte stream' }),
              n_r: D.link('net', 'recv', { label: 'Đoạn không đều', tone: 'red', fail: 0.22 })
            },
            flows: [D.flow(['s_n', 'n_r'], { rate: 2.5, kind: 'heavy' })]
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
            risk: { val: 'Cấm CRLF trong thân', level: 'warn' }
          },
          scene: {
            entities: {
              send: D.dev(-11, 2.2, 'Client HTTP/1.1', { halo: 'blue' }),
              flt: D.block(0, 2.2, { color: 'green', glyph: 'layers', label: ['Delimiter Framing'], sub: 'Tách theo \\r\\n', tags: [{ text: 'Dễ thử bằng NetCat', tone: 'green' }] }),
              recv: D.rack(11, 2.2, 'Server Parser', { color: 'green', sub: 'BufferedReader UTF-8' }),
              fr: D.frame(0, -4.6, 'Đóng khung văn bản bằng dấu phân cách CRLF', [
                { label: 'GET / HTTP/1.1', sub: 'Request Line', tone: 'blue' },
                { label: '\\r\\n', sub: '0D 0A', tone: 'green', active: true },
                { label: 'Host: ptit.edu.vn', sub: 'Header', tone: 'blue' },
                { label: '\\r\\n\\r\\n', sub: 'Hết Header ✓', tone: 'green', active: true }
              ], { icon: 'packet' })
            },
            links: {
              s_f: D.link('send', 'flt', { label: 'Header + CRLF', tone: 'green' }),
              f_r: D.link('flt', 'recv', { label: 'Từng dòng nguyên vẹn', tone: 'green' })
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
              send: D.dev(-11, 2.2, 'DataOutputStream', { sub: 'writeInt(N) + body', halo: 'green' }),
              flt: D.block(0, 2.2, { color: 'purple', glyph: 'code', label: ['Length-Prefix'], sub: 'Không cần quét byte', tags: [{ text: 'An toàn nhị phân', tone: 'violet' }] }),
              recv: D.rack(11, 2.2, 'DataInputStream', { color: 'green', sub: 'readInt + readNBytes' }),
              fr: D.frame(0, -4.5, 'Cấu trúc khung tiền tố độ dài (Length-Prefix Frame)', [
                { label: '4B Length', sub: '00 00 00 0C (12)', tone: 'violet', active: true },
                { label: '12 byte Payload nhị phân', sub: 'Ảnh · File · Protobuf · UTF-8', tone: 'green' }
              ], {
                icon: 'binary',
                pointers: [
                  { idx: 0, label: '1. readInt() → 12', tone: 'violet' },
                  { idx: 1, label: '2. readNBytes(12)', tone: 'green' }
                ]
              })
            },
            links: {
              s_f: D.link('send', 'flt', { label: '4B Len + Payload', tone: 'green' }),
              f_r: D.link('flt', 'recv', { label: 'Message nguyên vẹn', tone: 'green' })
            },
            flows: [D.flow(['s_f', 'f_r'], { rate: 1.9, kind: 'res' })]
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
              cli: D.dev(-11, 2.0, 'Echo Client', { tags: [{ text: 'Chuẩn bị connect()', tone: 'paper' }] }),
              srvZone: D.zone(1.5, 13.5, -2.5, 8.8, 'ECHO SERVER · PORT 9000', { tone: 'blue' }),
              ss: D.rack(7.5, 4.4, 'ServerSocket', { color: 'blue', sub: 'LISTEN :9000', tags: [{ text: 'Chỉ nhận kết nối', tone: 'blue' }] }),
              q: D.queue(7.5, -0.4, 'Kernel Backlog', { n: 0, slots: 5, color: 'gray' }),
              info: D.panel(-6.5, -4.2, 'Trạng thái khởi đầu', [
                '# Server: new ServerSocket(9000) → LISTEN',
                '# Backlog: hàng đợi nhân chờ SYN từ client',
                '# accept() đang block chờ kết nối đầu tiên'
              ], { icon: 'terminal' })
            },
            links: {
              c_s: D.link('cli', 'ss', { label: 'Chờ SYN tới :9000', style: 'off' }),
              ss_q: D.link('ss', 'q', { label: 'Chờ accept()', style: 'dashed' })
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
            sock: { val: '1 Listen + 1 Session', level: 'good' },
            timeout: { val: 'Mặc định 21 s OS', level: 'warn' },
            dir: { val: 'Song công (Duplex)', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 2.0, 'Client Socket', { halo: 'green', tags: [{ text: 'ESTABLISHED', tone: 'green' }] }),
              ss: D.block(-0.5, 5.2, { color: 'gray', glyph: 'server', label: ['ServerSocket'], sub: 'Tiếp tục LISTEN' }),
              worker: D.rack(10.5, 1.8, 'Session Socket', { color: 'green', halo: 'green', sub: 'Từ accept()', tags: [{ text: 'Trao đổi dữ liệu', tone: 'green' }] }),
              fr: D.frame(0, -4.8, 'Chuỗi bắt tay 3 bước TCP (RFC 9293)', [
                { label: '1. SYN', sub: 'Seq=0 (Client→Srv)', tone: 'blue' },
                { label: '2. SYN-ACK', sub: 'Seq=0, Ack=1', tone: 'amber' },
                { label: '3. ACK', sub: 'ESTABLISHED ✓', tone: 'green', active: true }
              ], { icon: 'packet' })
            },
            links: {
              c_w: D.link('cli', 'worker', { label: 'SYN / SYN-ACK / ACK', tone: 'green', both: true }),
              ss_w: D.link('ss', 'worker', { label: 'accept() cấp phiên', style: 'dashed' })
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
            sock: { val: 'Treo nếu thiếu hạn', level: 'warn' },
            timeout: { val: 'Conn 3s · Read 2s', level: 'good' },
            dir: { val: 'Ngắt an toàn', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 2.2, 'Echo Client', { halo: 'amber', tags: [{ text: 'SO_TIMEOUT = 2 s', tone: 'amber' }] }),
              guard: D.firewall(-1.5, 2.2, 'Bộ đếm Timeout', { color: 'amber', glyph: 'shield', sub: 'Ngắt sau 2 000 ms' }),
              hang: D.rack(10.5, 2.2, 'Server bị treo', { color: 'red', heat: 0.85, sub: 'Không phản hồi', tags: [{ text: 'Im lặng > 2 s', tone: 'red' }] }),
              pn: D.panel(0, -4.4, 'Hai lớp thời hạn bắt buộc trên Socket Java', [
                '> socket.connect(addr, 3000)   → chặn bắt tay treo 21 s',
                '> socket.setSoTimeout(2000)    → chặn read() treo vô hạn',
                '! Quá hạn → ném SocketTimeoutException để thu hồi thread'
              ], { icon: 'shield' })
            },
            links: {
              c_g: D.link('cli', 'guard', { label: 'read() có hẹn giờ' }),
              g_h: D.link('guard', 'hang', { label: 'Mất phản hồi', tone: 'red', style: 'cut', fail: 0.75 })
            },
            flows: [D.flow(['c_g', 'g_h'], { rate: 1.6, kind: 'kill', fail: 0.75 })]
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
            state: { val: 'FIN_WAIT_2', level: 'good' },
            sock: { val: 'Đóng ghi · Mở đọc', level: 'good' },
            timeout: { val: 'Đủ hạn 2 s', level: 'good' },
            dir: { val: 'Srv → Client mở', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-10.5, 2.4, 'Echo Client', { halo: 'violet', tags: [{ text: 'shutdownOutput() → FIN', tone: 'violet' }] }),
              srv: D.rack(10.5, 2.4, 'Echo Server', { color: 'green', sub: 'Đọc thấy EOF (-1)', tags: [{ text: 'Trả nốt echo rồi FIN', tone: 'green' }] }),
              fr: D.frame(0, -4.8, 'Đóng một chiều TCP Half-Close (Stevens UNP §6.6)', [
                { label: 'Client → Server', sub: 'Đã gửi FIN (đóng ghi)', tone: 'gray' },
                { label: 'Server → Client', sub: 'Vẫn mở trả echo ✓', tone: 'green', active: true },
                { label: 'Kết thúc phiên', sub: 'Server gửi FIN → CLOSED', tone: 'blue' }
              ], { icon: 'packet' })
            },
            links: {
              c_s: D.link('cli', 'srv', { label: 'Chiều ghi: đã gửi FIN', style: 'dashed', tone: 'gray', via: [[0, 4.8]] }),
              s_c: D.link('srv', 'cli', { label: 'Chiều đọc: vẫn nhận echo', tone: 'green', via: [[0, 0.2]] })
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
              c1: D.dev(-11.5, 4.8, 'Client #1 (chậm 4 s)', { tags: [{ text: 'Đang chiếm server', tone: 'red' }] }),
              c2: D.dev(-11.5, -1.5, 'Client #2 (nhanh)', { tags: [{ text: 'Chờ oan 3 983 ms!', tone: 'amber' }] }),
              q: D.queue(-1.5, -1.5, 'Kernel Backlog', { n: 2, slots: 5, color: 'amber' }),
              srv: D.rack(9.5, 1.8, 'Web Server Tuần tự', { color: 'red', heat: 0.85, cpu: 0.96, sub: '1 OS thread duy nhất' }),
              pn: D.panel(0.5, -5.6, 'Đo thực nghiệm: 1 client chậm chặn cả hàng', [
                '! Client #1 giữ kết nối 4 000 ms → chặn vòng lặp accept()',
                '! Client #2 chỉ cần 3 ms nhưng phải chờ tới 3 983 ms'
              ], { icon: 'alert' })
            },
            links: {
              l1: D.link('c1', 'srv', { label: 'Chiếm thread 4 s', tone: 'red' }),
              l2: D.link('c2', 'q', { label: 'Đứng chờ', style: 'dashed', tone: 'amber' }),
              q_s: D.link('q', 'srv', { label: 'Chờ đến lượt', style: 'dashed', tone: 'amber' })
            },
            flows: [D.flow(['l1'], { rate: 0.9, kind: 'heavy' })]
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
            safe: { val: 'AtomicLong / Lock', level: 'warn' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12.5, -8.5, -0.5, 4.5, 6, 'Nhiều client'),
              t1: D.block(-0.5, 4.6, { color: 'blue', glyph: 'server', label: ['Worker Thread 1'], sub: 'count++' }),
              t2: D.block(-0.5, -0.4, { color: 'blue', glyph: 'server', label: ['Worker Thread 2'], sub: 'count++' }),
              cnt: D.firewall(10.5, 2.2, 'Bộ đếm chung', { color: 'amber', glyph: 'lock', sub: 'AtomicLong', tags: [{ text: 'Critical section', tone: 'amber' }] }),
              fr: D.frame(0, -5.2, 'Tránh Race Condition bằng thao tác nguyên tử', [
                { label: 'Đọc count', sub: 'val = 100', tone: 'blue' },
                { label: 'Cộng 1', sub: '100 + 1', tone: 'blue' },
                { label: 'CAS / Lock', sub: 'AtomicLong / synchronized ✓', tone: 'green', active: true },
                { label: 'Ghi an toàn', sub: 'count = 101', tone: 'green' }
              ], { icon: 'lock' })
            },
            links: {
              c_1: D.link('cli', 't1', { label: 'HTTP GET' }),
              c_2: D.link('cli', 't2', { label: 'HTTP GET' }),
              t1_c: D.link('t1', 'cnt', { label: 'Tăng an toàn', tone: 'green' }),
              t2_c: D.link('t2', 'cnt', { label: 'Tăng an toàn', tone: 'green' })
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
            conn: { val: '200 (chạy 8/lượt)', level: 'warn' },
            wait: { val: '25,5 giây', level: 'warn' },
            ram: { val: 'Ổn định (8 OS thr)', level: 'good' },
            safe: { val: 'An toàn', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12.5, -8.5, -0.2, 4.6, 12, '200 kết nối đồng thời'),
              q: D.queue(-1, 2.2, 'BlockingQueue (192 chờ)', { n: 6, slots: 6, color: 'orange', tags: [{ text: 'Đầy hàng chờ I/O', tone: 'amber' }] }),
              pool: D.rack(10, 2.2, 'FixedThreadPool(8)', { color: 'amber', slots: 4, cpu: 0.22, sub: '8 OS thread block I/O', tags: [{ text: 'CPU rảnh vẫn nghẽn!', tone: 'amber' }] }),
              pn: D.panel(0, -4.6, 'Hiệu năng Pool cố định với tác vụ I/O-bound', [
                '~ 200 tác vụ × 1 s / 8 OS thread = 25 đợt → 25,5 giây',
                '+ Chặn cạn RAM (giữ tối đa 8 stack OS thread)'
              ], { icon: 'cpu' })
            },
            links: {
              c_q: D.link('cli', 'q', { label: '200 request' }),
              q_p: D.link('q', 'pool', { label: '8 tác vụ / đợt', tone: 'amber' })
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
            conn: { val: '200 → 10 000+ conn', level: 'good' },
            wait: { val: '1,2 giây', level: 'good' },
            ram: { val: 'Vài KB / v-thread', level: 'good' },
            safe: { val: 'Graceful shutdown', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12.5, -8.5, -0.2, 4.6, 14, '200+ kết nối đồng thời'),
              jvmZ: D.zone(-4.8, 13.5, -1.6, 6.8, 'JVM VIRTUAL THREAD SCHEDULER (JEP 444)', { tone: 'green' }),
              vt: D.block(-0.5, 2.2, { color: 'green', glyph: 'layers', halo: 'green', label: ['Virtual Threads'], sub: 'Unmount khi chờ I/O', tags: [{ text: '1,2 s / 200 kết nối', tone: 'green' }] }),
              cpu: D.rack(10, 2.2, '8 Carrier Threads', { color: 'teal', glyph: 'cpu', slots: 4, cpu: 0.72, sub: '8 lõi CPU bận đều' }),
              pn: D.panel(0, -4.8, 'So sánh thực nghiệm (200 kết nối × 1 s I/O)', [
                '# FixedThreadPool(8):   25,5 giây (block OS thread)',
                '+ Virtual Thread (8 lõi): 1,2 giây (nhanh gấp 21×!)'
              ], { icon: 'layers' })
            },
            links: {
              c_v: D.link('cli', 'vt', { label: '1 v-thread / client', tone: 'green' }),
              v_c: D.link('vt', 'cpu', { label: 'Ghép kênh M:N', tone: 'green' })
            },
            flows: [
              D.flow(['c_v', 'v_c'], { rate: 2.8, kind: 'req' }),
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
      legend: ['ping', 'res', 'heavy', 'kill', 'msg'],
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
              cli: D.dev(-11, 2.2, 'UDP Client', { halo: 'blue', tags: [{ text: 'DatagramPacket 48B', tone: 'blue' }] }),
              net: D.cloud(0, 2.2, ['Mạng IP (0 RTT)'], { color: 'teal', sub: 'Không cần bắt tay' }),
              srv: D.rack(11, 2.2, 'SNTP / Ping Server', { color: 'teal', sub: 'UDP :12000', tags: [{ text: 'Stateless', tone: 'paper' }] }),
              fr: D.frame(0, -4.6, 'Cấu trúc UDP Datagram Header (tối giản 8 byte)', [
                { label: 'Src Port', sub: '2 byte', tone: 'paper' },
                { label: 'Dst Port', sub: ':12000 (2B)', tone: 'blue' },
                { label: 'Length', sub: '2 byte', tone: 'teal' },
                { label: 'Checksum', sub: '2 byte', tone: 'amber' },
                { label: 'Payload', sub: '48 B nguyên ranh giới ✓', tone: 'green', active: true }
              ], { icon: 'packet' })
            },
            links: {
              c_n: D.link('cli', 'net', { label: 'send(packet)', tone: 'green' }),
              n_s: D.link('net', 'srv', { label: 'Gửi thẳng datagram', tone: 'green' }),
              s_c: D.link('srv', 'cli', { label: 'Phản hồi 1 gói', style: 'dashed', via: [[0, -1.2]] })
            },
            flows: [
              D.flow(['c_n', 'n_s'], { rate: 1.6, kind: 'ping' }),
              D.flow(['s_c'], { rate: 1.3, kind: 'res' })
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
            loss: { val: '2/10 gói mất', level: 'warn' },
            bw: { val: 'Không retransmit', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 2.6, 'PingClient', { halo: 'amber', tags: [{ text: 'Timeout = 1 000 ms', tone: 'amber' }] }),
              net: D.cloud(0, 2.6, ['Mạng mất gói'], { color: 'red', glyph: 'alert', heat: 0.55, sub: 'Rơi Ping #1, #4' }),
              srv: D.rack(11.5, 2.6, 'PingServer :12000', { color: 'blue', sub: 'Trả PONG viết hoa' }),
              fr: D.frame(0, -4.6, 'Kết quả đo 10 gói UDP Pinger (Kurose & Ross)', [
                { label: 'Ping #0', sub: 'RTT 2 ms ✓', tone: 'green' },
                { label: 'Ping #1', sub: 'MẤT (Timeout)', tone: 'red', active: true },
                { label: 'Ping #2–3', sub: 'RTT ~2 ms ✓', tone: 'green' },
                { label: 'Ping #4', sub: 'MẤT (Timeout)', tone: 'red', active: true },
                { label: 'Ping #5–9', sub: 'RTT ~2 ms ✓', tone: 'green' }
              ], { icon: 'packet' })
            },
            links: {
              c_n: D.link('cli', 'net', { label: '10 gói PING' }),
              n_s: D.link('net', 'srv', { label: 'Đến 8 gói', tone: 'amber', fail: 0.35 }),
              s_c: D.link('srv', 'cli', { label: 'PONG · RTT ~2 ms', tone: 'green', style: 'dashed', via: [[0, -1.2]] })
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
            loss: { val: 'Nghẽn đường trục', level: 'bad' },
            bw: { val: 'N × 4 Mbps (lãng phí)', level: 'bad' }
          },
          scene: {
            entities: {
              src: D.rack(-11.5, 1.5, 'Nguồn phát Video', { color: 'red', heat: 0.85, cpu: 0.92, sub: 'Nhân bản N lần', tags: [{ text: 'Nghẽn băng thông!', tone: 'red' }] }),
              rt: D.router(-1.5, 1.5, 'Router đường trục', { color: 'red', heat: 0.6, sub: 'N × 4 Mbps' }),
              r1: D.dev(10.5, 6.0, 'Máy nhận #1'),
              r2: D.dev(10.5, 1.5, 'Máy nhận #2'),
              r3: D.dev(10.5, -3.5, 'Máy nhận #N'),
              pn: D.panel(-6.5, -5.0, 'Tải băng thông Unicast', [
                '! 50 máy xem = 50 dòng riêng = 200 Mbps',
                '! CPU server tăng tuyến tính theo N'
              ], { icon: 'alert' })
            },
            links: {
              s_r: D.link('src', 'rt', { label: 'N bản sao đè trục', tone: 'red' }),
              l1: D.link('rt', 'r1', { label: 'Bản sao 1 (4 Mbps)', tone: 'red' }),
              l2: D.link('rt', 'r2', { label: 'Bản sao 2 (4 Mbps)', tone: 'red' }),
              l3: D.link('rt', 'r3', { label: 'Bản sao N (4 Mbps)', tone: 'red' })
            },
            flows: [
              D.flow(['s_r', 'l1'], { rate: 2.0, kind: 'heavy' }),
              D.flow(['s_r', 'l2'], { rate: 2.0, kind: 'heavy' }),
              D.flow(['s_r', 'l3'], { rate: 2.0, kind: 'heavy' })
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
            loss: { val: 'TTL = 1 (trong LAN)', level: 'good' },
            bw: { val: '1 × 4 Mbps (cố định)', level: 'good' }
          },
          scene: {
            entities: {
              src: D.rack(-11.5, 0.5, 'Nguồn phát Video', { color: 'green', cpu: 0.18, sub: '1 gói → 239.0.0.1', tags: [{ text: 'TTL = 1', tone: 'green' }] }),
              rt: D.router(-1.5, 0.5, 'Multicast Router', { color: 'teal', halo: 'green', sub: 'IGMP nhân bản nhánh' }),
              grp: D.zone(6.2, 14.2, -6.5, 7.6, 'NHÓM MULTICAST 239.0.0.1', { tone: 'green' }),
              r1: D.dev(10.2, 5.2, 'Thành viên #1'),
              r2: D.dev(10.2, 0.5, 'Thành viên #2'),
              r3: D.dev(10.2, -4.2, 'Thành viên #N')
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
              cli: D.dev(-11, 2.4, 'Trình duyệt Chat', { tags: [{ text: 'Hỏi mỗi 1 giây', tone: 'amber' }] }),
              net: D.cloud(0, 2.4, ['HTTP/1.1 Polling'], { color: 'amber', sub: 'Lặp ~600 B header' }),
              srv: D.rack(11, 2.4, 'HTTP Server', { color: 'amber', cpu: 0.78, sub: '95% request trả rỗng' }),
              fr: D.frame(0, -4.6, 'Nhược điểm lặp HTTP Polling mỗi 1 giây', [
                { label: 'GET /messages', sub: '~600 B header lặp', tone: 'amber' },
                { label: '200 OK []', sub: 'Rỗng 95% số lần!', tone: 'red', active: true },
                { label: 'Độ trễ trung bình', sub: '500–1 000 ms', tone: 'amber' }
              ], { icon: 'packet' })
            },
            links: {
              q1: D.link('cli', 'net', { label: 'GET /messages', tone: 'amber' }),
              q2: D.link('net', 'srv', { label: '600B header', tone: 'amber' }),
              r: D.link('srv', 'cli', { label: '200 OK [] (rỗng)', style: 'dashed', via: [[0, -1.2]] })
            },
            flows: [
              D.flow(['q1', 'q2'], { rate: 2.6, kind: 'req' }),
              D.flow(['r'], { rate: 2.2, kind: 'res' })
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
            mode: { val: 'Upgrade → WS', level: 'good' },
            status: { val: '101 Switching', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 2.6, 'WebSocket Client', { halo: 'blue', tags: [{ text: 'Sec-WebSocket-Key', tone: 'blue' }] }),
              hs: D.firewall(0, 2.6, 'RFC 6455 Upgrade', { color: 'violet', glyph: 'shield', sub: 'SHA-1 + Base64' }),
              srv: D.rack(11.5, 2.6, 'Chat Server', { color: 'green', sub: '101 Switching' }),
              fr: D.frame(0, -4.6, 'Trao đổi Header nâng cấp kết nối (RFC 6455)', [
                { label: 'Upgrade: websocket', sub: 'GET /chat HTTP/1.1', tone: 'blue' },
                { label: 'SHA-1 + Base64', sub: 'Key + GUID chuẩn', tone: 'violet' },
                { label: '101 Switching', sub: 'Sec-WebSocket-Accept ✓', tone: 'green', active: true }
              ], { icon: 'packet' })
            },
            links: {
              c_h: D.link('cli', 'hs', { label: 'GET /chat Upgrade' }),
              h_s: D.link('hs', 'srv', { label: 'Xác thực khóa' }),
              s_c: D.link('srv', 'cli', { label: '101 Accept', tone: 'green', style: 'dashed', via: [[0, -1.5]] })
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
            mode: { val: 'Song công (Duplex)', level: 'good' },
            status: { val: 'OPEN', level: 'good' }
          },
          scene: {
            entities: {
              a: D.dev(-11.5, 2.2, 'Người dùng A', { halo: 'green', tags: [{ text: 'Frame 6B (masked)', tone: 'blue' }] }),
              hub: D.rack(-0.5, 2.2, 'Chat Room Hub', { color: 'green', slots: 4, sub: 'ConcurrentHashMap' }),
              b: D.dev(11, 5.4, 'Người dùng B'),
              c: D.dev(11, -0.8, 'Người dùng C'),
              fr: D.frame(-1, -5.0, 'Cấu trúc khung WebSocket (chỉ 2–14 byte overhead)', [
                { label: 'FIN=1 · Op=Text', sub: '2 byte cơ bản', tone: 'teal' },
                { label: 'Masking Key', sub: '4 byte (C→S)', tone: 'amber' },
                { label: 'Payload', sub: '"Chào lớp" (<15 ms) ✓', tone: 'green', active: true }
              ], { icon: 'packet' })
            },
            links: {
              a_h: D.link('a', 'hub', { label: 'Frame: "Chào lớp"', tone: 'green' }),
              h_b: D.link('hub', 'b', { label: 'Push tức thì', tone: 'green' }),
              h_c: D.link('hub', 'c', { label: 'Push tức thì', tone: 'green' })
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
            mode: { val: 'Keep-alive + Close', level: 'good' },
            status: { val: '1000 Normal', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 2.5, 'WebSocket Client', { halo: 'green', tags: [{ text: 'Tự trả Pong + Reconnect', tone: 'green' }] }),
              nat: D.router(0, 2.5, 'NAT / Proxy', { color: 'teal', sub: 'Giữ bảng phiên sống' }),
              srv: D.rack(11.5, 2.5, 'Chat Server', { color: 'teal', sub: 'Heartbeat 30 s', tags: [{ text: 'Dọn phiên chết', tone: 'paper' }] }),
              pn: D.panel(0, -4.6, 'Khung điều khiển WebSocket (Control Frames)', [
                '+ Ping (0x9) → Pong (0xA) mỗi 30 s giữ NAT không cắt phiên',
                '~ Quá hạn không thấy Pong → thu hồi phiên chết ngay',
                '# Đóng kết nối sạch: Close frame mã 1000 Normal Closure'
              ], { icon: 'wifi' })
            },
            links: {
              s_n: D.link('srv', 'nat', { label: 'Ping (0x9)', style: 'beat', tone: 'green' }),
              n_c: D.link('nat', 'cli', { label: 'Giữ phiên sống', style: 'beat', tone: 'green' }),
              pong: D.link('cli', 'srv', { label: 'Pong (0xA)', style: 'dashed', via: [[0, -1.2]] })
            },
            flows: [
              D.flow(['s_n', 'n_c'], { rate: 1.6, kind: 'ping' }),
              D.flow(['pong'], { rate: 1.4, kind: 'res' })
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
      legend: ['req', 'res', 'msg', 'heavy', 'kill', 'ping'],
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
              cli: D.dev(-11, 2.2, 'Trình duyệt'),
              pipe: D.queue(0, 2.2, '1 Kết nối TCP (tuần tự)', { n: 5, slots: 6, color: 'red', tags: [{ text: 'JS nặng chặn CSS', tone: 'red' }] }),
              srv: D.rack(11, 2.2, 'HTTP/1.1 Server', { color: 'amber', sub: 'Trả lần lượt từng tệp' }),
              fr: D.frame(0, -4.5, 'Tắc đầu hàng ở tầng ứng dụng (HTTP/1.1)', [
                { label: 'app.js (chậm!)', sub: 'Đang chiếm ống TCP', tone: 'red', active: true },
                { label: 'style.css', sub: 'Bị chặn chờ', tone: 'amber' },
                { label: 'logo.png', sub: 'Bị chặn chờ', tone: 'amber' }
              ], { icon: 'layers', pointers: [{ idx: 0, label: 'Chặn mọi tệp sau!', tone: 'red' }] })
            },
            links: {
              c_p: D.link('cli', 'pipe', { label: 'GET app.js → css' }),
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
              cli: D.dev(-11, 2.2, 'HttpClient HTTP/2', { halo: 'green', tags: [{ text: 'HPACK nén header', tone: 'green' }] }),
              mux: D.block(0, 2.2, { color: 'green', glyph: 'layers', label: ['Binary Framing'], sub: 'Stream 1 · 3 · 5', tags: [{ text: '1 TCP duy nhất', tone: 'green' }] }),
              srv: D.rack(11, 2.2, 'HTTP/2 Server', { color: 'blue', sub: 'Giải mã Stream ID' }),
              fr: D.frame(0, -4.6, 'Ghép kênh nhị phân HTTP/2 trên 1 kết nối TCP', [
                { label: 'S1: HTML', sub: 'Frame #1', tone: 'blue' },
                { label: 'S3: CSS', sub: 'Frame #1', tone: 'green', active: true },
                { label: 'S5: JS', sub: 'Frame #1', tone: 'violet' },
                { label: 'S1: HTML', sub: 'Frame #2', tone: 'blue' },
                { label: 'S3: CSS', sub: 'Frame #2', tone: 'green' }
              ], { icon: 'layers', note: 'Các frame nhỏ xen kẽ nhau theo Stream ID — hết tắc tầng HTTP' })
            },
            links: {
              c_m: D.link('cli', 'mux', { label: 'Frame S1, S3, S5', tone: 'green' }),
              m_s: D.link('mux', 'srv', { label: 'Multiplexing 1 TCP', tone: 'green' })
            },
            flows: [
              D.flow(['c_m', 'm_s'], { rate: 2.5, kind: 'req' }),
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
              cli: D.dev(-11, 2.2, 'Điện thoại 4G', { kind: 'phone', halo: 'red', tags: [{ text: 'Mạng 4G mất gói', tone: 'red' }] }),
              tcp: D.cloud(0, 2.2, ['TCP Buffer chặn'], { color: 'red', heat: 0.85, glyph: 'alert', sub: 'Mất S1 → giữ S3, S5', tags: [{ text: 'TCP HOL Blocking', tone: 'red' }] }),
              srv: D.rack(11, 2.2, 'HTTP/2 Server', { color: 'amber', sub: 'Chờ gửi lại gói S1' }),
              fr: D.frame(0, -4.5, 'TCP bắt buộc đúng thứ tự toàn cục → 1 gói mất chặn tất cả', [
                { label: 'Gói Stream 1', sub: 'MẤT GIỮA ĐƯỜNG ✕', tone: 'red', active: true },
                { label: 'Gói Stream 3', sub: 'Đã tới · bị giữ chờ!', tone: 'amber' },
                { label: 'Gói Stream 5', sub: 'Đã tới · bị giữ chờ!', tone: 'amber' }
              ], { icon: 'alert', pointers: [{ idx: 0, label: 'Chờ TCP retransmit', tone: 'red' }] })
            },
            links: {
              c_t: D.link('cli', 'tcp', { label: 'Mất 1 segment TCP', tone: 'red', fail: 0.45 }),
              t_s: D.link('tcp', 'srv', { label: 'S3, S5 bị giữ chờ', style: 'cut', tone: 'red' })
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
            hs: { val: '1-RTT / 0-RTT', level: 'good' },
            mig: { val: 'Giữ phiên (Conn ID)', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-12, 2.2, 'Điện thoại HTTP/3', { kind: 'phone', halo: 'green', tags: [{ text: 'Wi-Fi → 4G mượt mà', tone: 'green' }] }),
              rt: D.router(-4.5, 2.2, 'Wi-Fi / 4G', { color: 'teal', sub: 'Đổi IP giữ Conn ID' }),
              s1: D.block(3.5, 5.0, { color: 'amber', glyph: 'wifi', label: ['QUIC Stream 1'], sub: 'Gửi lại riêng S1' }),
              s2: D.block(3.5, -0.4, { color: 'green', glyph: 'wifi', label: ['QUIC Stream 3 & 5'], sub: 'Chạy tiếp không chờ!' }),
              srv: D.rack(12, 2.2, 'HTTP/3 Server', { color: 'green', sub: 'TLS 1.3 + QPACK' }),
              fr: D.frame(0, -5.2, 'QUIC trên UDP: Stream độc lập + Connection ID', [
                { label: 'Conn ID 0x9F2A', sub: 'Bền khi đổi Wi-Fi→4G', tone: 'blue' },
                { label: 'Stream 1', sub: 'Truyền lại riêng lẻ', tone: 'amber' },
                { label: 'Stream 3 & 5', sub: 'Giao ngay không nghẽn ✓', tone: 'green', active: true }
              ], { icon: 'wifi' })
            },
            links: {
              c_r: D.link('cli', 'rt', { label: 'UDP :443', tone: 'green' }),
              r_1: D.link('rt', 's1', { label: 'Rớt riêng S1', tone: 'amber', fail: 0.3 }),
              r_2: D.link('rt', 's2', { label: 'Conn ID', tone: 'green' }),
              s1_srv: D.link('s1', 'srv', { label: 'Retransmit S1', style: 'dashed' }),
              s2_srv: D.link('s2', 'srv', { label: 'Giao ngay', tone: 'green' })
            },
            flows: [
              D.flow(['c_r', 'r_2', 's2_srv'], { rate: 2.5, kind: 'res' }),
              D.flow(['c_r', 'r_1', 's1_srv'], { rate: 1.2, kind: 'ping', fail: 0.3 })
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
            contract: { val: 'java.rmi.Remote', level: '' },
            lang: { val: 'Chỉ Java ↔ Java', level: 'bad' },
            stream: { val: 'Unary đồng bộ', level: '' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 1.8, 'RMI Client', { tags: [{ text: 'Idempotency-Key', tone: 'amber' }] }),
              reg: D.block(0, 5.8, { color: 'orange', glyph: 'search', label: ['RMI Registry'], sub: 'Tra Stub :1099' }),
              srv: D.rack(11, 1.8, 'BankAccount Server', { color: 'blue', sub: 'synchronized + Key' }),
              pn: D.panel(0, -4.4, 'Giới hạn của Java RMI', [
                '> Tra Registry lấy Stub → đóng gói Java Serialization',
                '! Mất gói khi retry transfer() cần Idempotency-Key',
                '# Ràng buộc chặt vào cùng ngôn ngữ Java ở hai đầu'
              ], { icon: 'code' })
            },
            links: {
              c_r: D.link('cli', 'reg', { label: 'lookup("Bank")', style: 'dashed' }),
              c_s: D.link('cli', 'srv', { label: 'Stub → transfer(key, 500)' }),
              s_c: D.link('srv', 'cli', { label: 'Số dư mới', tone: 'green', style: 'dashed', via: [[0, -0.4]] })
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
            fmt: { val: 'JSON (UTF-8)', level: 'good' },
            contract: { val: 'OpenAPI / RFC 9110', level: 'good' },
            lang: { val: 'Mọi nền tảng & Web', level: 'good' },
            stream: { val: 'Request / Response', level: '' }
          },
          scene: {
            entities: {
              web: D.dev(-11.5, 4.6, 'Mobile / Web', { kind: 'phone' }),
              py: D.dev(-11.5, -0.6, 'Python / curl'),
              api: D.rack(0.5, 2.0, 'Petstore REST API', { color: 'green', glyph: 'gateway', halo: 'green', sub: '/pet/{id}', tags: [{ text: 'Stateless + JSON', tone: 'green' }] }),
              db: D.db(11.5, 2.0, 'Pet DB', { color: 'purple', sub: 'PostgreSQL' }),
              fr: D.frame(0, -5.0, 'Ngữ nghĩa REST trên HTTP (Petstore)', [
                { label: 'GET /pet/101', sub: '200 OK · đọc', tone: 'blue' },
                { label: 'POST /pet', sub: '201 Created · thêm', tone: 'green', active: true },
                { label: 'JSON UTF-8', sub: 'Đọc dễ · Đa ngôn ngữ', tone: 'amber' }
              ], { icon: 'gateway' })
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
            contract: { val: 'route_guide.proto', level: 'good' },
            lang: { val: 'Sinh mã đa ngôn ngữ', level: 'good' },
            stream: { val: 'Unary trên HTTP/2', level: 'good' }
          },
          scene: {
            entities: {
              proto: D.block(-11, 5.4, { color: 'violet', glyph: 'code', label: ['route_guide.proto'], sub: 'Hợp đồng nguồn duy nhất' }),
              cli: D.dev(-11, -0.4, 'gRPC Client Stub', { sub: 'GetFeature(Point)' }),
              h2: D.block(0.5, 2.2, { color: 'teal', glyph: 'layers', label: ['Protobuf + HTTP/2'], sub: 'Mã hóa varint', tags: [{ text: 'Kiểm kiểu lúc dịch', tone: 'green' }] }),
              srv: D.rack(11.5, 2.2, 'RouteGuide Server', { color: 'green', sub: '8 địa danh Hà Nội' }),
              fr: D.frame(0.5, -5.0, 'So sánh kích thước cùng 1 bản ghi Point(lat, lon)', [
                { label: 'JSON văn bản', sub: '~58 byte (lặp tên trường)', tone: 'amber' },
                { label: 'Protobuf (field tag + varint)', sub: '~14 byte (nhỏ gọn 4×) ✓', tone: 'green', active: true }
              ], { icon: 'binary' })
            },
            links: {
              pr_c: D.link('proto', 'cli', { label: 'protoc sinh stub', style: 'dashed' }),
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
            stream: { val: 'Bi-Dir + Deadline', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 2.2, 'gRPC Client', { halo: 'blue', tags: [{ text: 'Deadline = 2 s', tone: 'amber' }] }),
              s1: D.block(0, 5.2, { color: 'green', glyph: 'layers', label: ['Server / Client Stream'], sub: 'ListFeatures · RecordRoute' }),
              s2: D.block(0, -0.4, { color: 'violet', glyph: 'layers', label: ['Bidirectional Stream'], sub: 'RouteChat song công' }),
              srv: D.rack(11.5, 2.2, 'RouteGuide Server', { color: 'green', sub: 'OK / DEADLINE' }),
              fr: D.frame(0, -5.2, '4 chế độ giao tiếp trên cùng kênh HTTP/2', [
                { label: 'Unary', sub: '1 → 1', tone: 'paper' },
                { label: 'Server Stream', sub: '1 → N', tone: 'green' },
                { label: 'Client Stream', sub: 'N → 1', tone: 'blue' },
                { label: 'Bi-Directional', sub: 'N ↔ N + Deadline ✓', tone: 'violet', active: true }
              ], { icon: 'layers' })
            },
            links: {
              c_1: D.link('cli', 's1', { label: 'Stream GPS', tone: 'green' }),
              s1_s: D.link('s1', 'srv', { label: 'Nhiều msg / 1 RPC', tone: 'green' }),
              c_2: D.link('cli', 's2', { label: 'Gửi nhận đồng thời', tone: 'green', both: true }),
              s2_s: D.link('s2', 'srv', { label: '2 chiều HTTP/2', tone: 'green', both: true })
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
            ex: { val: 'Direct/Fanout/Topic', level: '' },
            ack: { val: 'Đang thiết lập', level: '' },
            qos: { val: 'Mặc định', level: '' },
            dur: { val: 'Queue bền vững', level: 'good' }
          },
          scene: {
            entities: {
              pub: D.rack(-11.5, 2.0, 'Order Producer', { color: 'blue', sub: 'publish(ex, key)' }),
              brkZ: D.zone(-4.8, 13.8, -2.6, 7.6, 'RABBITMQ BROKER (AMQP)', { tone: 'amber' }),
              ex: D.router(-1.0, 2.0, 'Exchange', { color: 'orange', wifi: false, sub: 'Khớp Binding' }),
              q1: D.queue(9.5, 4.8, 'orders.email', { n: 3, slots: 6, color: 'green' }),
              q2: D.queue(9.5, -0.8, 'orders.analytics', { n: 2, slots: 6, color: 'purple' }),
              fr: D.frame(0, -5.2, 'Chuỗi định tuyến AMQP (Producer tách rời Consumer)', [
                { label: 'Producer', sub: 'Gửi routing key', tone: 'blue' },
                { label: 'Exchange', sub: 'Direct · Fanout · Topic', tone: 'orange', active: true },
                { label: 'Binding', sub: 'Luật lọc khóa', tone: 'amber' },
                { label: 'Queues', sub: 'Lưu đệm bền vững ✓', tone: 'green' }
              ], { icon: 'queue' })
            },
            links: {
              p_e: D.link('pub', 'ex', { label: 'Msg + routing key' }),
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
            dur: { val: 'Durable + Persist', level: 'good' }
          },
          scene: {
            entities: {
              q: D.queue(-10, 2.2, 'task_queue (Durable)', { n: 4, slots: 6, color: 'orange', tags: [{ text: 'Giữ bản sao đĩa', tone: 'amber' }] }),
              w1: D.rack(4.5, 5.2, 'Worker email-1', { color: 'red', dead: 0.85, sub: 'Sập trước Ack' }),
              w2: D.rack(4.5, -0.6, 'Worker email-2', { color: 'green', halo: 'green', sub: 'Nhận lại & Ack', tags: [{ text: 'Không mất đơn!', tone: 'green' }] }),
              pn: D.panel(-2, -5.0, 'Cơ chế At-Least-Once với Manual Ack', [
                '! email-1 mất kết nối trước khi gửi basicAck()',
                '+ Broker tự trả đơn về queue và redeliver sang email-2',
                '~ email-2 xử lý idempotent theo orderId tránh gửi 2 thư'
              ], { icon: 'shield' })
            },
            links: {
              q_1: D.link('q', 'w1', { label: 'Mất kết nối', tone: 'red', style: 'cut', fail: 0.9 }),
              q_2: D.link('q', 'w2', { label: 'Giao lại (redeliver)', tone: 'green' })
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
              q: D.queue(-10, 2.2, 'orders.email', { n: 3, slots: 6, color: 'orange', tags: [{ text: 'basicQos(1)', tone: 'green' }] }),
              w1: D.rack(5.5, 5.2, 'Worker chậm', { color: 'amber', cpu: 0.9, sub: 'Giữ 1 unacked' }),
              w2: D.rack(5.5, -0.6, 'Worker nhanh', { color: 'green', halo: 'green', cpu: 0.45, sub: 'Rảnh → nhận ngay', tags: [{ text: 'Chia tải công bằng', tone: 'green' }] }),
              pn: D.panel(-2, -5.0, 'Fair Dispatch (prefetchCount = 1)', [
                '~ Worker chậm đang giữ 1 đơn nặng → broker không dồn thêm',
                '+ Worker nhanh xong việc & ack → lập tức nhận đơn kế tiếp'
              ], { icon: 'balancer' })
            },
            links: {
              q_1: D.link('q', 'w1', { label: '1 unacked (chờ)', style: 'dashed' }),
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
            ack: { val: 'Manual Ack + Idemp.', level: 'good' },
            qos: { val: 'Fair Dispatch', level: 'good' },
            dur: { val: 'Tách rời hoàn toàn', level: 'good' }
          },
          scene: {
            entities: {
              pub: D.rack(-12, 0.5, 'Order Service', { color: 'blue', sub: 'key = order.hn.1001' }),
              brkZ: D.zone(-5.5, 13.8, -6.8, 7.8, 'TOPIC EXCHANGE: orders.topic', { tone: 'amber' }),
              ex: D.router(-1.8, 0.5, 'orders.topic', { color: 'orange', wifi: false, sub: 'Wildcard * và #' }),
              qhn: D.queue(9.2, 5.4, 'orders.hanoi', { n: 2, slots: 5, color: 'green', tags: [{ text: 'order.hn.*', tone: 'green' }] }),
              qem: D.queue(9.2, 0.5, 'orders.email', { n: 3, slots: 5, color: 'blue', tags: [{ text: 'order.#', tone: 'blue' }] }),
              qan: D.queue(9.2, -4.4, 'orders.analytics', { n: 2, slots: 5, color: 'purple', tags: [{ text: 'order.#', tone: 'violet' }] })
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
              cli: D.dev(-11, 2.2, 'Client Java'),
              tap: D.cloud(0, 2.2, ['Kẻ nghe lén (MITM)'], { color: 'red', heat: 0.85, glyph: 'alert', sub: 'Wi-Fi công cộng', tags: [{ text: 'Plaintext bị lộ!', tone: 'red' }] }),
              srv: D.rack(11, 2.2, 'API Server :80', { color: 'amber', sub: 'HTTP chữ rõ' }),
              fr: D.frame(0, -4.6, 'Gói tin HTTP không mã hóa bị đọc trọn trên đường dây', [
                { label: 'GET /pet/101', sub: 'Chữ rõ', tone: 'amber' },
                { label: 'Authorization: Bearer ...', sub: 'LỘ TOKEN / MẬT KHẨU! ✕', tone: 'red', active: true },
                { label: 'JSON Body', sub: 'Dễ bị sửa đổi', tone: 'red' }
              ], { icon: 'alert' })
            },
            links: {
              c_t: D.link('cli', 'tap', { label: 'GET /pet (chữ rõ)', tone: 'red' }),
              t_s: D.link('tap', 'srv', { label: 'Đọc & sửa gói', tone: 'red' })
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
              cli: D.dev(-11.5, 1.8, 'SSLSocket Client', { halo: 'green', tags: [{ text: 'TrustStore JVM', tone: 'blue' }] }),
              ca: D.block(0, 6.0, { color: 'violet', glyph: 'cert', label: ['Root CA Tin cậy'], sub: 'Chuỗi X.509 hợp lệ' }),
              tls: D.firewall(0, 0.2, 'Kênh TLS 1.3', { color: 'green', glyph: 'lock', sub: 'AES-GCM AEAD' }),
              srv: D.rack(11.5, 1.8, 'ptit.edu.vn :443', { color: 'green', sub: 'X.509 + Private Key' }),
              fr: D.frame(0, -5.2, 'Bắt tay TLS 1.3 (1-RTT + Forward Secrecy)', [
                { label: 'ClientHello', sub: 'ECDHE Key Share', tone: 'blue' },
                { label: 'ServerHello', sub: 'Cert X.509 + Chữ ký', tone: 'violet' },
                { label: 'Xác minh CA', sub: 'TrustStore + SAN', tone: 'teal' },
                { label: 'AES-GCM', sub: 'Bản ghi mã hóa ✓', tone: 'green', active: true }
              ], { icon: 'lock' })
            },
            links: {
              c_ca: D.link('cli', 'ca', { label: 'Kiểm chữ ký CA', style: 'dashed' }),
              c_t: D.link('cli', 'tls', { label: 'ClientHello (ECDHE)', tone: 'green' }),
              t_s: D.link('tls', 'srv', { label: 'Bản ghi mã hóa', tone: 'green', both: true })
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
            conf: { val: 'Ngắt trước khi gửi', level: 'good' },
            auth: { val: 'Từ chối cert lỗi', level: 'bad' },
            hs: { val: 'HandshakeException', level: 'bad' },
            perm: { val: 'Không rò rỉ dữ liệu', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 2.2, 'TlsCheck Client'),
              chk: D.firewall(0, 2.2, 'Xác minh X.509', { color: 'amber', glyph: 'shield', sub: 'Chặn cert lỗi', tags: [{ text: 'Ngắt ngay lập tức', tone: 'red' }] }),
              bad: D.rack(11, 2.2, 'badssl.com', { color: 'red', heat: 0.75, sub: 'Chứng chỉ không hợp lệ' }),
              fr: D.frame(0, -4.6, '4 lỗi chứng chỉ bắt buộc chặn (badssl.com)', [
                { label: 'expired', sub: 'Quá hạn dùng ✕', tone: 'red' },
                { label: 'wrong.host', sub: 'Sai SAN / tên miền ✕', tone: 'red', active: true },
                { label: 'self-signed', sub: 'Tự ký chưa tin cậy ✕', tone: 'red' },
                { label: 'untrusted-root', sub: 'CA ngoài TrustStore ✕', tone: 'red' }
              ], { icon: 'shield' })
            },
            links: {
              c_k: D.link('cli', 'chk', { label: 'Kiểm chứng chỉ' }),
              k_b: D.link('chk', 'bad', { label: 'SSLHandshakeException', tone: 'red', style: 'cut', fail: 0.9 })
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
            auth: { val: 'X.509 + RS256', level: 'good' },
            hs: { val: 'Stateless JWT', level: 'good' },
            perm: { val: 'Scope write:pets', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11.5, 1.8, 'Petstore Client', { halo: 'green', tags: [{ text: 'Bearer JWT (RS256)', tone: 'blue' }] }),
              as: D.rack(0, 5.8, 'Auth Server', { color: 'purple', glyph: 'key', sub: 'Cấp JWT + JWKS' }),
              gw: D.firewall(0, 0.0, 'HTTPS + JWT Guard', { color: 'green', glyph: 'lock', sub: 'Kiểm RS256 + scope' }),
              rs: D.rack(11.5, 1.8, 'Petstore API', { color: 'green', sub: 'PUT /pet/101 → 200', tags: [{ text: '200 OK', tone: 'green' }] }),
              fr: D.frame(0, -5.2, 'Cấu trúc JWT (RFC 7519) đặt trong kênh HTTPS', [
                { label: 'Header', sub: 'alg: RS256 · typ: JWT', tone: 'blue' },
                { label: 'Payload', sub: 'sub · scope:write:pets · exp', tone: 'violet', active: true },
                { label: 'Signature', sub: 'Kiểm bằng Public Key (JWKS) ✓', tone: 'green' }
              ], { icon: 'key' })
            },
            links: {
              c_a: D.link('cli', 'as', { label: 'Lấy Access Token', style: 'dashed' }),
              a_r: D.link('as', 'rs', { label: 'Public Key (JWKS)', style: 'dashed' }),
              c_g: D.link('cli', 'gw', { label: 'HTTPS + Bearer JWT', tone: 'green' }),
              g_r: D.link('gw', 'rs', { label: 'Hợp lệ · đủ scope', tone: 'green' })
            },
            flows: [D.flow(['c_g', 'g_r'], { rate: 2.0, kind: 'req' })]
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
            evt: { val: 'Ngủ trên read()', level: 'bad' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12, -7.5, -0.5, 5.0, 16, '10 000 kết nối mở'),
              srv: D.rack(7.5, 2.2, 'Blocking Server', { color: 'red', heat: 0.9, cpu: 0.96, slots: 4, sub: '~10 GB RAM stack', tags: [{ text: 'Nghẽn C10K!', tone: 'red' }] }),
              pn: D.panel(0, -4.6, 'Nút thắt mô hình 1 OS thread / 1 socket (Kegel C10K)', [
                '! 10 000 thread × ~1 MB stack = ~10 GB RAM dù 99% đang ngủ',
                '! Kernel tốn CPU chuyển ngữ cảnh liên tục giữa các thread'
              ], { icon: 'alert' })
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
            mode: { val: 'Non-Blocking', level: 'good' },
            evt: { val: 'OP_ACCEPT / READ', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12.5, -8.5, -0.5, 4.8, 16, '10 000 SocketChannel'),
              sel: D.router(-0.8, 2.2, 'NIO Selector', { color: 'teal', wifi: false, halo: 'green', sub: 'epoll / kqueue / IOCP', tags: [{ text: 'select() ready keys', tone: 'green' }] }),
              loop: D.rack(10.8, 2.2, 'Event-Loop Thread', { color: 'green', cpu: 0.28, sub: 'Chỉ xử lý kênh sẵn' }),
              pn: D.panel(0, -4.6, 'I/O Multiplexing dưới nhân hệ điều hành', [
                '+ Kernel theo dõi 10 000 fd, chỉ trả về tập selectedKeys sẵn sàng',
                '+ 1 thread Event-Loop xử lý nhẹ nhàng mà không block trên read()'
              ], { icon: 'cpu' })
            },
            links: {
              c_s: D.link('cli', 'sel', { label: 'Đăng ký không chặn', tone: 'green' }),
              s_l: D.link('sel', 'loop', { label: 'SelectedKeys sẵn sàng', tone: 'green' })
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
            c10k: { val: 'Buffer theo kết nối', level: 'good' },
            th: { val: '1 thread không block', level: 'good' },
            mode: { val: 'Channel ↔ Buffer', level: 'good' },
            evt: { val: 'flip() / compact()', level: 'good' }
          },
          scene: {
            entities: {
              ch: D.dev(-11, 2.4, 'SocketChannel', { sub: 'read(buf) trả ngay' }),
              buf: D.block(0, 2.4, { color: 'violet', glyph: 'memory', label: ['ByteBuffer'], sub: 'attach vào SelectionKey' }),
              out: D.rack(11, 2.4, 'Echo Writer', { color: 'green', sub: 'flip() → write(buf)' }),
              fr: D.frame(0, -4.4, 'Trạng thái ByteBuffer sau khi gọi flip() (chuyển sang đọc để ghi ra kênh)', [
                { label: 'Byte 0', sub: "'H'", tone: 'green', active: true },
                { label: 'Byte 1', sub: "'e'", tone: 'green' },
                { label: 'Byte 2', sub: "'l'", tone: 'green' },
                { label: 'Byte 3', sub: "'l'", tone: 'green' },
                { label: 'Byte 4', sub: "'o'", tone: 'green' },
                { label: 'Byte 5..7', sub: 'Chưa dùng', tone: 'gray' }
              ], {
                icon: 'memory',
                pointers: [
                  { idx: 0, label: 'pos = 0', tone: 'blue' },
                  { idx: 4, label: 'lim = 5', tone: 'violet' },
                  { idx: 5, label: 'cap = 8', tone: 'gray' }
                ]
              })
            },
            links: {
              c_b: D.link('ch', 'buf', { label: 'Ghi byte vào buffer' }),
              b_o: D.link('buf', 'out', { label: 'flip() rồi ghi kênh', tone: 'green' })
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
            c10k: { val: 'Hàng chục nghìn conn', level: 'good' },
            th: { val: 'Event-Loop + Worker', level: 'good' },
            mode: { val: 'Reactor bất đồng bộ', level: 'good' },
            evt: { val: 'Tách I/O khỏi CPU', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12.5, -8.5, -1.0, 4.5, 14, 'Hàng nghìn client'),
              rz: D.zone(-4.8, 13.8, -5.2, 6.8, 'KIẾN TRÚC REACTOR (NETTY · NGINX)', { tone: 'green' }),
              ev: D.router(-1.0, 1.8, 'Reactor Event-Loop', { color: 'green', wifi: false, halo: 'green', sub: 'Chỉ làm I/O không chặn' }),
              wk: D.rack(10.2, 4.2, 'Worker Pool', { color: 'blue', sub: 'Nghiệp vụ & DB' }),
              cf: D.block(10.2, -1.6, { color: 'purple', glyph: 'layers', label: ['CompletableFuture'], sub: 'Fan-out bất đồng bộ' })
            },
            links: {
              c_e: D.link('cli', 'ev', { label: 'I/O không chặn', tone: 'green' }),
              e_w: D.link('ev', 'wk', { label: 'Giao việc nặng' }),
              e_c: D.link('ev', 'cf', { label: 'Async fan-out' })
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
            retry: { val: 'Retry + Request ID', level: 'good' },
            cb: { val: 'CLOSED', level: 'good' },
            dup: { val: 'Khớp ID 16 bit', level: 'good' },
            qos: { val: 'At-least-once UDP', level: '' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 2.4, 'RetryResolver', { halo: 'blue', tags: [{ text: 'txId=0x4A12 + CRC32', tone: 'blue' }] }),
              net: D.cloud(0, 2.4, ['Mạng UDP chập chờn'], { color: 'amber', sub: 'Có thể mất / trễ gói' }),
              srv: D.rack(11, 2.4, 'UDP Name Server', { color: 'teal', sub: 'Kiểm CRC32 · Trả txId' }),
              fr: D.frame(0, -4.6, 'Gói tin tin cậy tự xây ở tầng ứng dụng trên UDP', [
                { label: 'txId (16-bit)', sub: '0x4A12 (ghép đôi)', tone: 'blue', active: true },
                { label: 'Payload', sub: 'Query ptit.edu.vn', tone: 'paper' },
                { label: 'CRC32 (4B)', sub: 'Phát hiện lỗi bit ✓', tone: 'green' }
              ], { icon: 'packet' })
            },
            links: {
              q1: D.link('cli', 'net', { label: 'Query txId=0x4A12', tone: 'amber', fail: 0.3 }),
              q2: D.link('net', 'srv', { label: 'Kiểm CRC32' }),
              r: D.link('srv', 'cli', { label: 'Reply txId=0x4A12 + IP', tone: 'green', style: 'dashed', via: [[0, -1.2]] })
            },
            flows: [
              D.flow(['q1', 'q2'], { rate: 1.8, kind: 'req', fail: 0.3 }),
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
            retry: { val: 'Backoff + Jitter', level: 'good' },
            cb: { val: 'CLOSED', level: 'good' },
            dup: { val: 'Idempotency-Key', level: 'good' },
            qos: { val: 'Trải đều lưu lượng', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.crowd(-12.5, -8.5, -0.2, 4.6, 10, '500 Client thanh toán'),
              jit: D.block(-0.5, 2.2, { color: 'green', glyph: 'gear', halo: 'green', label: ['Backoff + Jitter'], sub: 'Rải đều thời điểm', tags: [{ text: 'Chống Thundering Herd', tone: 'green' }] }),
              pay: D.rack(10.5, 2.2, 'Payment Service', { color: 'blue', cpu: 0.52, sub: 'Hồi phục ổn định' }),
              fr: D.frame(0, -4.6, 'Lịch giãn nhịp Exponential Backoff + Full Jitter', [
                { label: 'Thử lại 1', sub: 'rand(0..100 ms)', tone: 'blue' },
                { label: 'Thử lại 2', sub: 'rand(0..200 ms)', tone: 'teal' },
                { label: 'Thử lại 3', sub: 'rand(0..400 ms)', tone: 'green', active: true },
                { label: 'Idempotency-Key', sub: 'Không trừ tiền 2 lần ✓', tone: 'violet' }
              ], { icon: 'gear' })
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
            retry: { val: 'Dừng khi OPEN', level: 'good' },
            cb: { val: 'OPEN → HALF_OPEN', level: 'warn' },
            dup: { val: 'Fail-fast < 1 ms', level: 'good' },
            qos: { val: 'Bảo vệ hệ thống gọi', level: 'good' }
          },
          scene: {
            entities: {
              cli: D.dev(-11, 2.2, 'Client thanh toán'),
              cb: D.firewall(0, 2.2, 'Circuit Breaker', { color: 'amber', glyph: 'shield', sub: 'OPEN → Fallback', tags: [{ text: 'Ngắt mạch bảo vệ', tone: 'amber' }] }),
              pay: D.rack(11, 2.2, 'Payment Service', { color: 'red', dead: 0.85, sub: 'Đang hỏng · chờ phục hồi' }),
              fr: D.frame(0, -4.6, 'Máy trạng thái 3 bước của Circuit Breaker', [
                { label: 'CLOSED', sub: 'Bình thường · cho qua', tone: 'green' },
                { label: 'OPEN (đang kích hoạt)', sub: 'Trả Fallback < 1 ms', tone: 'red', active: true },
                { label: 'HALF_OPEN', sub: 'Thả vài probe /health', tone: 'amber' }
              ], { icon: 'shield' })
            },
            links: {
              c_b: D.link('cli', 'cb', { label: 'Fallback < 1 ms', tone: 'amber' }),
              b_p: D.link('cb', 'pay', { label: 'Đã ngắt (chỉ probe)', style: 'cut', tone: 'red' })
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
            dup: { val: 'QoS 1 / QoS 2', level: 'good' },
            qos: { val: 'QoS 0 · 1 · 2', level: 'good' }
          },
          scene: {
            entities: {
              iot: D.dev(-11.5, 2.2, 'Cảm biến P301', { kind: 'sensor', halo: 'green', sub: 'Header 2B', tags: [{ text: 'PUBLISH QoS 1', tone: 'green' }] }),
              brk: D.rack(-0.5, 2.2, 'Mosquitto Broker', { color: 'orange', glyph: 'queue', sub: 'sensors/+/temp' }),
              dash: D.dev(11, 5.2, 'Bảng giám sát'),
              alrt: D.rack(11, -0.8, 'Dịch vụ cảnh báo', { color: 'purple', sub: 'Sub sensors/+/temp' }),
              fr: D.frame(-0.5, -5.0, '3 mức bảo đảm giao tin MQTT (Header tối thiểu 2 byte)', [
                { label: 'QoS 0', sub: 'Tối đa 1 lần (nhẹ)', tone: 'paper' },
                { label: 'QoS 1', sub: 'PUBLISH + PUBACK ✓', tone: 'green', active: true },
                { label: 'QoS 2', sub: '4 bước đúng 1 lần', tone: 'violet' }
              ], { icon: 'sensor' })
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
