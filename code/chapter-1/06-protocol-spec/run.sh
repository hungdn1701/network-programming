# Terminal 1: đóng vai server, lắng nghe ở 127.0.0.1:9199
java -cp out netlab.tools.NetCat -l 9199

# Terminal 2: đóng vai client, kết nối tới server
java -cp out netlab.tools.NetCat 127.0.0.1 9199
