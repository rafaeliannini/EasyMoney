package com.app.finance.finance_api.repository;

import com.app.finance.finance_api.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    // Spring Data cria a query automaticamente pelo nome do método
    List<Transaction> findByUserId(Long userId);
}