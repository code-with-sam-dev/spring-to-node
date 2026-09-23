package dev.codewithsam.springbootapi.ep10;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.Map;

/**
 * NOTHING IS CONFIGURED HERE. No size limit, no storage location, no temp
 * directory. That is the measurement: what a Spring developer gets for writing
 * one parameter type and nothing else.
 */
@RestController
@RequestMapping("/ep10")
public class Ep10UploadController {

    @PostMapping("/upload")
    public Map<String, Object> upload(@RequestParam("file") MultipartFile file) {
        return Map.of(
                "name", file.getOriginalFilename() == null ? "" : file.getOriginalFilename(),
                "bytes", file.getSize());
    }
}
