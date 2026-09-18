package com.app.finance.finance_api.controller;

import com.app.finance.finance_api.model.Investment;
import com.app.finance.finance_api.model.User;
import com.app.finance.finance_api.repository.InvestmentRepository;
import com.app.finance.finance_api.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import java.math.BigDecimal;
import java.util.List;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {
    private static final List<String> CATEGORIES = List.of("Poupança", "Caixinha", "Renda fixa", "Ações", "Fundos", "Cripto", "Outros");
    private final InvestmentRepository investments;
    private final UserRepository users;
    public InvestmentController(InvestmentRepository investments, UserRepository users) { this.investments = investments; this.users = users; }

    @GetMapping public List<Response> list(@AuthenticationPrincipal Jwt jwt) { return investments.findByUserIdOrderByCategoryAscNameAsc(user(jwt).getId()).stream().map(Response::from).toList(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Response create(@RequestBody Request request, @AuthenticationPrincipal Jwt jwt) { Investment item = new Investment(); apply(item, request); item.setUser(user(jwt)); return Response.from(investments.save(item)); }
    @PutMapping("/{id}") public Response update(@PathVariable Long id, @RequestBody Request request, @AuthenticationPrincipal Jwt jwt) { Investment item = investments.findByIdAndUserId(id, user(jwt).getId()).orElseThrow(() -> new IllegalArgumentException("Investimento não encontrado.")); apply(item, request); return Response.from(investments.save(item)); }
    private void apply(Investment item, Request r) { if (r.name() == null || r.name().isBlank() || !CATEGORIES.contains(r.category()) || r.amount() == null || r.amount().signum() < 0 || (r.goal() != null && r.goal().signum() < 0)) throw new IllegalArgumentException("Dados do investimento inválidos."); item.setName(r.name().trim()); item.setCategory(r.category()); item.setAmount(r.amount()); item.setGoal(r.goal()); }
    private User user(Jwt jwt) { return users.findByFirebaseUid(jwt.getSubject()).orElseThrow(() -> new IllegalStateException("Usuário não encontrado no banco de dados.")); }
    public record Request(String name, String category, BigDecimal amount, BigDecimal goal) {}
    public record Response(Long id, String name, String category, BigDecimal amount, BigDecimal goal) { static Response from(Investment i) { return new Response(i.getId(), i.getName(), i.getCategory(), i.getAmount(), i.getGoal()); } }
}
