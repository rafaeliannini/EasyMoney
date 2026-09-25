# Análise e implementação — 23/09/2026

## Situação encontrada

O frontend usa React 19, TypeScript, Vite, Recharts, Axios e Firebase Authentication. A maior parte das telas estava concentrada em `finance-web/src/App.tsx`. Já existiam cadastro/login por e-mail ou Google, visão geral, dashboard com filtros, lançamentos de receitas/despesas, investimentos e metas por investimento. O perfil era somente de leitura.

O backend usa Java 21+, Spring Boot, Spring Security com tokens JWT do Firebase, JPA e PostgreSQL. Transações e investimentos são associados ao UID do Firebase por um usuário local. Os gráficos utilizam consultas SQL agregadas. Contas, responsáveis, fontes e tipos de investimento eram listas fixas nos dois lados. O único teste existente verificava a inicialização do contexto Spring.

## Demandas implementadas

1. **Google e senha na mesma conta:** o Perfil permite vincular Google à conta autenticada e adicionar senha a uma conta Google. Usa `linkWithPopup` e `linkWithCredential`, mantendo o UID e os registros. Conflitos com credenciais de outra conta são explicados; não há mesclagem automática de contas existentes.
2. **Troca de contas:** cada conta tem uma árvore React e um cliente HTTP próprios. Logout/troca desmonta formulários, limpa os dados e cancela as requisições anteriores. O token é obtido do usuário proprietário da sessão, com conferência antes/depois da obtenção e na resposta. A criação/sincronização do usuário local precede as consultas financeiras. O cadastro local usa upsert por UID para tolerar chamadas concorrentes.
3. **Parcelamentos:** formulário com total, quantidade de meses, parcela opcional e primeira data. O backend valida e salva todas as parcelas em uma transação de banco. Centavos residuais ficam na última parcela; datas são calculadas a partir do vencimento original, inclusive em meses curtos e anos bissextos. Limite de 2 a 360 parcelas. Cada lançamento registra grupo, número, quantidade e total da compra. Lançamentos futuros aparecem separados e só entram no saldo e nos gráficos na sua data.
4. **Opções pessoais:** Perfil edita contas, responsáveis, fontes/pagadores e tipos de investimento. As listas são persistidas por usuário, validadas no backend e usadas pelos formulários. A edição vale para novos lançamentos; o histórico mantém os nomes anteriores. Categorias de despesas continuam na lista original. Cada lista aceita 1 a 50 opções únicas de até 80 caracteres.
5. **Perfil editável:** nome, foto por URL HTTPS, e-mail e senha. Nome e foto são atualizados no Firebase e sincronizados no PostgreSQL usando claims de um token renovado. Alterações sensíveis pedem reautenticação. E-mail só muda após confirmação do link; o botão “Atualizar conta” sincroniza a mudança, assim como o próximo login. Senhas permanecem exclusivamente no Firebase. Falhas parciais de sincronização são informadas e podem ser repetidas. Upload de arquivo de imagem não faz parte desta implementação.
6. **CDI:** atualização opcional de investimentos vinculados ao CDI, com percentual e data do saldo informado. O backend consulta a série SGS 12 do Banco Central e aplica `saldo × (1 + taxa_diária_percentual × percentual_contratado / 10000)` nas datas publicadas posteriores à data do saldo. O acumulado conserva 12 casas decimais; a apresentação monetária usa 2. A estimativa é bruta, sem IR, IOF, taxas ou regras específicas de cada produto.

## Atualização do CDI

- Primeira tentativa 60 segundos após iniciar a API; novas tentativas a cada hora, processando cotações até o dia anterior no fuso `America/Sao_Paulo`.
- O backend precisa permanecer em execução para atualizar automaticamente. Períodos em que esteve parado são recuperados nas consultas seguintes, em janelas de até um ano.
- Datas sem cotação não recebem juros inventados. Reexecuções não duplicam rendimento. Falhas da fonte mantêm saldo/data anteriores e geram registro no log.
- Bloqueio no banco serializa atualização e edição. Se o rendimento mudou desde a abertura do formulário, a edição retorna conflito e pede recarregamento.
- Alterar saldo ou percentual exige uma data de referência nova. Alterar somente nome/meta preserva a precisão acumulada. Remover a atualização automática preserva o saldo e encerra o cálculo.
- Para desativar a tarefa: `FINANCE_CDI_ENABLED=false`.

Referência da taxa: [SGS 12 — CDI diário (% ao dia), Banco Central](https://www3.bcb.gov.br/sgspub/consultarvalores/consultarValoresSeries.do?method=consultarSeries&series=12).

## Proteção de dados

Na revisão foram encontrados endpoints de usuários que listavam todas as contas e excluíam qualquer ID autenticado. Agora a listagem retorna somente a própria conta e a exclusão confere o dono. Nenhuma identidade é aceita a partir do payload para sincronizar o perfil.

As tabelas/colunas novas seguem o mecanismo existente `spring.jpa.hibernate.ddl-auto=update`. Os registros anteriores continuam compatíveis: campos de parcelamento e CDI são opcionais; usuários sem preferências salvas recebem as opções originais.

## Como validar

Com o PostgreSQL do `docker-compose.yml` disponível:

```powershell
cd backend/finance-api
.\mvnw.cmd test
```

Frontend:

```powershell
cd finance-web
npm test
npm run build
npm run lint
```

Testes de integração usam transações com rollback e desativam o agendamento de CDI. Dependem do PostgreSQL local configurado; não precisam de uma sessão real do Firebase. Os testes de frontend simulam os serviços externos.

Cobertura: isolamento entre contas, respostas atrasadas, espera pelo cadastro local, vinculação dos dois provedores, conflito de credenciais, reautenticação e sincronização de perfil, payload de parcelamento, arredondamento/datas, opções particulares, autorização de usuários, persistência de rendimentos, idempotência e conflito de edição.

## Verificações externas pendentes

- Validar login/vinculação Google e confirmação de e-mail com uma conta de teste no projeto Firebase. Os fluxos foram testados com mocks, sem operar contas reais.
- A consulta HTTPS ao endpoint SGS expirou neste ambiente. O cálculo e a persistência foram testados com taxas controladas; o recebimento de cotações reais deve ser confirmado nos logs da API quando houver acesso à fonte.
- O build ainda informa um bundle principal acima de 500 kB, aviso já presente antes das mudanças.

Referências dos fluxos: [vinculação de provedores](https://firebase.google.com/docs/auth/web/account-linking) e [gerenciamento de usuários](https://firebase.google.com/docs/auth/web/manage-users).

## Continuidade

Os doze grupos de “Passos futuros” do README permanecem no backlog. A próxima frente é orçamento e planejamento mensal; o agendamento gerado pelos parcelamentos já fornece parte dos dados para essa evolução.
