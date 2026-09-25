package com.app.finance.finance_api;

import com.app.finance.finance_api.service.InstallmentPlanner;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import static org.junit.jupiter.api.Assertions.*;

class InstallmentPlannerTests {
    @Test void preservesTotalAndOriginalDayAcrossShortMonths() {
        var plan = InstallmentPlanner.plan(new BigDecimal("100.00"), null, 3, LocalDate.of(2028, 1, 31));
        assertEquals(new BigDecimal("33.33"), plan.get(0).amount());
        assertEquals(new BigDecimal("33.34"), plan.get(2).amount());
        assertEquals(LocalDate.of(2028, 2, 29), plan.get(1).date());
        assertEquals(LocalDate.of(2028, 3, 31), plan.get(2).date());
        assertEquals(new BigDecimal("100.00"), plan.stream().map(InstallmentPlanner.Payment::amount).reduce(BigDecimal.ZERO, BigDecimal::add));
    }
    @Test void rejectsInconsistentOrInvalidAmounts() {
        LocalDate date = LocalDate.of(2026, 12, 31);
        assertThrows(IllegalArgumentException.class, () -> InstallmentPlanner.plan(new BigDecimal("100"), new BigDecimal("40"), 3, date));
        assertThrows(IllegalArgumentException.class, () -> InstallmentPlanner.plan(new BigDecimal("0.01"), null, 3, date));
        assertThrows(IllegalArgumentException.class, () -> InstallmentPlanner.plan(new BigDecimal("100.001"), null, 3, date));
        assertThrows(IllegalArgumentException.class, () -> InstallmentPlanner.plan(new BigDecimal("100"), null, 361, date));
    }
    @Test void acceptsSpecifiedInstallmentAndYearRollover() {
        var plan = InstallmentPlanner.plan(new BigDecimal("120"), new BigDecimal("60"), 2, LocalDate.of(2026, 12, 31));
        assertEquals(LocalDate.of(2027, 1, 31), plan.get(1).date());
        assertEquals(new BigDecimal("60"), plan.get(1).amount());
    }
}
