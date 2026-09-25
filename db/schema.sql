create table if not exists sessoes (
  id uuid primary key default gen_random_uuid(),
  numero serial,
  papel text not null,
  apelido text not null,
  caso_1 text not null,
  caso_2 text not null,
  encaminhamento_1 text,
  encaminhamento_2 text,
  preparo int,
  ip_hash text not null,
  tokens int not null default 0,
  criada_em timestamptz not null default now(),
  concluida_em timestamptz
);

create table if not exists eventos (
  id bigserial primary key,
  sessao_id uuid not null references sessoes(id) on delete cascade,
  atendimento int not null check (atendimento in (1, 2)),
  assunto text not null,
  sinal text,
  ultima_fala text not null,
  criado_em timestamptz not null default now()
);

create index if not exists eventos_sessao on eventos (sessao_id, atendimento);
create index if not exists sessoes_ip on sessoes (ip_hash, criada_em);

create table if not exists falas (
  id bigserial primary key,
  sessao_id uuid not null references sessoes(id) on delete cascade,
  atendimento int not null check (atendimento in (1, 2)),
  ordem int not null,
  quem text not null check (quem in ('profissional', 'paciente')),
  texto text not null
);

create index if not exists falas_sessao on falas (sessao_id, atendimento, ordem);

create table if not exists avaliacoes (
  sessao_id uuid not null references sessoes(id) on delete cascade,
  atendimento int not null check (atendimento in (1, 2)),
  resultado jsonb,
  criada_em timestamptz not null default now(),
  primary key (sessao_id, atendimento)
);

alter table sessoes add column if not exists preceptor_segundos int;

alter table sessoes add column if not exists idioma text not null default 'pt';
