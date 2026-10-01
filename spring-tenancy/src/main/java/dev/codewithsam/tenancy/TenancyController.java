package dev.codewithsam.tenancy;

import dev.openfeature.contrib.providers.flagd.Config;
import dev.openfeature.contrib.providers.flagd.FlagdOptions;
import dev.openfeature.contrib.providers.flagd.FlagdProvider;
import dev.openfeature.sdk.Client;
import dev.openfeature.sdk.ImmutableContext;
import dev.openfeature.sdk.OpenFeatureAPI;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** EPISODE 40: who the current tenant is, and who gets the new checkout. */
@RestController
public class TenancyController {

    private final Client flags;

    TenancyController(@Value("${flags-file}") String flagsFile) throws Exception {
        OpenFeatureAPI.getInstance().setProviderAndWait(new FlagdProvider(FlagdOptions.builder()
            .resolverType(Config.Resolver.FILE).offlineFlagSourcePath(flagsFile).build()));
        this.flags = OpenFeatureAPI.getInstance().getClient();
    }

    @GetMapping("/whoami")
    String whoami() {
        String tenant = TenantContext.get();
        return tenant == null ? "no tenant" : tenant;
    }

    /** One character per user, user-1 to user-n: 1 if the new checkout is on. */
    @GetMapping("/rollout")
    String rollout(@RequestParam int n, @RequestParam String how) {
        StringBuilder out = new StringBuilder();
        for (int i = 1; i <= n; i++) {
            String user = "user-" + i;
            boolean on = "openfeature".equals(how)
                ? flags.getBooleanValue("new-checkout", false, new ImmutableContext(user))
                : Math.floorMod(user.hashCode(), 100) < 20;
            out.append(on ? '1' : '0');
        }
        return out.toString();
    }
}
