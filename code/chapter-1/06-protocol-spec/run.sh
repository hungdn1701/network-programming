# Vai client: nói HTTP/1.1 với web server thật. Gõ từng dòng của request, kết thúc bằng một dòng trống
# (hoặc dùng request đã soạn sẵn: ... < requests/get-root.txt)
java -cp out netlab.tools.NetCat --crlf ptit.edu.vn 80

# Vai server: NetCat lắng nghe ở loopback, port 9199; ở terminal khác, curl đóng vai client
java -cp out netlab.tools.NetCat --crlf -l 9199
curl -i http://127.0.0.1:9199/hello.txt
