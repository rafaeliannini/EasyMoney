package com.app.finance.finance_api;

import com.app.finance.finance_api.controller.*;
import com.app.finance.finance_api.model.User;
import com.app.finance.finance_api.repository.*;
import com.app.finance.finance_api.service.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest(properties = {"finance.cdi.enabled=false", "spring.jpa.show-sql=false", "logging.level.root=WARN"})
@Transactional
class FinanceFeaturesTests {
    @Autowired UserRepository users;
    @Autowired UserController userController;
    @Autowired TransactionController transactions;
    @Autowired TransactionRepository transactionRepository;
    @Autowired PreferencesService preferences;
    @Autowired InvestmentController investments;
    @Autowired InvestmentRepository investmentRepository;
    @Autowired CdiAccrualService accrual;
    @Autowired InsightController insights;

    private Jwt token(String uid, String email, String name) {
        return Jwt.withTokenValue("test").header("alg", "none").subject(uid).claim("email", email).claim("name", name).build();
    }
    private Jwt account() {
        String uid = UUID.randomUUID().toString(); Jwt jwt = token(uid, uid + "@example.com", "Teste");
        userController.createUser(new User(), jwt); return jwt;
    }
    private Long id(Jwt jwt) { return users.findByFirebaseUid(jwt.getSubject()).orElseThrow().getId(); }

    @Test void personalizedOptionsArePrivateAndUsedByInstallments() {
        Jwt a = account(), b = account();
        preferences.save(id(a), new PreferencesService.Values(List.of("Minha conta"), List.of("Parceiro"), List.of("Cliente"), List.of("Meu CDB")));
        assertEquals(List.of("Minha conta"), preferences.get(id(a)).wallets());
        assertTrue(preferences.get(id(b)).wallets().contains("Conta"));
        var request = new TransactionController.InstallmentRequest(new BigDecimal("100.00"), null, 3, LocalDate.of(2028, 1, 31), "Minha conta", "Outros", "Parceiro");
        var result = transactions.createInstallments(request, a);
        transactionRepository.flush();
        assertEquals(3, result.size()); assertEquals(new BigDecimal("33.34"), result.get(2).amount());
        assertEquals(LocalDate.of(2028, 2, 29), result.get(1).date());
        assertEquals(1, result.stream().map(TransactionController.TransactionResponse::installmentGroup).distinct().count());
        assertEquals(3, transactions.getTransactions(a).size()); assertTrue(transactions.getTransactions(b).isEmpty());
        // Removing an option does not rewrite the historical transactions.
        preferences.save(id(a), PreferencesService.defaults());
        assertEquals("Minha conta", transactions.getTransactions(a).get(0).wallet());
        assertThrows(IllegalArgumentException.class, () -> transactions.createInstallments(request, b));
    }
    @Test void invalidInstallmentsDoNotSavePartialPayments() {
        Jwt jwt = account();
        var request = new TransactionController.InstallmentRequest(new BigDecimal("100"), new BigDecimal("70"), 3, LocalDate.now(), "Conta", "Outros", "Eu");
        assertThrows(IllegalArgumentException.class, () -> transactions.createInstallments(request, jwt));
        assertTrue(transactions.getTransactions(jwt).isEmpty());
        assertThrows(IllegalArgumentException.class, () -> transactions.createTransaction(new TransactionController.TransactionRequest(BigDecimal.ONE, "EXPENSE", LocalDate.now(), null, null, null), jwt));
    }
    @Test void profileSyncUsesTokenIdentityAndRestrictsUserAccess() {
        Jwt a = account(), b = account(); Long original = id(a);
        User forged = new User(); forged.setFirebaseUid(b.getSubject()); forged.setEmail("forged@example.com");
        Jwt updated = token(a.getSubject(), "updated-" + a.getSubject() + "@example.com", "Nome novo");
        User result = userController.createUser(forged, updated);
        assertEquals(original, result.getId()); assertEquals("Nome novo", result.getName());
        assertEquals(updated.getClaimAsString("email"), result.getEmail());
        assertEquals(List.of(original), userController.getAllUsers(a).stream().map(User::getId).toList());
        assertThrows(ResponseStatusException.class, () -> userController.deleteUser(id(b), a));
        assertTrue(users.findByFirebaseUid(b.getSubject()).isPresent());
    }
    @Test void cdiUpdatesArePersistedOnceAndStaleEditsAreRejected() {
        Jwt a = account(), b = account(); LocalDate initial = LocalDate.now().minusDays(5);
        var created = investments.create(new InvestmentController.Request("Reserva", "Caixinha", new BigDecimal("1000"), null, new BigDecimal("100"), initial, null), a);
        var rates = List.of(new CdiCalculator.Rate(initial.plusDays(1), new BigDecimal("0.05")));
        accrual.apply(created.id(), rates, initial.plusDays(2));
        accrual.apply(created.id(), rates, initial.plusDays(2)); investmentRepository.flush();
        var updated = investments.list(a).get(0);
        assertEquals(new BigDecimal("1000.50"), updated.amount());
        assertEquals(initial.plusDays(1), updated.lastAccruedDate());
        assertTrue(investments.list(b).isEmpty());
        var stale = new InvestmentController.Request("Reserva", "Caixinha", new BigDecimal("1000"), null, new BigDecimal("100"), null, initial);
        assertThrows(ResponseStatusException.class, () -> investments.update(created.id(), stale, a));
        assertThrows(ResponseStatusException.class, () -> investments.update(created.id(), stale, b));
    }
    @Test void preferencesRejectEmptyAndDuplicateLists() {
        Jwt jwt = account(); var defaults = PreferencesService.defaults();
        assertThrows(IllegalArgumentException.class, () -> preferences.save(id(jwt), new PreferencesService.Values(List.of(), defaults.responsible(), defaults.incomeSources(), defaults.investmentTypes())));
        assertThrows(IllegalArgumentException.class, () -> preferences.save(id(jwt), new PreferencesService.Values(List.of("Conta", " conta "), defaults.responsible(), defaults.incomeSources(), defaults.investmentTypes())));
    }

    @Test void scheduledTransactionsStayOutOfHistoricalCharts() {
        Jwt jwt = account(); LocalDate today = LocalDate.now(java.time.ZoneId.of("America/Sao_Paulo"));
        transactions.createTransaction(new TransactionController.TransactionRequest(new BigDecimal("10.00"), "EXPENSE", today, "Conta", "Outros", "Eu"), jwt);
        transactions.createTransaction(new TransactionController.TransactionRequest(new BigDecimal("500.00"), "EXPENSE", today.plusDays(1), "Conta", "Outros", "Eu"), jwt);
        transactionRepository.flush();
        var dashboard = insights.dashboard(jwt);
        assertEquals(1, dashboard.monthly().size());
        assertEquals(0, new BigDecimal("10").compareTo(dashboard.monthly().get(0).expense()));
        assertEquals(0, new BigDecimal("10").compareTo(dashboard.categories().get(0).total()));
        assertEquals(1, dashboard.daily().size());
    }
}
