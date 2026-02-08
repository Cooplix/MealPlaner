package com.mealplaner.api.dto;

import java.util.List;

public class DishUpdate {
  private String name;
  private String meal;
  private List<DishIngredientDto> ingredients;
  private String notes;

  public String getName() {
    return name;
  }

  public void setName(String name) {
    this.name = name;
  }

  public String getMeal() {
    return meal;
  }

  public void setMeal(String meal) {
    this.meal = meal;
  }

  public List<DishIngredientDto> getIngredients() {
    return ingredients;
  }

  public void setIngredients(List<DishIngredientDto> ingredients) {
    this.ingredients = ingredients;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }
}
