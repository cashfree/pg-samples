package com.example.cashfree.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

@Component
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {

        response.setHeader("X-Content-Type-Options", "nosniff");
        response.setHeader("X-Frame-Options", "DENY");
        response.setHeader("Referrer-Policy", "no-referrer");
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
        response.setHeader("Content-Security-Policy",
                "default-src 'self'; "
                        + "script-src 'self' https://sdk.cashfree.com; "
                        + "connect-src 'self' https://sandbox.cashfree.com https://api.cashfree.com; "
                        + "style-src 'self'; "
                        + "img-src 'self' data:; "
                        + "base-uri 'self'; "
                        + "form-action 'self' https://sandbox.cashfree.com https://api.cashfree.com; "
                        + "frame-ancestors 'none'");

        if (request.getRequestURI().startsWith("/api/")) {
            response.setHeader("Cache-Control", "no-store");
        }

        filterChain.doFilter(request, response);
    }
}
