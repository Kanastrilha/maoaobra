# Integração com Firebase real

## Destino e estado verificado

O responsável autorizou usar o projeto existente **maoaobra-51218**, inclusive substituindo a base anterior. O aplicativo web confirmado é `1:658075256499:web:f4ed19490baae47f1152c6`. O banco `(default)` já existe em `southamerica-east1`, a mesma região escolhida para as funções. O Hosting tem o endereço `https://maoaobra-51218.web.app`.

Em 01/11/2026, a conta foi autenticada na CLI e os recursos foram consultados. A API de cobrança retornou **billingEnabled: false**. O projeto permanece no plano Spark. **A implantação desta versão não foi realizada:** as funções exigem Blaze; Authentication e App Check ainda precisam de configuração e validação para esta integração. Nenhum dado foi apagado, nenhuma regra remota foi substituída e o Hosting atual não foi alterado nesta preparação.

O responsável optou por **manter o Spark por enquanto**. A preparação de nuvem fica versionada, sem executar deploy ou modificar cobrança. O backend segue disponível nos emuladores locais.

O código suporta três modos explícitos: `local`, `firebase-emulator` e `firebase`. A escolha do último exige o projeto e o aplicativo autorizados, configuração pública completa e uma chave reCAPTCHA Enterprise do App Check. Não existe fallback automático entre nuvem e emulador.

## Preparação que já está no código

- App Check obrigatório nas funções de nuvem, com validação do App ID permitido. O frontend usa reCAPTCHA Enterprise e atualiza o token automaticamente.
- CORS restrito às origens Firebase Hosting do projeto e ao GitHub Pages existente. Emuladores continuam restritos a loopback.
- O runtime exige `MAOAOBRA_DEPLOYMENT_MODE=cloud`, confirma o projeto e recusa variáveis de emuladores em configuração de nuvem.
- Ações administrativas exigem, além do papel e da claim, login realizado nos últimos dez minutos. MFA administrativo continua pendente.
- Acessos rápidos com contas e senhas fictícias ficam ocultos no modo de nuvem. O seed só aceita os emuladores.
- Hosting com HTTPS fornecido pelo Firebase, CSP, proteção contra inclusão em iframe, `nosniff`, política de referência, cache dos assets e atualização do HTML. O listener PWA foi movido para o bundle para não exigir script inline.
- Lockfile independente em `functions/` para a instalação remota reproduzível. Runtime de implantação Node.js 22; ferramentas locais Node.js 24.
- Duas instâncias máximas por função, zero instâncias mínimas, concorrência 10, memória de 256 MiB e timeout de 30 segundos. Esses limites não são um teto financeiro.
- Limpeza TTL prevista para recibos de idempotência e contadores temporários. Exclusões TTL podem gerar cobrança e não ocorrem imediatamente.
- O comando de deploy confirma o destino, rejeita variáveis de emulador, recompila com a configuração real e verifica os metadados da compilação antes de publicar o Hosting. Não usa os valores sintéticos do CI.

## Etapas necessárias antes da publicação

1. **Cobrança:** vincular uma conta de cobrança ao projeto para ativar Blaze, revisar os custos e configurar alertas. Essa decisão cabe ao responsável pela conta. O script não vincula cobrança nem faz upgrade automaticamente.
2. **Authentication:** habilitar login por e-mail/senha e a confirmação de e-mail, conferir os domínios autorizados e configurar as mensagens de confirmação e recuperação. A consulta inicial de configuração de Auth retornou 404; é preciso inicializar ou corrigir esse serviço antes de testar os fluxos reais. Habilitar proteção contra enumeração e revisar as cotas e a política de senha.
3. **App Check:** registrar o aplicativo web com uma chave reCAPTCHA Enterprise restrita aos domínios do site. Validar a geração de tokens, a configuração do provedor e o enforcement dos serviços suportados. As funções de nuvem recusam chamadas sem token válido do aplicativo permitido.
4. **Configuração local:** copiar `.env.firebase.example` para `.env.firebase.local`, preencher a API key pública do app e a site key pública do App Check. Criar `functions/.env.maoaobra-51218` com `MAOAOBRA_DEPLOYMENT_MODE=cloud`. Os dois arquivos locais ficam fora do Git. Credenciais privadas e tokens não pertencem a esses arquivos de frontend.
5. **IAM e operação:** conferir os papéis da identidade de execução e usar uma conta de serviço com acesso mínimo ao Firestore; configurar monitoramento, alertas, retenção e backup com teste de restauração. Evitar a função Editor genérica para a identidade do runtime. Definir MFA e provisionamento da primeira conta administrativa; contas de demonstração não devem ser migradas.
6. **Publicação coordenada:** implantar funções, regras, índices e Hosting juntos, testar App Check, cadastro, confirmação de e-mail, login e isolamento entre duas contas. A nova regra nega as coleções antigas: o frontend antigo do GitHub Pages não é compatível com ela. Atualizar ou redirecionar esse endereço quando a versão nova estiver validada.

O pedido de substituir o banco não exige apagar a base anterior antecipadamente. A implementação usa novas coleções e não migra os hashes ou perfis administrativos antigos. Exclusões ou limpeza de legado só devem ocorrer quando a versão nova estiver funcionando.

## Comandos

```powershell
npx firebase login --interactive
npm run check
npm run test:backend
npm run build:firebase
npm run deploy:firebase
```

Fechar a suíte local antes de `test:backend`, que usa as mesmas portas. Para testes durante desenvolvimento, `dev:backend` e `emulators` continuam funcionando sem acesso à nuvem.

O deploy usa explicitamente `--project maoaobra-51218` e o codebase `maoaobra-copia`. Não usa `--force`, não exclui automaticamente funções de outro codebase e não usa um destino implícito da CLI.

## Validação desta preparação

Passaram 24 testes de domínio/configuração e 16 testes de integração com Auth, Firestore, Storage e funções emulados. Lint e builds local e de nuvem também passaram. A compilação de nuvem foi validada com valores públicos **sintéticos**, sem chamadas ao Firebase real. Isso não verifica o login ou App Check de produção nem demonstra uma implantação concluída.

Os alertas moderados de dependências documentados em `BACKEND-EMULADORES.md` continuam pendentes. Uploads e exclusão de conta também permanecem bloqueados. A versão em nuvem é de testes; ainda não há afirmação de prontidão ou conformidade para dados pessoais reais.

## Fontes

- [Planos Firebase e acesso a Cloud Functions](https://firebase.google.com/docs/projects/billing/firebase-pricing-plans).
- [App Check com reCAPTCHA Enterprise](https://firebase.google.com/docs/app-check/web/recaptcha-enterprise-provider).
- [Configuração de ambiente das funções](https://firebase.google.com/docs/functions/config-env).
- [Publicação com Firebase Hosting](https://firebase.google.com/docs/hosting/quickstart).
