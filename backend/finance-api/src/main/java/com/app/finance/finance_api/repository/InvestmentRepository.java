package com.app.finance.finance_api.repository;

import com.app.finance.finance_api.model.Investment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface InvestmentRepository extends JpaRepository<Investment, Long> {
    List<Investment> findByUserIdOrderByCategoryAscNameAsc(Long userId);
    Optional<Investment> findByIdAndUserId(Long id, Long userId);
}
