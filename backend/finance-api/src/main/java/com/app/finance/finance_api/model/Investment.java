package com.app.finance.finance_api.model;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Entity
@Table(name = "tb_investments", indexes = @Index(name = "idx_investment_user", columnList = "user_id"))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Investment {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false) private String name;
    @Column(nullable = false) private String category;
    @Column(nullable = false, precision = 19, scale = 2) private BigDecimal amount;
    @Column(precision = 19, scale = 2) private BigDecimal goal;
    @ManyToOne @JoinColumn(name = "user_id", nullable = false)
    private User user;
}
