package dev.codewithsam.springbootapi.ep08;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.context.annotation.Bean;
import org.springframework.core.MethodParameter;
import org.springframework.http.MediaType;
import org.springframework.http.server.ServerHttpRequest;
import org.springframework.http.server.ServerHttpResponse;
import org.springframework.http.converter.HttpMessageConverter;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.web.servlet.mvc.method.annotation.ResponseBodyAdvice;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.util.LinkedHashMap;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * THE TRANSFER GAP, MEASURED FROM BOTH ENDS.
 *
 * transform.ts wrapped every NestJS response in an envelope with one map() in
 * one interceptor. The obvious Spring translation is HandlerInterceptor,
 * because the name matches. It cannot do it, and this measures WHY rather than
 * asserting it: postHandle is handed a ModelAndView, and for an @ResponseBody
 * method there is no model. The returned object is already on its way to the
 * message converter.
 *
 * The type that CAN do it is ResponseBodyAdvice, which sits at the converter
 * instead. So the job Nest gives to one hook, Spring splits across two, and
 * picking the one whose name matches gets you the wrong one.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class Ep08BodyRewriteTest {

    @LocalServerPort
    int port;

    static String modelAndViewSeenByPostHandle = "not reached";
    static final java.util.List<String> ORDER = new java.util.concurrent.CopyOnWriteArrayList<>();

    @TestConfiguration
    static class Hooks implements WebMvcConfigurer {

        /** The instinct. It runs, it is given nothing to edit, and it changes
         *  nothing, which is the worst combination: no error, no effect. */
        @Override
        public void addInterceptors(InterceptorRegistry registry) {
            registry.addInterceptor(new HandlerInterceptor() {
                @Override
                public void postHandle(HttpServletRequest request, HttpServletResponse response,
                                       Object handler, ModelAndView modelAndView) {
                    ORDER.add("postHandle");
                    modelAndViewSeenByPostHandle = String.valueOf(modelAndView);
                    // Spring documents postHandle as too late even for a header on
                    // @ResponseBody methods. Measured here rather than assumed.
                    response.setHeader("X-Added-By-PostHandle", "yes");
                    if (modelAndView != null) {
                        modelAndView.addObject("meta", Map.of("added", "by postHandle"));
                    }
                }
            }).addPathPatterns("/ep08/**");
        }

        /** The type that actually reaches the payload. */
        @Bean
        EnvelopeAdvice envelopeAdvice() {
            return new EnvelopeAdvice();
        }
    }

    @RestControllerAdvice
    static class EnvelopeAdvice implements ResponseBodyAdvice<Object> {
        @Override
        public boolean supports(MethodParameter returnType,
                                Class<? extends HttpMessageConverter<?>> converterType) {
            return returnType.getContainingClass().equals(Ep08TraceController.class);
        }

        @Override
        public Object beforeBodyWrite(Object body, MethodParameter returnType, MediaType contentType,
                                      Class<? extends HttpMessageConverter<?>> converterType,
                                      ServerHttpRequest request, ServerHttpResponse response) {
            ORDER.add("ResponseBodyAdvice.beforeBodyWrite");
            var envelope = new LinkedHashMap<String, Object>();
            envelope.put("data", body);
            envelope.put("meta", Map.of("path", "GET " + request.getURI().getPath()));
            return envelope;
        }
    }

    @Test
    void postHandleCannotTouchTheBodyButResponseBodyAdviceCan() throws Exception {
        HttpResponse<String> res = HttpClient.newHttpClient().send(
                HttpRequest.newBuilder(URI.create("http://localhost:" + port + "/ep08/trace")).build(),
                HttpResponse.BodyHandlers.ofString());

        System.out.println("=== Spring, rewriting the body ===");
        System.out.println("what postHandle was handed: ModelAndView=" + modelAndViewSeenByPostHandle);
        System.out.println("what ran first:             " + String.join(" -> ", ORDER));
        System.out.println("what the client received:   " + res.body());
        System.out.println("header set in postHandle:   X-Added-By-PostHandle="
                + res.headers().firstValue("X-Added-By-PostHandle").orElse("absent"));

        assertThat(modelAndViewSeenByPostHandle)
                .as("postHandle runs, and for an @ResponseBody method it is handed no model at all")
                .isEqualTo("null");
        assertThat(res.body())
                .as("ResponseBodyAdvice sits at the converter, so it does reach the payload")
                .contains("\"data\"")
                .contains("\"meta\"")
                .contains("GET /ep08/trace");
    }
}
