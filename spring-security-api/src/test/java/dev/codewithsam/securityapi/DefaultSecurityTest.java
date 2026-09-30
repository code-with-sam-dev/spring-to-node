package dev.codewithsam.securityapi;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

/**
 * EPISODE 20, A: the starter on the classpath and no security configuration at all. What does
 * each endpoint answer without credentials?
 */
@SpringBootTest
@AutoConfigureMockMvc
class DefaultSecurityTest {

    @Autowired MockMvc mvc;

    @Test
    void anonymousRequests() throws Exception {
        for (String path : new String[] {"/payments", "/refunds"}) {
            int status = mvc.perform(get(path)).andReturn().getResponse().getStatus();
            System.out.println("  Spring, A, no config, GET " + path + " anonymous: " + status);
        }
    }
}
