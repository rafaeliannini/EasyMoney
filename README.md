# EasyMoney

Para rodar o backend (local)
cd backend/finance-api 
.\mvnw spring-boot:run

Para rodar o frontend (dev local)
cd finance-web
npm run dev

Proximos passos:
Adicionar algum jeito de quem loga com o google poder logar com o email e quem loga com email poder logar com google se possivel.

Corrigir bug que ao trocar de conta você ainda ve os dados do login anterior até dar f5.

Adicionar a possibilidade de colocar despesas parceladas com o valor total, valor da parcela e meses a pagar.

Adicionar no perfil a possibilidade de trocar os dados como tipos do investimentos e na parte de transações os responsaveis, contas e especifição das receitas(trocando o nome para por exemplo pagador ou fonte).

Adicionar ao perfil possibilidade de trocar nome, email, senha, e adicionar/alterar foto, mudanças tem que refletir no firebase e no banco de dados.

Adicionar a possibilidade de nos investimentos colocar quando for caixinhas ou rendas fixas a % do cdi e todos os dias calcular um novo valor e atualizar automaticamente o investimento.

1. Orçamento e planejamento mensal
- Limites de gastos por categoria.
- Comparação “planejado × realizado”.
- Despesas e receitas recorrentes.
- Projeção do saldo até o fim do mês.
- Identificação automática de assinaturas.
- Alertas como: “Você já utilizou 85% do orçamento de alimentação”.

2. Patrimônio líquido
Crie uma visão consolidada com:
- Dinheiro em contas.
- Investimentos.
- Imóveis e outros bens.
- Cartões, financiamentos e demais dívidas.
- Evolução do patrimônio líquido ao longo do tempo.

3. Reserva de emergência
- Meta calculada em meses de despesas essenciais.
- Configuração recomendada, por exemplo, entre 3 e 12 meses.
- Indicador de cobertura: “Sua reserva cobre 4,7 meses”.
- Separação entre dinheiro disponível e investimentos sem liquidez imediata.

4. Análise real da carteira
Além de mostrar o valor investido:
- Alocação por classe: renda fixa, ações, FIIs, ETFs, cripto etc.
- Distribuição por instituição, setor, país, indexador e moeda.
- Rentabilidade nominal e real, descontando a inflação.
- Comparação com CDI, Ibovespa, IPCA e outros benchmarks.
- Rentabilidade ponderada por aportes.
- Histórico de aportes, resgates e valorização.
- Concentração e exposição excessiva.
- Vencimentos de renda fixa.

5. Alocação desejada e rebalanceamento
O usuário define, por exemplo:
- 50% renda fixa.
- 25% ETFs.
- 15% FIIs.
- 10% ações.
O app mostra:
- Alocação atual versus desejada.
- Classes acima ou abaixo da meta.
- Sugestão de como distribuir o próximo aporte.
- Simulação antes de realizar uma movimentação.

6. Metas mais inteligentes
Você já cria metas com valores investidos; pode evoluí-las com:
- Data-alvo.
- Inflação estimada.
- Rentabilidade esperada.
- Aporte mensal necessário.
- Probabilidade ou margem de segurança.
- Cenários conservador, base e otimista.
- Simulação de atraso ou aumento do aporte.
- Metas compartilhadas entre pessoas.

7. Proventos e renda passiva
- Dividendos, juros e rendimentos de FIIs.
- Calendário de recebimentos.
- Renda passiva mensal e anual.
- Yield sobre o custo.
- Proventos previstos.
- Progresso até cobrir determinada despesa ou percentual do custo de vida.

8. Dívidas e estratégia de quitação
- Cadastro de empréstimos, financiamentos e parcelamentos.
- Taxa de juros e custo total.
- Cronograma de parcelas.
- Simulação de amortização antecipada.
- Comparação entre investir ou quitar dívida.
- Estratégias “menor saldo primeiro” e “maior juros primeiro”.

9. Simulador de decisões
Uma área de “E se?” pode diferenciar bastante o produto:
- E se eu aumentar meu aporte em R$ 300?
- E se a inflação subir?
- E se eu comprar um carro?
- E se eu perder minha renda por três meses?
- E se eu antecipar este financiamento?
- Quando posso viver de renda?
- Por quanto tempo meu patrimônio sustentaria minhas despesas?

10. Automação e importação
- Importação de CSV/OFX.
- Leitura de faturas.
- Regras automáticas de categorização.
- Detecção de transferências entre contas para não contá-las como receita ou despesa.
- Conciliação de transações duplicadas.
- Integração com instituições financeiras.

11. Alertas realmente úteis
- Gasto fora do padrão.
- Saldo insuficiente para uma conta futura.
- Concentração elevada em um ativo ou instituição.
- Renda fixa próxima do vencimento.
- Meta atrasada.
- Aporte mensal ainda não realizado.
- Queda relevante do patrimônio.
- Reserva de emergência sendo utilizada.
- Dividendos ou juros recebidos.

12. Relatórios e organização familiar
- Fechamento mensal automático.
- Relatório anual.
- Comparação entre períodos.
- Exportação para PDF e planilha.
- Espaços pessoal, casal, família ou empresa.
- Permissões por usuário.
- Comentários e anexos em transações.
- Prestação de contas entre responsáveis.