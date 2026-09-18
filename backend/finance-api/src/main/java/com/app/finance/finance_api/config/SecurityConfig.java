package com.app.finance.finance_api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
            .cors(Customizer.withDefaults()) // Mantém a sua configuração de CORS atual
            .csrf(csrf -> csrf.disable()) // Desabilita CSRF (seguro para APIs REST stateless com JWT)
            .authorizeHttpRequests(authz -> authz
                .requestMatchers("/api/health").permitAll() // Endpoint público
                .anyRequest().authenticated() // Tudo exige token
            )
            .oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
            
        return http.build();
    }
}