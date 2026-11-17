-- Jugement par l'API par lots (18/11/2026) : une ligne de coût par requête de lot, jamais deux.
-- Si l'étape qui récupère les résultats est rejouée, la deuxième écriture est refusée par cet index
-- (le client de lots l'ignore) : le coût réel n'est jamais compté deux fois.
create unique index if not exists cost_ledger_batch_request_key
  on public.cost_ledger ((metadata ->> 'batchId'), (metadata ->> 'customId'))
  where metadata ? 'batchId' and metadata ? 'customId';
