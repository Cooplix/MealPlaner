package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CalorieCreate {
  @JsonProperty("ingredientKey")
  private String ingredientKey;
  private double amount;
  private String unit;
  private double calories;

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
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
