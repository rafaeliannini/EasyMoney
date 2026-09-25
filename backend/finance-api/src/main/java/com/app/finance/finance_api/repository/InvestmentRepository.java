package com.app.finance.finance_api.repository;

import com.app.finance.finance_api.model.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InvestmentRepository extends JpaRepository<Investment, Long> {
    List<Investment> findByUserIdOrderByCategoryAscNameAsc(Long userId);
    Optional<Investment> findByIdAndUserId(Long id, Long userId);
    List<Investment> findByCdiPercentIsNotNull();
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select i from Investment i where i.id = :id")
    Optional<Investment> lockById(@org.springframework.data.repository.query.Param("id") Long id);
}
