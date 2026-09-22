package dev.codewithsam.springbootapi.ep02;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/** Spring's plain @Controller. The returned String is a VIEW NAME. */
@Controller
public class PlainController {
  @GetMapping("/ep02-plain")
  String hello() {
    return "hello";
  }
}
