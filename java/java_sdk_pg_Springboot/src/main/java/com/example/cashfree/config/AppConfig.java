package com.example.cashfree.config;

import com.cashfree.pg.Cashfree;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;

@Configuration
@EnableConfigurationProperties({CashfreeProperties.class, AppProperties.class})
public class AppConfig {

    @Bean
    Cashfree cashfree(CashfreeProperties properties) {
        Cashfree.CFEnvironment environment = "PRODUCTION".equalsIgnoreCase(properties.getEnvironment())
                ? Cashfree.PRODUCTION
                : Cashfree.SANDBOX;

        return new Cashfree(
                environment,
                trimToNull(properties.getClientId()),
                trimToNull(properties.getClientSecret()),
                null,
                null,
                null);
    }

    private static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
