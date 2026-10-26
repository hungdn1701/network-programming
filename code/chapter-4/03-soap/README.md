# Web service: SOAP, hợp đồng WSDL và message XML

Mã chạy được của phần “Web service: SOAP, hợp đồng WSDL và message XML”: dịch vụ đổi nhiệt độ TempConvert (ví dụ quen dùng trong tài liệu về web service) qua SOAP, bằng
Jakarta XML Web Services. Mọi đoạn mã trên slide trích từ thư mục này; mọi kết quả chạy trên slide lấy từ `results/` (output
thật, không gõ lại).

**Môi trường:** JDK 21 (Temurin 21.0.12), Windows 11. Từ JDK 11, JAX-WS không còn nằm trong JDK: dự án dùng Metro (`jaxws-rt`
4.0.5, hiện thực Jakarta XML Web Services 4.0) qua Maven Wrapper (`mvnw`, tự tải Maven 3.9.16 ở lần chạy đầu; không cần cài
Maven). `Endpoint.publish` dùng HTTP server có sẵn trong JDK (module `jdk.httpserver`).

```bash
sh mvnw -q package dependency:copy-dependencies -DincludeScope=runtime    # Windows cmd: mvnw.cmd ...

java -cp "target/classes;target/dependency/*" netlab.soap.SoapServer   # terminal 1 (Linux, macOS: ":")

# terminal 2
curl -s "http://127.0.0.1:9199/tempconvert?wsdl"                # WSDL do Metro sinh (results/tempconvert.wsdl)
curl -s "http://127.0.0.1:9199/tempconvert?xsd=1"               # XSD mà WSDL import (results/tempconvert.xsd)
curl -s -o resp.xml -H 'Content-Type: text/xml; charset=utf-8' -H 'SOAPAction: ""' --data-binary @request.xml \
     -w 'HTTP %{http_code}, request body %{size_upload} bytes, response body %{size_download} bytes\n' \
     http://127.0.0.1:9199/tempconvert
xmllint --format resp.xml                                       # định dạng lại cho dễ đọc (không bắt buộc)
```

| File | Dùng ở | Cho thấy |
|---|---|---|
| `TempConvert` | slide 4 | `@WebService`, `@WebMethod`, `@WebParam(name = "celsius")`: lớp Java thường thành web service với hai thao tác `celsiusToFahrenheit`, `fahrenheitToCelsius`, không viết mã đọc ghi XML |
| `SoapServer` | slide 4 | `Endpoint.publish("http://127.0.0.1:9199/tempconvert", ...)`; WSDL ở cùng địa chỉ kèm `?wsdl` |
| `request.xml` | slide 5 | SOAP envelope gửi bằng curl: Body là phần tử `celsiusToFahrenheit` (namespace `http://netlab/tempconvert`) với `celsius` = 100 |
| `results/curl-soap.txt` | slide 5, 6 | HTTP 200; `return` = 212.0; request 242 byte, response 259 byte (chỉ thân, chưa kể header HTTP); response đã định dạng bằng `xmllint --format` |
| `results/tempconvert.wsdl`, `.xsd` | slide 3 (hình) | WSDL thật: `types` (import XSD ở `?xsd=1`: `celsius` kiểu `xs:double`), `message`, `portType`, `binding` (SOAP qua HTTP, document/literal), `service` (`soap:address`) |

**Bài tập mở rộng — dịch vụ SOAP công khai viết bằng ASP.NET.** Dịch vụ Calculator ở `http://www.dneonline.com/calculator.asmx`
(thao tác `Add`, `Subtract`, `Multiply`, `Divide`; WSDL ở `?wsdl`) trả lời được request SOAP gửi bằng curl; header phản hồi cho
thấy server là IIS, ASP.NET (kiểm tra 2026-10-25). Đây là dịch vụ của bên thứ ba, có thể ngừng bất cứ lúc nào.

```bash
curl -s -H 'Content-Type: text/xml; charset=utf-8' -H 'SOAPAction: "http://tempuri.org/Add"' --data-binary \
  '<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/" xmlns:t="http://tempuri.org/"><soap:Body><t:Add><t:intA>2</t:intA><t:intB>3</t:intB></t:Add></soap:Body></soap:Envelope>' \
  http://www.dneonline.com/calculator.asmx
```

`mvnw`, `mvnw.cmd`, `.mvn/wrapper/maven-wrapper.properties` lấy từ `maven-wrapper-distribution` 3.3.4 (bản `only-script`,
SHA-1 `640f7c39ee902b630ada7e77086a6ddb9fceae56` đối chiếu Maven Central, 2026-10-25). Thư viện tải về `~/.m2`, không commit;
`target/` bị `.gitignore`.
