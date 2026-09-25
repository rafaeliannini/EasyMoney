package com.app.finance.finance_api.repository;

import com.app.finance.finance_api.model.Transaction;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface TransactionRepository extends JpaRepository<Transaction, Long> {
    // Spring Data cria a query automaticamente pelo nome do método
    List<Transaction> findByUserId(Long userId);
    @Query(value = "select to_char(date_trunc('month', date), 'YYYY-MM') as label, coalesce(sum(case when type = 'INCOME' then amount else 0 end), 0) as income, coalesce(sum(case when type = 'EXPENSE' then amount else 0 end), 0) as expense, coalesce(sum(case when type = 'INCOME' then amount else -amount end), 0) as total from tb_transactions where user_id = :userId and date >= :from and date < :to group by date_trunc('month', date) order by date_trunc('month', date)", nativeQuery = true)
    List<InsightProjection> monthlyTotals(@Param("userId") Long userId, @Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);
    @Query(value = "select coalesce(specification, description) as label, 0 as income, coalesce(sum(amount), 0) as expense, coalesce(sum(amount), 0) as total from tb_transactions where user_id = :userId and type = 'EXPENSE' and date >= :from and date < :to group by coalesce(specification, description) order by total desc", nativeQuery = true)
    List<InsightProjection> expensesByCategory(@Param("userId") Long userId, @Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);
    @Query(value = "select coalesce(responsible, 'Não informado') as label, 0 as income, coalesce(sum(amount), 0) as expense, coalesce(sum(amount), 0) as total from tb_transactions where user_id = :userId and type = 'EXPENSE' and date >= :from and date < :to group by responsible order by total desc", nativeQuery = true)
    List<InsightProjection> expensesByResponsible(@Param("userId") Long userId, @Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);
    @Query(value = "select coalesce(specification, description) as label, coalesce(sum(amount), 0) as income, 0 as expense, coalesce(sum(amount), 0) as total from tb_transactions where user_id = :userId and type = 'INCOME' and date >= :from and date < :to group by coalesce(specification, description) order by total desc", nativeQuery = true)
    List<InsightProjection> incomeBySource(@Param("userId") Long userId, @Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);
    @Query(value = "select to_char(date, 'YYYY-MM-DD') as label, 0 as income, coalesce(sum(amount), 0) as expense, coalesce(sum(amount), 0) as total from tb_transactions where user_id = :userId and type = 'EXPENSE' and date >= :from and date < :to group by date order by date", nativeQuery = true)
    List<InsightProjection> dailyExpenses(@Param("userId") Long userId, @Param("from") java.time.LocalDate from, @Param("to") java.time.LocalDate to);
}
