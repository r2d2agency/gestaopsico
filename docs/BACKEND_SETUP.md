# Backend - Estrutura para Easypanel

Este documento descreve a estrutura do backend que você precisa criar no Easypanel.

## Stack Recomendada

- **Runtime:** Node.js 20+
- **Framework:** Express ou Fastify
- **ORM:** Prisma ou TypeORM
- **Banco:** PostgreSQL 16
- **Auth:** JWT (jsonwebtoken + bcrypt)

## Variáveis de Ambiente (Backend)

```env
DATABASE_URL=postgresql://user:password@host:5432/clinicasaude
JWT_SECRET=sua-chave-secreta-forte
PORT=3001
CORS_ORIGIN=https://seu-frontend.easypanel.host
```

## Tabelas PostgreSQL

```sql
-- Usuários/Profissionais
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role VARCHAR(50) DEFAULT 'professional',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pacientes
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES users(id),
  name VARCHAR(255) NOT NULL,
  cpf VARCHAR(14) UNIQUE,
  birth_date DATE,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  gender VARCHAR(20),
  emergency_contact VARCHAR(255),
  clinical_notes TEXT,
  health_history TEXT,
  medications TEXT,
  allergies TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

-- Casais
CREATE TABLE couples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES users(id),
  patient1_id UUID REFERENCES patients(id),
  patient2_id UUID REFERENCES patients(id),
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Consultas
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  professional_id UUID REFERENCES users(id),
  patient_id UUID REFERENCES patients(id),
  couple_id UUID REFERENCES couples(id),
  type VARCHAR(20) NOT NULL, -- 'individual' | 'couple'
  date DATE NOT NULL,
  time TIME NOT NULL,
  duration INTEGER DEFAULT 50,
  value DECIMAL(10,2),
  status VARCHAR(20) DEFAULT 'scheduled',
  payment_status VARCHAR(20) DEFAULT 'pending',
  mode VARCHAR(20) DEFAULT 'video',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Prontuários
CREATE TABLE records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id),
  couple_id UUID REFERENCES couples(id),
  professional_id UUID REFERENCES users(id),
  type VARCHAR(20) NOT NULL,
  content TEXT,
  ai_content TEXT,
  date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Transcrições
CREATE TABLE transcriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  content TEXT,
  speakers JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Pagamentos
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  patient_id UUID REFERENCES patients(id),
  value DECIMAL(10,2) NOT NULL,
  method VARCHAR(20),
  status VARCHAR(20) DEFAULT 'pending',
  paid_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Endpoints da API

### Auth
- `POST /api/auth/register` — Cadastro
- `POST /api/auth/login` — Login (retorna JWT)
- `GET /api/auth/me` — Usuário autenticado

### Pacientes
- `GET /api/pacientes` — Listar (com busca e paginação)
- `GET /api/pacientes/:id` — Detalhes
- `POST /api/pacientes` — Criar
- `PUT /api/pacientes/:id` — Atualizar
- `DELETE /api/pacientes/:id` — Remover

### Consultas
- `GET /api/consultas` — Listar (filtro por data/status)
- `GET /api/consultas/:id` — Detalhes
- `POST /api/consultas` — Agendar
- `PUT /api/consultas/:id` — Atualizar
- `POST /api/consultas/:id/cancel` — Cancelar

### Casais
- `GET /api/casais` — Listar
- `GET /api/casais/:id` — Detalhes + sessões
- `POST /api/casais` — Criar vínculo

### Prontuários
- `GET /api/pacientes/:id/prontuarios` — Por paciente
- `GET /api/prontuarios/:id` — Detalhes
- `POST /api/prontuarios` — Criar
- `PUT /api/prontuarios/:id` — Atualizar

### Financeiro
- `GET /api/financeiro` — Listar pagamentos
- `GET /api/financeiro/summary` — Resumo mensal
- `PUT /api/financeiro/:id` — Atualizar status

### Dashboard
- `GET /api/dashboard/summary` — Resumo geral

## Deploy no Easypanel

1. Crie um serviço **App** (Node.js) para o backend
2. Crie um serviço **PostgreSQL** para o banco
3. Crie um serviço **App** (Static/Nginx) para o frontend
4. Configure as variáveis de ambiente
5. No frontend, defina `VITE_API_URL` apontando para o backend
