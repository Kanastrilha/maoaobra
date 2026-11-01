# Segurança e infraestrutura do mãoAobra

Revisão da cópia em 01/11/2026. Este documento descreve o estado observado e o plano de implementação. As partes de nuvem abaixo ainda não foram configuradas nem implantadas.

## Estado atual

A cópia agora tem dois modos. O anterior usa IndexedDB e sessões no navegador; essas verificações **não são uma fronteira de segurança para usuários reais**. O novo modo usa Auth, Firestore, funções e regras nos emuladores. A implementação e a execução estão descritas em [BACKEND-EMULADORES.md](BACKEND-EMULADORES.md). A nuvem continua desabilitada e os emuladores só aceitam dados fictícios.

Os arquivos de regras lidos na pasta original permitem leitura pública de cadastros, pedidos e chamados, além de alterações sem identidade autenticada. Isso é um risco crítico **caso essas regras correspondam às publicadas**. O estado publicado no console Firebase não foi consultado. Não houve acesso aos registros remotos nem alteração no original.

A cópia mantém regras de bloqueio na raiz e regras específicas para os emuladores em `backend/`, selecionadas pelo `firebase.json`. Nenhuma regra foi publicada. Publicar as regras de bloqueio no projeto original interromperia seu funcionamento; esta implementação não é uma migração do sistema existente.

## Proteções implementadas nesta etapa

- Removidos os pacotes sem uso `react-router-dom` e `gh-pages`. Firebase foi reintroduzido com uma integração explícita e isolada nos emuladores.
- Dependências atualizadas dentro das faixas declaradas, sem `--force`. O lockfile registra as versões instaladas.
- Variáveis `VITE_` fora de `VITE_DATA_MODE` são recusadas antes da compilação e em tempo de execução. As mensagens de erro não incluem valores. Essa lista terá de ser revisada explicitamente ao implementar o backend remoto.
- Dev server e preview usam loopback por padrão. São ferramentas de desenvolvimento.
- Node.js 24 definido em `.nvmrc` e `engines`.
- CI preparado com instalação pelo lockfile, scripts de dependências desativados, lint, testes de domínio, testes nos emuladores, builds e auditoria. Actions fixadas por commit e token com leitura apenas; sem publicação ou credenciais de nuvem.
- Dependabot preparado para propor atualizações de npm e Actions. Não há merge automático.
- Arquivos comuns de contas de serviço, chaves privadas e exportações incluídos no `.gitignore`. Isso evita inclusões acidentais; não substitui análise de segredos nem remove arquivos já versionados.

O CI e o Dependabot só serão ativados quando esta cópia for a raiz de um repositório no GitHub. Nada foi enviado ao GitHub nesta etapa. A auditoria bloqueia severidades alta e crítica; alertas moderados continuam visíveis.

## Arquitetura recomendada

Preservar o frontend e usar **Firebase Auth + Firestore + Cloud Storage + Cloud Functions** em um projeto novo de homologação. O projeto original continua separado. Essa escolha aproveita a stack original e os fluxos existentes; depende de validação de região, custos e requisitos de operação antes da criação dos recursos.

O navegador autentica pelo Firebase Auth. As regras do Firestore autorizam leituras específicas. Operações de negócio passam por funções que validam identidade, estado da conta, permissão e dados de entrada. O Admin SDK dessas funções ignora as Security Rules: cada função precisa de autorização própria, e sua conta de serviço precisa de IAM mínimo.

As funções devem obter a identidade do token validado, nunca de `user_id`, `role`, `status` ou campos equivalentes enviados no corpo da requisição. Para operações administrativas, conferir também o estado atual da conta e a permissão administrativa controlada pelo servidor. Cadastro público nunca cria administrador.

### Prioridade 0 — identidade e isolamento dos dados

1. Criar ambiente de homologação independente e emuladores locais. Produção terá outro projeto e controle de acesso próprio. Nenhuma conta fictícia será migrada.
2. Implementar Auth real, recuperação de senha, verificação de e-mail e reautenticação para exclusão ou troca de credenciais. Exigir verificação de e-mail antes de operações com potencial de abuso. Configurar proteção contra enumeração e autenticação reforçada para administradores, conforme os recursos habilitados no serviço.
3. Separar fisicamente documentos públicos e privados. Firestore não oculta campos individuais de um documento em uma leitura autorizada. CPF, endereço completo, e-mail privado e dados internos não podem ficar em documentos públicos. Rever a necessidade de coletar CPF e endereço completo já no cadastro.
4. Implementar regras com acesso negado por padrão e testes no Emulator Suite. Validar também a propriedade dos arquivos do Storage.

Critério de conclusão: requisições diretas, fora da interface, não leem dados privados sem autenticação, não permitem a um cliente ler pedidos de outro, nem elevam um usuário a administrador. Essas tentativas precisam estar cobertas por testes dos serviços remotos, ainda ausentes.

### Modelo de dados e permissões proposto

Os nomes abaixo são uma proposta para a nova integração, não coleções já criadas.

| Recurso | Leitura | Escrita |
| --- | --- | --- |
| `publicProfiles/{uid}` e serviços publicados | Público, somente perfis aprovados e campos destinados à divulgação | Função valida o dono e os campos permitidos; aprovação pelo administrador |
| `privateProfiles/{uid}` | Titular; suporte autorizado somente quando necessário | Função valida titular, campos e formatos |
| `accounts/{uid}` com perfil e aprovação | Titular e administração autorizada | Funções de cadastro e administração; sem edição livre de papel ou status |
| `orders/{id}` | Cliente e profissional participantes | Funções verificam participantes e transições de estado |
| `orders/{id}/messages/{messageId}` | Participantes do pedido | Função atribui autor e horário; escrita idempotente |
| `supportTickets/{id}` e mensagens | Titular e equipe autorizada | Funções conferem dono, permissão e estado do chamado |
| `reviews/{orderId_authorId}` | Versão pública com campos limitados | Função exige pedido concluído, participante e unicidade |
| Arquivos de perfil e portfólio | Público somente após validação e publicação | Dono envia para área temporária; processamento publica versão segura |
| Anexos de chat | Somente participantes | Upload autorizado para o pedido; acesso sem URLs públicas permanentes |
| Trilha de auditoria | Administração restrita | Somente servidor; sem alteração pelo cliente |

### Prioridade 1 — regras de negócio e proteção contra abuso

- Validar esquema, tipos, tamanhos máximos, campos aceitos e valores em cada operação. Validar o token não significa validar o conteúdo.
- Usar transações para criar pedidos, aceitar orçamentos, concluir serviços e registrar avaliações. Valores monetários devem usar centavos inteiros no modelo remoto.
- Implementar chaves de idempotência vinculadas ao autor e à operação. Repetir uma requisição não pode criar dois pedidos ou duas avaliações; reutilizar a chave com conteúdo diferente deve ser recusado.
- Salvar mensagens em documentos próprios, com paginação e ordenação por horário do servidor. Não regravar todo o histórico em um array.
- Limitar requisições por usuário e por operação, além de tamanho de entrada. Usar App Check como camada adicional e aplicar limites compartilhados no servidor. Memória de uma instância não é suficiente para limitar um serviço que escala.
- Validar imagens no backend por conteúdo, tamanho e dimensões. Gerar uma imagem normalizada, remover metadados desnecessários e separar anexos privados de fotos públicas. `accept="image/*"` e o MIME enviado pelo navegador não bastam.
- Registrar aprovações, exclusões e mudanças de permissão com autor, recurso, resultado, horário do servidor e identificador de requisição. Não registrar senhas, tokens, CPF ou o conteúdo de conversas.

Critério de conclusão: duas requisições simultâneas preservam os dados, repetição não duplica operações e requisições inválidas são recusadas no serviço mesmo que a interface seja modificada.

### Prioridade 2 — operação e recuperação

- Escolher região do banco e das funções considerando localização dos usuários, disponibilidade dos serviços, latência e custos. Manter a configuração versionada.
- Configurar funções com limites de instâncias, concorrência, timeout e memória adequados ao tráfego esperado. Medir antes de aumentar.
- Configurar alertas de falhas, latência, volume anormal e gastos. Alertas de orçamento não são um teto que bloqueia automaticamente a cobrança.
- Definir backup do Firestore e estratégia para Auth e arquivos. Testar restauração em ambiente separado. Definir com o responsável quanto dado pode ser perdido e quanto tempo o serviço pode ficar indisponível.
- Guardar segredos das funções em Secret Manager; usar identidades de serviço com privilégio mínimo. No CI, preferir credenciais temporárias por identidade federada. Nunca colocar uma chave de conta de serviço no frontend ou no repositório.
- Definir domínio, HTTPS, headers de segurança, cache de assets e uma política CSP compatível com as fontes, ícones e imagens externas hoje usados. Validar primeiro em homologação.
- Preparar deploy por ambiente, aprovação de produção, rollback e migrações compatíveis. Testes obrigatórios precisam ser exigidos na proteção da branch no GitHub; o workflow sozinho não impede merges.

Critério de conclusão: restauração ensaiada, alarmes verificados, rollback documentado e implantação de homologação incapaz de atingir o projeto original.

### Prioridade 3 — ciclo de vida dos dados

Definir quais dados são necessários, quem acessa, por quanto tempo ficam guardados e como são exportados ou excluídos. A exclusão de conta deve coordenar Auth, documentos e arquivos com retries e registro do resultado. Evitar apagar silenciosamente o histórico necessário ao outro participante: definir anonimização, retenção e acesso antes de implementar a rotina remota.

Essa política ainda precisa de decisões do responsável pelo produto. Não há afirmação de conformidade legal nesta revisão.

## Verificação local e pendências conhecidas

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run check
npm run audit:security
npm audit --omit=dev
```

Após a atualização, a consulta npm retornou **zero alertas altos ou críticos** e **seis moderados** na árvore de desenvolvimento do ESLint, associados a `minimatch` e seus dependentes. O npm não ofereceu uma correção compatível para toda essa cadeia. Ela não foi ocultada com exceções, overrides de versão principal ou `--force`. Acompanhar a correção upstream e reavaliar as versões; a contagem pode mudar com novos avisos.

Auditoria de dependências não testa autorização e não demonstra ausência de vulnerabilidades na aplicação. Auth, modelo de dados separado, funções e testes de acesso já estão implementados nos emuladores. Continuam pendentes infraestrutura de homologação, operação em nuvem, upload seguro, exclusão recuperável, paginação completa, monitoramento, backup e implantação. O relatório acima de seis alertas refere-se à etapa anterior à adição dos SDKs do backend; consultar `npm audit` para o estado atual.

## Referências técnicas

- [Checklist de segurança do Firebase](https://firebase.google.com/support/guides/security-checklist): ambientes separados, regras, testes, IAM e proteção contra abuso.
- [Controle de campos no Firestore](https://firebase.google.com/docs/firestore/security/rules-fields): leituras são feitas por documento; separar os dados privados.
- [Funções callable](https://firebase.google.com/docs/functions/callable): transporte e validação de tokens; autorização de negócio continua na função.
- [Controle de gastos](https://firebase.google.com/docs/projects/billing/avoid-surprise-bills): monitorar consumo e configurar alertas.
- [Backup e restauração do Firestore](https://firebase.google.com/docs/firestore/backups): recursos para planejar a recuperação.
