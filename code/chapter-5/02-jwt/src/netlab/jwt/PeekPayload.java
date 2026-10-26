package netlab.jwt;

import java.time.Duration;
import java.time.Instant;

/**
 * V31: đọc header và payload của một JWT chỉ bằng giải mã Base64URL, không cần khóa nào. Payload không được mã hóa: ai giữ
 * token đều đọc được các claim; chữ ký chỉ chống sửa đổi.
 *
 * <p>Chạy: {@code java -cp out netlab.jwt.PeekPayload}
 */
public final class PeekPayload {

    public static void main(String[] args) throws Exception {
        String token = new AuthorizationServer().issue("bob", "read:pets", Instant.now(), Duration.ofMinutes(5));
        String[] parts = token.split("\\.");
        System.out.println("token   " + token.length() + " chars: " + token.substring(0, 60) + "...");
        System.out.println("header  " + Jwt.decode(parts[0]));  // không cần khóa
        System.out.println("payload " + Jwt.decode(parts[1]));
        System.out.println("signature " + parts[2].length() + " chars (RSA 2048 bit)");
    }
}
