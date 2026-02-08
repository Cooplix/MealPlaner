package com.mealplaner.auth;

import com.mealplaner.config.AppProperties;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;
import javax.crypto.SecretKey;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
  private final AppProperties properties;
  private final SecretKey key;

  public JwtService(AppProperties properties) {
    this.properties = properties;
    this.key = Keys.hmacShaKeyFor(properties.getJwt().getSecret().getBytes(StandardCharsets.UTF_8));
  }

  public String createToken(String login) {
    Instant now = Instant.now();
    Instant exp = now.plusSeconds(properties.getJwt().getExpMinutes() * 60L);
    return Jwts.builder()
        .subject(login)
        .issuedAt(Date.from(now))
        .expiration(Date.from(exp))
        .signWith(key)
        .compact();
  }

  public String extractLogin(String token) {
    Claims claims = Jwts.parser()
        .verifyWith(key)
        .build()
        .parseSignedClaims(token)
        .getPayload();
    return claims.getSubject();
  }
}
