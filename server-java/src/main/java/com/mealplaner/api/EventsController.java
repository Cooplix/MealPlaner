package com.mealplaner.api;

import com.mealplaner.api.dto.EventEntry;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.events.EventService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/events")
public class EventsController {
  private final EventService eventService;

  public EventsController(EventService eventService) {
    this.eventService = eventService;
  }

  @GetMapping
  public List<EventEntry> list(
      @RequestParam(required = false) Integer limit,
      @RequestParam(required = false) Integer lookaheadDays,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    String userId = requireUser(principal);
    try {
      return eventService.buildEvents(userId, limit, lookaheadDays);
    } catch (IllegalArgumentException exc) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, exc.getMessage());
    }
  }

  private String requireUser(UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return principal.getId();
  }
}
