package com.mealplaner.api.dto;

import java.util.Map;

public class IngredientUpsert {
  private String name;
  private String unit;
  private Map<String, String> translations;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public Map<String, String> getTranslations() {
    return translations;
  }

  public void setTranslations(Map<String, String> translations) {
    this.translations = translations;
  }
}
