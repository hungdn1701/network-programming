package netlab.grpc;

import netlab.grpc.compat.LookupReplyExtended;
import netlab.grpc.compat.LookupReplyRenumbered;
import netlab.grpc.lookup.LookupReply;

/**
 * V26: client cũ (dùng LookupReply của lookup.proto) đọc byte do hai phiên bản server mới gửi. Đổi số trường: client đọc
 * sai mà không có ngoại lệ. Thêm trường số mới: client đọc đúng các trường cũ, bỏ qua trường lạ.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.grpc.CompatDemo}
 */
public final class CompatDemo {

    public static void main(String[] args) throws Exception {
        byte[] renumbered = LookupReplyRenumbered.newBuilder()
                .setFound(true).setValue("Thủ đô của Việt Nam").build().toByteArray();
        print("server đổi số trường", LookupReply.parseFrom(renumbered));  // client cũ đọc theo số trường cũ

        byte[] extended = LookupReplyExtended.newBuilder()
                .setFound(true).setValue("Thủ đô của Việt Nam").setVersion(7).build().toByteArray();
        print("server thêm trường 3", LookupReply.parseFrom(extended));
    }

    private static void print(String label, LookupReply reply) {
        System.out.println(label + ": found=" + reply.getFound() + ", value=\"" + reply.getValue() + "\", "
                + reply.getUnknownFields().asMap().size() + " unknown field(s)");
    }
}
