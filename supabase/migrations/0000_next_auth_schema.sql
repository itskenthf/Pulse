-- Auth.js (NextAuth) storage schema for @auth/supabase-adapter.
-- This is the adapter's own schema — Pulse's app tables (0001) reference
-- next_auth.users.id as their user_id foreign key. Supabase's own Auth
-- product is intentionally unused; see docs/DECISIONS.md.
--
-- Source: https://authjs.dev/getting-started/adapters/supabase

create extension if not exists "uuid-ossp";

create schema if not exists next_auth;

grant usage on schema next_auth to service_role;
grant all on schema next_auth to postgres;

create table if not exists next_auth.users
(
    id uuid not null default uuid_generate_v4(),
    name text,
    email text,
    "emailVerified" timestamp with time zone,
    image text,
    constraint users_pkey primary key (id),
    constraint users_email_key unique (email)
);

grant all on table next_auth.users to postgres;
grant all on table next_auth.users to service_role;

create table if not exists next_auth.sessions
(
    id uuid not null default uuid_generate_v4(),
    expires timestamp with time zone not null,
    "sessionToken" text not null,
    "userId" uuid,
    constraint sessions_pkey primary key (id),
    constraint sessions_sessionToken_key unique ("sessionToken"),
    constraint "sessions_userId_fkey" foreign key ("userId") references next_auth.users (id) on delete cascade
);

grant all on table next_auth.sessions to postgres;
grant all on table next_auth.sessions to service_role;

create table if not exists next_auth.accounts
(
    id uuid not null default uuid_generate_v4(),
    type text not null,
    provider text not null,
    "providerAccountId" text not null,
    refresh_token text,
    access_token text,
    expires_at bigint,
    token_type text,
    scope text,
    id_token text,
    session_state text,
    oauth_token_secret text,
    oauth_token text,
    "userId" uuid,
    constraint accounts_pkey primary key (id),
    constraint provider_unique unique (provider, "providerAccountId"),
    constraint "accounts_userId_fkey" foreign key ("userId") references next_auth.users (id) on delete cascade
);

grant all on table next_auth.accounts to postgres;
grant all on table next_auth.accounts to service_role;

create table if not exists next_auth.verification_tokens
(
    identifier text,
    token text,
    expires timestamp with time zone not null,
    constraint verification_tokens_pkey primary key (token),
    constraint token_unique unique (token),
    constraint token_identifier_unique unique (token, identifier)
);

grant all on table next_auth.verification_tokens to postgres;
grant all on table next_auth.verification_tokens to service_role;

create or replace function next_auth.uid() returns uuid
    language sql stable
    as $$
  select
    coalesce(
        nullif(current_setting('request.jwt.claim.sub', true), ''),
        (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
    )::uuid
$$;
