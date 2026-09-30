package dev.codewithsam.cache;

import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

/** EPISODE 24: a repository stand-in that counts every load, cached with Spring's annotations. */
@Service
public class PaymentsService {

    private final AtomicInteger loads = new AtomicInteger();
    private final Map<String, String> rows = new ConcurrentHashMap<>(Map.of("pay_1", "pending"));

    private Payment load(String id) {
        loads.incrementAndGet();
        try {
            Thread.sleep(50);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
        return id.startsWith("missing") ? null : new Payment(id, rows.getOrDefault(id, "pending"));
    }

    /** Loads so far. A method, because the cache proxy has no field of its own. */
    public int loads() {
        return loads.get();
    }

    @Cacheable("payments")
    public Payment find(String id) {
        return load(id);
    }

    @Cacheable(cacheNames = "payments", sync = true)
    public Payment findSync(String id) {
        return load(id);
    }

    public Payment update(String id, String status) {
        rows.put(id, status);
        return new Payment(id, status);
    }

    @CacheEvict(cacheNames = "payments", key = "#id")
    public Payment updateAndEvict(String id, String status) {
        rows.put(id, status);
        return new Payment(id, status);
    }
}
