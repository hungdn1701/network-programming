package netlab.stream;

import java.util.List;
import java.util.Locale;
import netlab.stream.routeguide.Feature;
import netlab.stream.routeguide.Point;

/**
 * V27: dữ liệu địa danh cho RouteGuide, như phần trước (bản gốc đọc route_guide_db.json gồm các địa danh ở New Jersey). Tọa độ lấy
 * từ OpenStreetMap (© OpenStreetMap contributors, ODbL), làm tròn 4 chữ số thập phân.
 */
final class Features {

    static final Point PTIT = point(209_809_000, 1_057_871_000);
    static final Point HOAN_KIEM = point(210_288_000, 1_058_525_000);
    static final Point VAN_MIEU = point(210_288_000, 1_058_360_000);
    static final Point LANG_BAC = point(210_368_000, 1_058_347_000);
    static final Point TRAN_QUOC = point(210_479_000, 1_058_368_000);
    static final Point LONG_BIEN = point(210_431_000, 1_058_580_000);

    static final List<Feature> ALL = List.of(
            feature("Học viện Công nghệ Bưu chính Viễn thông", PTIT),
            feature("Hồ Hoàn Kiếm", HOAN_KIEM),
            feature("Văn Miếu - Quốc Tử Giám", VAN_MIEU),
            feature("Nhà hát Lớn Hà Nội", point(210_242_000, 1_058_578_000)),
            feature("Lăng Chủ tịch Hồ Chí Minh", LANG_BAC),
            feature("Chùa Trấn Quốc", TRAN_QUOC),
            feature("Cầu Long Biên", LONG_BIEN),
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
