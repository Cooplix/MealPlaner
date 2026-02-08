package com.mealplaner.auth;

import com.mealplaner.user.UserDocument;
import com.mealplaner.user.UserRepository;
import java.io.IOException;
import java.util.Optional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
  @Autowired
  private JwtService jwtService;

  @Autowired
  private UserRepository userRepository;

  @Override
  protected void doFilterInternal(
      HttpServletRequest request,
      HttpServletResponse response,
      FilterChain filterChain
  ) throws ServletException, IOException {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header != null && header.startsWith("Bearer ")) {
      String token = header.substring(7);
      try {
        String login = jwtService.extractLogin(token);
        Optional<UserDocument> userOpt = userRepository.findByLogin(login);
        if (userOpt.isPresent()) {
          UserDocument user = userOpt.get();
          UserPrincipal principal = new UserPrincipal(
              user.getId(),
              user.getLogin(),
              user.getName(),
              user.isAdmin()
          );
          UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
              principal,
              null,
              principal.authorities()
          );
          auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
          SecurityContextHolder.getContext().setAuthentication(auth);
        }
      } catch (Exception ignored) {
        // Let the request continue; security will enforce auth where required.
      }
    }
    filterChain.doFilter(request, response);
  }
}
