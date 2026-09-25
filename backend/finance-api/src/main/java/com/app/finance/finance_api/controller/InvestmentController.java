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
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Objects;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/investments")
public class InvestmentController {

    private final com.app.finance.finance_api.service.PreferencesService preferences;
    private final InvestmentRepository investments;
    private final UserRepository users;
    public InvestmentController(InvestmentRepository investments, UserRepository users, com.app.finance.finance_api.service.PreferencesService preferences) { this.preferences = preferences; this.investments = investments; this.users = users; }

    @GetMapping public List<Response> list(@AuthenticationPrincipal Jwt jwt) { return investments.findByUserIdOrderByCategoryAscNameAsc(user(jwt).getId()).stream().map(Response::from).toList(); }
    @PostMapping @ResponseStatus(HttpStatus.CREATED) public Response create(@RequestBody Request request, @AuthenticationPrincipal Jwt jwt) { Investment item = new Investment(); apply(item, request, user(jwt).getId()); item.setUser(user(jwt)); return Response.from(investments.save(item)); }
    @PutMapping("/{id}") @Transactional
    public Response update(@PathVariable Long id, @RequestBody Request request, @AuthenticationPrincipal Jwt jwt) {
        Long owner = user(jwt).getId();
        Investment item = investments.lockById(id).filter(i -> i.getUser().getId().equals(owner))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!Objects.equals(item.getLastAccruedDate(), request.lastAccruedDate()))
            throw new ResponseStatusException(HttpStatus.CONFLICT, "O rendimento foi atualizado. Recarregue antes de editar.");
        apply(item, request, owner); return Response.from(investments.save(item));
    }
    private void apply(Investment item, Request r, Long userId) {
        if (r.name() == null || r.name().isBlank() || r.name().length() > 120 || r.category() == null
            || (!r.category().equals(item.getCategory()) && !preferences.get(userId).investmentTypes().contains(r.category()))
            || !validMoney(r.amount()) || (r.goal() != null && !validMoney(r.goal())))
            throw new IllegalArgumentException("Dados do investimento inválidos.");
        LocalDate today = LocalDate.now(ZoneId.of("America/Sao_Paulo"));
        if (r.cdiPercent() != null) {
            if (r.cdiPercent().signum() <= 0 || r.cdiPercent().compareTo(new BigDecimal("1000")) > 0 || r.cdiPercent().scale() > 2)
                throw new IllegalArgumentException("Informe um percentual do CDI entre 0,01 e 1000.");
            boolean reset = item.getCdiPercent() == null || item.getCdiPercent().compareTo(r.cdiPercent()) != 0
                || item.getAmount().compareTo(r.amount()) != 0 || r.valuationDate() != null;
            if (reset) {
                if (r.valuationDate() == null || r.valuationDate().isAfter(today) || r.valuationDate().isBefore(today.minusYears(10)))
                    throw new IllegalArgumentException("Informe a data do saldo, até hoje e nos últimos 10 anos.");
                item.setLastAccruedDate(r.valuationDate()); item.setAccruedAmount(r.amount());
            }
        } else { item.setAccruedAmount(null); item.setLastAccruedDate(null); }
        item.setCdiPercent(r.cdiPercent()); item.setName(r.name().trim()); item.setCategory(r.category()); item.setAmount(r.amount()); item.setGoal(r.goal());
    }
    private boolean validMoney(BigDecimal amount) { return amount != null && amount.signum() >= 0 && amount.scale() <= 2 && amount.precision() <= 15; }
    private User user(Jwt jwt) { return users.findByFirebaseUid(jwt.getSubject()).orElseThrow(() -> new IllegalStateException("Usuário não encontrado no banco de dados.")); }
    public record Request(String name, String category, BigDecimal amount, BigDecimal goal, BigDecimal cdiPercent, LocalDate valuationDate, LocalDate lastAccruedDate) {}
    public record Response(Long id, String name, String category, BigDecimal amount, BigDecimal goal, BigDecimal cdiPercent, LocalDate lastAccruedDate) {
        static Response from(Investment i) { return new Response(i.getId(), i.getName(), i.getCategory(), i.getAmount(), i.getGoal(), i.getCdiPercent(), i.getLastAccruedDate()); }
    }
}
