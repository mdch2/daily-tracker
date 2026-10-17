begin;
create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email) values
  ('10000000-0000-4000-8000-000000000001', 'owner@example.test'),
  ('10000000-0000-4000-8000-000000000002', 'other@example.test');

select is((select count(*)::integer from public.profiles), 2, 'Auth creates profiles atomically');
select ok((select relrowsecurity from pg_class where oid = 'public.profiles'::regclass), 'Profiles enforce RLS');

set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"10000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
select is((select count(*)::integer from public.profiles), 1, 'Owner reads only their profile');
select is((select count(*)::integer from public.profiles where id = '10000000-0000-4000-8000-000000000002'), 0, 'Other user is invisible');
select lives_ok($$update public.profiles set display_name = 'Synthetic user', time_zone = 'America/Bogota' where id = '10000000-0000-4000-8000-000000000001'$$, 'Owner updates permitted fields');
select is((select display_name from public.profiles), 'Synthetic user', 'Update persists');
with changed as (
  update public.profiles set display_name = 'Intrusion' where id = '10000000-0000-4000-8000-000000000002' returning id
) select is((select count(*)::integer from changed), 0, 'Cross-user update changes no rows');
select throws_ok($$insert into public.profiles (id) values ('10000000-0000-4000-8000-000000000001')$$, '42501', null, 'Client cannot insert profiles');
select throws_ok($$delete from public.profiles$$, '42501', null, 'Client cannot delete profiles');
select throws_ok($$update public.profiles set id = '10000000-0000-4000-8000-000000000002'$$, '42501', null, 'Owner cannot transfer ownership');
select throws_ok($$update public.profiles set created_at = now()$$, '42501', null, 'Client cannot rewrite creation timestamp');
select throws_ok($$update public.profiles set time_zone = 'Invalid/Timezone'$$, '23514', null, 'Database validates timezones');

reset role;
set local role anon;
select throws_ok($$select * from public.profiles$$, '42501', null, 'Anonymous cannot read');
reset role;
select is((select display_name from public.profiles where id = '10000000-0000-4000-8000-000000000002'), null::text, 'Other profile remains unchanged');

select * from finish();
rollback;
