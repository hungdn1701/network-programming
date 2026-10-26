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
 * V30: echo client, dạng rõ hoặc qua TLS. Bản TLS tin các chứng chỉ trong truststore client-trust.p12 và bật kiểm tra hostname
 * (SSLSocket không tự kiểm tra hostname nếu không đặt endpoint identification algorithm).
 *
 * <p>Chạy: {@code java -cp out netlab.tls.EchoClient plain|tls <host> <port> <dòng>}
 */
public final class EchoClient {

    public static void main(String[] args) throws Exception {
        boolean tls = args[0].equals("tls");
        String host = args[1];
        int port = Integer.parseInt(args[2]);
        try (Socket socket = tls ? openTls(host, port) : new Socket(host, port);
             PrintWriter out = new PrintWriter(socket.getOutputStream(), true, UTF_8);
             BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream(), UTF_8))) {
            if (socket instanceof SSLSocket ssl) {
                ssl.startHandshake();  // handshake TLS: thỏa thuận khóa, kiểm tra chứng chỉ và hostname
                X509Certificate cert = (X509Certificate) ssl.getSession().getPeerCertificates()[0];
                System.out.println(ssl.getSession().getProtocol() + " " + ssl.getSession().getCipherSuite()
                        + ", server cert " + cert.getSubjectX500Principal().getName());
            }
            out.println(args[3]);
            System.out.println("echoed: " + in.readLine());
        }
    }

    private static Socket openTls(String host, int port) throws Exception {
        System.setProperty("javax.net.ssl.trustStore", "client-trust.p12");  // các chứng chỉ client tin
        System.setProperty("javax.net.ssl.trustStorePassword", "changeit");
        SSLSocket socket = (SSLSocket) SSLSocketFactory.getDefault().createSocket(host, port);
        SSLParameters params = socket.getSSLParameters();
        params.setEndpointIdentificationAlgorithm("HTTPS");  // bật kiểm tra hostname theo chứng chỉ
        socket.setSSLParameters(params);
        return socket;
    }
}
