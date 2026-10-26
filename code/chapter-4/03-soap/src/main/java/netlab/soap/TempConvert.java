package netlab.soap;

import jakarta.jws.WebMethod;
import jakarta.jws.WebParam;
import jakarta.jws.WebService;

/**
 * V24: dịch vụ đổi nhiệt độ dưới dạng web service SOAP, theo ví dụ TempConvert quen dùng trong tài liệu về web service.
 * Chú thích @WebService và @WebMethod đủ để Metro sinh WSDL và nhận message SOAP: không viết mã đọc ghi XML nào.
 */
@WebService(serviceName = "TempConvert", targetNamespace = "http://netlab/tempconvert")
public class TempConvert {

    @WebMethod
    public double celsiusToFahrenheit(@WebParam(name = "celsius") double celsius) {  // thao tác và tên tham số trong message
        System.out.println("celsiusToFahrenheit(" + celsius + ")");
        return celsius * 9 / 5 + 32;
    }

    @WebMethod
    public double fahrenheitToCelsius(@WebParam(name = "fahrenheit") double fahrenheit) {
        System.out.println("fahrenheitToCelsius(" + fahrenheit + ")");
        return (fahrenheit - 32) * 5 / 9;
    }
}
