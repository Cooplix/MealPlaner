package com.mealplaner.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app")
public class AppProperties {
  private final Jwt jwt = new Jwt();
  private final Admin admin = new Admin();

  public Jwt getJwt() {
    return jwt;
  }

  public Admin getAdmin() {
    return admin;
  }

  public static class Jwt {
    private String secret;
    private String algorithm = "HS256";
    private int expMinutes = 120;

    public String getSecret() {
      return secret;
    }

    public void setSecret(String secret) {
      this.secret = secret;
    }

    public String getAlgorithm() {
      return algorithm;
    }

    public void setAlgorithm(String algorithm) {
      this.algorithm = algorithm;
    }

    public int getExpMinutes() {
      return expMinutes;
    }

    public void setExpMinutes(int expMinutes) {
      this.expMinutes = expMinutes;
    }
  }

  public static class Admin {
    private String login = "admin";
    private String initialPassword = "";

    public String getLogin() {
      return login;
    }

    public void setLogin(String login) {
      this.login = login;
    }

    public String getInitialPassword() {
      return initialPassword;
    }

    public void setInitialPassword(String initialPassword) {
      this.initialPassword = initialPassword;
    }
  }
}
