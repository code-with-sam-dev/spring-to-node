package dev.codewithsam.springbootapi.ep02;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/** @RestController, which is @Controller plus @ResponseBody. NestJS's @Controller. */
@RestController
public class BodyController {
  @GetMapping("/ep02-body")
  String hello() {
    return "hello";
  }
}
