package com.mealplaner.auth;

import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.spec.InvalidKeySpecException;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.SecretKeyFactory;
import javax.crypto.spec.PBEKeySpec;

public final class PasslibPbkdf2 {
  private static final String PREFIX = "$pbkdf2-sha256$";
  private static final String ALPHABET = "./0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
  private static final Map<Character, Integer> ALPHABET_MAP = new HashMap<>();

  static {
    for (int i = 0; i < ALPHABET.length(); i += 1) {
      ALPHABET_MAP.put(ALPHABET.charAt(i), i);
    }
  }

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
    int buffer = 0;
    int bits = 0;
    byte[] out = new byte[input.length() * 3 / 4 + 3];
    int outPos = 0;

    for (int i = 0; i < input.length(); i += 1) {
      Integer value = ALPHABET_MAP.get(input.charAt(i));
      if (value == null) {
        continue;
      }
      buffer = (buffer << 6) | value;
      bits += 6;
      if (bits >= 8) {
        bits -= 8;
        out[outPos++] = (byte) ((buffer >> bits) & 0xff);
      }
    }

    byte[] trimmed = new byte[outPos];
    System.arraycopy(out, 0, trimmed, 0, outPos);
    return trimmed;
  }
}
