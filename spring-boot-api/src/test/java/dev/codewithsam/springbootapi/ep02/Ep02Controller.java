package dev.codewithsam.springbootapi.ep02;

import org.springframework.web.bind.annotation.*;

/**
 * The Spring counterpart of nestjs-api/src/ep02-routes/route-order.ts.
 *
 * The parameter method is declared FIRST on purpose: that is the exact order
 * that makes the NestJS version return the wrong handler for /recent. Spring
 * resolves by pattern specificity rather than by declaration order, so this
 * same ordering is harmless here, and RouteOrderTest proves it rather than
 * asserting it.
 */
@RestController
@RequestMapping("/ep02-payments")
public class Ep02Controller {

  @GetMapping("/{id}")
  String byId(@PathVariable String id) {
    return "byId handler, id=" + id;
  }

  @GetMapping("/recent")
  String recent() {
    return "recent handler";
  }

  @PostMapping
  String create() {
    return "created";
  }
}
