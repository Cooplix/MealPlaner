package com.mealplaner.api;

import com.mealplaner.api.dto.LoginRequest;
import com.mealplaner.api.dto.TokenResponse;
import com.mealplaner.api.dto.UserPublic;
import com.mealplaner.auth.JwtService;
import com.mealplaner.user.UserDocument;
import com.mealplaner.user.UserService;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
  private final UserService userService;
  private final JwtService jwtService;

  public AuthController(UserService userService, JwtService jwtService) {
    this.userService = userService;
    this.jwtService = jwtService;
  }

  @PostMapping("/login")
  public TokenResponse login(@RequestBody LoginRequest request) {
    Optional<UserDocument> userOpt = userService.findByLogin(request.getLogin());
    if (userOpt.isEmpty() || !userService.verifyPassword(userOpt.get(), request.getPassword())) {
      throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Incorrect login or password");
    }

    UserDocument user = userOpt.get();
    userService.upgradePasswordIfLegacy(user, request.getPassword());

    String token = jwtService.createToken(user.getLogin());
    UserPublic publicUser = new UserPublic(user.getId(), user.getLogin(), user.getName(), user.isAdmin());
    return new TokenResponse(token, publicUser);
  }
}
