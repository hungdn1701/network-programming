package netlab.tls;

import static java.nio.charset.StandardCharsets.UTF_8;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.Socket;
import java.security.cert.X509Certificate;
import javax.net.ssl.SSLParameters;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

/**
 * V30: client tra cứu, dạng rõ hoặc qua TLS. Bản TLS tin các chứng chỉ trong truststore client-trust.p12 và bật kiểm tra
 * hostname (SSLSocket không tự kiểm tra hostname nếu không đặt endpoint identification algorithm).
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp out netlab.tls.LookupClient plain|tls|tls-no-hostname-check <host> <port> <khóa>}
 * <br>Thêm {@code --default-trust} để dùng truststore mặc định của JDK (cacerts) thay cho client-trust.p12.
 */
public final class LookupClient {

    public static void main(String[] args) throws Exception {
        String mode = args[0];
        String host = args[1];
        int port = Integer.parseInt(args[2]);
        String key = args[3];
        boolean defaultTrust = args.length > 4 && args[4].equals("--default-trust");
        try (Socket socket = open(mode, host, port, defaultTrust);
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true, UTF_8);
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8))) {
            if (socket instanceof SSLSocket ssl) {
                ssl.startHandshake();  // handshake TLS: thỏa thuận khóa, kiểm tra chứng chỉ (và hostname nếu bật)
                X509Certificate cert = (X509Certificate) ssl.getSession().getPeerCertificates()[0];
                System.out.println(ssl.getSession().getProtocol() + " " + ssl.getSession().getCipherSuite()
                        + ", server cert " + cert.getSubjectX500Principal().getName());
            }
            out.println(key);
            System.out.println(key + " -> " + in.readLine());
        } catch (Exception e) {
            String m = e.getMessage();
            System.out.println(e.getClass().getSimpleName() + ": " + (m.length() > 90 ? m.substring(0, 90) + " ..." : m));
        }
    }

    private static Socket open(String mode, String host, int port, boolean defaultTrust) throws Exception {
        if (mode.equals("plain")) {
            return new Socket(host, port);
        }
        if (!defaultTrust) {
            System.setProperty("javax.net.ssl.trustStore", "client-trust.p12");  // các chứng chỉ client tin
            System.setProperty("javax.net.ssl.trustStorePassword", "changeit");
        }
        SSLSocket socket = (SSLSocket) SSLSocketFactory.getDefault().createSocket(host, port);
        if (mode.equals("tls")) {
            SSLParameters params = socket.getSSLParameters();
            params.setEndpointIdentificationAlgorithm("HTTPS");  // bật kiểm tra hostname theo chứng chỉ
            socket.setSSLParameters(params);
        }
        return socket;
    }
}
