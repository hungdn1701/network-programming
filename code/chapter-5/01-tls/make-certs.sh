#!/bin/sh
# V30: tạo keystore của server (khóa riêng và chứng chỉ tự ký cho localhost) và truststore của client.
keytool -genkeypair -alias lookup -keyalg EC -validity 365 \
    -dname "CN=localhost" -ext "SAN=dns:localhost" \
    -keystore server.p12 -storepass changeit
keytool -exportcert -alias lookup -rfc -file server.crt \
    -keystore server.p12 -storepass changeit
keytool -importcert -alias lookup -file server.crt -noprompt \
    -keystore client-trust.p12 -storepass changeit
