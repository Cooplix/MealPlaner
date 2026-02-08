package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CalorieUpdate {
  @JsonProperty("ingredientKey")
  private String ingredientKey;
  private Double amount;
  private String unit;
  private Double calories;

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
  }

  public Double getAmount() {
    return amount;
  }

  public void setAmount(Double amount) {
    this.amount = amount;
  }

  public String getUnit() {
    return unit;
  }

  public void setUnit(String unit) {
    this.unit = unit;
  }

  public Double getCalories() {
    return calories;
  }

  public void setCalories(Double calories) {
    this.calories = calories;
  }
}
