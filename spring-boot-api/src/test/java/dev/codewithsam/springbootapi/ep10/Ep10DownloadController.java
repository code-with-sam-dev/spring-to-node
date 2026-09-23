package dev.codewithsam.springbootapi.ep10;

import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;

/**
 * The same 50 MB file served two ways, so the NestJS comparison has a Spring
 * half rather than a remembered one.
 *
 * Both return the same bytes. Only where those bytes live differs: byte[] is a
 * copy on the heap, FileSystemResource is a handle the container copies from.
 */
@RestController
@RequestMapping("/ep10")
public class Ep10DownloadController {

    static Path file;

    @GetMapping("/buffered")
    public ResponseEntity<byte[]> buffered() throws IOException {
        return ResponseEntity.ok(Files.readAllBytes(file));
    }

    @GetMapping("/streamed")
    public ResponseEntity<Resource> streamed() {
        return ResponseEntity.ok(new FileSystemResource(file));
    }
}
