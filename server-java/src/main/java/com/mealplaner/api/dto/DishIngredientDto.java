package com.mealplaner.api.dto;

public class DishIngredientDto {
  private String ingredientKey;
  private String name;
  private String unit;
  private double qty;

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
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

  public double getQty() {
    return qty;
  }

  public void setQty(double qty) {
    this.qty = qty;
  }
}
