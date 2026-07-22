# Manual de Processos e Atendimento — Kassiele Advocacia

**Versão 1 · Julho de 2026**
Escopo: funis de BPC-LOAS e Auxílio por Incapacidade (INSS).
Fora de escopo nesta versão: trabalhista, acidentário, aposentadoria por tempo,
pensão por morte e revisões — esses casos são escalados para atendimento humano.

---

## 1. Como o atendimento funciona agora

O escritório não agenda mais consultas prévias. O lead entra pelo WhatsApp,
a IA (Sofia) faz a triagem, classifica em um dos dois funis, reúne os
documentos e entrega o caso pronto para a Dra. Kassiele analisar.

```
WhatsApp  ──>  Sofia (triagem + coleta)  ──>  Dra. Kassiele (análise)
                        │                              │
                        ├── follow-up automático        └── protocolo (equipe)
                        └── escalonamento humano
```

**O que mudou na prática:** antes o funil dependia de alguém lembrar de cobrar
documento. Agora cada lead tem uma data de próxima ação no sistema, e quem
passa do prazo aparece em vermelho no painel. Nenhum lead fica invisível.

---

## 2. A pergunta que separa os dois funis

Uma única pergunta define todo o resto do atendimento:

> "O senhor já trabalhou de carteira assinada, ou paga o INSS por conta
> própria, como MEI ou autônomo?"

| Resposta | Funil | Por quê |
|---|---|---|
| Sim | **Auxílio por Incapacidade** | Tem vínculo com o INSS, o benefício é previdenciário |
| Não | **BPC-LOAS** | Sem contribuição, o caminho é o benefício assistencial |
| Não sei / confuso | **Escalar humano** | Chutar o funil gera checklist errado e retrabalho |

O "não sei" é escalado de propósito. Uma classificação errada faz a IA pedir
CadÚnico de quem é contribuinte, ou CNIS de quem nunca trabalhou registrado —
o cliente percebe a incoerência e a confiança cai.

---

## 3. Esteira BPC-LOAS

| # | Etapa | O que acontece | Prazo | Quem |
|---|---|---|---|---|
| 1 | Triagem | Confirma não-contribuição; identifica se é idoso (65+) ou PcD | 1 dia | IA |
| 2 | Análise de renda | Pessoas na casa e renda total do domicílio | 2 dias | IA |
| 3 | CadÚnico | Verifica se tem e se está atualizado (24 meses) | 3 dias | IA |
| 4 | Laudo médico | Coleta documento do médico | 3 dias | IA |
| 5 | Proposta | Honorários de 30% + prova de legitimidade | 2 dias | IA |
| 6 | Documentação | RG, CPF, comprovante de residência | 3 dias | IA |
| 7 | Assinatura | Procuração e contrato via D4Sign | 3 dias | IA |
| 8 | Protocolo INSS | Requerimento no Meu INSS | 2 dias | **Equipe** |
| 9 | Perícia / Avaliação | Perícia médica e avaliação social | 7 dias | **Equipe** |
| 10 | Acompanhamento | Atualização periódica até a decisão | 14 dias | IA |

**Por que a renda vem na etapa 2:** é o filtro que mais desqualifica no BPC.
Renda per capita acima do limite elimina o direito. Descobrir isso antes de
gastar três dias coletando documento economiza o esforço do escritório e não
cria expectativa em quem não vai ser atendido.

**Como perguntar renda sem soar invasivo:** enquadre como verificação de
enquadramento, nunca como fiscalização. "Pra eu já ver se a senhora se encaixa
nas regras: quantas pessoas moram na casa e quanto entra por mês no total?"

---

## 4. Esteira Auxílio por Incapacidade

| # | Etapa | O que acontece | Prazo | Quem |
|---|---|---|---|---|
| 1 | Triagem | Confirma contribuição (CLT, MEI ou autônomo) | 1 dia | IA |
| 2 | Vínculo e carência | Última contribuição e qualidade de segurado | 2 dias | IA |
| 3 | Laudo médico | Documento central deste funil | 3 dias | IA |
| 4 | Proposta | Honorários de 30% + legitimidade | 2 dias | IA |
| 5 | Documentação | RG, CPF, residência, CNIS/carteira | 3 dias | IA |
| 6 | Assinatura | Procuração e contrato via D4Sign | 3 dias | IA |
| 7 | Protocolo INSS | Requerimento no Meu INSS | 2 dias | **Equipe** |
| 8 | Perícia médica | Data determinada pelo INSS | 7 dias | **Equipe** |
| 9 | Acompanhamento | Atualização periódica | 14 dias | IA |

Funil mais curto que o BPC — sem CadÚnico e sem análise de renda. Converte mais
rápido, por isso vale priorizar na fila da equipe quando houver escolha.

---

## 5. Regra de ouro dos documentos

**Sempre aceitar o laudo, mesmo desatualizado.** A IA nunca diz "esse não
serve" ou "precisa ser mais recente".

Resposta padrão: *"Pode mandar mesmo assim que a Dra. Kassiele analisa aqui.
Se precisar de um mais novo, a gente te avisa."*

O motivo é comercial, não jurídico: quem já enviou um documento se comprometeu
com o escritório e não procura concorrente. Recusar o documento na primeira
mensagem é a forma mais rápida de perder o lead.

### Documentos por funil

**BPC-LOAS** — laudo médico, CadÚnico, RG, CPF, comprovante de residência.
Opcional: comprovante de renda da família.

**Auxílio por Incapacidade** — laudo médico, RG, CPF, comprovante de
residência, CNIS ou carteira de trabalho. Opcional: guias de MEI/GPS.

O checklist é montado automaticamente pelo banco quando o funil é definido.
Nenhum lead existe sem checklist.

---

## 6. Cadência de follow-up

Rodada diariamente pelo n8n sobre o campo `proxima_acao_em`.

| Tentativa | Quando | Canal | Conteúdo |
|---|---|---|---|
| 1 | D+1 | Texto | Lembrete leve, citando o documento que falta pelo nome |
| 2 | D+3 | Áudio | Dra. explicando **por que** aquele documento trava o pedido |
| 3 | D+7 | Texto | Reforço de legitimidade (OAB, Instagram) |
| 4 | D+15 | Texto | Última chamada → **escala para humano** |

**Cadência especial da etapa de assinatura:** D+1 e D+2, depois escala. Quem
chegou até a assinatura já está convencido — a demora costuma ser dificuldade
técnica com o link, não falta de interesse. Insistir por 15 dias aqui é perder
um cliente que já era seu.

**Por que a tentativa 4 escala em vez de descartar:** um lead que já enviou
laudo tem valor alto demais para ser encerrado por um bot. A decisão de
desistir é da Dra. Kassiele.

**O follow-up é sempre específico.** "Falta só o CadÚnico e a gente já
protocola" converte muito mais que "oi, tudo bem?". É por isso que o checklist
é uma tabela e não um campo de texto: o sistema sabe o nome exato do que falta.

---

## 7. Matriz de escalonamento

A IA para de responder e chama a Dra. Kassiele quando:

| Situação | Por quê |
|---|---|
| Cliente pede para falar com advogado | Pedido explícito, sempre atendido |
| Caso fora dos dois funis | Trabalhista, acidentário, pensão, revisão — fora do escopo V1 |
| Benefício já negado / recurso / outro advogado | Exige análise jurídica, não triagem |
| Pergunta valor, prazo ou chance de ganhar | Risco de promessa falsa (OAB) |
| Desconfiança persiste após prova de OAB | Só a Dra. reverte |
| Sinal de sofrimento grave ou desespero | Acolher, sair do roteiro comercial, escalar na hora |
| Muitas mensagens sem avançar de etapa | Configurável; padrão 6 |

Ao escalar, a IA avisa: *"Vou pedir para a Dra. Kassiele te responder
pessoalmente, tá? Ela retorna assim que possível."* Nunca deixa a pessoa no
vácuo sem explicação.

---

## 8. O que a IA nunca pode fazer

Estas regras não têm exceção. Estão no prompt e devem ser conferidas em
qualquer alteração de texto:

- Garantir aprovação do benefício
- Estimar valor a receber ou valor de atrasados
- Prometer prazo de resposta do INSS
- Dar diagnóstico médico ou opinar se a doença "dá direito"
- Comentar caso de outro cliente
- Pedir senha do gov.br, do Meu INSS, dados de cartão ou PIX

O escritório não cobra nada antecipado. Se o cliente oferecer pagamento, a IA
recusa — é exatamente esse o comportamento que diferencia o escritório dos
golpistas.

---

## 9. Como responder à desconfiança de golpe

A desconfiança é legítima: existem muitos falsos advogados agindo com esse
público. A IA nunca soa ofendida nem insiste. Responde com prova:

1. Número da OAB da Dra. Kassiele
2. Convite para conferir em `cna.oab.org.br`
3. Instagram do escritório e endereço físico
4. Reforço de que nada é cobrado adiantado

Se a desconfiança continuar, escala. Confiança em direito previdenciário se
constrói com pessoa, não com script.

---

## 10. Honorários — como é comunicado

30% ao final, apenas em caso de êxito. Nada cobrado antes: sem taxa, sem
consulta, sem custo de abertura.

A IA fala disso **espontaneamente**, assim que o lead se qualifica, antes que
ele pergunte. Antecipar reduz objeção — foi a estratégia que a Dra. Kassiele já
usava manualmente e que passou para o roteiro.

Quando o envio de áudios está ativo, o áudio gravado pela própria Dra.
substitui o texto. A voz dela transmite confiança que o texto não transmite.

---

## 11. Divisão de trabalho: IA e equipe

**A IA faz:** triagem, classificação, coleta de documentos, follow-up,
explicação de honorários, prova de legitimidade, lembretes de perícia,
atualização de status ao cliente.

**A equipe humana faz:** análise jurídica do caso, download dos documentos para
as pastas locais, protocolo no Meu INSS, cumprimento de exigências, registro
das datas de perícia no painel, acompanhamento processual, decisão sobre
encerrar um lead.

**Ponto de atenção:** a data da perícia e a exigência do INSS chegam pelos
canais do INSS, não pelo WhatsApp. Alguém da equipe precisa registrá-las em
**Prazos & Perícias**, senão o lembrete automático não existe. Este é o único
elo manual crítico do fluxo.

---

## 12. Rotina diária sugerida

**Manhã (10 minutos, equipe)**
1. Abrir **Indicadores**. Olhar "Parados além do prazo" e "Prazos vencidos".
2. Se houver prazo vencido sem baixa, resolver antes de qualquer outra coisa.
3. Abrir os leads parados listados e decidir: retomar, escalar ou encerrar.

**Ao longo do dia**
4. Registrar em Prazos & Perícias qualquer data nova recebida do INSS.
5. Atender as conversas marcadas como "humano" no Chat.

**Semanal (Dra. Kassiele)**
6. Olhar o insight de gargalo nos Indicadores — em qual etapa o funil trava.
7. Se a mesma etapa aparece toda semana, o problema é o texto da IA ou o
   documento pedido ali, não o cliente.

---

## 13. Pendências antes do go-live

- [ ] Gravar os três áudios da Dra. e preencher `url_audio` nos modelos
      `honorarios_audio`, `anti_golpe_audio` e `followup_d3_porque`
- [ ] Preencher OAB, endereço e Instagram reais no seed 02
- [ ] Rodar a sincronização de embeddings no n8n (a base RAG entra sem vetor)
- [ ] Dra. Kassiele revisar todos os textos de mensagem — é ela quem responde
      perante a OAB
- [ ] Definir política de retenção dos laudos médicos (LGPD, art. 11)
- [ ] Trocar a RLS permissiva pela versão com Supabase Auth antes de produção

---

## 14. Riscos conhecidos

**LGPD.** Laudo médico e CID são dado pessoal sensível. Hoje o painel usa
políticas permissivas para desenvolvimento. Antes de produção é necessário
ativar autenticação e restringir por usuário — o bloco de endurecimento está
comentado no fim do arquivo `sql/01_SCHEMA_PREVIDENCIARIO.sql`.

**Publicidade e captação (OAB).** Atendimento passivo — o lead procura o
escritório — é aceito. O risco está em linguagem mercantil e promessa de
resultado, que o prompt proíbe explicitamente. A revisão final dos textos
precisa ser da Dra. Kassiele.

**Dependência de registro manual das perícias.** Se ninguém registrar a data,
o lembrete não sai e o cliente pode faltar. É o ponto mais frágil do fluxo e
merece checagem na rotina diária.

**Consulta automática ao Meu INSS não existe.** Não há API pública para o
processo administrativo. A coleta de andamento continua manual; só o *envio*
da atualização ao cliente é automatizado.
