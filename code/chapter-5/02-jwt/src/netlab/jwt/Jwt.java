package netlab.jwt;

import static java.nio.charset.StandardCharsets.US_ASCII;
import static java.nio.charset.StandardCharsets.UTF_8;

import java.security.GeneralSecurityException;
import java.security.PrivateKey;
import java.security.PublicKey;
import java.security.Signature;
import java.time.Instant;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * V31: tạo và kiểm tra JWT ký RS256 (RSA với SHA-256), chỉ dùng JDK. Token gồm header.payload.signature, ba phần mã hóa
 * Base64URL; chữ ký tính trên chuỗi "header.payload". Bên kiểm tra chỉ cần khóa công khai của authorization server.
 */
final class Jwt {

    static final class InvalidTokenException extends Exception {
        InvalidTokenException(String message) {
            super(message);
        }
    }

    private static final Base64.Encoder ENC = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder DEC = Base64.getUrlDecoder();

    private Jwt() {
    }

    static String sign(Map<String, Object> claims, PrivateKey key) throws GeneralSecurityException {
        Map<String, Object> header = new LinkedHashMap<>();
        header.put("alg", "RS256");
        header.put("typ", "JWT");
        String signingInput = encode(Json.object(header)) + "." + encode(Json.object(claims));
        Signature rsa = Signature.getInstance("SHA256withRSA");
        rsa.initSign(key);
        rsa.update(signingInput.getBytes(US_ASCII));
        return signingInput + "." + ENC.encodeToString(rsa.sign());
    }

    /** Kiểm tra định dạng, thuật toán, chữ ký và thời hạn; trả các claim nếu token hợp lệ. */
    static Map<String, String> verify(String token, PublicKey key) throws InvalidTokenException {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new InvalidTokenException("malformed token");
        }
        try {
            if (!"RS256".equals(Json.parse(decode(parts[0])).get("alg"))) {  // không nhận "alg":"none" hay thuật toán khác
                throw new InvalidTokenException("unexpected algorithm");
            }
            Signature rsa = Signature.getInstance("SHA256withRSA");
            rsa.initVerify(key);  // chỉ cần khóa công khai: không gọi authorization server
            rsa.update((parts[0] + "." + parts[1]).getBytes(US_ASCII));
            if (!rsa.verify(DEC.decode(parts[2]))) {  // 1. chữ ký: payload có bị sửa không
                throw new InvalidTokenException("bad signature");
            }
            Map<String, String> claims = Json.parse(decode(parts[1]));
            if (Long.parseLong(claims.get("exp")) <= Instant.now().getEpochSecond()) {  // 2. thời hạn
                throw new InvalidTokenException("token expired");
            }
            return claims;
        } catch (GeneralSecurityException | IllegalArgumentException | NullPointerException e) {
            throw new InvalidTokenException("malformed token");
        }
    }

    static String encode(String json) {
        return ENC.encodeToString(json.getBytes(UTF_8));
    }

    static String decode(String part) {
        return new String(DEC.decode(part), UTF_8);  // Base64URL chỉ là cách biểu diễn: ai cũng giải được
    }
}
