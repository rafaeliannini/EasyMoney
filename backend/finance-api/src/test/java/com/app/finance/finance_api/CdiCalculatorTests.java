package com.app.finance.finance_api;

import com.app.finance.finance_api.model.Investment;
import com.app.finance.finance_api.service.CdiCalculator;
import org.junit.jupiter.api.Test;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import static org.junit.jupiter.api.Assertions.*;

class CdiCalculatorTests {
    @Test void compoundsPublishedDaysAtContractPercentageWithoutDoubleCounting() {
        Investment item = new Investment(); item.setAmount(new BigDecimal("1000.00")); item.setCdiPercent(new BigDecimal("110"));
        item.setLastAccruedDate(LocalDate.of(2026, 9, 3));
        var friday = new CdiCalculator.Rate(LocalDate.of(2026, 9, 4), new BigDecimal("0.05"));
        var tuesday = new CdiCalculator.Rate(LocalDate.of(2026, 9, 8), new BigDecimal("0.04"));
        var future = new CdiCalculator.Rate(LocalDate.of(2026, 9, 9), new BigDecimal("0.05"));
        var through = LocalDate.of(2026, 9, 8);
        assertTrue(CdiCalculator.accrue(item, List.of(tuesday, friday, friday, future), through));
        assertEquals(new BigDecimal("1000.99"), item.getAmount());
        assertEquals(new BigDecimal("1000.990242000000"), item.getAccruedAmount());
        assertEquals(through, item.getLastAccruedDate());
        assertFalse(CdiCalculator.accrue(item, List.of(friday, tuesday, future), through));
        assertEquals(new BigDecimal("1000.99"), item.getAmount());
    }
    @Test void missingRatesAndManualInvestmentsRemainUnchanged() {
        Investment item = new Investment(); item.setAmount(new BigDecimal("50"));
        assertFalse(CdiCalculator.accrue(item, List.of(), LocalDate.now()));
        item.setCdiPercent(new BigDecimal("100")); item.setLastAccruedDate(LocalDate.of(2026, 9, 4));
        assertFalse(CdiCalculator.accrue(item, List.of(), LocalDate.of(2026, 9, 7)));
        assertEquals(new BigDecimal("50"), item.getAmount());
        assertEquals(LocalDate.of(2026, 9, 4), item.getLastAccruedDate());
    }
}
