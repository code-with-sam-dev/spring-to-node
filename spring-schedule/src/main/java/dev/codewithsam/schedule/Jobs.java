package dev.codewithsam.schedule;

import java.util.Set;
import net.javacrumbs.shedlock.spring.annotation.SchedulerLock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/** EPISODE 25: the jobs a probe switches on with jobs=..., each recording its runs. */
@Component
public class Jobs {

    private final String instance;
    private final Set<String> on;

    Jobs(@Value("${instance:a}") String instance, @Value("${jobs:}") Set<String> on) {
        this.instance = instance;
        this.on = on;
    }

    private void record(String job, String event) {
        RunLog.RUNS.add(new RunLog.Run(job, instance, System.currentTimeMillis(), event));
    }

    private static void sleep(long ms) {
        try {
            Thread.sleep(ms);
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
        }
    }

    @Scheduled(cron = "* * * * * *")
    public void settle() {
        if (on.contains("settle")) record("settle", "start");
    }

    @Scheduled(cron = "* * * * * *")
    @SchedulerLock(name = "payments:settle", lockAtLeastFor = "500ms")
    public void settleOnce() {
        if (on.contains("settleOnce")) record("settleOnce", "start");
    }

    @Scheduled(fixedRate = 500)
    public void report() {
        if (!on.contains("report")) return;
        record("report", "start");
        sleep(1500);
        record("report", "end");
    }

    @Scheduled(fixedRate = 200)
    public void heartbeat() {
        if (on.contains("heartbeat")) record("heartbeat", "start");
    }

    @Scheduled(fixedRate = 1000)
    public void slow() {
        if (on.contains("slow")) sleep(800);
    }

    @Scheduled(fixedRate = 300)
    public void failing() {
        if (!on.contains("failing")) return;
        record("failing", "start");
        throw new IllegalStateException("payments API down");
    }
}
