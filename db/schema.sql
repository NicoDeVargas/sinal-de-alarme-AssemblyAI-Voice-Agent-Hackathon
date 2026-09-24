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
