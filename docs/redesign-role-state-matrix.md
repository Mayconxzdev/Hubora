# Hubora — matriz de papéis e estados

| Capacidade | Visitante local | Conta e-mail | Conta Google | Serviço/admin |
|---|---|---|---|---|
| abrir pelo link | sim | sim | sim | n/a |
| navegar e pesquisar | sim | sim | sim | n/a |
| biblioteca/progresso | aparelho | conta + aparelho | conta + aparelho | não lê dados por padrão |
| sincronizar aparelhos | não | sim | sim | somente manutenção autorizada |
| exportar/importar | sim | sim | sim | não |
| Cofre | isolado por aparelho | conta + desbloqueio local | conta + desbloqueio local | conteúdo não exposto |
| notificações remotas | não | quando permitido | quando permitido | cria/verifica em backend |
| cadastrar provedor local | sim | sim | sim | não |
| provisionar E2E | não | não | não | `service_role` somente |
| ler outra conta | nunca | nunca | nunca | apenas operação administrativa explícita |

## Estados de sessão

| Estado | UI esperada | Persistência |
|---|---|---|
| primeira visita | produto utilizável + convite para sincronizar | local |
| visitante explícito | confirmação de dados neste aparelho | local |
| cadastro aguardando e-mail | instrução + e-mail + link de login | nenhuma sessão |
| autenticado | avatar, sync e perfil | Supabase + cache local |
| sessão restaurada | sem flash de usuário incorreto | Supabase persistente |
| sessão expirada | dados locais preservados, pedido de novo login | local até reautenticar |
| logout | sessão remota removida, estado de conta isolado | convidado/local separado |
| OAuth indisponível | mensagem honesta + alternativas | sem sessão falsa |

## Estados de dados obrigatórios

Cada superfície aplicável prevê: inicial, carregando, sucesso, vazio, parcial, desatualizado, offline, erro recuperável, erro bloqueante e sem autorização. `WARN` não encobre perda funcional.
