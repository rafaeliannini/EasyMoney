package com.app.finance.finance_api.service;

import com.app.finance.finance_api.repository.InvestmentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDate;
import java.util.List;

@Service
public class CdiAccrualService {
    private final InvestmentRepository investments;
    public CdiAccrualService(InvestmentRepository investments) { this.investments = investments; }
    @Transactional
    public void apply(Long id, List<CdiCalculator.Rate> rates, LocalDate through) {
        investments.lockById(id).ifPresent(item -> { if (CdiCalculator.accrue(item, rates, through)) investments.save(item); });
    }
}
