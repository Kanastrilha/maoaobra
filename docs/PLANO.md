# Plano — Mão a Obra v2

Registro das decisões de produto e arquitetura. Atualize quando uma decisão mudar.

## Decisões

| Tema                 | Decisão                                                                                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Objetivo             | Piloto real em **Cáceres/MT**                                                                                                                                      |
| Categorias do piloto | Diarista, eletricista, montador de móveis, capinador                                                                                                               |
| Backend              | API própria (Node + Fastify) + Postgres/PostGIS. Monólito modular, sem microsserviços                                                                              |
| Plataformas          | App Expo (iOS, Android e web a partir do mesmo código), admin como rotas protegidas                                                                                |
| Login                | Celular + código (OTP). Provedor de SMS/WhatsApp **a escolher**                                                                                                    |
| Monetização (piloto) | **Modelo B:** o cliente paga uma **taxa de serviço** no app ao confirmar o pedido; o serviço é pago direto ao profissional (dinheiro, Pix, depois do serviço)      |
| Taxa do gateway      | Repassada ao cliente conforme o meio de pagamento (Lei 13.455/2017), exibida como valor único por meio ("R$ X no Pix / R$ Y no cartão")                            |
| Percentual/valor     | **A definir.** Recomendação: taxa fixa por categoria (o app não conhece o valor final do serviço), promocional no piloto, com mínimo que cubra a tarifa do gateway |
| Depois do piloto     | "Pagamento protegido" opcional (split + custódia) e preço tabelado para categorias padronizáveis (diarista, frete)                                                 |

## Desintermediação (cliente e profissional "irem por fora")

Todas as alavancas aprovadas. Entram no lançamento:

- Contato (telefone/endereço completo) oculto até a confirmação; antes disso, só chat no app
- Aviso (não bloqueio) quando o chat detecta telefone, "zap" ou @
- Avaliações, nota e destaque na busca contam só pedidos feitos pelo app
- "Repetir serviço" com taxa menor para o mesmo profissional
- Reembolso automático da taxa se o profissional não comparecer
- Termos de uso proibindo o desvio
- Métricas de vazamento no admin: recompra do mesmo par cliente–profissional, cancelamentos após o chat, telefones detectados por categoria

Depois do piloto: verificação de antecedentes, agendamento recorrente, penalidade a reincidentes.

## Arquitetura

```
apps/api/src/
  modules/<domínio>/   rotas validam e autorizam; regra de negócio no service do módulo
  db/                  schema Drizzle + migrations versionadas
  lib/                 infraestrutura (sms, erros, guardas)
apps/app/src/app/      telas (Expo Router)
packages/shared/       contratos Zod, enums, máquina de estados do pedido
```

Regras:
- Módulo chama o service de outro módulo, nunca as tabelas dele.
- Dinheiro em centavos (`integer`); datas em `timestamptz`; status como enum no banco.
- Transição de status com `UPDATE ... WHERE status = <esperado>` e registro em tabela de eventos.
- Webhooks de pagamento idempotentes (id do evento único) e processados em fila (pg-boss).

Tetos conhecidos (marcados com `ponytail:` no código):
- Rate limit do login em memória: vale por instância → storage no banco ao escalar.
- Chat por polling (3 s com a conversa aberta) → WebSocket quando volume ou latência pedirem.
- Conversa devolvida inteira → paginar se pedidos passarem a ter centenas de mensagens.
- Sem permissão de localização, o app usa o centro de Cáceres → geocodificar CEP ao expandir.

## Pedido (modelo B)

```
requested ──pro aceita──► accepted ──cliente confirma──► confirmed ──pro conclui──► completed
    │ pro recusa → declined     │ qualquer lado → cancelled   │ qualquer lado → cancelled
    │ cliente → cancelled                                     │ cliente, a partir do dia → no_show
```

Regras em `packages/shared/src/order.ts` (fonte única; a API devolve ao app as ações possíveis).
Telefone e endereço só aparecem a partir de `confirmed`. Na fase 2, `confirmed` passa a exigir a taxa paga.

## Roteiro

| Fase                        | Entrega                                                                                                                         | Pronto quando                                                  |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **0. Fundação** ✅          | Monorepo, Postgres + migrations, login por celular, app Expo, CI                                                                | Login funciona no app contra a API; testes de integração no CI |
| **1. Marketplace** ✅       | Onboarding, cadastro do profissional + aprovação, categorias, busca por raio, pedido + chat + máquina de estados                | Pedido vai de solicitado a concluído entre dois aparelhos      |
| **1b. Complementos**        | Push (Expo), fotos de perfil/portfólio (storage S3/R2), edição de perfil do profissional, "repetir serviço"                     | Profissional é avisado de pedido novo com o app fechado        |
| **2. Taxa de serviço**      | Gateway (Pix + cartão), cobrança na confirmação, webhook idempotente, reembolso automático, liberação do contato após pagamento | Fluxo com dinheiro no sandbox, incluindo reembolso             |
| **3. Confiança e operação** | Avaliações, painel admin (aprovações, pedidos, métricas de vazamento), LGPD (termos, exportar/apagar dados)                     | Admin opera o piloto sem acessar o banco                       |
| **4. Piloto**               | Lojas, beta fechado em Cáceres com profissionais recrutados um a um                                                             | Primeiros pedidos reais pagos                                  |

## Pendências fora do código

- Escolher gateway (comparar tarifas de Pix e cartão; Asaas, Pagar.me, Mercado Pago)
- Escolher provedor de OTP (SMS ou WhatsApp) e estimar custo por login
- Definir valor da taxa por categoria (precisa do preço típico de cada serviço em Cáceres)
- Validação contábil/jurídica: nota fiscal da taxa, termos de uso, política de cancelamento
- Contas: hospedagem da API + Postgres gerenciado (staging), Sentry, Expo/EAS, lojas
