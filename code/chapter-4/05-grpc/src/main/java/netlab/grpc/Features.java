package netlab.grpc;

import java.util.List;
import java.util.Locale;
import netlab.grpc.routeguide.Feature;
import netlab.grpc.routeguide.Point;

/**
 * V26: dữ liệu địa danh cho RouteGuide (bản gốc đọc route_guide_db.json gồm các địa danh ở New Jersey). Ở đây là vài địa danh ở
 * Hà Nội; tọa độ lấy từ OpenStreetMap (© OpenStreetMap contributors, ODbL), làm tròn 4 chữ số thập phân.
 */
final class Features {

    static final Point PTIT = point(209_809_000, 1_057_871_000);

    static final List<Feature> ALL = List.of(
            feature("Học viện Công nghệ Bưu chính Viễn thông", PTIT),
            feature("Hồ Hoàn Kiếm", point(210_288_000, 1_058_525_000)),
            feature("Văn Miếu - Quốc Tử Giám", point(210_288_000, 1_058_360_000)),
            feature("Nhà hát Lớn Hà Nội", point(210_242_000, 1_058_578_000)),
            feature("Lăng Chủ tịch Hồ Chí Minh", point(210_368_000, 1_058_347_000)),
            feature("Chùa Trấn Quốc", point(210_479_000, 1_058_368_000)),
            feature("Cầu Long Biên", point(210_431_000, 1_058_580_000)),
            feature("Sân vận động Quốc gia Mỹ Đình", point(210_205_000, 1_057_639_000)));

    private Features() {
    }

    static Point point(int latitude, int longitude) {
        return Point.newBuilder().setLatitude(latitude).setLongitude(longitude).build();
    }

    static Feature feature(String name, Point location) {
        return Feature.newBuilder().setName(name).setLocation(location).build();
    }

    /** Tọa độ dạng độ: chia số nguyên cho 10^7. */
    static String format(Point p) {
        return String.format(Locale.ROOT, "%.4f, %.4f", p.getLatitude() / 1e7, p.getLongitude() / 1e7);
    }
}
