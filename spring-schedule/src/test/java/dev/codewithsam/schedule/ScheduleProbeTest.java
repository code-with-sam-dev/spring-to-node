package dev.codewithsam.schedule;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.builder.SpringApplicationBuilder;
import org.springframework.context.ConfigurableApplicationContext;
import org.testcontainers.containers.GenericContainer;

/**
 * EPISODE 25 PROBES, Spring: @Scheduled and ShedLock. Two instances are two application contexts,
 * each with its own scheduler; both use the same Redis for their locks.
 */
class ScheduleProbeTest {

    static final GenericContainer<?> REDIS = new GenericContainer<>("redis:8-alpine").withExposedPorts(6379);

    static {
        REDIS.start();
    }

    @AfterAll
    static void stop() {
        REDIS.stop();
    }

    @BeforeEach
    void clear() {
        RunLog.RUNS.clear();
    }

    static ConfigurableApplicationContext start(String instance, String jobs, Map<String, Object> extra) {
        Map<String, Object> props = new HashMap<>(Map.of("instance", instance, "jobs", jobs,
            "spring.data.redis.host", REDIS.getHost(), "spring.data.redis.port", REDIS.getMappedPort(6379),
            "logging.level.org.springframework.scheduling", "OFF"));
        props.putAll(extra);
        return new SpringApplicationBuilder(ScheduleApplication.class).properties(props).logStartupInfo(false).run();
    }

    static long count(String job, String instance) {
        return RunLog.RUNS.stream().filter(r -> r.job().equals(job) && r.event().equals("start") && (instance == null || r.instance().equals(instance))).count();
    }

    /** Distinct seconds the job ran in, and how many of those seconds it ran in more than once. */
    static String ticks(String job) {
        Map<Long, Long> perSecond = new HashMap<>();
        RunLog.RUNS.stream().filter(r -> r.job().equals(job) && r.event().equals("start")).forEach(r -> perSecond.merge(r.at() / 1000, 1L, Long::sum));
        return "ticks " + perSecond.size() + ", ticks run twice " + perSecond.values().stream().filter(n -> n > 1).count();
    }

    static int maxConcurrent(String job) {
        List<RunLog.Run> runs = new ArrayList<>(RunLog.RUNS.stream().filter(r -> r.job().equals(job)).toList());
        runs.sort((x, y) -> Long.compare(x.at(), y.at()));
        int now = 0, max = 0;
        for (RunLog.Run r : runs) {
            now += r.event().equals("start") ? 1 : r.event().equals("end") ? -1 : 0;
            max = Math.max(max, now);
        }
        return max;
    }

    @Test
    void twoInstances() throws Exception {
        try (var a = start("a", "settle", Map.of()); var b = start("b", "settle", Map.of())) {
            Thread.sleep(3100);
        }
        System.out.printf("  Spring, A, two instances, @Scheduled every second, 3 s: runs %d (instance a %d, instance b %d), %s%n", count("settle", null), count("settle", "a"), count("settle", "b"), ticks("settle"));
    }

    @Test
    void shedLock() throws Exception {
        try (var a = start("a", "settleOnce", Map.of()); var b = start("b", "settleOnce", Map.of())) {
            Thread.sleep(3100);
        }
        System.out.printf("  Spring, B, two instances, @SchedulerLock on Redis, 3 s: runs %d (instance a %d, instance b %d), %s%n", count("settleOnce", null), count("settleOnce", "a"), count("settleOnce", "b"), ticks("settleOnce"));
    }

    @Test
    void overlap() throws Exception {
        try (var a = start("a", "report", Map.of())) {
            Thread.sleep(5000);
        }
        System.out.printf("  Spring, C, @Scheduled every second, a job that takes 2.5 s, 5 s: runs started %d, most at once %d%n", count("report", null), maxConcurrent("report"));
        RunLog.RUNS.clear();
        try (var a = start("a", "report", Map.of("spring.task.scheduling.pool.size", 4))) {
            Thread.sleep(5000);
        }
        System.out.printf("  Spring, C, @Scheduled every second, pool size 4, a job that takes 2.5 s, 5 s: runs started %d, most at once %d%n", count("report", null), maxConcurrent("report"));
    }

    @Test
    void starvation() throws Exception {
        for (int pool : new int[] {1, 2}) {
            RunLog.RUNS.clear();
            try (var a = start("a", "heartbeat,slow", Map.of("spring.task.scheduling.pool.size", pool))) {
                Thread.sleep(3000);
            }
            List<Long> beats = RunLog.RUNS.stream().filter(r -> r.job().equals("heartbeat")).map(RunLog.Run::at).toList();
            long gap = 0;
            for (int i = 1; i < beats.size(); i++) gap = Math.max(gap, beats.get(i) - beats.get(i - 1));
            System.out.printf("  Spring, D, beside an 800 ms job, scheduler pool size %d: heartbeats in 3 s %d, longest gap %d ms%n", pool, beats.size(), gap);
        }
    }

    @Test
    void failing() throws Exception {
        try (var a = start("a", "failing", Map.of())) {
            Thread.sleep(1600);
        }
        System.out.printf("  Spring, E, @Scheduled(fixedRate = 300) that throws every time, 1.6 s: runs %d%n", count("failing", null));
    }
}
