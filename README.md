# EasyMoney

O **EasyMoney** é uma aplicação web de controle financeiro pessoal, criada para transformar uma organização antes feita em planilhas em uma experiência mais prática e visual.

O objetivo é reunir receitas, despesas, parcelamentos e investimentos em um só lugar, permitindo acompanhar o saldo, entender os hábitos de consumo e visualizar o progresso das metas financeiras.

**[Acesse o EasyMoney oficial → easymoneyappbr.vercel.app](https://easymoneyappbr.vercel.app)**

## Funcionalidades

| Área | O que você pode fazer |
| --- | --- |
| Visão geral | Consultar saldo, receitas e despesas do mês, taxa de poupança e movimentações recentes. |
| Transações | Registrar receitas e despesas com data, conta, responsável e categoria ou fonte/pagador. |
| Parcelamentos | Informar o valor total, valor da parcela e quantidade de meses, com geração dos lançamentos mensais. |
| Lançamentos futuros | Consultar movimentações agendadas, que entram no saldo e nas análises a partir da sua data. |
| Dashboard | Explorar gráficos de fluxo de caixa, despesas e receitas, com filtros por período, tipo, responsável, categoria e conta. |
| Investimentos | Cadastrar e editar posições, agrupar por tipo e acompanhar valores e metas. |
| Rendimento por CDI | Configurar percentual do CDI e data do saldo para atualização automática de uma estimativa bruta. |
| Perfil | Alterar nome, e-mail, senha e foto por URL HTTPS; personalizar contas, responsáveis, fontes e tipos de investimento. |
| Autenticação | Entrar com Google ou e-mail/senha e vincular os dois métodos à mesma conta. |

Os dados são associados ao usuário autenticado. A interface tem adaptações para telas menores, e a troca de contas limpa o estado da sessão anterior.

As funcionalidades acima descrevem o código deste repositório. A versão publicada pode acompanhar um estágio diferente do desenvolvimento. Detalhes de implementação e verificações externas pendentes estão na [documentação técnica](docs/implementacao-proximos-passos.md).

## Tecnologias

| Camada | Tecnologias |
| --- | --- |
| Frontend | React, TypeScript, Vite, Recharts e Axios |
| Backend | Java, Spring Boot, Spring Security e Spring Data JPA |
| Banco de dados | PostgreSQL |
| Autenticação | Firebase Authentication, com validação de tokens JWT na API |
| Ambiente local | Docker Compose para o PostgreSQL e Maven Wrapper para o backend |
| Ambiente Produtivo | Vercel (front-end), Render(back-end), Neon (Banco de dados) |
| Testes | Vitest, Testing Library, JUnit e testes de integração com Spring Boot |

O frontend consulta a API REST autenticada, que persiste e agrega os dados no PostgreSQL. O Firebase gerencia o acesso à conta; os registros financeiros ficam no banco da aplicação.

## Como executar localmente

### Pré-requisitos

- Git.
- Node.js 24 e npm.
- JDK 21 ou superior, com `JAVA_HOME` configurado.
- Docker com Docker Compose, em execução.
- Um projeto Firebase com aplicativo Web e Authentication configurados.

Não é necessário instalar o Maven separadamente: o backend inclui o Maven Wrapper. Os comandos abaixo usam PowerShell no Windows; há uma alternativa para iniciar o backend no Linux/macOS.

### 1. Obter o projeto

```powershell
git clone https://github.com/rafaeliannini/EasyMoney.git
cd EasyMoney
```

### 2. Iniciar o PostgreSQL

Na raiz do repositório:

```powershell
docker compose up -d postgres
```

O Compose inicia somente o banco. Backend e frontend são executados nos próximos passos, em terminais separados.

| Configuração local | Valor padrão |
| --- | --- |
| Host e porta | `localhost:5433` |
| Banco | `finance_db` |
| Usuário | `finance_user` |
| Senha de desenvolvimento | `finance_password` |

Esses valores correspondem ao `docker-compose.yml` e aos padrões da API. O volume `postgres_data` mantém os dados entre reinicializações. Para parar o banco sem remover o volume, execute `docker compose down` na raiz.

### 3. Configurar o Firebase e o frontend

No Firebase, registre um aplicativo Web, habilite os provedores **E-mail/senha** e **Google** em Authentication e inclua `localhost` nos domínios autorizados.

Crie `finance-web/.env.local` com os dados do seu aplicativo Web:

```dotenv
VITE_API_URL=http://localhost:8080/api
VITE_FIREBASE_API_KEY=sua-chave-do-aplicativo-web
VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=seu-projeto
```

Use os valores fornecidos pelo Firebase, substituindo os exemplos. O arquivo `.env.local` já é ignorado pelo Git e tem precedência sobre `.env`. Reinicie o Vite quando alterar essas variáveis. Variáveis `VITE_*` são incluídas no frontend: não coloque nelas credenciais administrativas ou de banco de dados.

### 4. Executar o backend

Em um terminal, a partir da raiz:

```powershell
cd backend/finance-api
.\mvnw.cmd spring-boot:run
```

No Linux/macOS, use `./mvnw spring-boot:run` no mesmo diretório.

**Ao usar um projeto Firebase próprio**, configure o emissor dos tokens no mesmo terminal, antes de iniciar a API:

```powershell
$env:SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI="https://securetoken.google.com/seu-projeto"
.\mvnw.cmd spring-boot:run
```

O ID desse projeto deve ser o mesmo de `VITE_FIREBASE_PROJECT_ID`. Sem a substituição, o backend usa o projeto definido em [application.yml](backend/finance-api/src/main/resources/application.yml).

A API inicia em `http://localhost:8080`. Confira seu funcionamento em [http://localhost:8080/api/health](http://localhost:8080/api/health). As rotas de dados exigem autenticação.

### 5. Executar o frontend

Em outro terminal, a partir da raiz:

```powershell
cd finance-web
npm ci
npm run dev
```

Abra **[http://localhost:5173](http://localhost:5173)** e crie uma conta ou faça login. Nos próximos usos, basta executar `npm run dev` se as dependências já estiverem instaladas e atualizadas.

O CORS da API permite `http://localhost:5173` e o domínio oficial. Se o Vite iniciar em outra porta, libere a porta 5173 ou ajuste [CorsConfig.java](backend/finance-api/src/main/java/com/app/finance/finance_api/config/CorsConfig.java).

### Configurações opcionais do backend

Configure estas variáveis no ambiente do processo da API quando precisar substituir os padrões:

| Variável | Finalidade / padrão |
| --- | --- |
| `DB_URL` | Conexão JDBC; padrão `jdbc:postgresql://localhost:5433/finance_db`. |
| `DB_USER` | Usuário do banco; padrão `finance_user`. |
| `DB_PASSWORD` | Senha do banco; padrão local `finance_password`. |
| `SPRING_SECURITY_OAUTH2_RESOURCESERVER_JWT_ISSUER_URI` | Emissor dos tokens do projeto Firebase usado pelo frontend. |
| `FINANCE_CDI_ENABLED` | Use `false` para desativar a atualização automática por CDI. |

O backend não lê automaticamente o `.env.local` do frontend. A criação e atualização das tabelas seguem a configuração atual do Hibernate (`ddl-auto: update`).

## Testes e build

Backend, com o PostgreSQL disponível:

```powershell
cd backend/finance-api
.\mvnw.cmd test
```

Frontend:

```powershell
cd finance-web
npm test
npm run lint
npm run build
```

O build do frontend é gerado em `finance-web/dist`. Para inspecioná-lo localmente, execute `npm run preview`; o acesso autenticado à API também depende de liberar a origem dessa prévia no CORS.

Os testes cobrem isolamento de sessões, vinculação de acesso, perfil, parcelamentos, preferências e cálculo de CDI. Os testes de integração do backend utilizam PostgreSQL com rollback; os testes do frontend simulam os serviços externos.

## Sobre o CDI e a conta

- O CDI é uma **estimativa bruta**, sem desconto de impostos, taxas ou regras particulares de cada produto. A fonte é a série SGS 12 do Banco Central.
- A API tenta atualizar os investimentos após o primeiro minuto de execução e, depois, a cada hora, usando cotações publicadas até o dia anterior. O backend precisa estar em execução; indisponibilidade da fonte preserva o último saldo calculado.
- A mudança de e-mail exige confirmação pelo Firebase. Depois, use **Atualizar conta** no Perfil ou faça login novamente para sincronizar o banco.
- A vinculação de provedores mantém os dados da mesma conta; contas já criadas separadamente não são mescladas automaticamente.
- O cadastro financeiro é manual. Importação de planilhas e integração com instituições financeiras estão entre as evoluções planejadas.

## Estrutura do repositório

```text
EasyMoney/
├── backend/finance-api/  # API Spring Boot e testes de backend
├── finance-web/          # Interface React e testes de frontend
├── docs/                 # Ideias, demandas e documentação técnica
├── docker-compose.yml    # PostgreSQL para desenvolvimento local
└── README.md
```

## Documentação e próximos passos

A proposta inicial organiza o desenvolvimento em infraestrutura, autenticação, cadastro de dados, agregações no backend e visualização com gráficos. A evolução prevista inclui orçamento mensal, patrimônio líquido, reserva de emergência, análise de carteira, dívidas, importação de dados e relatórios.

- [Proposta inicial e etapas do projeto (PDF)](docs/IdeiaInicialFinance.pdf).
- [Demandas e ideias para evolução](docs/demandas.md).
- [Implementações, decisões técnicas e validações pendentes](docs/implementacao-proximos-passos.md).

Para sugerir uma melhoria ou relatar um problema, [abra uma issue](https://github.com/rafaeliannini/EasyMoney/issues) com o contexto, o comportamento esperado e, no caso de erros, os passos para reproduzir.