package com.mealplaner.api;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.util.Map;
import org.junit.jupiter.api.Test;

class HealthControllerUnitTest {
  @Test
  void healthReturnsOkPayload() {
    HealthController controller = new HealthController();
    Map<String, Object> payload = controller.health();
    assertEquals("ok", payload.get("status"));
    assertNotNull(payload.get("timestamp"));
  }
}
