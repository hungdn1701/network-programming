package netlab.rest;

import java.util.LinkedHashMap;
import java.util.Map;

/**
 * V25: JSON tối thiểu cho ví dụ — chỉ đối tượng phẳng có giá trị chuỗi, như {"key":"hanoi","value":"..."}. JDK 21 không có
 * thư viện JSON; dự án thật dùng Jackson hoặc Gson.
 */
final class Json {

    private Json() {
    }

    static String object(Map<String, String> fields) {
        StringBuilder sb = new StringBuilder("{");
        fields.forEach((k, v) -> {
            if (sb.length() > 1) {
                sb.append(',');
            }
            sb.append(quote(k)).append(':').append(quote(v));
        });
        return sb.append('}').toString();
    }

    static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"' -> sb.append("\\\"");
                case '\\' -> sb.append("\\\\");
                case '\n' -> sb.append("\\n");
                default -> {
                    if (c < 0x20) {
                        sb.append(String.format("\\u%04x", (int) c));
                    } else {
                        sb.append(c);
                    }
                }
            }
        }
        return sb.append('"').toString();
    }

    /** Đọc đối tượng phẳng có giá trị chuỗi; sai cú pháp thì ném IllegalArgumentException. */
    static Map<String, String> parseObject(String text) {
        Map<String, String> result = new LinkedHashMap<>();
        int[] pos = {skip(text, 0)};
        expect(text, pos, '{');
        if (peek(text, pos) == '}') {
            pos[0]++;
            return result;
        }
        while (true) {
            String key = string(text, pos);
            expect(text, pos, ':');
            result.put(key, string(text, pos));
            char c = peek(text, pos);
            pos[0]++;
            if (c == '}') {
                return result;
            }
            if (c != ',') {
                throw new IllegalArgumentException("expected , or } at " + (pos[0] - 1));
            }
        }
    }

    private static String string(String t, int[] pos) {
        expect(t, pos, '"');
        StringBuilder sb = new StringBuilder();
        while (pos[0] < t.length()) {
            char c = t.charAt(pos[0]++);
            if (c == '"') {
                return sb.toString();
            }
            if (c == '\\' && pos[0] < t.length()) {
                char e = t.charAt(pos[0]++);
                switch (e) {
                    case 'n' -> sb.append('\n');
                    case 't' -> sb.append('\t');
                    case 'u' -> {
                        sb.append((char) Integer.parseInt(t.substring(pos[0], pos[0] + 4), 16));
                        pos[0] += 4;
                    }
                    default -> sb.append(e);
                }
            } else {
                sb.append(c);
            }
        }
        throw new IllegalArgumentException("unterminated string");
    }

    private static void expect(String t, int[] pos, char c) {
        if (peek(t, pos) != c) {
            throw new IllegalArgumentException("expected " + c + " at " + pos[0]);
        }
        pos[0]++;
    }

    private static char peek(String t, int[] pos) {
        pos[0] = skip(t, pos[0]);
        return pos[0] < t.length() ? t.charAt(pos[0]) : '\0';
    }

    private static int skip(String t, int i) {
        while (i < t.length() && Character.isWhitespace(t.charAt(i))) {
            i++;
        }
        return i;
    }
}
