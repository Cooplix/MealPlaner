package com.mealplaner.api;

import com.mealplaner.api.dto.ConsumeRequest;
import com.mealplaner.api.dto.PetFoodItemCreate;
import com.mealplaner.api.dto.PetFoodItemEntry;
import com.mealplaner.api.dto.PetFoodItemUpdate;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.inventory.PetFoodItemDocument;
import com.mealplaner.inventory.PetFoodService;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/pet-inventory")
public class PetInventoryController {
  private final PetFoodService petFoodService;

  public PetInventoryController(PetFoodService petFoodService) {
    this.petFoodService = petFoodService;
  }

  @GetMapping
  public List<PetFoodItemEntry> list(@AuthenticationPrincipal UserPrincipal principal) {
    String userId = requireUser(principal);
    return petFoodService.listItems(userId).stream().map(this::toEntry).toList();
  }

  @GetMapping("/{id}")
  public PetFoodItemEntry get(
      @PathVariable String id,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      return toEntry(petFoodService.getItem(userId, id));
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public PetFoodItemEntry create(
      @RequestBody PetFoodItemCreate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      PetFoodItemDocument doc = toDocument(payload);
      return toEntry(petFoodService.createItem(userId, doc));
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    }
  }

  @PatchMapping("/{id}")
  public PetFoodItemEntry update(
      @PathVariable String id,
      @RequestBody PetFoodItemUpdate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      PetFoodItemDocument updated = petFoodService.updateItem(
          userId,
          id,
          payload.getManufacturer(),
          payload.getProductName(),
          payload.getFoodType(),
          payload.getPackageType(),
          payload.getWeight(),
          payload.getWeightUnit(),
          payload.getQuantity(),
          payload.getMinQty(),
          payload.getMaxQty(),
          toInstant(payload.getExpiresAt()),
          payload.getNotes()
      );
      return toEntry(updated);
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
  }

  @DeleteMapping("/{id}")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void delete(
      @PathVariable String id,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      petFoodService.deleteItem(userId, id);
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
  }

  @PostMapping("/{id}/consume")
  public PetFoodItemEntry consume(
      @PathVariable String id,
      @RequestBody ConsumeRequest payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      PetFoodItemDocument updated = petFoodService.consume(userId, id, payload.getAmount());
      return toEntry(updated);
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }

  private PetFoodItemEntry toEntry(PetFoodItemDocument doc) {
    PetFoodItemEntry entry = new PetFoodItemEntry();
    entry.setId(doc.getId());
    entry.setManufacturer(doc.getManufacturer());
    entry.setProductName(doc.getProductName());
    entry.setFoodType(doc.getFoodType());
    entry.setPackageType(doc.getPackageType());
    entry.setWeight(doc.getWeight());
    entry.setWeightUnit(doc.getWeightUnit());
    entry.setQuantity(doc.getQuantity());
    entry.setMinQty(doc.getMinQty());
    entry.setMaxQty(doc.getMaxQty());
    entry.setExpiresAt(toLocal(doc.getExpiresAt()));
    entry.setAddedAt(toLocal(doc.getAddedAt()));
    entry.setNotes(doc.getNotes());
    return entry;
  }

  private PetFoodItemDocument toDocument(PetFoodItemCreate payload) {
    PetFoodItemDocument doc = new PetFoodItemDocument();
    doc.setManufacturer(payload.getManufacturer());
    doc.setProductName(payload.getProductName());
    doc.setFoodType(payload.getFoodType());
    doc.setPackageType(payload.getPackageType());
    doc.setWeight(payload.getWeight());
    doc.setWeightUnit(payload.getWeightUnit());
    doc.setQuantity(payload.getQuantity());
    doc.setMinQty(payload.getMinQty());
    doc.setMaxQty(payload.getMaxQty());
    doc.setExpiresAt(toInstant(payload.getExpiresAt()));
    doc.setNotes(payload.getNotes());
    return doc;
  }

  private LocalDateTime toLocal(java.time.Instant instant) {
    if (instant == null) {
      return null;
    }
    return LocalDateTime.ofInstant(instant, ZoneOffset.UTC);
  }

  private java.time.Instant toInstant(LocalDateTime time) {
    if (time == null) {
      return null;
    }
    return time.toInstant(ZoneOffset.UTC);
  }
}
