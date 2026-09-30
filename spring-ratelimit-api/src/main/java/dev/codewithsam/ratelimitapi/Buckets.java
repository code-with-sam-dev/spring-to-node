package dev.codewithsam.ratelimitapi;

import io.github.bucket4j.Bucket;
import io.github.bucket4j.BucketConfiguration;
import io.github.bucket4j.distributed.proxy.ProxyManager;
import io.github.bucket4j.redis.lettuce.Bucket4jLettuce;
import io.lettuce.core.RedisClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.function.Function;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * EPISODE 21. Where the buckets live: in this JVM by default, or in Redis when
 * ratelimit.redis-url is set, so every instance draws from the same bucket.
 */
@Configuration
class Buckets {

    static BucketConfiguration perMinute(long requests) {
        return BucketConfiguration.builder()
            .addLimit(limit -> limit.capacity(requests).refillIntervally(requests, Duration.ofMinutes(1)))
            .build();
    }

    @Bean
    Function<String, Bucket> bucketFor(@Value("${ratelimit.redis-url:}") String redisUrl) {
        if (redisUrl.isEmpty()) {
            Map<String, Bucket> local = new ConcurrentHashMap<>();
            return key -> local.computeIfAbsent(key, k -> Bucket.builder()
                .addLimit(limit -> limit.capacity(limitFor(k)).refillIntervally(limitFor(k), Duration.ofMinutes(1)))
                .build());
        }
        ProxyManager<String> redis = Bucket4jLettuce.casBasedBuilder(RedisClient.create(redisUrl)).build()
            .withMapper((String key) -> key.getBytes(StandardCharsets.UTF_8));
        return key -> redis.getProxy(key, () -> perMinute(limitFor(key)));
    }

    static long limitFor(String key) {
        return key.startsWith("login:") ? 1 : 3;
    }
}
