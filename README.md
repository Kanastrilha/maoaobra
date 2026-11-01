# mãoAobra — cópia local

Esta pasta é a versão de trabalho independente. O projeto original continua na Área de Trabalho, em `maosobra`.

O código já foi enviado à branch `codex/backend-seguranca` do GitHub. A preparação para o Firebase real está em [docs/FIREBASE-REAL.md](docs/FIREBASE-REAL.md). O destino autorizado é `maoaobra-51218`; a implantação ainda depende de habilitar Blaze e configurar Auth/App Check. As instruções a seguir descrevem os modos de teste locais.

## Executar

Use Node.js 24, conforme `.nvmrc` e `engines` no `package.json`.

```powershell
cd "C:\Users\Kanas\OneDrive\Documentos\ChatGPT\vamos ver\maoaobra-copia"
npm ci --ignore-scripts
npm run dev
```

Se as dependências já estiverem instaladas, basta `npm run dev`. Abra o endereço `/maoaobra-copia/` exibido pelo Vite.

```powershell
npm test
npm run lint
npm run build
npm run preview
npm run check
npm run audit:security
```

## Como os dados funcionam

- Há três modos explícitos: **local**, com IndexedDB; **firebase-emulator**, com serviços neste computador; e **firebase**, para o projeto real autorizado mediante configuração completa. Os dados de demonstração são independentes da nuvem.
- Para testar o backend, siga [docs/BACKEND-EMULADORES.md](docs/BACKEND-EMULADORES.md): `npm run emulators`, `npm run seed:emulators` e `npm run dev:backend`. As instruções e contas abaixo nesta seção referem-se ao modo IndexedDB.
- Não há conexão com o Firebase original, envio de endereço para geocodificação ou preenchimento automático com GPS.
- Variáveis `VITE_FIREBASE_*`, outro `VITE_DATA_MODE` ou variáveis `VITE_` fora da lista permitida impedem também a compilação. Variáveis `VITE_` são públicas e não devem conter segredos.
- O ViaCEP preenche o endereço a partir do CEP digitado. Fontes, ícones e fotos de exemplo continuam usando serviços externos.
- Não use dados pessoais reais. Esta demonstração não constitui um ambiente de produção: quem controla o navegador também controla a base local.
- Os dados persistem ao recarregar e são compartilhados entre abas da **mesma origem** (mesmo navegador, host e porta). Outros navegadores e computadores têm bases diferentes.
- O chat e os cadastros são gravados em transações, sempre sobre a versão mais recente do registro. Falhas de gravação são exibidas na interface.
- A exclusão de conta remove os registros associados e as credenciais locais. Uma coleção vazia não é repovoada automaticamente.

## Contas fictícias

As três opções de acesso rápido ficam na tela de login. A senha de demonstração é `123`.

| Perfil | E-mail fictício |
| --- | --- |
| Cliente | pedro@example.test |
| Profissional | eduardo@example.test |
| Administrador local | legalmano@example.test |

Novas contas exigem senha de pelo menos 8 caracteres e usam PBKDF2/SHA-256 com 600.000 iterações e salt aleatório. Nenhuma senha ou hash é incluído nos dados enviados aos componentes da interface.

Os cadastros profissionais ficam pendentes até aprovação pelo administrador da demonstração. A verificação de CPF confere somente os dígitos; não consulta a Receita Federal. As notas aparecem somente após avaliações de pedidos concluídos, com uma avaliação por pedido e autor.

O expediente considera os dias de trabalho, o fuso `America/Cuiaba` e horários que atravessam a meia-noite. Pedidos podem ser enviados fora do expediente para resposta posterior. O botão de WhatsApp é simulado.

## Antes de conectar um serviço público

O backend já implementa Auth, autorização de operações e separação dos dados públicos e privados nos emuladores. O modo de nuvem está preparado, mas ainda não foi implantado. É necessário completar os itens de cobrança, configuração e operação descritos em `docs/FIREBASE-REAL.md`. As contas fictícias não devem ser migradas para produção.

Os arquivos `firestore.rules` e `storage.rules` bloqueiam todo acesso remoto por precaução. **Não publique essas regras no projeto original**, pois bloqueariam seu funcionamento. Nenhuma regra foi implantada.

O `firebase.json` dos emuladores usa as regras em `backend/`, que autorizam leituras específicas e negam toda escrita direta do cliente. Uploads e exclusão de conta permanecem bloqueados no backend nesta etapa.

O script que publicava no GitHub Pages original foi removido. A compilação `dist/` pode ser inspecionada localmente com `npm run preview`; esta pasta não está publicada.

## Verificação

Os testes em `tests/domain.test.js` cobrem isolamento de configuração, sessões, permissões, cadastros, pedidos, mensagens, avaliações, exclusão e horários. O fluxo cliente → pedido fora do expediente → chat em duas abas → conclusão com avaliação também foi verificado no navegador.

`npm run test:backend` inicia os emuladores e executa `tests/backend/security.test.js`, que testa os serviços por requisições diretas, incluindo tentativas de acesso indevido, Auth, confirmação de e-mail, recuperação de senha, concorrência e idempotência.

## Segurança e infraestrutura

O plano de backend, os riscos observados, as permissões propostas e os critérios para produção estão em [docs/SEGURANCA-E-INFRAESTRUTURA.md](docs/SEGURANCA-E-INFRAESTRUTURA.md).

O CI em `.github/workflows/ci.yml` executa instalação pelo lockfile, lint, testes de domínio e dos emuladores, builds dos dois modos e auditoria sem publicar nada. O Dependabot propõe atualizações semanais. Ambos estão apenas preparados localmente: para ativá-los, esta pasta deve ser a raiz de um repositório no GitHub. Nenhum envio ao GitHub foi feito.

`npm run audit:security` falha para alertas altos e críticos e continua exibindo os moderados. A integração tem uma correção transitiva gRPC documentada em `docs/BACKEND-EMULADORES.md`. Consulte o resultado atual da auditoria ao atualizar dependências.
