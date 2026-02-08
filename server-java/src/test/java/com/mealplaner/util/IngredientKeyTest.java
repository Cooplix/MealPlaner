package com.mealplaner.util;

import static org.junit.jupiter.api.Assertions.assertEquals;

import org.junit.jupiter.api.Test;

class IngredientKeyTest {
  @Test
  void normalizeLowercasesAndTrims() {
    assertEquals("sugar__kg", IngredientKey.normalize(" Sugar ", "KG"));
  }

  @Test
  void normalizeFallsBackToDefaultUnit() {
    assertEquals("salt__g", IngredientKey.normalize("Salt", "шт"));
  }
}
