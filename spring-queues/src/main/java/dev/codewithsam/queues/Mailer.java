package dev.codewithsam.queues;

import java.util.concurrent.CompletableFuture;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

/** EPISODE 26: receipts sent in the background with @Async. Finished work is recorded in Redis. */
@Service
public class Mailer {

    private final StringRedisTemplate records;

    Mailer(StringRedisTemplate records) {
        this.records = records;
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Async
    public void send(String id, long ms) {
        sleep(ms);
        records.opsForList().rightPush("sent", id);
    }

    @Async
    public void sendFailing(String id) {
        records.opsForList().rightPush("attempts", id);
        throw new IllegalStateException("mail server busy");
    }

    @Async
    public CompletableFuture<String> sendFailingWithResult(String id) {
        records.opsForList().rightPush("attempts", id);
        return CompletableFuture.failedFuture(new IllegalStateException("mail server busy"));
    }
}
