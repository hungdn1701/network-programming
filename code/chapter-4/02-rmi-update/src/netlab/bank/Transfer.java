package netlab.bank;

import java.io.Serializable;

/**
 * V23: một lệnh chuyển tiền. Serializable nên được truyền theo giá trị qua RMI: mỗi đầu giữ một bản sao riêng. Các trường để public
 * và sửa được, để demo cho thấy sửa bản sao ở một đầu không ảnh hưởng đầu kia.
 */
public final class Transfer implements Serializable {

    private static final long serialVersionUID = 1L;

    public String from;
    public String to;
    public long amount;
    public String status = "PENDING";  // server ghi DONE khi đã chuyển

    public Transfer(String from, String to, long amount) {
        this.from = from;
        this.to = to;
        this.amount = amount;
    }

    @Override
    public String toString() {
        return from + " -> " + to + ": " + amount + " (" + status + ")";
    }
}
