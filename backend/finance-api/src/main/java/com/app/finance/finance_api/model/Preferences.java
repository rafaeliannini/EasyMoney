package com.app.finance.finance_api.model;

import jakarta.persistence.*;
import lombok.Data;
import java.util.ArrayList;
import java.util.List;

@Entity @Table(name = "tb_preferences") @Data
public class Preferences {
    @Id private Long id;
    @ElementCollection @OrderColumn(name = "position") private List<String> wallets = new ArrayList<>();
    @ElementCollection @OrderColumn(name = "position") private List<String> responsible = new ArrayList<>();
    @ElementCollection @OrderColumn(name = "position") private List<String> incomeSources = new ArrayList<>();
    @ElementCollection @OrderColumn(name = "position") private List<String> investmentTypes = new ArrayList<>();
}
