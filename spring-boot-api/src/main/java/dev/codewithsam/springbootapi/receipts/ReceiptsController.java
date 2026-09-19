package dev.codewithsam.springbootapi.receipts;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * THE IDENTICAL WORK TO THE NESTJS SIDE. Same algorithm, same round count, so
 * the comparison is about the EXECUTION MODEL and nothing else.
 *
 * <p>This runs on the request's own thread. Every other thread in the pool
 * carries on serving, which is why a Spring developer has never had to think
 * about this. The NestJS equivalent has one thread running JavaScript, so the
 * same loop stops everything.
 */
@RestController
@RequestMapping("/receipts")
public class ReceiptsController {

  @GetMapping("/sign")
  public Map<String, Object> sign(@RequestParam(defaultValue = "400000") int rounds) {
    try {
      MessageDigest sha256 = MessageDigest.getInstance("SHA-256");
      String digest = "seed";
      for (int i = 0; i < rounds; i++) {
        byte[] hashed = sha256.digest(digest.getBytes(StandardCharsets.UTF_8));
        digest = HexFormat.of().formatHex(hashed);
      }
      return Map.of("digest", digest.substring(0, 16), "rounds", rounds);
    } catch (NoSuchAlgorithmException impossible) {
      throw new IllegalStateException(impossible);
    }
  }
}
