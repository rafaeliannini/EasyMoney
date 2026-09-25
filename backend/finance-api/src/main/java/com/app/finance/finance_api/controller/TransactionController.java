package com.app.finance.finance_api.controller;

import com.app.finance.finance_api.model.Transaction;
import com.app.finance.finance_api.model.User;
import com.app.finance.finance_api.repository.TransactionRepository;
import com.app.finance.finance_api.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import org.springframework.transaction.annotation.Transactional;
import com.app.finance.finance_api.service.InstallmentPlanner;

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private static final List<String> EXPENSE_SPECIFICATIONS = List.of("Restaurantes/delivery", "Supermercado", "Farmácia",
            "Transporte", "Presente", "Lazer", "Compras pessoais", "Viagem", "Academia/esportes", "Outros");


    private final com.app.finance.finance_api.service.PreferencesService preferences;
    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public TransactionController(TransactionRepository transactionRepository, UserRepository userRepository, com.app.finance.finance_api.service.PreferencesService preferences) {
        this.preferences = preferences;
        this.transactionRepository = transactionRepository;
        this.userRepository = userRepository;
    }

    @GetMapping
    public List<TransactionResponse> getTransactions(@AuthenticationPrincipal Jwt jwt) {
        return transactionRepository.findByUserId(currentUser(jwt).getId()).stream()
                .sorted(Comparator.comparing(Transaction::getDate).reversed().thenComparing(Transaction::getId, Comparator.reverseOrder()))
                .map(TransactionResponse::from).toList();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public TransactionResponse createTransaction(@RequestBody TransactionRequest request, @AuthenticationPrincipal Jwt jwt) {
        var options = preferences.get(currentUser(jwt).getId());
        if (!isValid(request, options)) throw new IllegalArgumentException("Dados da transação inválidos.");
        Transaction transaction = new Transaction();
        // description continua preenchida para manter os lançamentos existentes compatíveis.
        transaction.setDescription(request.specification());
        transaction.setAmount(request.amount());
        transaction.setType(request.type());
        transaction.setDate(request.date());
        transaction.setWallet(request.wallet());
        transaction.setSpecification(request.specification());
        // Receitas também podem ter responsável para alimentar os gráficos do dashboard.
        // O null continua aceito para manter compatibilidade com lançamentos antigos.
        transaction.setResponsible(request.responsible());
        transaction.setUser(currentUser(jwt));
        return TransactionResponse.from(transactionRepository.save(transaction));
    }

    private boolean isValid(TransactionRequest request, com.app.finance.finance_api.service.PreferencesService.Values options) {
        if (request.amount() == null || request.amount().signum() <= 0 || request.amount().scale() > 2 || request.amount().precision() > 15 || request.date() == null
                || !("INCOME".equals(request.type()) || "EXPENSE".equals(request.type()))
                || request.wallet() == null || request.specification() == null || !options.wallets().contains(request.wallet())) return false;
        if ("EXPENSE".equals(request.type()))
            return request.responsible() != null && EXPENSE_SPECIFICATIONS.contains(request.specification()) && options.responsible().contains(request.responsible());
        return options.incomeSources().contains(request.specification())
                && (request.responsible() == null || options.responsible().contains(request.responsible()));
    }

    @PostMapping("/installments")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    public List<TransactionResponse> createInstallments(@RequestBody InstallmentRequest request, @AuthenticationPrincipal Jwt jwt) {
        TransactionRequest base = new TransactionRequest(request.totalAmount(), "EXPENSE", request.date(), request.wallet(), request.specification(), request.responsible());
        if (!isValid(base, preferences.get(currentUser(jwt).getId()))) throw new IllegalArgumentException("Dados da despesa inválidos.");
        var plan = InstallmentPlanner.plan(request.totalAmount(), request.installmentAmount(), request.months(), request.date());
        User owner = currentUser(jwt);
        String group = UUID.randomUUID().toString();
        List<Transaction> items = plan.stream().map(payment -> {
            Transaction item = new Transaction();
            item.setUser(owner); item.setType("EXPENSE"); item.setDescription(request.specification());
            item.setSpecification(request.specification()); item.setWallet(request.wallet()); item.setResponsible(request.responsible());
            item.setAmount(payment.amount()); item.setDate(payment.date());
            item.setInstallmentGroup(group); item.setInstallmentNumber(payment.number());
            item.setInstallmentCount(request.months()); item.setInstallmentTotal(request.totalAmount());
            return item;
        }).toList();
        return transactionRepository.saveAll(items).stream().map(TransactionResponse::from).toList();
    }

    public record InstallmentRequest(BigDecimal totalAmount, BigDecimal installmentAmount, Integer months,
                                     LocalDate date, String wallet, String specification, String responsible) {}

    private User currentUser(Jwt jwt) {
        return userRepository.findByFirebaseUid(jwt.getSubject())
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado no banco de dados."));
    }

    public record TransactionRequest(BigDecimal amount, String type, LocalDate date, String wallet, String specification, String responsible) {}
    public record TransactionResponse(Long id, String description, BigDecimal amount, String type, LocalDate date,
                                      String wallet, String specification, String responsible,
                                      String installmentGroup, Integer installmentNumber, Integer installmentCount, BigDecimal installmentTotal) {
        static TransactionResponse from(Transaction transaction) {
            return new TransactionResponse(transaction.getId(), transaction.getDescription(), transaction.getAmount(), transaction.getType(),
                    transaction.getDate(), transaction.getWallet(), transaction.getSpecification(), transaction.getResponsible(),
                    transaction.getInstallmentGroup(), transaction.getInstallmentNumber(), transaction.getInstallmentCount(), transaction.getInstallmentTotal());
        }
    }
}
