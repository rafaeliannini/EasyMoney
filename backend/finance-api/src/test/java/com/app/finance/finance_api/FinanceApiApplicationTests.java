package com.app.finance.finance_api;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {"finance.cdi.enabled=false", "spring.jpa.show-sql=false", "logging.level.root=WARN"})
class FinanceApiApplicationTests {

	@Test
	void contextLoads() {
	}

}
