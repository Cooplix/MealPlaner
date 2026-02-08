package com.mealplaner.util;

public final class IngredientKey {
  private IngredientKey() {}

  public static String normalize(String name, String unit) {
    String safeName = name == null ? "" : name.trim().toLowerCase();
    String safeUnit = Units.sanitize(unit);
    return safeName + "__" + safeUnit;
  }
}
