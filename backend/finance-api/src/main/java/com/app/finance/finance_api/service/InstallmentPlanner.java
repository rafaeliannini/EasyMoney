package com.app.finance.finance_api.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

public final class InstallmentPlanner {
    private InstallmentPlanner() {}
    public record Payment(int number, LocalDate date, BigDecimal amount) {}

    public static List<Payment> plan(BigDecimal total, BigDecimal installment, Integer months, LocalDate firstDate) {
        if (total == null || total.signum() <= 0 || total.scale() > 2 || total.precision() > 15
                || months == null || months < 2 || months > 360 || firstDate == null)
            throw new IllegalArgumentException("Informe um total válido, a primeira data e entre 2 e 360 meses.");
        BigDecimal regular = installment == null ? total.divide(BigDecimal.valueOf(months), 2, RoundingMode.DOWN) : installment;
        BigDecimal last = total.subtract(regular.multiply(BigDecimal.valueOf(months - 1)));
        // Only a rounding adjustment is accepted; inconsistent totals should not
        // silently create a balloon payment or a negative final installment.
        if (regular.signum() <= 0 || regular.scale() > 2 || last.signum() <= 0
                || last.subtract(regular).abs().compareTo(BigDecimal.valueOf(months, 2)) > 0)
            throw new IllegalArgumentException("O valor da parcela e os meses devem corresponder ao total; apenas ajustes de centavos são aceitos.");
        List<Payment> result = new ArrayList<>();
        for (int i = 0; i < months; i++)
            result.add(new Payment(i + 1, firstDate.plusMonths(i), i == months - 1 ? last : regular));
        return List.copyOf(result);
    }
}
