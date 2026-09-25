package com.app.finance.finance_api.controller;

import com.app.finance.finance_api.model.User;
import com.app.finance.finance_api.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserRepository userRepository;

    @GetMapping
    public List<User> getAllUsers(@AuthenticationPrincipal Jwt jwt) {
        return userRepository.findByFirebaseUid(jwt.getSubject()).stream().toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@RequestBody User user, @AuthenticationPrincipal Jwt jwt) {
        // A identidade vem sempre do token validado, nunca do payload enviado pelo navegador.
        // A operação é idempotente para suportar login com Google e sessões já existentes.
        User currentUser = userRepository.findByFirebaseUid(jwt.getSubject()).orElseGet(User::new);
        currentUser.setFirebaseUid(jwt.getSubject());
        currentUser.setEmail(jwt.getClaimAsString("email"));
        String name = jwt.getClaimAsString("name");
        if (name == null || name.isBlank()) name = currentUser.getName() == null ? user.getName() : currentUser.getName();
        if (name != null && name.length() > 120) throw new IllegalArgumentException("Nome deve ter até 120 caracteres.");
        currentUser.setName(name == null || name.isBlank() ? "Usuário" : name.trim());
        String photo = jwt.getClaimAsString("picture");
        if (photo != null && (photo.length() > 2048 || !photo.startsWith("https://"))) throw new IllegalArgumentException("Use uma URL HTTPS para a foto.");
        currentUser.setPhotoUrl(photo);
        userRepository.syncProfile(currentUser.getFirebaseUid(), currentUser.getEmail(), currentUser.getName(), currentUser.getPhotoUrl());
        return userRepository.findByFirebaseUid(jwt.getSubject()).orElseThrow();
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id, @AuthenticationPrincipal Jwt jwt) {
        User owner = userRepository.findByFirebaseUid(jwt.getSubject()).orElseThrow();
        if (!owner.getId().equals(id)) throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_FOUND);
        userRepository.deleteById(id);
    }
}
