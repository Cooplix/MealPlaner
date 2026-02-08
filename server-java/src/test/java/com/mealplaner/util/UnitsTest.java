package com.mealplaner.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class UnitsTest {
  @Test
  void sanitizeDefaultsToGrams() {
    assertEquals("g", Units.sanitize("шт"));
    assertEquals("g", Units.sanitize("unknown"));
    assertEquals("g", Units.sanitize(null));
  }

  @Test
  void sanitizeNormalizesKnownUnits() {
    assertEquals("kg", Units.sanitize(" KG "));
    assertEquals("pcs", Units.sanitize("Pcs"));
  }
}
