package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CalorieEntry {
  private String id;

  @JsonProperty("ingredientKey")
  private String ingredientKey;

  @JsonProperty("ingredientName")
  private String ingredientName;

  private double amount;
  private String unit;
  private double calories;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
  }

  public String getIngredientName() {
    return ingredientName;
  }

  public void setIngredientName(String ingredientName) {
    this.ingredientName = ingredientName;
  }

  public double getAmount() {
    return amount;
  }

  public void setAmount(double amount) {
    this.amount = amount;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public double getCalories() {
    return calories;
  }

  public void setCalories(double calories) {
    this.calories = calories;
  }
}
