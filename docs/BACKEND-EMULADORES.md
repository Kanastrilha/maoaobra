# Backend Firebase emulado

Implementação isolada para testar o backend sem criar recursos de nuvem. O único projeto aceito é `demo-maoaobra-copia`. O código recusa configurações Firebase de nuvem, projetos diferentes e hosts de banco/autenticação fora dos emuladores previstos.

## Executar

Pré-requisitos: Node.js 24 para as ferramentas deste checkout e Java 21+. As funções declaram o runtime de implantação Node.js 22, atualmente suportado pelo Firebase. Neste computador, o emulador avisa que executa as funções com o Node.js 24 instalado. A compatibilidade com Node.js 22 deve ser validada antes da futura implantação.

Na raiz de `maoaobra-copia`:

```powershell
npm ci --ignore-scripts --no-audit --no-fund
npm run emulators
```

Em outro terminal:

```powershell
npm run seed:emulators
npm run dev:backend -- --port 5175
```

Abra [a cópia com backend](http://127.0.0.1:5175/maoaobra-copia/) e [o painel dos emuladores](http://127.0.0.1:14000/).

O seed adiciona contas e serviços fictícios ausentes; não limpa coleções nem sobrescreve os cadastros existentes. Sua senha é **TesteLocal@123**, apenas para desenvolvimento:

| Perfil | E-mail |
| --- | --- |
| Cliente | pedro@example.test |
| Profissional | eduardo@example.test |
| Administrador | legalmano@example.test |

As contas do seed já estão verificadas. Cadastros novos precisam confirmar o e-mail pelo link exibido no terminal do emulador. Recuperação de senha também gera um link local, sem enviar e-mail real. Na tela de login, informe o e-mail para recuperar a senha ou o e-mail e a senha para reenviar a confirmação. Profissionais novos ficam pendentes e precisam de aprovação do administrador.

O Auth Emulator usa tokens de desenvolvimento: não deve ser exposto à internet nem utilizado como serviço de produção. Não use dados reais. Os dados são efêmeros e desaparecem ao encerrar os emuladores. O modo IndexedDB anterior continua disponível com `npm run dev` e usa uma base independente.

## Portas e serviços

| Serviço | Endereço |
| --- | --- |
| Auth | 127.0.0.1:19099 |
| Firestore | 127.0.0.1:18080 |
| Functions | 127.0.0.1:15001 |
| Storage | 127.0.0.1:19199 |
| Painel | 127.0.0.1:14000 |
| Hub / logs | 127.0.0.1:14400 / 14500 |

Não altere só uma porta: `firebase.json` e `functions/src/config.js` precisam concordar. Todos os serviços usam loopback. O script escolhe o Java 21 instalado neste computador sem mudar as configurações globais do Windows. Downloads dos emuladores ficam em `.emulator-cache`, ignorado pelo Git.

## Como a proteção funciona

- O Auth Emulator autentica as credenciais. O frontend não recebe ou calcula hashes de senha para o banco do backend.
- `executeCommand` recebe comandos com esquema estrito, identidade do token validado, validação de e-mail confirmado e situação atual da conta. Autor e horário das mensagens são determinados pelo servidor.
- O cadastro não aceita administrador, aprovação ou status vindos do navegador. O administrador precisa da claim `admin` e do papel atual `ADMIN` em `accounts`. Retirar o papel no banco revoga os poderes, mesmo com token ainda existente.
- `accounts` contém papel, nome e status; `privateProfiles` contém os dados privados. Somente `publicProfiles` inclui os campos permitidos do profissional aprovado. CPF, endereço completo, telefone privado e e-mail ficam fora da publicação.
- Toda escrita direta pelo SDK cliente é negada nas regras. As funções, que usam Admin SDK, também verificam suas próprias permissões. Regras não protegem automaticamente o Admin SDK.
- Pedidos e mensagens são acessíveis somente aos participantes. O administrador não recebe conversas de pedidos de terceiros. Chamados de suporte ficam disponíveis ao titular e à administração autorizada.
- Mensagens ficam em documentos separados. Transações preservam envios concorrentes. Chaves de idempotência vinculadas ao usuário impedem repetição de operações; outra carga com a mesma chave é recusada.
- Valores monetários são armazenados em centavos. Avaliações exigem pedido concluído e são únicas por pedido e autor. A projeção pública não inclui o ID do cliente, do pedido nem a lista de participantes.
- Existe limite compartilhado de 60 chamadas de mutação e 120 snapshots por minuto por usuário. Isso não é uma proteção completa contra criação de contas em massa nem limita leituras públicas anônimas.
- A trilha de auditoria registra ação, autor, recurso e horário. Não guarda o payload, texto de chat, senha, CPF ou e-mail.
- A sincronização do frontend observa pequenos documentos de revisão. Ela não faz polling periódico para baixar toda a base.

`firebase.json` carrega as regras de `backend/firestore.rules` e `backend/storage.rules`. Os arquivos de regras na raiz continuam negando todo acesso e não são a configuração desta integração. Nenhuma regra foi publicada no projeto original.

## Testar

Feche a suíte de desenvolvimento antes de rodar os testes, pois usam as mesmas portas. O comando de testes inicia uma base efêmera, executa a suíte e encerra os emuladores:

```powershell
npm run check
npm run test:backend
npm run build -- --mode emulator
npm run audit:security
```

Os testes do backend cobrem Auth, confirmação de e-mail, redefinição de senha, acesso privado, escrita direta negada, promoção indevida, revogação de papel, restrição a participantes, idempotência, concorrência, valores, avaliações, chamados, limites e operações ainda bloqueadas. O CI executa esses testes com Java 21, sem credenciais de nuvem ou implantação.

O SDK Firebase 13.1.0 fixa gRPC em uma faixa antiga. O `overrides` do root substitui somente `@firebase/firestore > @grpc/grpc-js` por **1.14.7**, da mesma versão principal, para corrigir os avisos altos. Essa substituição precisa continuar coberta pelos testes dos emuladores e deve ser removida quando o SDK adotar a correção. Não se deve aceitar o downgrade automático sugerido pelo audit para Firebase 9.

Na verificação de 01/11/2026, os 20 testes de domínio e os 16 testes de integração passaram, assim como lint e builds dos dois modos. A auditoria retornou zero alertas altos ou críticos e **21 pacotes com alertas moderados**, dos quais **seis aparecem também ao omitir dependências de desenvolvimento**, em cadeias transitivas do Google Cloud (`gaxios`, `gcp-metadata`, `glob`, `google-gax`, `minimatch` e `rimraf`). `npm audit fix` sem `--force` não conseguiu resolver esses casos nas faixas atuais. Não são alertas apenas do ESLint e não foram ocultados com exceções. Acompanhar as correções upstream antes de habilitar a nuvem.

O navegador também foi verificado com o site conectado aos emuladores: carregamento dos profissionais, login pelo Auth e criação de uma solicitação fictícia, exibida em Atendimentos em Andamento. Não houve erro de console nesse fluxo. As contas e o pedido usados nessa verificação pertencem apenas à base efêmera de demonstração.

## Limitações explícitas desta etapa

1. **Nuvem desabilitada.** Não foram criados Firebase de homologação, cobrança, domínio, IAM, backup ou monitoramento. O backend se recusa a executar em configuração de produção. App Check é dispensado somente pelo runtime do emulador; a futura conexão em nuvem precisa de provedor e enforcement próprios.
2. **Uploads fechados.** O Storage nega leitura e escrita. Envio de imagens no backend aguarda validação de conteúdo, normalização, privacidade e processamento seguro. A interface avisa em vez de fingir que salvou.
3. **Exclusão remota fechada.** Aguarda política de retenção e rotina recuperável que coordene Auth, documentos e arquivos. Rejeitar um profissional marca `REJECTED`; não apaga silenciosamente o cadastro.
4. **Leituras limitadas.** O snapshot retorna até 100 perfis públicos, 200 serviços, 200 avaliações públicas, 50 pedidos e 100 mensagens por conversa. O limite é informado na resposta e há indicador `messagesHaveMore` em pedidos. A interface de paginação e o cálculo de métricas para bases maiores ainda precisam ser implementados.
5. **Operação de produção pendente.** É necessário configurar limpeza por TTL de `rateLimits` e `receipts`, retenção de auditoria, MFA administrativo, proteção contra enumeração/abuso no Auth, orçamento, alarmes e restauração de backup. O tempo de inatividade da interface não substitui uma política de sessão do servidor.

A primeira versão em nuvem deve usar um projeto separado, testes executados também no runtime escolhido e dados de homologação. Não basta trocar o project ID nesta implementação.
