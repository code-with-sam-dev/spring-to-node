package dev.codewithsam.springbootapi.ep02;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Episode 3, beat 2: @Controller does not mean the same thing in the two
 * frameworks, and the word being identical is what makes it dangerous.
 *
 * Nest's @Controller is Spring's @RestController: the return value IS the
 * response body. Spring's plain @Controller treats the returned String as a
 * VIEW NAME to be resolved by a template engine.
 *
 * So a developer porting a NestJS controller back, or reading Spring examples
 * while writing Nest, reaches for the identical word and gets a different
 * machine. This measures it rather than asserting it.
 */
@WebMvcTest({PlainController.class, BodyController.class})
class ControllerAnnotationTest {

  @Autowired private MockMvc mvc;

  /**
   * The plain @Controller returns "hello" and Spring goes looking for a VIEW
   * called hello. There is no template engine configured, so resolution fails.
   * The important part is not the status, it is that the string was never
   * treated as a body.
   */
  @Test
  void plainControllerTreatsTheStringAsAViewName() throws Exception {
    var result = mvc.perform(get("/ep02-plain")).andReturn();
    var view = result.getModelAndView();
    org.junit.jupiter.api.Assertions.assertNotNull(
        view, "a plain @Controller should have produced a ModelAndView");
    org.junit.jupiter.api.Assertions.assertEquals("hello", view.getViewName());
    org.junit.jupiter.api.Assertions.assertEquals(
        "", result.getResponse().getContentAsString(),
        "the string went to the view resolver, not to the response body");
  }

  /** Add @ResponseBody, which is what @RestController bundles, and it is a body. */
  @Test
  void responseBodyMakesItTheBody() throws Exception {
    mvc.perform(get("/ep02-body"))
       .andExpect(status().isOk())
       .andExpect(content().string("hello"));
  }
}
