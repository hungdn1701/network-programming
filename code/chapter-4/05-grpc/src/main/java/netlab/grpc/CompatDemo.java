package netlab.grpc;

import netlab.grpc.compat.FeatureExtended;
import netlab.grpc.compat.PointRenumbered;
import netlab.grpc.routeguide.Feature;
import netlab.grpc.routeguide.Point;

/**
 * V26: client cũ (dùng Point, Feature của route_guide.proto) đọc byte do hai phiên bản server mới gửi. Đổi số trường: client đọc
 * sai mà không có ngoại lệ. Thêm trường số mới: client đọc đúng các trường cũ, bỏ qua trường lạ.
 *
 * <p>Chạy: {@code java -Dstdout.encoding=UTF-8 -cp "target/classes;target/dependency/*" netlab.grpc.CompatDemo}
 */
public final class CompatDemo {

    public static void main(String[] args) throws Exception {
        byte[] renumbered = PointRenumbered.newBuilder()
                .setLatitude(209_809_000).setLongitude(1_057_871_000).build().toByteArray();
        Point point = Point.parseFrom(renumbered);  // client cũ đọc theo số trường cũ
        System.out.println("server đổi số trường: " + Features.format(point) + ", " + unknown(point));

        byte[] extended = FeatureExtended.newBuilder()
                .setName("Học viện Công nghệ Bưu chính Viễn thông").setLocation(Features.PTIT).setCategory("giáo dục")
                .build().toByteArray();
        Feature feature = Feature.parseFrom(extended);
        System.out.println("server thêm trường 3: \"" + feature.getName() + "\" at " + Features.format(feature.getLocation())
                + ", " + unknown(feature));
    }

    private static String unknown(com.google.protobuf.Message message) {
        return message.getUnknownFields().asMap().size() + " unknown field(s)";
    }
}
