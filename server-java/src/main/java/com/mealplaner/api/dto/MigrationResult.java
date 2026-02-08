package com.mealplaner.api.dto;

public class MigrationResult {
  private boolean dryRun;
  private String userId;

  private int claimedIngredients;
  private int claimedDishes;
  private int claimedPlans;
  private int claimedCalories;
  private int claimedPurchases;
  private int claimedInventory;
  private int claimedPetInventory;

  private int inventoryKeysFilled;
  private int inventoryKeysNormalized;
  private int inventoryKeysSkipped;

  private int dishIngredientKeysFilled;
  private int dishIngredientKeysNormalized;
  private int dishIngredientKeysSkipped;
  private int dishesUpdated;

  private int inventoryUpdated;
  private int petInventoryUpdated;

  private int backfillInventoryAdded;
  private int backfillInventoryUpdated;
  private int backfillInventorySkipped;

  public boolean isDryRun() {
    return dryRun;
  }

  public void setDryRun(boolean dryRun) {
    this.dryRun = dryRun;
  }

  public String getUserId() {
    return userId;
  }

  public void setUserId(String userId) {
    this.userId = userId;
  }

  public int getClaimedIngredients() {
    return claimedIngredients;
  }

  public void setClaimedIngredients(int claimedIngredients) {
    this.claimedIngredients = claimedIngredients;
  }

  public int getClaimedDishes() {
    return claimedDishes;
  }

  public void setClaimedDishes(int claimedDishes) {
    this.claimedDishes = claimedDishes;
  }

  public int getClaimedPlans() {
    return claimedPlans;
  }

  public void setClaimedPlans(int claimedPlans) {
    this.claimedPlans = claimedPlans;
  }

  public int getClaimedCalories() {
    return claimedCalories;
  }

  public void setClaimedCalories(int claimedCalories) {
    this.claimedCalories = claimedCalories;
  }

  public int getClaimedPurchases() {
    return claimedPurchases;
  }

  public void setClaimedPurchases(int claimedPurchases) {
    this.claimedPurchases = claimedPurchases;
  }

  public int getClaimedInventory() {
    return claimedInventory;
  }

  public void setClaimedInventory(int claimedInventory) {
    this.claimedInventory = claimedInventory;
  }

  public int getClaimedPetInventory() {
    return claimedPetInventory;
  }

  public void setClaimedPetInventory(int claimedPetInventory) {
    this.claimedPetInventory = claimedPetInventory;
  }

  public int getInventoryKeysFilled() {
    return inventoryKeysFilled;
  }

  public void setInventoryKeysFilled(int inventoryKeysFilled) {
    this.inventoryKeysFilled = inventoryKeysFilled;
  }

  public int getInventoryKeysNormalized() {
    return inventoryKeysNormalized;
  }

  public void setInventoryKeysNormalized(int inventoryKeysNormalized) {
    this.inventoryKeysNormalized = inventoryKeysNormalized;
  }

  public int getInventoryKeysSkipped() {
    return inventoryKeysSkipped;
  }

  public void setInventoryKeysSkipped(int inventoryKeysSkipped) {
    this.inventoryKeysSkipped = inventoryKeysSkipped;
  }

  public int getDishIngredientKeysFilled() {
    return dishIngredientKeysFilled;
  }

  public void setDishIngredientKeysFilled(int dishIngredientKeysFilled) {
    this.dishIngredientKeysFilled = dishIngredientKeysFilled;
  }

  public int getDishIngredientKeysNormalized() {
    return dishIngredientKeysNormalized;
  }

  public void setDishIngredientKeysNormalized(int dishIngredientKeysNormalized) {
    this.dishIngredientKeysNormalized = dishIngredientKeysNormalized;
  }

  public int getDishIngredientKeysSkipped() {
    return dishIngredientKeysSkipped;
  }

  public void setDishIngredientKeysSkipped(int dishIngredientKeysSkipped) {
    this.dishIngredientKeysSkipped = dishIngredientKeysSkipped;
  }

  public int getDishesUpdated() {
    return dishesUpdated;
  }

  public void setDishesUpdated(int dishesUpdated) {
    this.dishesUpdated = dishesUpdated;
  }

  public int getInventoryUpdated() {
    return inventoryUpdated;
  }

  public void setInventoryUpdated(int inventoryUpdated) {
    this.inventoryUpdated = inventoryUpdated;
  }

  public int getPetInventoryUpdated() {
    return petInventoryUpdated;
  }

  public void setPetInventoryUpdated(int petInventoryUpdated) {
    this.petInventoryUpdated = petInventoryUpdated;
  }

  public int getBackfillInventoryAdded() {
    return backfillInventoryAdded;
  }

  public void setBackfillInventoryAdded(int backfillInventoryAdded) {
    this.backfillInventoryAdded = backfillInventoryAdded;
  }

  public int getBackfillInventoryUpdated() {
    return backfillInventoryUpdated;
  }

  public void setBackfillInventoryUpdated(int backfillInventoryUpdated) {
    this.backfillInventoryUpdated = backfillInventoryUpdated;
  }

  public int getBackfillInventorySkipped() {
    return backfillInventorySkipped;
  }

  public void setBackfillInventorySkipped(int backfillInventorySkipped) {
    this.backfillInventorySkipped = backfillInventorySkipped;
  }
}
