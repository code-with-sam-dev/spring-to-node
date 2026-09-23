package dev.codewithsam.springbootapi.ep10;

import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.server.LocalServerPort;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.concurrent.atomic.AtomicLong;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Does Spring's byte[] route cost what the NestJS buffered route cost?
 *
 * MEASURED ON THE SERVER'S OWN HEAP, and reported with its noise, because a
 * JVM heap reading is not the clean number arrayBuffers is on the Node side.
 * The test asserts only what the measurement can actually support.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Ep10DownloadTest {

    static final int SIZE = 50 * 1024 * 1024;

    @LocalServerPort
    int port;

    @BeforeAll
    static void writeTheFile() throws Exception {
        Path p = Files.createTempFile("ep10-spring-", ".bin");
        Files.write(p, new byte[SIZE]);
        p.toFile().deleteOnExit();
        Ep10DownloadController.file = p;
    }

    private static long usedMb() {
        Runtime r = Runtime.getRuntime();
        return (r.totalMemory() - r.freeMemory()) / 1048576;
    }

    /**
     * COUNTS THE BYTES WITHOUT KEEPING THEM. The first version used
     * BodyHandlers.ofByteArray(), which allocated the whole 50 MB in the TEST,
     * and the test shares a JVM with the server. Both routes then measured
     * about +110 MB and looked identical, because what was being measured was
     * the client. That is the same mistake episode 5's blocking demo had to
     * correct, arriving in a different disguise.
     */
    private long fetch(String route) throws Exception {
        AtomicLong counted = new AtomicLong();
        HttpResponse<Void> res = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/ep10/" + route)).build(),
                HttpResponse.BodyHandlers.ofByteArrayConsumer(
                        chunk -> chunk.ifPresent(b -> counted.addAndGet(b.length))));
        long peak = usedMb();
        assertThat(res.statusCode()).isEqualTo(200);
        assertThat(counted.get()).isEqualTo(SIZE);
        return peak;
    }

    @Test
    void bufferedAndStreamedDeliverTheSameBytes() throws Exception {
        System.gc();
        Thread.sleep(200);
        long base = usedMb();
        long afterStreamed = fetch("streamed");
        System.gc();
        Thread.sleep(200);
        long betweenRuns = usedMb();
        long afterBuffered = fetch("buffered");

        System.out.println("=== Spring, the same 50 MB file, two routes ===");
        System.out.println("  heap before          " + base + " MB");
        System.out.println("  after FileSystemResource  " + afterStreamed + " MB");
        System.out.println("  heap settled         " + betweenRuns + " MB");
        System.out.println("  after byte[]         " + afterBuffered + " MB");
        System.out.println("  NOTE: this is a JVM heap reading, not the clean figure");
        System.out.println("        arrayBuffers gives on the Node side. Treat the");
        System.out.println("        direction as the result, not the exact megabytes.");

        // THE ONLY CLAIM THIS MEASUREMENT CAN SUPPORT. Both routes delivered
        // exactly 50 MB and returned 200, asserted inside fetch(). The heap
        // figures are printed for direction and deliberately NOT asserted on,
        // because a JVM heap reading moves with collection timing and the
        // episode would be quoting noise.
        assertThat(afterBuffered).as("the process survived both routes").isPositive();
    }
}
