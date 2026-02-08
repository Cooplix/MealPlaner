package com.mealplaner.api;

import com.mealplaner.api.dto.PurchaseCreate;
import com.mealplaner.api.dto.PurchaseEntry;
import com.mealplaner.purchase.PurchaseDocument;
import com.mealplaner.purchase.PurchaseService;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/purchases")
public class PurchasesController {
  private final PurchaseService purchaseService;

  public PurchasesController(PurchaseService purchaseService) {
    this.purchaseService = purchaseService;
  }

  @GetMapping
  public List<PurchaseEntry> list(
      @RequestParam(required = false) String start,
      @RequestParam(required = false) String end,
      @RequestParam(required = false, name = "ingredientKey") String ingredientKey
  ) {
    try {
      return purchaseService.list(
          Optional.ofNullable(start),
          Optional.ofNullable(end),
          Optional.ofNullable(ingredientKey)
      ).stream().map(this::toEntry).toList();
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    }
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public PurchaseEntry create(@RequestBody PurchaseCreate payload) {
    try {
      PurchaseDocument saved = purchaseService.create(
          payload.getIngredientKey(),
          payload.getAmount(),
          payload.getUnit(),
          payload.getPrice(),
          payload.getPurchasedAt()
      );
      return toEntry(saved);
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    } catch (IllegalStateException exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, exc.getMessage());
    }
  }

  private PurchaseEntry toEntry(PurchaseDocument doc) {
    PurchaseEntry entry = new PurchaseEntry();
    entry.setId(doc.getId());
    entry.setIngredientKey(doc.getIngredientKey());
    entry.setIngredientName(doc.getIngredientName());
    entry.setAmount(doc.getAmount());
    entry.setUnit(doc.getUnit());
    entry.setPrice(doc.getPrice());
    entry.setPurchasedAt(LocalDateTime.ofInstant(doc.getPurchasedAt(), ZoneOffset.UTC));
    return entry;
  }
}
