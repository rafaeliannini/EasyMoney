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
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public User createUser(@RequestBody User user, @AuthenticationPrincipal Jwt jwt) {
        // A identidade vem sempre do token validado, nunca do payload enviado pelo navegador.
        // A operação é idempotente para suportar login com Google e sessões já existentes.
        return userRepository.findByFirebaseUid(jwt.getSubject()).orElseGet(() -> {
            User currentUser = new User();
            currentUser.setFirebaseUid(jwt.getSubject());
            currentUser.setEmail(jwt.getClaimAsString("email"));
            currentUser.setName(user.getName() == null || user.getName().isBlank() ? "Usuário" : user.getName().trim());
            return userRepository.save(currentUser);
        });
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteUser(@PathVariable Long id) {
        userRepository.deleteById(id);
    }
}
