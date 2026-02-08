package com.mealplaner.api.dto;

import java.util.Map;

public class IngredientEntry {
  private String key;
  private String name;
  private String unit;
  private Map<String, String> translations;

  public IngredientEntry() {}

  public IngredientEntry(String key, String name, String unit, Map<String, String> translations) {
    this.key = key;
    this.name = name;
    this.unit = unit;
    this.translations = translations;
  }

  public String getKey() {
    return key;
  }

  public void setKey(String key) {
    this.key = key;
  }

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
