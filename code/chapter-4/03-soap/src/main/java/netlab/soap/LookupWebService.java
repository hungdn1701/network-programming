package netlab.soap;

import jakarta.jws.WebMethod;
import jakarta.jws.WebParam;
import jakarta.jws.WebService;
import java.util.Map;

/**
 * V24: dịch vụ tra cứu dưới dạng web service SOAP. Chú thích @WebService và @WebMethod đủ để Metro sinh WSDL và nhận
 * message SOAP: không viết mã đọc ghi XML nào.
 */
@WebService(serviceName = "LookupService", targetNamespace = "http://netlab/lookup")
public class LookupWebService {

    private static final Map<String, String> DATA = Map.of(
            "hanoi", "Thủ đô của Việt Nam",
            "huế", "Cố đô triều Nguyễn");

    @WebMethod
    public String lookup(@WebParam(name = "key") String key) {  // thao tác lookup, tham số tên key trong message
        System.out.println("lookup(\"" + key + "\")");
        return DATA.get(key);
    }
}
