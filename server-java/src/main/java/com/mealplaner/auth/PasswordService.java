package com.mealplaner.auth;

import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class PasswordService {
  private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder();

  public boolean matches(String rawPassword, String storedHash) {
    if (storedHash == null || storedHash.isBlank()) {
      return false;
    }
    if (storedHash.startsWith("$pbkdf2-sha256$")) {
      return PasslibPbkdf2.matches(rawPassword, storedHash);
    }
    return bcrypt.matches(rawPassword, storedHash);
  }

  public String hash(String rawPassword) {
    return bcrypt.encode(rawPassword);
  }
}
