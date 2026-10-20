# Đặc tả giao thức tra cứu, bản 1

Giao thức theo dòng giữa client và dịch vụ tra cứu. Bản này dùng cho Chương 1 (thử bằng NetCat) và Chương 2
(server TCP đầu tiên).

| Mục | Quy định |
|---|---|
| Giao vận | TCP, port 9199 |
| Charset | UTF-8 |
| Framing | Mỗi message là một dòng, kết thúc bằng LF (byte 10). Bên nhận chấp nhận cả CRLF và bỏ CR ở cuối dòng. |
| Độ dài | Mỗi dòng tối đa 256 byte, không tính ký tự kết thúc dòng |
| Yêu cầu | Một dòng chứa khóa cần tra, ví dụ `hanoi` |
| Phản hồi | Một dòng, một trong ba dạng: `OK <giá trị>`, `NOTFOUND`, `ERR <lý do>` |
| Lỗi | Dòng rỗng → `ERR empty key`; dòng dài hơn 256 byte → `ERR line too long` |
| Phiên | Một kết nối gửi được nhiều yêu cầu, lần lượt từng yêu cầu một; client đóng kết nối khi xong |

Ví dụ một phiên (`>` là dòng client gửi, `<` là dòng server trả):

```
> hanoi
< OK Thủ đô của Việt Nam
> atlantis
< NOTFOUND
>
< ERR empty key
```
