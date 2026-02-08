package com.mealplaner.analytics;

import com.mealplaner.api.dto.DishCostAnalyticsResponse;
import com.mealplaner.api.dto.SpendingAnalyticsResponse;
import com.mealplaner.calorie.CalorieDocument;
import com.mealplaner.calorie.CalorieService;
import com.mealplaner.dish.DishDocument;
import com.mealplaner.dish.DishIngredient;
import com.mealplaner.dish.DishService;
import com.mealplaner.ingredient.IngredientDocument;
import com.mealplaner.ingredient.IngredientService;
import com.mealplaner.purchase.PurchaseDocument;
import com.mealplaner.purchase.PurchaseService;
import com.mealplaner.util.IngredientKey;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class AnalyticsService {
  private static final Map<String, Double> MASS_CONVERSIONS = new HashMap<>();
  private static final Map<String, Double> VOLUME_CONVERSIONS = new HashMap<>();

  static {
    MASS_CONVERSIONS.put("kg", 1.0);
    MASS_CONVERSIONS.put("g", 1.0 / 1000);
    MASS_CONVERSIONS.put("mg", 1.0 / 1_000_000);
    MASS_CONVERSIONS.put("lb", 0.453592);
    MASS_CONVERSIONS.put("oz", 0.0283495);

    VOLUME_CONVERSIONS.put("l", 1.0);
    VOLUME_CONVERSIONS.put("ml", 1.0 / 1000);
    VOLUME_CONVERSIONS.put("cup", 0.236588);
    VOLUME_CONVERSIONS.put("tbsp", 0.0147868);
    VOLUME_CONVERSIONS.put("tsp", 0.00492892);
  }

  private final PurchaseService purchaseService;
  private final DishService dishService;
  private final IngredientService ingredientService;
  private final CalorieService calorieService;

  public AnalyticsService(
      PurchaseService purchaseService,
      DishService dishService,
      IngredientService ingredientService,
      CalorieService calorieService
  ) {
    this.purchaseService = purchaseService;
    this.dishService = dishService;
    this.ingredientService = ingredientService;
    this.calorieService = calorieService;
  }

  public SpendingAnalyticsResponse buildSpendingAnalytics(
      String userId,
      Optional<String> start,
      Optional<String> end,
      Optional<String> ingredientKey
  ) {
    List<PurchaseDocument> filtered = purchaseService.list(userId, start, end, ingredientKey);
    List<PurchaseDocument> all = purchaseService.list(userId, Optional.empty(), Optional.empty(), Optional.empty());
    SpendingAnalyticsResponse response = new SpendingAnalyticsResponse();
    SpendingAnalyticsResponse.Range range = new SpendingAnalyticsResponse.Range();
    range.setStart(start.map(String::trim).filter(value -> !value.isBlank()).orElse(null));
    range.setEnd(end.map(String::trim).filter(value -> !value.isBlank()).orElse(null));
    response.setRange(range);
    response.setIngredientKey(ingredientKey.map(String::trim).filter(value -> !value.isBlank()).orElse(null));
    response.setPurchaseCount(filtered.size());
    response.setTotals(computeSpendStats(filtered));
    response.setAllTime(computeSpendStats(all));
    response.setDailyTotals(buildDailyTotals(filtered));
    response.setTopSpenders(buildTopSpenders(filtered, response.getTotals().getTotalSpent()));
    List<CalorieDocument> calorieEntries = calorieService.listAll(userId);
    NutritionResult nutrition = computeNutrition(filtered, calorieEntries);
    response.setNutrition(nutrition.stats);
    response.setTopCalories(nutrition.topItems);
    return response;
  }

  public DishCostAnalyticsResponse buildDishCostAnalytics(String userId) {
    List<DishDocument> dishes = dishService.listDishes(userId);
    List<IngredientDocument> ingredients = ingredientService.listIngredients(userId);
    List<PurchaseDocument> purchases = purchaseService.list(userId, Optional.empty(), Optional.empty(), Optional.empty());

    Map<String, IngredientDocument> optionMap = new HashMap<>();
    for (IngredientDocument ingredient : ingredients) {
      optionMap.put(normalizeKey(ingredient.getKey()), ingredient);
      if (ingredient.getName() != null && ingredient.getUnit() != null) {
        optionMap.put(IngredientKey.normalize(ingredient.getName(), ingredient.getUnit()), ingredient);
      }
    }

    Map<String, List<PurchaseDocument>> purchaseMap = new HashMap<>();
    for (PurchaseDocument purchase : purchases) {
      String key = normalizeKey(purchase.getIngredientKey());
      purchaseMap.computeIfAbsent(key, ignore -> new ArrayList<>()).add(purchase);
    }

    List<DishCostAnalyticsResponse.DishCostSummary> summaries = new ArrayList<>();
    double totalDishCost = 0.0;
    int missingCount = 0;

    for (DishDocument dish : dishes) {
      double dishCost = 0.0;
      List<DishCostAnalyticsResponse.MissingIngredient> missing = new ArrayList<>();
      List<DishCostAnalyticsResponse.IngredientCost> ingredientCosts = new ArrayList<>();

      for (DishIngredient ingredient : dish.getIngredients()) {
        String name = ingredient.getName() == null ? "" : ingredient.getName().trim();
        String unit = ingredient.getUnit() == null ? "" : ingredient.getUnit().trim().toLowerCase();
        if (name.isBlank() || unit.isBlank()) {
          DishCostAnalyticsResponse.MissingIngredient missingIngredient = new DishCostAnalyticsResponse.MissingIngredient();
          missingIngredient.setIngredient(name);
          missingIngredient.setUnit(unit);
          missing.add(missingIngredient);
          continue;
        }
        String fallbackKey = IngredientKey.normalize(name, unit);
        String resolvedKey = ingredient.getIngredientKey() == null || ingredient.getIngredientKey().isBlank()
            ? fallbackKey
            : normalizeKey(ingredient.getIngredientKey());
        IngredientDocument matching = optionMap.get(resolvedKey);
        if (matching == null) {
          matching = optionMap.get(fallbackKey);
        }
        if (matching == null) {
          DishCostAnalyticsResponse.MissingIngredient missingIngredient = new DishCostAnalyticsResponse.MissingIngredient();
          missingIngredient.setIngredient(name);
          missingIngredient.setUnit(unit);
          missing.add(missingIngredient);
          continue;
        }
        List<PurchaseDocument> purchasesForIngredient = purchaseMap.get(normalizeKey(matching.getKey()));
        if (purchasesForIngredient == null || purchasesForIngredient.isEmpty()) {
          DishCostAnalyticsResponse.MissingIngredient missingIngredient = new DishCostAnalyticsResponse.MissingIngredient();
          missingIngredient.setIngredient(name);
          missingIngredient.setUnit(unit);
          missing.add(missingIngredient);
          continue;
        }
        PurchaseDocument latest = purchasesForIngredient.get(0);
        NormalizedQuantity normalizedPurchase = normalizeQuantity(latest.getAmount(), latest.getUnit());
        NormalizedQuantity normalizedIngredient = normalizeQuantity(ingredient.getQty(), ingredient.getUnit());
        if (normalizedPurchase == null || normalizedIngredient == null) {
          DishCostAnalyticsResponse.MissingIngredient missingIngredient = new DishCostAnalyticsResponse.MissingIngredient();
          missingIngredient.setIngredient(name);
          missingIngredient.setUnit(unit);
          missing.add(missingIngredient);
          continue;
        }
        if (!normalizedPurchase.baseUnit.equals(normalizedIngredient.baseUnit) || normalizedPurchase.amount <= 0) {
          DishCostAnalyticsResponse.MissingIngredient missingIngredient = new DishCostAnalyticsResponse.MissingIngredient();
          missingIngredient.setIngredient(name);
          missingIngredient.setUnit(unit);
          missing.add(missingIngredient);
          continue;
        }
        double pricePerUnit = latest.getPrice() / normalizedPurchase.amount;
        double cost = pricePerUnit * normalizedIngredient.amount;
        dishCost += cost;
        DishCostAnalyticsResponse.IngredientCost ingredientCost = new DishCostAnalyticsResponse.IngredientCost();
        ingredientCost.setIngredient(name);
        ingredientCost.setAmount(ingredient.getQty());
        ingredientCost.setUnit(unit);
        ingredientCost.setCost(cost);
        ingredientCosts.add(ingredientCost);
      }

      if (!ingredientCosts.isEmpty()) {
        totalDishCost += dishCost;
      }
      missingCount += missing.size();

      DishCostAnalyticsResponse.DishCostSummary summary = new DishCostAnalyticsResponse.DishCostSummary();
      summary.setDishId(dish.getId());
      summary.setName(dish.getName());
      summary.setTotalCost(dishCost);
      summary.setMissingIngredients(missing);
      summary.setIngredients(ingredientCosts);
      summaries.add(summary);
    }

    summaries.sort(Comparator.comparingDouble(DishCostAnalyticsResponse.DishCostSummary::getTotalCost).reversed());

    DishCostAnalyticsResponse response = new DishCostAnalyticsResponse();
    response.setDishes(summaries);
    response.setTotalDishCost(totalDishCost);
    response.setMissingCount(missingCount);
    response.setTotalSpent(purchases.stream().mapToDouble(PurchaseDocument::getPrice).sum());
    return response;
  }

  private SpendingAnalyticsResponse.SpendingStats computeSpendStats(List<PurchaseDocument> purchases) {
    SpendingAnalyticsResponse.SpendingStats stats = new SpendingAnalyticsResponse.SpendingStats();
    if (purchases == null || purchases.isEmpty()) {
      stats.setTotalSpent(0.0);
      stats.setAverageDailySpend(0.0);
      stats.setMedianDailySpend(0.0);
      stats.setDaysTracked(0);
      stats.setAveragePurchase(0.0);
      return stats;
    }

    Map<LocalDate, Double> byDate = new HashMap<>();
    LocalDate minDate = null;
    LocalDate maxDate = null;
    Map<String, UnitAggregate> normalizedTotals = new HashMap<>();

    for (PurchaseDocument purchase : purchases) {
      LocalDate date = toLocalDate(purchase);
      if (date != null) {
        if (minDate == null || date.isBefore(minDate)) {
          minDate = date;
        }
        if (maxDate == null || date.isAfter(maxDate)) {
          maxDate = date;
        }
        byDate.merge(date, purchase.getPrice(), Double::sum);
      }
      NormalizedQuantity normalized = normalizeQuantity(purchase.getAmount(), purchase.getUnit());
      if (normalized != null) {
        UnitAggregate bucket = normalizedTotals.get(normalized.baseUnit);
        if (bucket == null) {
          bucket = new UnitAggregate();
          normalizedTotals.put(normalized.baseUnit, bucket);
        }
        bucket.amount += normalized.amount;
        bucket.price += purchase.getPrice();
      }
    }

    double totalSpent = byDate.values().stream().mapToDouble(Double::doubleValue).sum();
    int daysTracked = computeDaysTracked(minDate, maxDate);
    stats.setTotalSpent(totalSpent);
    stats.setAverageDailySpend(daysTracked > 0 ? totalSpent / daysTracked : 0.0);
    stats.setMedianDailySpend(median(byDate.values()));
    stats.setDaysTracked(daysTracked);
    stats.setAveragePurchase(totalSpent / Math.max(1, purchases.size()));

    if (!normalizedTotals.isEmpty()) {
      Map.Entry<String, UnitAggregate> best = null;
      for (Map.Entry<String, UnitAggregate> entry : normalizedTotals.entrySet()) {
        if (best == null || entry.getValue().amount > best.getValue().amount) {
          best = entry;
        }
      }
      if (best != null && best.getValue().amount > 0) {
        stats.setNormalizedUnit(best.getKey());
        stats.setTotalNormalizedQuantity(best.getValue().amount);
        stats.setAverageUnitPrice(best.getValue().price / best.getValue().amount);
      }
    }
    return stats;
  }

  private List<SpendingAnalyticsResponse.DailyTotal> buildDailyTotals(List<PurchaseDocument> purchases) {
    Map<LocalDate, Double> totals = new HashMap<>();
    for (PurchaseDocument purchase : purchases) {
      LocalDate date = toLocalDate(purchase);
      if (date == null) {
        continue;
      }
      totals.merge(date, purchase.getPrice(), Double::sum);
    }
    List<SpendingAnalyticsResponse.DailyTotal> result = new ArrayList<>();
    totals.entrySet().stream()
        .sorted(Map.Entry.comparingByKey())
        .forEach(entry -> {
          SpendingAnalyticsResponse.DailyTotal total = new SpendingAnalyticsResponse.DailyTotal();
          total.setDate(entry.getKey().toString());
          total.setTotal(entry.getValue());
          result.add(total);
        });
    return result;
  }

  private List<SpendingAnalyticsResponse.TopSpender> buildTopSpenders(
      List<PurchaseDocument> purchases,
      double totalSpent
  ) {
    Map<String, TopSpenderAggregate> buckets = new HashMap<>();
    for (PurchaseDocument purchase : purchases) {
      String key = normalizeKey(purchase.getIngredientKey());
      TopSpenderAggregate bucket = buckets.get(key);
      if (bucket == null) {
        bucket = new TopSpenderAggregate();
        buckets.put(key, bucket);
      }
      bucket.total += purchase.getPrice();
      bucket.count += 1;
      NormalizedQuantity normalized = normalizeQuantity(purchase.getAmount(), purchase.getUnit());
      if (normalized != null && normalized.amount > 0) {
        bucket.unitPriceSum += purchase.getPrice() / normalized.amount;
        bucket.unitPriceCount += 1;
        bucket.unitLabel = normalized.baseUnit;
      }
    }
    List<SpendingAnalyticsResponse.TopSpender> result = new ArrayList<>();
    for (Map.Entry<String, TopSpenderAggregate> entry : buckets.entrySet()) {
      TopSpenderAggregate bucket = entry.getValue();
      SpendingAnalyticsResponse.TopSpender spender = new SpendingAnalyticsResponse.TopSpender();
      spender.setIngredientKey(entry.getKey());
      spender.setTotal(bucket.total);
      spender.setCount(bucket.count);
      spender.setShare(totalSpent > 0 ? bucket.total / totalSpent : 0.0);
      spender.setAverageUnitPrice(
          bucket.unitPriceCount > 0 ? bucket.unitPriceSum / bucket.unitPriceCount : null
      );
      spender.setUnitLabel(bucket.unitLabel);
      result.add(spender);
    }
    result.sort(Comparator.comparingDouble(SpendingAnalyticsResponse.TopSpender::getTotal).reversed());
    if (result.size() > 5) {
      return result.subList(0, 5);
    }
    return result;
  }

  private NutritionResult computeNutrition(List<PurchaseDocument> purchases, List<CalorieDocument> calorieEntries) {
    if (purchases.isEmpty() || calorieEntries.isEmpty()) {
      SpendingAnalyticsResponse.NutritionStats stats = new SpendingAnalyticsResponse.NutritionStats();
      stats.setTotalCalories(0.0);
      stats.setAverageDailyCalories(0.0);
      stats.setCaloriesPerPurchase(0.0);
      stats.setDaysTracked(purchases.isEmpty() ? 0 : 1);
      stats.setPurchasesWithCalories(0);
      return new NutritionResult(stats, List.of());
    }

    Map<String, List<CalorieDocument>> entryMap = new HashMap<>();
    for (CalorieDocument entry : calorieEntries) {
      entryMap.computeIfAbsent(normalizeKey(entry.getIngredientKey()), ignore -> new ArrayList<>()).add(entry);
    }

    LocalDate minDate = null;
    LocalDate maxDate = null;
    double totalCalories = 0.0;
    int purchasesWithCalories = 0;
    Map<String, NutritionAggregate> ingredientTotals = new HashMap<>();

    for (PurchaseDocument purchase : purchases) {
      LocalDate date = toLocalDate(purchase);
      if (date != null) {
        if (minDate == null || date.isBefore(minDate)) {
          minDate = date;
        }
        if (maxDate == null || date.isAfter(maxDate)) {
          maxDate = date;
        }
      }

      List<CalorieDocument> entries = entryMap.get(normalizeKey(purchase.getIngredientKey()));
      if (entries == null || entries.isEmpty()) {
        continue;
      }

      Double caloriesForPurchase = null;
      for (CalorieDocument entry : entries) {
        if (entry.getAmount() <= 0) {
          continue;
        }
        Double converted = convertQuantity(purchase.getAmount(), purchase.getUnit(), entry.getUnit());
        if (converted == null) {
          continue;
        }
        double candidate = (converted / entry.getAmount()) * entry.getCalories();
        if (!Double.isFinite(candidate)) {
          continue;
        }
        caloriesForPurchase = candidate;
        break;
      }
      if (caloriesForPurchase == null) {
        continue;
      }

      totalCalories += caloriesForPurchase;
      purchasesWithCalories += 1;

      NormalizedQuantity normalized = normalizeQuantity(purchase.getAmount(), purchase.getUnit());
      NutritionAggregate bucket = ingredientTotals.get(normalizeKey(purchase.getIngredientKey()));
      if (bucket == null) {
        bucket = new NutritionAggregate();
        ingredientTotals.put(normalizeKey(purchase.getIngredientKey()), bucket);
      }
      bucket.calories += caloriesForPurchase;
      bucket.count += 1;
      if (normalized != null) {
        bucket.normalizedAmount += normalized.amount;
        bucket.normalizedUnit = normalized.baseUnit;
      }
    }

    int daysTracked = computeDaysTracked(minDate, maxDate);
    double averageDailyCalories = daysTracked > 0 ? totalCalories / daysTracked : 0.0;
    double caloriesPerPurchase = purchasesWithCalories > 0 ? totalCalories / purchasesWithCalories : 0.0;

    List<SpendingAnalyticsResponse.TopCalorieItem> topItems = new ArrayList<>();
    for (Map.Entry<String, NutritionAggregate> entry : ingredientTotals.entrySet()) {
      NutritionAggregate aggregate = entry.getValue();
      SpendingAnalyticsResponse.TopCalorieItem item = new SpendingAnalyticsResponse.TopCalorieItem();
      item.setIngredientKey(entry.getKey());
      item.setTotalCalories(aggregate.calories);
      item.setCount(aggregate.count);
      item.setNormalizedAmount(aggregate.normalizedAmount > 0 ? aggregate.normalizedAmount : null);
      item.setNormalizedUnit(aggregate.normalizedUnit);
      topItems.add(item);
    }
    topItems.sort(Comparator.comparingDouble(SpendingAnalyticsResponse.TopCalorieItem::getTotalCalories).reversed());
    if (topItems.size() > 5) {
      topItems = new ArrayList<>(topItems.subList(0, 5));
    }

    SpendingAnalyticsResponse.NutritionStats stats = new SpendingAnalyticsResponse.NutritionStats();
    stats.setTotalCalories(totalCalories);
    stats.setAverageDailyCalories(averageDailyCalories);
    stats.setCaloriesPerPurchase(caloriesPerPurchase);
    stats.setDaysTracked(daysTracked);
    stats.setPurchasesWithCalories(purchasesWithCalories);
    return new NutritionResult(stats, topItems);
  }

  private LocalDate toLocalDate(PurchaseDocument purchase) {
    if (purchase.getPurchasedAt() == null) {
      return null;
    }
    return purchase.getPurchasedAt().atZone(ZoneOffset.UTC).toLocalDate();
  }

  private int computeDaysTracked(LocalDate minDate, LocalDate maxDate) {
    if (minDate == null || maxDate == null) {
      return 0;
    }
    long days = ChronoUnit.DAYS.between(minDate, maxDate) + 1;
    return (int) Math.max(days, 1);
  }

  private double median(Iterable<Double> values) {
    List<Double> sorted = new ArrayList<>();
    for (Double value : values) {
      sorted.add(value);
    }
    if (sorted.isEmpty()) {
      return 0.0;
    }
    Collections.sort(sorted);
    int mid = sorted.size() / 2;
    if (sorted.size() % 2 == 0) {
      return (sorted.get(mid - 1) + sorted.get(mid)) / 2.0;
    }
    return sorted.get(mid);
  }

  private NormalizedQuantity normalizeQuantity(double amount, String unit) {
    if (!Double.isFinite(amount) || amount <= 0) {
      return null;
    }
    String normalized = unit == null ? "" : unit.trim().toLowerCase();
    if (MASS_CONVERSIONS.containsKey(normalized)) {
      return new NormalizedQuantity("kg", amount * MASS_CONVERSIONS.get(normalized));
    }
    if (VOLUME_CONVERSIONS.containsKey(normalized)) {
      return new NormalizedQuantity("l", amount * VOLUME_CONVERSIONS.get(normalized));
    }
    if ("pcs".equals(normalized)) {
      return new NormalizedQuantity("pcs", amount);
    }
    return null;
  }

  private Double convertQuantity(double amount, String fromUnit, String toUnit) {
    String from = fromUnit == null ? "" : fromUnit.trim().toLowerCase();
    String to = toUnit == null ? "" : toUnit.trim().toLowerCase();
    if (from.equals(to)) {
      return amount;
    }
    if (MASS_CONVERSIONS.containsKey(from) && MASS_CONVERSIONS.containsKey(to)) {
      double inKg = amount * MASS_CONVERSIONS.get(from);
      return inKg / MASS_CONVERSIONS.get(to);
    }
    if (VOLUME_CONVERSIONS.containsKey(from) && VOLUME_CONVERSIONS.containsKey(to)) {
      double inLiters = amount * VOLUME_CONVERSIONS.get(from);
      return inLiters / VOLUME_CONVERSIONS.get(to);
    }
    if ("pcs".equals(from) && "pcs".equals(to)) {
      return amount;
    }
    return null;
  }

  private String normalizeKey(String value) {
    return value == null ? "" : value.trim().toLowerCase();
  }

  private static class UnitAggregate {
    private double amount;
    private double price;
  }

  private static class TopSpenderAggregate {
    private double total;
    private int count;
    private double unitPriceSum;
    private int unitPriceCount;
    private String unitLabel;
  }

  private static class NutritionAggregate {
    private double calories;
    private int count;
    private double normalizedAmount;
    private String normalizedUnit;
  }

  private static class NormalizedQuantity {
    private final String baseUnit;
    private final double amount;

    private NormalizedQuantity(String baseUnit, double amount) {
      this.baseUnit = baseUnit;
      this.amount = amount;
    }
  }

  private static class NutritionResult {
    private final SpendingAnalyticsResponse.NutritionStats stats;
    private final List<SpendingAnalyticsResponse.TopCalorieItem> topItems;

    private NutritionResult(
        SpendingAnalyticsResponse.NutritionStats stats,
        List<SpendingAnalyticsResponse.TopCalorieItem> topItems
    ) {
      this.stats = stats;
      this.topItems = topItems;
    }
  }
}
