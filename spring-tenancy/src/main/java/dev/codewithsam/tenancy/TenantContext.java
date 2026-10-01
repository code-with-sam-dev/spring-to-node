package dev.codewithsam.tenancy;

/** EPISODE 40: the current tenant, one per thread. */
public final class TenantContext {
    private static final ThreadLocal<String> TENANT = new ThreadLocal<>();

    private TenantContext() {}

    public static void set(String tenant) {
        TENANT.set(tenant);
    }

    public static String get() {
        return TENANT.get();
    }

    public static void clear() {
        TENANT.remove();
    }
}
