# EasyEveent API + Frontend

Aplicação para gestão de eventos com fluxo de compra/inscrição e regras de check-in configuráveis por evento.

## Stack

- Backend: Ruby on Rails (API)
- Frontend: React + Vite + TypeScript
- Banco: PostgreSQL
- Orquestração local: Docker Compose

## Instalação e execução com Docker

### Pré-requisitos

- Docker
- Docker Compose (plugin `docker compose`)

### 1) Build das imagens

```bash
docker compose build
```

### 2) Subir os serviços

```bash
docker compose up -d
```

### 3) Serviços e portas

- API Rails: `http://localhost:3000`
- Frontend Vite: `http://localhost:5173`
- PostgreSQL: container `db` (porta interna `5432`)


## Telas implementadas

### 1. Login (`/login`)

- Autenticação por e-mail e senha.
- Tratamento de erro de credenciais e erros HTTP.

### 2. Dashboard (`/dashboard`)

- Tela inicial autenticada com visão geral do sistema.
- Eventos diponíveis para check-in 

### 3. Eventos (`/eventos`)

- Listagem de eventos próprios e eventos em que o usuário participa.
- Filtros por título, status, localização e intervalo de datas.
- Criação, edição, exclusão e visualização de detalhes de evento.
- Acesso para configuração de check-in por evento.

### 4. Detalhes do evento (`/eventos/:eventId`)

- Exibição detalhada das informações do evento selecionado.

### 5. Regras de check-in (`/eventos/:eventId/checkin`)

- Configuração e ordenação de regras.
- Regras fixas padrão: `qr_code`, `printed_list`, `email_confirmation`.
- Regras avançadas configuráveis: `capacity_limit`, `live_count`, `half_price_policy`, `document_check`.

### 6. Compra/inscrição (`/events/:eventId/purchase` e `/eventos/:eventId/compra`)

- Fluxo de inscrição com seleção de pagamento e tipo de ingresso.
- Avaliação de regras ativas antes da confirmação da compra.
- Exibição de QR Code e confirmação de e-mail no retorno da compra.

### 7. Participantes (`/participantes`)

- Lista de participantes por evento do organizador.
- Exportação de participantes (CSV/PDF textual, conforme regra ativa).
- Transferência de participantes entre eventos compatíveis.

## Regras de check-in implementadas

### QR Code (`qr_code`)

- Um QR Code de acesso é gerado para o usuário no momento da inscrição/compra.
- O payload inclui token, expiração e opção de uso único (`single_use`).

### Lista impressa (`printed_list`)

- É possível exportar todos os participantes do evento.
- O formato pode ser configurado (CSV ou PDF textual).
- Quando há exigência de documento ativa, a coluna de documento também entra na exportação CSV.

### E-mail (`email_confirmation`)

- A confirmação de inscrição/check-in pode ser configurada pela regra.
- Atualmente, no fluxo de compra, quando `send_on = purchase`, o envio é simulado e registrado em log (`email_confirmation_simulated`).

### Capacidade (`capacity_limit`)

- Permite configurar a lotação máxima (`max_users`) do evento.
- Novas inscrições são bloqueadas automaticamente após atingir o limite.

### Live count (`live_count`)

- Mostra a contagem de inscritos em tempo real (`participants_count`).
- A regra também define intervalo de atualização (`refresh_seconds`).
- A visibilidade pode ser combinada com `visibility_toggle`.

### Meia entrada (`half_price_policy`)

- Permite compra de ingresso meia (`ticket_type = half`).
- Aplica multiplicador de preço configurável (`ratio`), por padrão 50%.

### Documento obrigatório (`document_check`)

- Exige documento no momento da inscrição.
- A compra é bloqueada caso o campo obrigatório não seja informado.
- O documento informado é salvo no vínculo do participante (`user_events.document`).

## Comandos úteis

```bash
# Executar migrations no serviço web
docker compose exec web bin/rails db:migrate

# Console Rails
docker compose exec web bin/rails console

# Testes backend
docker compose exec web bin/rails test
```
