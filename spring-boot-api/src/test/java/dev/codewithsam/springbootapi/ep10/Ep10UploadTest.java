package dev.codewithsam.springbootapi.ep10;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WHAT DOES SPRING REFUSE, WITH NOTHING CONFIGURED?
 *
 * The NestJS side of this measures the same two uploads against the same shaped
 * endpoint. The interesting number is not what either one accepts. It is where
 * each one draws the line when nobody has drawn one.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Ep10UploadTest {

    @LocalServerPort
    int port;

    private static final String BOUNDARY = "----ep10boundary";

    /** Hand rolled so the request is exactly what a curl would send, with no
     *  client library quietly chunking or compressing it. */
    private HttpResponse<String> upload(int port, int bytes) throws Exception {
        var body = new ByteArrayOutputStream();
        body.write(("--" + BOUNDARY + "\r\n"
                + "Content-Disposition: form-data; name=\"file\"; filename=\"payload.bin\"\r\n"
                + "Content-Type: application/octet-stream\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        body.write(new byte[bytes]);
        body.write(("\r\n--" + BOUNDARY + "--\r\n").getBytes(StandardCharsets.UTF_8));

        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/ep10/upload"))
                        .header("Content-Type", "multipart/form-data; boundary=" + BOUNDARY)
                        .POST(HttpRequest.BodyPublishers.ofByteArray(body.toByteArray()))
                        .build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @Test
    void whereSpringDrawsTheLineWhenNobodyDrewOne() throws Exception {
        HttpResponse<String> small = upload(port, 512 * 1024);
        HttpResponse<String> large = upload(port, 2 * 1024 * 1024);

        System.out.println("=== Spring, MultipartFile, nothing configured ===");
        System.out.println("  512 KB  -> " + small.statusCode() + "  " + small.body());
        System.out.println("    2 MB  -> " + large.statusCode() + "  " + trimmed(large.body()));

        assertThat(small.statusCode()).as("half a megabyte is accepted").isEqualTo(200);
        assertThat(large.statusCode())
                .as("two megabytes is REFUSED, by a default nobody set")
                .isNotEqualTo(200);
    }

    private static String trimmed(String s) {
        return s == null ? "" : s.length() > 200 ? s.substring(0, 200) + "..." : s;
    }
}
