package com.app.finance.finance_api.repository;

import java.math.BigDecimal;
public interface InsightProjection {
    String getLabel();
    BigDecimal getIncome();
    BigDecimal getExpense();
    BigDecimal getTotal();
}
