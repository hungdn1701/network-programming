package netlab.tls;

import java.security.cert.Certificate;
import java.security.cert.X509Certificate;
import java.util.ArrayList;
import java.util.List;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

/**
 * V30: kiểm tra chứng chỉ của server HTTPS thật ở port 443 bằng truststore mặc định của JDK (cacerts). Thành công thì in phiên
 * bản TLS và chuỗi chứng chỉ server gửi (tên CN, từ chứng chỉ của server lên CA); thất bại thì in kiểu ngoại lệ và thông báo.
 * Các tên miền của badssl.com cố ý cấu hình sai: hết hạn, sai tên, tự ký, CA gốc không được tin.
 *
 * <p>Chạy: {@code java -cp out netlab.tls.TlsCheck [--no-hostname-check] <host>...}
 */
public final class TlsCheck {

    public static void main(String[] args) {
        boolean hostnameCheck = !args[0].equals("--no-hostname-check");
        for (String host : args) {
            if (host.startsWith("--")) {
                continue;
            }
            System.out.println(host + ": " + check(host, hostnameCheck));
        }
    }

    private static String check(String host, boolean hostnameCheck) {
        try (SSLSocket socket = (SSLSocket) SSLSocketFactory.getDefault().createSocket(host, 443)) {
            if (hostnameCheck) {
                SSLParameters params = socket.getSSLParameters();
                params.setEndpointIdentificationAlgorithm("HTTPS");  // bật kiểm tra hostname theo chứng chỉ
                socket.setSSLParameters(params);
            }
            socket.startHandshake();  // kiểm tra chuỗi tin cậy, hạn dùng và hostname (nếu bật)
            List<String> chain = new ArrayList<>();
            for (Certificate c : socket.getSession().getPeerCertificates()) {
                chain.add(cn((X509Certificate) c));
            }
            return "OK " + socket.getSession().getProtocol() + ", chain: " + String.join(" <- ", chain);
        } catch (Exception e) {
            Throwable root = e;
            while (root.getCause() != null) {
                root = root.getCause();  // nguyên nhân gốc: hết hạn, sai tên hay không lần được tới CA tin cậy
            }
            return "FAIL " + root.getClass().getSimpleName() + ": " + root.getMessage();  // e là SSLHandshakeException
        }
    }

    private static String cn(X509Certificate cert) {
        for (String part : cert.getSubjectX500Principal().getName().split(",")) {
            if (part.startsWith("CN=")) {
                return part.substring(3);
            }
        }
        return cert.getSubjectX500Principal().getName();
    }
}
