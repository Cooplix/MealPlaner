package com.mealplaner.api.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.ArrayList;
import java.util.List;

public class DishBase {
  private String id;
  private String name;
  private String meal;
  private List<DishIngredientDto> ingredients = new ArrayList<>();
  private String notes;

  @JsonProperty("createdBy")
  private String createdBy;

  private double calories;

  public String getId() {
    return id;
  }

  public void setId(String id) {
    this.id = id;
  }

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
    this.ingredients = ingredients == null ? new ArrayList<>() : ingredients;
  }

  public String getNotes() {
    return notes;
  }

  public void setNotes(String notes) {
    this.notes = notes;
  }

  public String getCreatedBy() {
    return createdBy;
  }

  public void setCreatedBy(String createdBy) {
    this.createdBy = createdBy;
  }

  public double getCalories() {
    return calories;
  }

  public void setCalories(double calories) {
    this.calories = calories;
  }
}
