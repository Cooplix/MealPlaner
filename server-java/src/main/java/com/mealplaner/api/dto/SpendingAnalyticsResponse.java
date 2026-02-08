package com.mealplaner.api.dto;

import java.util.ArrayList;
import java.util.List;

public class SpendingAnalyticsResponse {
  private Range range;
  private String ingredientKey;
  private int purchaseCount;
  private SpendingStats totals;
  private SpendingStats allTime;
  private List<DailyTotal> dailyTotals = new ArrayList<>();
  private List<TopSpender> topSpenders = new ArrayList<>();
  private NutritionStats nutrition;
  private List<TopCalorieItem> topCalories = new ArrayList<>();

  public Range getRange() {
    return range;
  }

  public void setRange(Range range) {
    this.range = range;
  }

  public String getIngredientKey() {
    return ingredientKey;
  }

  public void setIngredientKey(String ingredientKey) {
    this.ingredientKey = ingredientKey;
  }

  public int getPurchaseCount() {
    return purchaseCount;
  }

  public void setPurchaseCount(int purchaseCount) {
    this.purchaseCount = purchaseCount;
  }

  public SpendingStats getTotals() {
    return totals;
  }

  public void setTotals(SpendingStats totals) {
    this.totals = totals;
  }

  public SpendingStats getAllTime() {
    return allTime;
  }

  public void setAllTime(SpendingStats allTime) {
    this.allTime = allTime;
  }

  public List<DailyTotal> getDailyTotals() {
    return dailyTotals;
  }

  public void setDailyTotals(List<DailyTotal> dailyTotals) {
    this.dailyTotals = dailyTotals == null ? new ArrayList<>() : dailyTotals;
  }

  public List<TopSpender> getTopSpenders() {
    return topSpenders;
  }

  public void setTopSpenders(List<TopSpender> topSpenders) {
    this.topSpenders = topSpenders == null ? new ArrayList<>() : topSpenders;
  }

  public NutritionStats getNutrition() {
    return nutrition;
  }

  public void setNutrition(NutritionStats nutrition) {
    this.nutrition = nutrition;
  }

  public List<TopCalorieItem> getTopCalories() {
    return topCalories;
  }

  public void setTopCalories(List<TopCalorieItem> topCalories) {
    this.topCalories = topCalories == null ? new ArrayList<>() : topCalories;
  }

  public static class Range {
    private String start;
    private String end;

    public String getStart() {
      return start;
    }

    public void setStart(String start) {
      this.start = start;
    }

    public String getEnd() {
      return end;
    }

    public void setEnd(String end) {
      this.end = end;
    }
  }

  public static class SpendingStats {
    private double totalSpent;
    private double averageDailySpend;
    private double medianDailySpend;
    private int daysTracked;
    private double averagePurchase;
    private String normalizedUnit;
    private Double totalNormalizedQuantity;
    private Double averageUnitPrice;

    public double getTotalSpent() {
      return totalSpent;
    }

    public void setTotalSpent(double totalSpent) {
      this.totalSpent = totalSpent;
    }

    public double getAverageDailySpend() {
      return averageDailySpend;
    }

    public void setAverageDailySpend(double averageDailySpend) {
      this.averageDailySpend = averageDailySpend;
    }

    public double getMedianDailySpend() {
      return medianDailySpend;
    }

    public void setMedianDailySpend(double medianDailySpend) {
      this.medianDailySpend = medianDailySpend;
    }

    public int getDaysTracked() {
      return daysTracked;
    }

    public void setDaysTracked(int daysTracked) {
      this.daysTracked = daysTracked;
    }

    public double getAveragePurchase() {
      return averagePurchase;
    }

    public void setAveragePurchase(double averagePurchase) {
      this.averagePurchase = averagePurchase;
    }

    public String getNormalizedUnit() {
      return normalizedUnit;
    }

    public void setNormalizedUnit(String normalizedUnit) {
      this.normalizedUnit = normalizedUnit;
    }

    public Double getTotalNormalizedQuantity() {
      return totalNormalizedQuantity;
    }

    public void setTotalNormalizedQuantity(Double totalNormalizedQuantity) {
      this.totalNormalizedQuantity = totalNormalizedQuantity;
    }

    public Double getAverageUnitPrice() {
      return averageUnitPrice;
    }

    public void setAverageUnitPrice(Double averageUnitPrice) {
      this.averageUnitPrice = averageUnitPrice;
    }
  }

  public static class DailyTotal {
    private String date;
    private double total;

    public String getDate() {
      return date;
    }

    public void setDate(String date) {
      this.date = date;
    }

    public double getTotal() {
      return total;
    }

    public void setTotal(double total) {
      this.total = total;
    }
  }

  public static class TopSpender {
    private String ingredientKey;
    private double total;
    private double share;
    private int count;
    private Double averageUnitPrice;
    private String unitLabel;

    public String getIngredientKey() {
      return ingredientKey;
    }

    public void setIngredientKey(String ingredientKey) {
      this.ingredientKey = ingredientKey;
    }

    public double getTotal() {
      return total;
    }

    public void setTotal(double total) {
      this.total = total;
    }

    public double getShare() {
      return share;
    }

    public void setShare(double share) {
      this.share = share;
    }

    public int getCount() {
      return count;
    }

    public void setCount(int count) {
      this.count = count;
    }

    public Double getAverageUnitPrice() {
      return averageUnitPrice;
    }

    public void setAverageUnitPrice(Double averageUnitPrice) {
      this.averageUnitPrice = averageUnitPrice;
    }

    public String getUnitLabel() {
      return unitLabel;
    }

    public void setUnitLabel(String unitLabel) {
      this.unitLabel = unitLabel;
    }
  }

  public static class NutritionStats {
    private double totalCalories;
    private double averageDailyCalories;
    private double caloriesPerPurchase;
    private int daysTracked;
    private int purchasesWithCalories;

    public double getTotalCalories() {
      return totalCalories;
    }

    public void setTotalCalories(double totalCalories) {
      this.totalCalories = totalCalories;
    }

    public double getAverageDailyCalories() {
      return averageDailyCalories;
    }

    public void setAverageDailyCalories(double averageDailyCalories) {
      this.averageDailyCalories = averageDailyCalories;
    }

    public double getCaloriesPerPurchase() {
      return caloriesPerPurchase;
    }

    public void setCaloriesPerPurchase(double caloriesPerPurchase) {
      this.caloriesPerPurchase = caloriesPerPurchase;
    }

    public int getDaysTracked() {
      return daysTracked;
    }

    public void setDaysTracked(int daysTracked) {
      this.daysTracked = daysTracked;
    }

    public int getPurchasesWithCalories() {
      return purchasesWithCalories;
    }

    public void setPurchasesWithCalories(int purchasesWithCalories) {
      this.purchasesWithCalories = purchasesWithCalories;
    }
  }

  public static class TopCalorieItem {
    private String ingredientKey;
    private double totalCalories;
    private int count;
    private Double normalizedAmount;
    private String normalizedUnit;

    public String getIngredientKey() {
      return ingredientKey;
    }

    public void setIngredientKey(String ingredientKey) {
      this.ingredientKey = ingredientKey;
    }

    public double getTotalCalories() {
      return totalCalories;
    }

    public void setTotalCalories(double totalCalories) {
      this.totalCalories = totalCalories;
    }

    public int getCount() {
      return count;
    }

    public void setCount(int count) {
      this.count = count;
    }

    public Double getNormalizedAmount() {
      return normalizedAmount;
    }

    public void setNormalizedAmount(Double normalizedAmount) {
      this.normalizedAmount = normalizedAmount;
    }

    public String getNormalizedUnit() {
      return normalizedUnit;
    }

    public void setNormalizedUnit(String normalizedUnit) {
      this.normalizedUnit = normalizedUnit;
    }
  }
}
