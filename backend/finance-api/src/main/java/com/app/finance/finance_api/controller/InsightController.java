package com.app.finance.finance_api.controller;

import com.app.finance.finance_api.model.User;
import com.app.finance.finance_api.repository.InsightProjection;
import com.app.finance.finance_api.repository.TransactionRepository;
import com.app.finance.finance_api.repository.UserRepository;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

@RestController @RequestMapping("/api/insights")
public class InsightController {
    private final TransactionRepository transactions; private final UserRepository users;
    public InsightController(TransactionRepository transactions, UserRepository users) { this.transactions = transactions; this.users = users; }
    @GetMapping("/dashboard") public Dashboard dashboard(@AuthenticationPrincipal Jwt jwt) {
        Long id = user(jwt).getId(); LocalDate today = LocalDate.now(); YearMonth month = YearMonth.from(today); LocalDate start = month.atDay(1); LocalDate end = month.plusMonths(1).atDay(1);
        return new Dashboard(map(transactions.monthlyTotals(id, month.minusMonths(11).atDay(1))), map(transactions.expensesByCategory(id,start,end)), map(transactions.expensesByResponsible(id,start,end)), map(transactions.incomeBySource(id,start,end)), map(transactions.dailyExpenses(id,today.minusDays(364),end)));
    }
    private User user(Jwt jwt) { return users.findByFirebaseUid(jwt.getSubject()).orElseThrow(() -> new IllegalStateException("Usuário não encontrado no banco de dados.")); }
    private List<Value> map(List<InsightProjection> values) { return values.stream().map(v -> new Value(v.getLabel(), safe(v.getIncome()), safe(v.getExpense()), safe(v.getTotal()))).toList(); }
    private BigDecimal safe(BigDecimal value) { return value == null ? BigDecimal.ZERO : value; }
    public record Value(String label, BigDecimal income, BigDecimal expense, BigDecimal total) {}
    public record Dashboard(List<Value> monthly, List<Value> categories, List<Value> responsible, List<Value> sources, List<Value> daily) {}
}
