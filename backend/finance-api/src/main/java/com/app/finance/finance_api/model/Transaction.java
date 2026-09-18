package com.app.finance.finance_api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "tb_transactions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Transaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String description;

    @Column(nullable = false)
    private BigDecimal amount;

    @Column(nullable = false)
    private String type; // Ex: "INCOME" ou "EXPENSE"

    @Column(nullable = false)
    private LocalDate date;

    // Relacionamento: Várias transações pertencem a um Usuário
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User user;
}