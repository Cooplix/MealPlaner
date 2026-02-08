package com.mealplaner.events;

import com.mealplaner.api.dto.EventEntry;
import com.mealplaner.api.dto.ShoppingListItem;
import com.mealplaner.inventory.InventoryItemDocument;
import com.mealplaner.inventory.InventoryService;
import com.mealplaner.inventory.PetFoodItemDocument;
import com.mealplaner.inventory.PetFoodService;
import com.mealplaner.purchase.PurchaseDocument;
import com.mealplaner.purchase.PurchaseService;
import com.mealplaner.shopping.ShoppingService;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import org.springframework.stereotype.Service;

@Service
public class EventService {
  private static final int DEFAULT_LIMIT = 10;
  private static final int DEFAULT_LOOKAHEAD_DAYS = 7;
  private static final int MAX_LIMIT = 50;
  private static final int EXPIRY_LOOKAHEAD_DAYS = 60;
  private static final int PURCHASE_WINDOW_DAYS = 30;
  private static final int MAX_CRITICAL_EVENTS = 5;
  private static final int MAX_PURCHASE_EVENTS = 5;

  private final InventoryService inventoryService;
  private final PetFoodService petFoodService;
  private final ShoppingService shoppingService;
  private final PurchaseService purchaseService;

  public EventService(
      InventoryService inventoryService,
      PetFoodService petFoodService,
      ShoppingService shoppingService,
      PurchaseService purchaseService
  ) {
    this.inventoryService = inventoryService;
    this.petFoodService = petFoodService;
    this.shoppingService = shoppingService;
    this.purchaseService = purchaseService;
  }

  public List<EventEntry> buildEvents(String userId, Integer limit, Integer lookaheadDays) {
    int safeLimit = clamp(limit == null ? DEFAULT_LIMIT : limit, 1, MAX_LIMIT);
    int safeLookaheadDays = clamp(
        lookaheadDays == null ? DEFAULT_LOOKAHEAD_DAYS : lookaheadDays,
        1,
        31
    );

    LocalDate today = LocalDate.now(ZoneOffset.UTC);
    LocalDate expiryMax = today.plusDays(EXPIRY_LOOKAHEAD_DAYS);
    LocalDate expiryMin = today.minusDays(1);
    LocalDate shoppingEnd = today.plusDays(safeLookaheadDays - 1);
    LocalDate purchaseStart = today.minusDays(PURCHASE_WINDOW_DAYS);
    LocalDateTime now = LocalDateTime.now(ZoneOffset.UTC);

    List<EventEntry> events = new ArrayList<>();

    List<InventoryItemDocument> inventoryItems = inventoryService.listItems(userId);
    for (InventoryItemDocument item : inventoryItems) {
      String title = resolveInventoryTitle(item);
      Instant expiresAt = item.getExpiresAt();
      if (expiresAt != null) {
        LocalDate expiryDate = expiresAt.atZone(ZoneOffset.UTC).toLocalDate();
        if (!expiryDate.isBefore(expiryMin) && !expiryDate.isAfter(expiryMax)) {
          EventEntry event = baseEvent(
              "expiry-inventory-" + item.getId(),
              "expiry",
              expiryPriority(today, expiryDate),
              title,
              toLocalDateTime(expiresAt)
          );
          events.add(event);
        }
      }

      Double minQty = item.getMinQty();
      if (minQty != null && item.getQuantity() < minQty) {
        double deficit = minQty - item.getQuantity();
        EventEntry event = baseEvent(
            "restock-inventory-" + item.getId(),
            "restock",
            restockPriority(item.getQuantity(), minQty),
            title,
            now
        );
        event.setAmount(deficit);
        event.setUnit(item.getUnit());
        events.add(event);
      }
    }

    List<PetFoodItemDocument> petItems = petFoodService.listItems(userId);
    for (PetFoodItemDocument item : petItems) {
      String title = resolvePetTitle(item);
      Instant expiresAt = item.getExpiresAt();
      if (expiresAt != null) {
        LocalDate expiryDate = expiresAt.atZone(ZoneOffset.UTC).toLocalDate();
        if (!expiryDate.isBefore(expiryMin) && !expiryDate.isAfter(expiryMax)) {
          EventEntry event = baseEvent(
              "expiry-pet-" + item.getId(),
              "expiry",
              expiryPriority(today, expiryDate),
              title,
              toLocalDateTime(expiresAt)
          );
          events.add(event);
        }
      }

      Double minQty = item.getMinQty();
      if (minQty != null && item.getQuantity() < minQty) {
        double deficit = minQty - item.getQuantity();
        EventEntry event = baseEvent(
            "restock-pet-" + item.getId(),
            "restock",
            restockPriority(item.getQuantity(), minQty),
            title,
            now
        );
        event.setAmount(deficit);
        event.setUnit("pcs");
        events.add(event);
      }
    }

    List<ShoppingListItem> shoppingList = shoppingService.build(userId, today.toString(), shoppingEnd.toString());
    if (!shoppingList.isEmpty()) {
      shoppingList.stream()
          .filter(item -> item.getToBuyQty() > 0)
          .sorted(Comparator.comparingDouble(ShoppingListItem::getToBuyQty).reversed())
          .limit(MAX_CRITICAL_EVENTS)
          .forEach(item -> {
            EventEntry event = baseEvent(
                "critical-" + (item.getIngredientKey() == null ? item.getName() : item.getIngredientKey()),
                "critical",
                criticalPriority(item),
                item.getName(),
                now
            );
            event.setAmount(item.getToBuyQty());
            event.setUnit(item.getUnit());
            events.add(event);
          });
    }

    List<PurchaseDocument> purchases = purchaseService.list(
        userId,
        Optional.of(purchaseStart.toString()),
        Optional.of(today.toString()),
        Optional.empty()
    );
    if (!purchases.isEmpty()) {
      double averagePrice = purchases.stream().mapToDouble(PurchaseDocument::getPrice).average().orElse(0.0);
      purchases.stream()
          .sorted(Comparator.comparingDouble(PurchaseDocument::getPrice).reversed())
          .limit(MAX_PURCHASE_EVENTS)
          .forEach(purchase -> {
            String title = resolvePurchaseTitle(purchase);
            EventEntry event = baseEvent(
                "purchase-" + purchase.getId(),
                "purchase",
                purchasePriority(purchase.getPrice(), averagePrice),
                title,
                toLocalDateTime(purchase.getPurchasedAt())
            );
            event.setAmount(purchase.getAmount());
            event.setUnit(purchase.getUnit());
            event.setPrice(purchase.getPrice());
            events.add(event);
          });
    }

    events.sort((left, right) -> {
      int priorityCompare = Integer.compare(priorityScore(right.getPriority()), priorityScore(left.getPriority()));
      if (priorityCompare != 0) {
        return priorityCompare;
      }
      return Long.compare(sortTimestamp(left), sortTimestamp(right));
    });

    if (events.size() > safeLimit) {
      return new ArrayList<>(events.subList(0, safeLimit));
    }
    return events;
  }

  private EventEntry baseEvent(String id, String kind, String priority, String title, LocalDateTime date) {
    EventEntry entry = new EventEntry();
    entry.setId(id);
    entry.setKind(kind);
    entry.setPriority(priority);
    entry.setTitle(title);
    entry.setDate(date);
    return entry;
  }

  private String resolveInventoryTitle(InventoryItemDocument item) {
    String name = item.getName();
    if (name != null && !name.trim().isEmpty()) {
      return name.trim();
    }
    String key = item.getIngredientKey();
    if (key != null && !key.trim().isEmpty()) {
      return key.trim();
    }
    return "Item";
  }

  private String resolvePetTitle(PetFoodItemDocument item) {
    String manufacturer = item.getManufacturer() == null ? "" : item.getManufacturer().trim();
    String product = item.getProductName() == null ? "" : item.getProductName().trim();
    String combined = (manufacturer + " " + product).trim();
    return combined.isEmpty() ? "Pet item" : combined;
  }

  private String resolvePurchaseTitle(PurchaseDocument purchase) {
    String name = purchase.getIngredientName();
    if (name != null && !name.trim().isEmpty()) {
      return name.trim();
    }
    String key = purchase.getIngredientKey();
    if (key != null && !key.trim().isEmpty()) {
      return key.trim();
    }
    return "Purchase";
  }

  private String expiryPriority(LocalDate today, LocalDate expiryDate) {
    long days = ChronoUnit.DAYS.between(today, expiryDate);
    if (days < 0) {
      return "critical";
    }
    if (days <= 7) {
      return "high";
    }
    if (days <= 14) {
      return "medium";
    }
    return "low";
  }

  private String restockPriority(double quantity, double minQty) {
    if (quantity <= 0) {
      return "critical";
    }
    if (quantity < minQty * 0.5) {
      return "high";
    }
    return "medium";
  }

  private String criticalPriority(ShoppingListItem item) {
    if (item.getInStockQty() <= 0) {
      return "critical";
    }
    if (item.getRequiredQty() > 0 && item.getToBuyQty() >= item.getRequiredQty() * 0.75) {
      return "high";
    }
    return "medium";
  }

  private String purchasePriority(double price, double averagePrice) {
    if (averagePrice <= 0) {
      return "low";
    }
    if (price >= averagePrice * 1.5) {
      return "high";
    }
    if (price >= averagePrice) {
      return "medium";
    }
    return "low";
  }

  private int priorityScore(String priority) {
    if ("critical".equals(priority)) {
      return 4;
    }
    if ("high".equals(priority)) {
      return 3;
    }
    if ("medium".equals(priority)) {
      return 2;
    }
    return 1;
  }

  private long sortTimestamp(EventEntry event) {
    LocalDateTime date = event.getDate();
    if (date == null) {
      return 0L;
    }
    long epoch = date.toInstant(ZoneOffset.UTC).toEpochMilli();
    if ("purchase".equals(event.getKind())) {
      return -epoch;
    }
    return epoch;
  }

  private LocalDateTime toLocalDateTime(Instant instant) {
    if (instant == null) {
      return null;
    }
    return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
  }

  private int clamp(int value, int min, int max) {
    if (value < min) {
      return min;
    }
    if (value > max) {
      return max;
    }
    return value;
  }
}
