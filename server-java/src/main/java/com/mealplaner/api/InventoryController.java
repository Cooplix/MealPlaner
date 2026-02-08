package com.mealplaner.api;

import com.mealplaner.api.dto.ConsumeRequest;
import com.mealplaner.api.dto.InventoryItemCreate;
import com.mealplaner.api.dto.InventoryItemEntry;
import com.mealplaner.api.dto.InventoryItemUpdate;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.inventory.InventoryItemDocument;
import com.mealplaner.inventory.InventoryService;
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
@RequestMapping("/api/inventory")
public class InventoryController {
  private final InventoryService inventoryService;

  public InventoryController(InventoryService inventoryService) {
    this.inventoryService = inventoryService;
  }

  @GetMapping
  public List<InventoryItemEntry> list(@AuthenticationPrincipal UserPrincipal principal) {
    String userId = requireUser(principal);
    return inventoryService.listItems(userId).stream().map(this::toEntry).toList();
  }

  @GetMapping("/{id}")
  public InventoryItemEntry get(
      @PathVariable String id,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      return toEntry(inventoryService.getItem(userId, id));
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public InventoryItemEntry create(
      @RequestBody InventoryItemCreate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      InventoryItemDocument doc = toDocument(payload);
      return toEntry(inventoryService.createItem(userId, doc));
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    }
  }

  @PatchMapping("/{id}")
  public InventoryItemEntry update(
      @PathVariable String id,
      @RequestBody InventoryItemUpdate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      InventoryItemDocument updated = inventoryService.updateItem(
          userId,
          id,
          payload.getName(),
          payload.getBaseName(),
          payload.getCategory(),
          payload.getLocation(),
          payload.getQuantity(),
          payload.getUnit(),
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
      inventoryService.deleteItem(userId, id);
    } catch (Exception exc) {
      throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
    }
  }

  @PostMapping("/{id}/consume")
  public InventoryItemEntry consume(
      @PathVariable String id,
      @RequestBody ConsumeRequest payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      InventoryItemDocument updated = inventoryService.consume(userId, id, payload.getAmount());
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

  private InventoryItemEntry toEntry(InventoryItemDocument doc) {
    InventoryItemEntry entry = new InventoryItemEntry();
    entry.setId(doc.getId());
    entry.setName(doc.getName());
    entry.setBaseName(doc.getBaseName());
    entry.setCategory(doc.getCategory());
    entry.setLocation(doc.getLocation());
    entry.setQuantity(doc.getQuantity());
    entry.setUnit(doc.getUnit());
    entry.setMinQty(doc.getMinQty());
    entry.setMaxQty(doc.getMaxQty());
    entry.setExpiresAt(toLocal(doc.getExpiresAt()));
    entry.setAddedAt(toLocal(doc.getAddedAt()));
    entry.setNotes(doc.getNotes());
    return entry;
  }

  private InventoryItemDocument toDocument(InventoryItemCreate payload) {
    InventoryItemDocument doc = new InventoryItemDocument();
    doc.setName(payload.getName());
    doc.setBaseName(payload.getBaseName());
    doc.setCategory(payload.getCategory());
    doc.setLocation(payload.getLocation());
    doc.setQuantity(payload.getQuantity());
    doc.setUnit(payload.getUnit());
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
