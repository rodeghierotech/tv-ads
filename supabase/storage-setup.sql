-- Executar no SQL Editor do Supabase após criar o projeto

-- Bucket público para mídias (leitura pública, escrita apenas via service role)
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

create policy "Leitura pública de mídia"
on storage.objects for select
using (bucket_id = 'media');
