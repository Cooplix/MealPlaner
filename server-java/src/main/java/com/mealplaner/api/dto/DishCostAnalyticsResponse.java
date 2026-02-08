package com.mealplaner.api.dto;

import java.util.ArrayList;
import java.util.List;

public class DishCostAnalyticsResponse {
  private List<DishCostSummary> dishes = new ArrayList<>();
  private double totalDishCost;
  private int missingCount;
  private double totalSpent;

  public List<DishCostSummary> getDishes() {
    return dishes;
  }

  public void setDishes(List<DishCostSummary> dishes) {
    this.dishes = dishes == null ? new ArrayList<>() : dishes;
  }

  public double getTotalDishCost() {
    return totalDishCost;
  }

  public void setTotalDishCost(double totalDishCost) {
    this.totalDishCost = totalDishCost;
  }

  public int getMissingCount() {
    return missingCount;
  }

  public void setMissingCount(int missingCount) {
    this.missingCount = missingCount;
  }

  public double getTotalSpent() {
    return totalSpent;
  }

  public void setTotalSpent(double totalSpent) {
    this.totalSpent = totalSpent;
  }

  public static class DishCostSummary {
    private String dishId;
    private String name;
    private double totalCost;
    private List<MissingIngredient> missingIngredients = new ArrayList<>();
    private List<IngredientCost> ingredients = new ArrayList<>();

    public String getDishId() {
      return dishId;
    }

    public void setDishId(String dishId) {
      this.dishId = dishId;
    }

    public String getName() {
      return name;
    }

    public void setName(String name) {
      this.name = name;
    }

    public double getTotalCost() {
      return totalCost;
    }

    public void setTotalCost(double totalCost) {
      this.totalCost = totalCost;
    }

    public List<MissingIngredient> getMissingIngredients() {
      return missingIngredients;
    }

    public void setMissingIngredients(List<MissingIngredient> missingIngredients) {
      this.missingIngredients = missingIngredients == null ? new ArrayList<>() : missingIngredients;
    }

    public List<IngredientCost> getIngredients() {
      return ingredients;
    }

    public void setIngredients(List<IngredientCost> ingredients) {
      this.ingredients = ingredients == null ? new ArrayList<>() : ingredients;
    }
  }

  public static class MissingIngredient {
    private String ingredient;
    private String unit;

    public String getIngredient() {
      return ingredient;
    }

    public void setIngredient(String ingredient) {
      this.ingredient = ingredient;
    }

    public String getUnit() {
      return unit;
    }

    public void setUnit(String unit) {
      this.unit = unit;
    }
  }

  public static class IngredientCost {
    private String ingredient;
    private double amount;
    private String unit;
    private double cost;

    public String getIngredient() {
      return ingredient;
    }

    public void setIngredient(String ingredient) {
      this.ingredient = ingredient;
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

    public double getCost() {
      return cost;
    }

    public void setCost(double cost) {
      this.cost = cost;
    }
  }
}
