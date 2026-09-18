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

@RestController
@RequestMapping("/api/transactions")
public class TransactionController {
    private static final List<String> WALLETS = List.of("Conta", "Vale alimentação", "Vale flexível");
    private static final List<String> RESPONSIBLES = List.of("Eu", "Mãe", "Pai");
    private static final List<String> EXPENSE_SPECIFICATIONS = List.of("Restaurantes/delivery", "Supermercado", "Farmácia",
            "Transporte", "Presente", "Lazer", "Compras pessoais", "Viagem", "Academia/esportes", "Outros");
    private static final List<String> INCOME_SPECIFICATIONS = List.of("TAGNA", "Mãe", "Pai", "Presentes", "Mesada");

    private final TransactionRepository transactionRepository;
    private final UserRepository userRepository;

    public TransactionController(TransactionRepository transactionRepository, UserRepository userRepository) {
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
        if (!isValid(request)) throw new IllegalArgumentException("Dados da transação inválidos.");
        Transaction transaction = new Transaction();
        // description continua preenchida para manter os lançamentos existentes compatíveis.
        transaction.setDescription(request.specification());
        transaction.setAmount(request.amount());
        transaction.setType(request.type());
        transaction.setDate(request.date());
        transaction.setWallet(request.wallet());
        transaction.setSpecification(request.specification());
        transaction.setResponsible("EXPENSE".equals(request.type()) ? request.responsible() : null);
        transaction.setUser(currentUser(jwt));
        return TransactionResponse.from(transactionRepository.save(transaction));
    }

    private boolean isValid(TransactionRequest request) {
        if (request.amount() == null || request.amount().signum() <= 0 || request.date() == null
                || !("INCOME".equals(request.type()) || "EXPENSE".equals(request.type()))
                || !WALLETS.contains(request.wallet())) return false;
        if ("EXPENSE".equals(request.type()))
            return EXPENSE_SPECIFICATIONS.contains(request.specification()) && RESPONSIBLES.contains(request.responsible());
        return INCOME_SPECIFICATIONS.contains(request.specification());
    }

    private User currentUser(Jwt jwt) {
        return userRepository.findByFirebaseUid(jwt.getSubject())
                .orElseThrow(() -> new IllegalStateException("Usuário não encontrado no banco de dados."));
    }

    public record TransactionRequest(BigDecimal amount, String type, LocalDate date, String wallet, String specification, String responsible) {}
    public record TransactionResponse(Long id, String description, BigDecimal amount, String type, LocalDate date,
                                      String wallet, String specification, String responsible) {
        static TransactionResponse from(Transaction transaction) {
            return new TransactionResponse(transaction.getId(), transaction.getDescription(), transaction.getAmount(), transaction.getType(),
                    transaction.getDate(), transaction.getWallet(), transaction.getSpecification(), transaction.getResponsible());
        }
    }
}
