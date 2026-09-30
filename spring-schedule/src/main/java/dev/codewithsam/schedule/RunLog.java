package dev.codewithsam.schedule;

import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/** EPISODE 25: every run of every job, shared by the instances a probe starts. */
public final class RunLog {

    public record Run(String job, String instance, long at, String event) {
    }

    public static final List<Run> RUNS = new CopyOnWriteArrayList<>();

    private RunLog() {
    }
}
