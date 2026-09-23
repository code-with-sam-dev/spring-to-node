package dev.codewithsam.springbootapi.ep08;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.web.servlet.FilterRegistrationBean;
import org.springframework.context.annotation.Bean;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * WHERE DOES EACH SPRING HOOK ACTUALLY RUN?
 *
 * Measured against a real servlet container on a random port, because a Filter
 * is a container concern and a mocked dispatch would not exercise it honestly.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Ep08OrderTest {

    // Plain HttpClient rather than a Spring test client. TestRestTemplate was
    // removed in Boot 4, and the JDK client makes the call the episode is
    // actually describing: a real request over a real socket.
    @LocalServerPort
    int port;

    private HttpResponse<String> get(String path) throws Exception {
        return HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + path)).build(),
                HttpResponse.BodyHandlers.ofString());
    }

    @TestConfiguration
    static class Hooks implements WebMvcConfigurer {
        @Bean
        FilterRegistrationBean<Ep08Trace.TraceFilter> traceFilter() {
            var reg = new FilterRegistrationBean<>(new Ep08Trace.TraceFilter());
            reg.addUrlPatterns("/ep08/*");
            return reg;
        }

        @Bean
        Ep08Trace.TraceAspect traceAspect() {
            return new Ep08Trace.TraceAspect();
        }

        @Override
        public void addInterceptors(InterceptorRegistry registry) {
            registry.addInterceptor(new Ep08Trace.TraceInterceptor()).addPathPatterns("/ep08/**");
        }
    }

    @BeforeEach
    void clear() {
        Ep08Trace.EVENTS.clear();
    }

    @Test
    void theOrderOnASuccessfulRequest() throws Exception {
        HttpResponse<String> res = get("/ep08/trace");

        System.out.println("=== Spring, successful request ===");
        System.out.println("status " + res.statusCode());
        Ep08Trace.EVENTS.forEach(e -> System.out.println("  " + e));

        assertThat(res.statusCode()).isEqualTo(200);

        List<String> names = Ep08Trace.EVENTS.stream().map(e -> e.split(" ")[0]).toList();
        assertThat(names).containsExactly(
                "filter:before",
                "interceptor:preHandle",
                "aspect:before",
                "handler",
                "aspect:after",
                "interceptor:postHandle",
                "interceptor:afterCompletion",
                "filter:after");
    }

    @Test
    void whatEachHookSeesWhenTheHandlerThrows() throws Exception {
        HttpResponse<String> res = get("/ep08/boom");

        System.out.println("=== Spring, handler throws ===");
        System.out.println("status " + res.statusCode());
        System.out.println("body   " + res.body());
        Ep08Trace.EVENTS.forEach(e -> System.out.println("  " + e));

        // THE THREE CLAIMS THE EPISODE WANTS, each pinned separately so a
        // failure names which one moved.
        assertThat(Ep08Trace.EVENTS).as("the aspect wraps the call, so it sees the throw")
                .anyMatch(e -> e.startsWith("aspect CAUGHT"));
        assertThat(Ep08Trace.EVENTS).as("postHandle is SKIPPED when the handler throws")
                .noneMatch(e -> e.startsWith("interceptor:postHandle"));
        assertThat(Ep08Trace.EVENTS).as("afterCompletion still runs, and is handed the exception")
                .anyMatch(e -> e.startsWith("interceptor:afterCompletion ex=") && !e.endsWith("ex=none"));
    }
}
