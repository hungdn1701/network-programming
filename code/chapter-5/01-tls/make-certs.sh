#!/bin/sh
# V30: tạo keystore của server (khóa riêng và chứng chỉ tự ký cho localhost) và truststore của client.
keytool -genkeypair -alias echo -keyalg EC -validity 365 \
    -dname "CN=localhost" -ext "SAN=dns:localhost" \
    -keystore server.p12 -storepass changeit
keytool -exportcert -alias echo -rfc -file server.crt \
    -keystore server.p12 -storepass changeit
keytool -importcert -alias echo -file server.crt -noprompt \
    -keystore client-trust.p12 -storepass changeit
