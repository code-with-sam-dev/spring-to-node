package dev.codewithsam.securityapi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.httpBasic;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * EPISODE 20, C: with the explicit chain. Anonymous, wrong password, right password.
 */
@SpringBootTest(properties = {"spring.security.user.name=sam", "spring.security.user.password=secret"})
@AutoConfigureMockMvc
@ActiveProfiles("chain")
class FilterChainTest {

    @Autowired MockMvc mvc;

    @Test
    void requests() throws Exception {
        for (String path : new String[] {"/payments", "/refunds", "/health"}) {
            System.out.println("  Spring, C, filter chain, GET " + path + " anonymous: " + mvc.perform(get(path)).andReturn().getResponse().getStatus());
        }
        System.out.println("  Spring, C, filter chain, GET /refunds wrong password: " + mvc.perform(get("/refunds").with(httpBasic("sam", "nope"))).andReturn().getResponse().getStatus());
        System.out.println("  Spring, C, filter chain, GET /refunds right password: " + mvc.perform(get("/refunds").with(httpBasic("sam", "secret"))).andReturn().getResponse().getStatus());
    }
}
