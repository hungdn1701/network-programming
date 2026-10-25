package netlab.jwt;

import java.security.GeneralSecurityException;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PublicKey;
import java.time.Duration;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * V31: phần của authorization server dùng trong ví dụ: giữ khóa riêng RSA và cấp access token dạng JWT. Đăng nhập người dùng
 * và luồng authorization code (chuyển hướng, đổi code lấy token) được mô tả ở hình, không hiện thực ở đây.
 */
final class AuthorizationServer {

    private final KeyPair keys;

    AuthorizationServer() throws GeneralSecurityException {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        keys = generator.generateKeyPair();
    }

    /** Khóa công khai: API dùng để kiểm tra chữ ký, có thể công bố cho mọi API. */
    PublicKey publicKey() {
        return keys.getPublic();
    }

    String issue(String subject, String scope, Instant issuedAt, Duration ttl) throws GeneralSecurityException {
        Map<String, Object> claims = new LinkedHashMap<>();
        claims.put("sub", subject);  // người dùng mà token đại diện
        claims.put("scope", scope);  // các quyền được cấp, cách nhau bằng dấu cách
        claims.put("iat", issuedAt.getEpochSecond());
        claims.put("exp", issuedAt.plus(ttl).getEpochSecond());  // thời điểm hết hạn
        return Jwt.sign(claims, keys.getPrivate());
    }
}
