# Web service: SOAP, hợp đồng WSDL và message XML

Mã chạy được của phần “Web service: SOAP, hợp đồng WSDL và message XML”: dịch vụ tra cứu qua SOAP, bằng Jakarta XML Web Services. Mọi đoạn mã trên slide trích từ thư mục
này; mọi kết quả chạy trên slide lấy từ `results/` (output thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Từ JDK 11, JAX-WS không còn nằm trong JDK: dự án dùng Metro (`jaxws-rt`
4.0.5, hiện thực Jakarta XML Web Services 4.0) qua Maven Wrapper (`mvnw`, tự tải Maven 3.9.16 ở lần chạy đầu; không cần cài
Maven). `Endpoint.publish` dùng HTTP server có sẵn trong JDK (module `jdk.httpserver`).

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.soap.SoapServer   # terminal 1 (Linux, macOS: ":")

# terminal 2
curl -s "http://127.0.0.1:9199/lookup?wsdl"                     # WSDL do Metro sinh (results/lookup.wsdl)
curl -s -o resp.xml -H 'Content-Type: text/xml; charset=utf-8' -H 'SOAPAction: ""' --data-binary @request.xml \
     -w 'HTTP %{http_code}, request body %{size_upload} bytes, response body %{size_download} bytes\n' \
     http://127.0.0.1:9199/lookup
xmllint --format resp.xml                                       # định dạng lại cho dễ đọc (không bắt buộc)
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `LookupWebService` | slide 4 | `@WebService`, `@WebMethod`, `@WebParam(name = "key")`: lớp Java thường thành web service, không viết mã đọc ghi XML |
| `SoapServer` | slide 4 | `Endpoint.publish("http://127.0.0.1:9199/lookup", ...)`; WSDL ở cùng địa chỉ kèm `?wsdl` |
| `request.xml` | slide 5 | SOAP envelope gửi bằng curl: Body là phần tử `lookup` (namespace `http://netlab/lookup`) với `key` |
| `results/curl-soap.txt` | slide 5, 6 | HTTP 200; request 205 byte, response 250 byte (chỉ thân, chưa kể header HTTP); response đã định dạng bằng `xmllint --format` |
| `results/lookup.wsdl` | slide 3 (hình) | WSDL thật: `types` (import XSD ở `?xsd=1`), `message`, `portType`, `binding` (SOAP qua HTTP, document/literal), `service` (`soap:address`) |

So sánh kích thước ở slide 6: giao thức dòng của Chương 2 gửi `hanoi` kèm LF (6 byte) và nhận `OK Thủ đô của Việt Nam` kèm LF
(31 byte UTF-8).

`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` lấy từ `maven-wrapper-distribution` 3.3.4 (bản `only-script`,
SHA-1 `640f7c39ee902b630ada7e77086a6ddb9fceae56` đối chiếu Maven Central, 2026-10-25). Thư viện tải về `~/.m2`, không commit;
`target/` bị `.gitignore`.
