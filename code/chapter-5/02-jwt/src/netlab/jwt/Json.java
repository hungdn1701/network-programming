package netlab.jwt;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * V31: JSON tối thiểu cho header và payload của JWT: đối tượng phẳng, giá trị là chuỗi hoặc số nguyên. JDK 21 không có thư
 * viện JSON; dự án thật dùng thư viện JWT có sẵn (như Nimbus JOSE + JWT).
 */
final class Json {

    private Json() {
    }

    static String object(Map<String, Object> fields) {
        StringBuilder sb = new StringBuilder("{");
        fields.forEach((k, v) -> {
            if (sb.length() > 1) {
                sb.append(',');
            }
            sb.append('"').append(k).append("\":");
            sb.append(v instanceof Number ? v.toString() : "\"" + v.toString().replace("\\", "\\\\").replace("\"", "\\\"") + "\"");
        });
        return sb.append('}').toString();
    }

    /** Đọc đối tượng phẳng; số được giữ dưới dạng chuỗi chữ số. Sai cú pháp thì ném IllegalArgumentException. */
    static Map<String, String> parse(String text) {
        Map<String, String> result = new LinkedHashMap<>();
        String t = text.strip();
        if (!t.startsWith("{") || !t.endsWith("}")) {
            throw new IllegalArgumentException("not an object");
        }
        int i = 1;
        while (i < t.length() - 1) {
            i = skip(t, i);
            if (t.charAt(i) == '}') {
                break;
            }
            int[] end = new int[1];
            String key = string(t, i, end);
            i = skip(t, end[0]);
            if (t.charAt(i++) != ':') {
                throw new IllegalArgumentException("expected :");
            }
            i = skip(t, i);
            String value;
            if (t.charAt(i) == '"') {
                value = string(t, i, end);
                i = end[0];
            } else {
                int j = i;
                while (j < t.length() && (Character.isDigit(t.charAt(j)) || t.charAt(j) == '-')) {
                    j++;
                }
                if (j == i) {
                    throw new IllegalArgumentException("expected string or number");
                }
                value = t.substring(i, j);
                i = j;
            }
            result.put(key, value);
            i = skip(t, i);
            if (t.charAt(i) == ',') {
                i++;
            }
        }
        return result;
    }

    private static String string(String t, int start, int[] end) {
        if (t.charAt(start) != '"') {
            throw new IllegalArgumentException("expected string");
        }
        StringBuilder sb = new StringBuilder();
        int i = start + 1;
        while (i < t.length()) {
            char c = t.charAt(i++);
            if (c == '"') {
                end[0] = i;
                return sb.toString();
            }
            sb.append(c == '\\' && i < t.length() ? t.charAt(i++) : c);
        }
        throw new IllegalArgumentException("unterminated string");
    }

    private static int skip(String t, int i) {
        while (i < t.length() && Character.isWhitespace(t.charAt(i))) {
            i++;
        }
        return i;
    }
}
