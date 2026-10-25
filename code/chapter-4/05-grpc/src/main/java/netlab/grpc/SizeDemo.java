package netlab.grpc;

import static java.nio.charset.StandardCharsets.UTF_8;

import com.google.protobuf.Message;
import com.google.protobuf.util.JsonFormat;
import java.util.HexFormat;
import netlab.grpc.lookup.LookupReply;
import netlab.grpc.lookup.LookupRequest;

/**
 * V26: cùng nội dung, mã hóa bằng Protocol Buffers và bằng JSON. In từng byte của message Protocol Buffers: tag (số trường và
 * kiểu), độ dài, rồi dữ liệu; tên trường không đi trên mạng.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.grpc.SizeDemo}
 */
public final class SizeDemo {

    public static void main(String[] args) throws Exception {
        show(LookupRequest.newBuilder().setKey("hanoi").build());
        show(LookupReply.newBuilder().setFound(true).setValue("Thủ đô của Việt Nam").build());
    }

    private static void show(Message message) throws Exception {
        byte[] proto = message.toByteArray();  // mã hóa nhị phân của Protocol Buffers
        String json = JsonFormat.printer().omittingInsignificantWhitespace().print(message);
        System.out.println(message.getDescriptorForType().getName() + ":");
        System.out.println("  protobuf " + proto.length + " bytes: " + HexFormat.ofDelimiter(" ").formatHex(proto));
        System.out.println("  JSON     " + json.getBytes(UTF_8).length + " bytes: " + json);
    }
}
