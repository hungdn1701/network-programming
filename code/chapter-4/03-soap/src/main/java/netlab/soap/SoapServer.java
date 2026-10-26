package netlab.soap;

import jakarta.xml.ws.Endpoint;
import java.util.logging.Level;
import java.util.logging.Logger;

/**
 * V24: công bố dịch vụ TempConvert ở http://127.0.0.1:9199/tempconvert. Endpoint.publish dùng HTTP server có sẵn trong JDK
 * (module jdk.httpserver); WSDL do Metro sinh ở địa chỉ endpoint kèm ?wsdl.
 *
 * <p>Chạy: {@code java -cp "target/classes;target/dependency/*" netlab.soap.SoapServer}
 */
public final class SoapServer {

    public static void main(String[] args) {
        Logger.getLogger("").setLevel(Level.WARNING);  // tắt log INFO của Metro
        String address = "http://127.0.0.1:9199/tempconvert";
        Endpoint.publish(address, new TempConvert());  // nhận SOAP request qua HTTP POST tới address
        System.out.println("SOAP endpoint " + address + ", WSDL " + address + "?wsdl");
    }
}
