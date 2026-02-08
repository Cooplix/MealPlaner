package com.mealplaner.dish;

import java.util.ArrayList;
import java.util.List;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.Field;

@Document(collection = "dishes")
public class DishDocument {
  @Id
  private String id;

  private String name;
  private String meal;
  private List<DishIngredient> ingredients = new ArrayList<>();
  private String notes;

  @Field("created_by")
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

  public List<DishIngredient> getIngredients() {
    return ingredients;
  }

  public void setIngredients(List<DishIngredient> ingredients) {
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
