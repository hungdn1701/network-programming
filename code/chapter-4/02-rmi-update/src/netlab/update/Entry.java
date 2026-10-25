package netlab.update;

import java.io.Serializable;

/**
 * V23: một mục của dịch vụ tra cứu. Serializable nên được truyền theo giá trị qua RMI: mỗi đầu giữ một bản sao riêng.
 * Các trường để public và sửa được, để demo cho thấy sửa bản sao ở một đầu không ảnh hưởng đầu kia.
 */
public final class Entry implements Serializable {

    private static final long serialVersionUID = 1L;

    public String key;
    public String value;
    public long version;  // server tăng mỗi lần cập nhật được áp dụng

    public Entry(String key, String value) {
        this(key, value, 0);
    }

    public Entry(String key, String value, long version) {
        this.key = key;
        this.value = value;
        this.version = version;
    }

    @Override
    public String toString() {
        return key + " = " + value + " (version " + version + ")";
    }
}
