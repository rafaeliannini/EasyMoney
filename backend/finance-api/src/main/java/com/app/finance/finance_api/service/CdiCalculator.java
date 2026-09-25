package com.app.finance.finance_api.service;

import com.app.finance.finance_api.model.Investment;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.List;
import java.util.TreeMap;

public final class CdiCalculator {
    private CdiCalculator() {}
    public record Rate(LocalDate date, BigDecimal dailyPercent) {}
    public static boolean accrue(Investment item, List<Rate> rates, LocalDate through) {
        if (item.getCdiPercent() == null || item.getLastAccruedDate() == null) return false;
        // Deduplicate published dates; only published daily rates produce income.
        var ordered = new TreeMap<LocalDate, BigDecimal>();
        for (Rate rate : rates) {
            if (rate.date() == null || rate.dailyPercent() == null || rate.dailyPercent().signum() < 0)
                throw new IllegalArgumentException("Cotação CDI inválida.");
            ordered.put(rate.date(), rate.dailyPercent());
        }
        BigDecimal balance = item.getAccruedAmount() == null ? item.getAmount() : item.getAccruedAmount();
        LocalDate last = item.getLastAccruedDate();
        for (var rate : ordered.entrySet()) {
            if (!rate.getKey().isAfter(last) || rate.getKey().isAfter(through)) continue;
            BigDecimal daily = rate.getValue().multiply(item.getCdiPercent()).movePointLeft(4);
            balance = balance.multiply(BigDecimal.ONE.add(daily)).setScale(12, RoundingMode.HALF_UP);
            last = rate.getKey();
        }
        if (last.equals(item.getLastAccruedDate())) return false;
        item.setAccruedAmount(balance); item.setAmount(balance.setScale(2, RoundingMode.HALF_UP)); item.setLastAccruedDate(last);
        return true;
    }
}
