package com.app.finance.finance_api.service;

import com.app.finance.finance_api.repository.InvestmentRepository;
import org.springframework.stereotype.Component;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.time.LocalDate;
import java.time.ZoneId;

@Component @EnableScheduling
@ConditionalOnProperty(name = "finance.cdi.enabled", havingValue = "true", matchIfMissing = true)
public class CdiScheduler {
    private static final Logger log = LoggerFactory.getLogger(CdiScheduler.class);
    private final InvestmentRepository investments;
    private final CdiRateClient rates;
    private final CdiAccrualService accrual;
    public CdiScheduler(InvestmentRepository investments, CdiRateClient rates, CdiAccrualService accrual) {
        this.investments = investments; this.rates = rates; this.accrual = accrual;
    }
    @Scheduled(initialDelay = 60000, fixedDelay = 3600000)
    public void update() {
        LocalDate through = LocalDate.now(ZoneId.of("America/Sao_Paulo")).minusDays(1);
        var items = investments.findByCdiPercentIsNotNull();
        var earliest = items.stream().map(i -> i.getLastAccruedDate()).filter(d -> d != null && d.isBefore(through)).min(LocalDate::compareTo);
        if (earliest.isEmpty()) return;
        try {
            // At most one year per cycle keeps requests within SGS date limits,
            // even if the application was offline for a long period.
            LocalDate end = earliest.get().plusYears(1).isBefore(through) ? earliest.get().plusYears(1) : through;
            var quotes = rates.fetch(earliest.get().plusDays(1), end);
            for (var item : items) {
                try { accrual.apply(item.getId(), quotes, end); }
                catch (RuntimeException e) { log.warn("Não foi possível atualizar investimento {} por CDI", item.getId(), e); }
            }
        } catch (RuntimeException e) { log.warn("CDI indisponível; valores preservados e nova tentativa no próximo ciclo", e); }
    }
}
