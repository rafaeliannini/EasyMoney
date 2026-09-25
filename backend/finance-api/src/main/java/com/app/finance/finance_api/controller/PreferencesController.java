package com.app.finance.finance_api.controller;

import com.app.finance.finance_api.repository.UserRepository;
import com.app.finance.finance_api.service.PreferencesService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController @RequestMapping("/api/preferences")
public class PreferencesController {
    private final PreferencesService preferences;
    private final UserRepository users;
    public PreferencesController(PreferencesService preferences, UserRepository users) { this.preferences = preferences; this.users = users; }
    private Long owner(Jwt jwt) { return users.findByFirebaseUid(jwt.getSubject()).orElseThrow().getId(); }
    @GetMapping public PreferencesService.Values get(@AuthenticationPrincipal Jwt jwt) { return preferences.get(owner(jwt)); }
    @PutMapping public PreferencesService.Values put(@AuthenticationPrincipal Jwt jwt, @RequestBody PreferencesService.Values values) { return preferences.save(owner(jwt), values); }
}
