#!/bin/sh
# Ghi lại các phiên trên slide vào results/ (replay, CONVENTIONS.md mục 8a). Chạy từ thư mục này, sau khi biên dịch.
# Các request đã soạn sẵn ở requests/ thay cho gõ tay; --echo in lại dòng gửi đi với dấu ">".
J="java -cp out netlab.tools.NetCat --echo"

# Vai client: request đúng đặc tả, rồi request thiếu header Host
$J --crlf ptit.edu.vn 80 < requests/get-root.txt | tr -d '\r' > results/NetCat-client.txt
$J --crlf ptit.edu.vn 80 < requests/no-host.txt | tr -d '\r' > results/NetCat-nohost.txt

# Gửi chỉ LF (không có --crlf): nginx vẫn chấp nhận, RFC 9112 mục 2.2 cho phép bên nhận khoan dung
$J ptit.edu.vn 80 < requests/get-root.txt | tr -d '\r' | head -6 > results/NetCat-lf.txt

# Vai server: NetCat lắng nghe ở port 9199, curl gửi request; response "gõ" sau 3 giây từ requests/hello-response.txt
( (sleep 3; cat requests/hello-response.txt) | $J --crlf -l 9199 | tr -d '\r' > results/NetCat-server.txt ) &
sleep 1.5
curl -si http://127.0.0.1:9199/hello.txt | tr -d '\r' > results/curl-i.txt
wait

# curl -v với cùng web server
sh http-trace.sh | tr -d '\r' > results/curl-v.txt
