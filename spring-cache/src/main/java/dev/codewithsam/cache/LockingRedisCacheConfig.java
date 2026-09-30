package dev.codewithsam.cache;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.cache.RedisCacheWriter;
import org.springframework.data.redis.connection.RedisConnectionFactory;

/** EPISODE 24: Redis with the locking cache writer, only when payments.cache.locking=true. */
@Configuration
@ConditionalOnProperty(name = "payments.cache.locking", havingValue = "true")
class LockingRedisCacheConfig {

    @Bean
    RedisCacheManager cacheManager(RedisConnectionFactory connections) {
        return RedisCacheManager.builder(RedisCacheWriter.lockingRedisCacheWriter(connections)).build();
    }
}
