package com.mealplaner.api;

import com.mealplaner.api.dto.UserCreate;
import com.mealplaner.api.dto.UserPasswordChange;
import com.mealplaner.api.dto.UserPublic;
import com.mealplaner.api.dto.UserUpdateName;
import com.mealplaner.auth.UserPrincipal;
import com.mealplaner.user.UserDocument;
import com.mealplaner.user.UserService;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UsersController {
  private final UserService userService;

  public UsersController(UserService userService) {
    this.userService = userService;
  }

  @PostMapping
  @ResponseStatus(HttpStatus.CREATED)
  public UserPublic createUser(
      @RequestBody UserCreate payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    if (principal == null || !principal.isAdmin()) {
      throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin privileges required");
    }
    Optional<UserDocument> existing = userService.findByLogin(payload.getLogin());
    if (existing.isPresent()) {
      throw new ResponseStatusException(HttpStatus.CONFLICT, "User with this login already exists");
    }
    UserDocument user = userService.createUser(
        payload.getLogin(),
        payload.getName(),
        payload.getPassword(),
        payload.isAdmin()
    );
    return new UserPublic(user.getId(), user.getLogin(), user.getName(), user.isAdmin());
  }

  @GetMapping("/me")
  public UserPublic me(@AuthenticationPrincipal UserPrincipal principal) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    return new UserPublic(principal.getId(), principal.getLogin(), principal.getName(), principal.isAdmin());
  }

  @PatchMapping("/me")
  public UserPublic updateMe(
      @RequestBody UserUpdateName payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    String name = payload.getName() == null ? "" : payload.getName().trim();
    if (name.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Name cannot be empty");
    }
    UserDocument user = userService.findById(principal.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    userService.updateName(user, name);
    return new UserPublic(user.getId(), user.getLogin(), user.getName(), user.isAdmin());
  }

  @PostMapping("/me/password")
  @ResponseStatus(HttpStatus.NO_CONTENT)
  public void changePassword(
      @RequestBody UserPasswordChange payload,
      @AuthenticationPrincipal UserPrincipal principal
  ) {
    if (principal == null) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Could not validate credentials");
    }
    UserDocument user = userService.findById(principal.getId())
        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    if (!userService.verifyPassword(user, payload.getCurrentPassword())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Current password is incorrect");
    }
    String newPassword = payload.getNewPassword() == null ? "" : payload.getNewPassword().trim();
    if (newPassword.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "New password cannot be empty");
    }
    userService.updatePassword(user, newPassword);
  }
}
