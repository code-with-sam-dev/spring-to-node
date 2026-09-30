package dev.codewithsam.springbootapi.ep08;

import jakarta.servlet.Filter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.ServletRequest;
import jakarta.servlet.ServletResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.aspectj.lang.ProceedingJoinPoint;
import org.aspectj.lang.annotation.Around;
import org.aspectj.lang.annotation.Aspect;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.ModelAndView;

import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Spring's three request-scoped extension points, each recording when it runs.
 *
 * The point of measuring rather than quoting is that the ORDER decides what
 * each one can still see and still change, and that is the whole basis for
 * choosing between them.
 */
public final class Ep08Trace {

    /** Concurrent because the filter and the container do not share a thread
     *  with the test, and a plain ArrayList hid a real event once. */
    public static final List<String> EVENTS = new CopyOnWriteArrayList<>();

    private Ep08Trace() {
    }

    public static void mark(String event) {
        EVENTS.add(event);
    }

    /** The outermost hook. Sees the raw request and response, and nothing about
     *  which handler will run, because that has not been decided yet. */
    public static class TraceFilter implements Filter {
        @Override
        public void doFilter(ServletRequest request, ServletResponse response, FilterChain chain)
                throws IOException, ServletException {
            mark("filter:before");
            try {
                chain.doFilter(request, response);
                mark("filter:after status " + ((HttpServletResponse) response).getStatus());
            } catch (Exception e) {
                mark("filter CAUGHT " + e.getClass().getSimpleName());
                throw e;
            }
        }
    }

    /** The one a Spring developer maps onto the word "interceptor". Note what
     *  postHandle is given: a ModelAndView, not the response body. */
    public static class TraceInterceptor implements HandlerInterceptor {
        @Override
        public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
            mark("interceptor:preHandle");
            return true;
        }

        @Override
        public void postHandle(HttpServletRequest request, HttpServletResponse response,
                               Object handler, ModelAndView modelAndView) {
            mark("interceptor:postHandle modelAndView=" + modelAndView
                    + " committed=" + response.isCommitted());
        }

        @Override
        public void afterCompletion(HttpServletRequest request, HttpServletResponse response,
                                    Object handler, Exception ex) {
            mark("interceptor:afterCompletion ex=" + (ex == null ? "none" : ex.getClass().getSimpleName()));
        }
    }

    /** The innermost hook, and the only one of the three that wraps the method
     *  call itself, which is why timing and retries live here. */
    @Aspect
    public static class TraceAspect {
        @Around("execution(* dev.codewithsam.springbootapi.ep08.Ep08TraceController.*(..))")
        public Object around(ProceedingJoinPoint pjp) throws Throwable {
            mark("aspect:before");
            try {
                Object result = pjp.proceed();
                mark("aspect:after");
                return result;
            } catch (Throwable t) {
                mark("aspect CAUGHT " + t.getClass().getSimpleName());
                throw t;
            }
        }
    }
}
