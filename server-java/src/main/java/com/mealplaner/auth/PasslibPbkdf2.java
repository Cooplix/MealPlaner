package com.mealplaner.auth;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.util.Base64;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public final class PasslibPbkdf2 {
  private static final String PREFIX = "$pbkdf2-sha256$";
  private PasslibPbkdf2() {}

  public static boolean matches(String rawPassword, String stored) {
    if (stored == null || !stored.startsWith(PREFIX)) {
      return false;
    }
    String[] parts = stored.split("\\$");
    if (parts.length < 5) {
      return false;
    }
    int iterations;
    try {
      iterations = Integer.parseInt(parts[2]);
    } catch (NumberFormatException exc) {
      return false;
    }
    byte[] salt = decodeAb64(parts[3]);
    byte[] expected = decodeAb64(parts[4]);
    if (salt.length == 0 || expected.length == 0) {
      return false;
    }

    try {
      PBEKeySpec spec = new PBEKeySpec(rawPassword.toCharArray(), salt, iterations, expected.length * 8);
      SecretKeyFactory factory = SecretKeyFactory.getInstance("PBKDF2WithHmacSHA256");
      byte[] derived = factory.generateSecret(spec).getEncoded();
      return MessageDigest.isEqual(expected, derived);
    } catch (NoSuchAlgorithmException | InvalidKeySpecException exc) {
      return false;
    }
  }

  private static byte[] decodeAb64(String input) {
    if (input == null || input.isBlank()) {
      return new byte[0];
    }
    String normalized = input.replace('.', '+');
    int padding = (4 - (normalized.length() % 4)) % 4;
    normalized = normalized + "=".repeat(padding);
    return Base64.getDecoder().decode(normalized);
  }
}
