package com.mealplaner.api;

import com.mealplaner.api.dto.ShoppingListResponse;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.shopping.ShoppingService;
import java.time.LocalDate;
import java.time.format.DateTimeParseException;
import java.util.HashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/shopping-list")
public class ShoppingController {
  private final ShoppingService shoppingService;

  public ShoppingController(ShoppingService shoppingService) {
    this.shoppingService = shoppingService;
  }

  @GetMapping
  public ShoppingListResponse build(
      @RequestParam String start,
      @RequestParam String end,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    LocalDate startDate = parseDate(start);
    LocalDate endDate = parseDate(end);
    if (endDate.isBefore(startDate)) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must not be before start date");
    }
    Map<String, String> range = new HashMap<>();
    range.put("start", start);
    range.put("end", end);
    return new ShoppingListResponse(range, shoppingService.build(userId, start, end));
  }

  private LocalDate parseDate(String value) {
    try {
      return LocalDate.parse(value);
    } catch (DateTimeParseException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid date");
    }
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }
}
