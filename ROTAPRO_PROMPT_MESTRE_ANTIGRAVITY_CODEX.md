# RotaPro --- Especificação e Prompt Mestre para Antigravity / Codex

**Produto:** RotaPro --- Gestão de Atendimento Externo\
**Versão do documento:** 1.0\
**Objetivo:** construir uma primeira versão funcional, instalável e
prioritariamente offline para uso individual no Android e Windows.

------------------------------------------------------------------------

## 1. Instrução principal para o agente de desenvolvimento

Atue como um engenheiro de software sênior, arquiteto de aplicações
offline-first, especialista em UX/UI mobile-first, React, TypeScript,
PWA, persistência local, testes e qualidade de código.

Sua tarefa é **implementar o RotaPro de ponta a ponta**, não apenas
criar telas estáticas ou entregar um plano. Primeiro inspecione o
projeto existente e o ambiente. Depois implemente, execute, teste,
corrija e documente o sistema.

### Uso de skills e ferramentas disponíveis

1.  Inspecione as skills, agentes, MCPs, regras e instruções disponíveis
    no Antigravity/Codex e no repositório.
2.  Leia os arquivos de instrução relevantes antes de codificar (por
    exemplo: `AGENTS.md`, `CLAUDE.md`, `README.md`, regras do projeto e
    skills de frontend, UX, arquitetura, testes, acessibilidade, PWA e
    segurança).
3.  Aplique todas as skills que forem **realmente pertinentes** ao
    RotaPro. Não invente skills que não estejam instaladas e não force
    skills sem relação com a tarefa.
4.  Se houver skills complementares, combine-as:
    planejamento/arquitetura, design de interface, implementação
    frontend, persistência local, PWA/offline, testes, revisão e
    documentação.
5.  Não sobrescreva trabalho existente sem antes inspecioná-lo. Preserve
    convenções e componentes úteis do repositório.
6.  Se faltar uma ferramenta ou skill, prossiga com boas práticas
    equivalentes e registre a limitação.

### Regra de execução

-   Não pare depois de apresentar arquitetura ou plano: implemente a
    aplicação.
-   Não deixe botões sem ação, links falsos, dados fictícios permanentes
    ou telas meramente ilustrativas.
-   Não declare uma funcionalidade pronta sem executá-la e validá-la.
-   Tome decisões técnicas razoáveis sem interromper o usuário com
    perguntas não essenciais.
-   Se houver uma decisão realmente bloqueadora, faça uma pergunta
    objetiva; caso contrário, escolha a alternativa mais simples, segura
    e sustentável.
-   Ao final, informe o que foi implementado, como executar, como
    instalar e quais limitações permanecem.

------------------------------------------------------------------------

## 2. Visão do produto

O RotaPro é um aplicativo pessoal para registrar e acompanhar jornadas
de atendimento externo.

O usuário organiza os clientes que pretende visitar, inicia a jornada,
registra cada deslocamento, marca a chegada, inicia e finaliza o
atendimento, segue para o próximo cliente e encerra o dia ao retornar à
empresa.

O aplicativo deve reduzir digitação durante o trabalho: ações frequentes
precisam ser realizadas com botões grandes e poucos toques.

### Objetivos da primeira versão

-   Cadastrar e manter uma lista local de clientes.
-   Programar os clientes que serão visitados em uma jornada.
-   Definir e alterar a ordem das visitas.
-   Registrar horários e durações reais de deslocamentos e atendimentos.
-   Exibir o andamento da jornada e previsões simples.
-   Permitir incluir um cliente urgente durante a jornada.
-   Consultar histórico e resumo da jornada.
-   Funcionar sem internet após instalação e primeiro
    carregamento/empacotamento.
-   Não depender de hospedagem, servidor, conta, API externa ou
    mensalidade.

### Fora do escopo inicial

Não implementar agora: - Multiusuário ou gestão de equipes. - Login,
cadastro em nuvem ou sincronização entre dispositivos. - Rastreamento
contínuo em segundo plano. - Trânsito em tempo real. - Cálculo de rotas
rodoviárias completo sem dados de mapas. - Integração obrigatória com
Google Maps ou serviços pagos. - Integrações corporativas.

A arquitetura pode permitir expansão futura, mas não complique o MVP.

------------------------------------------------------------------------

## 3. Plataformas e estratégia offline

### Prioridade

1.  Android: experiência principal de uso em campo.
2.  Windows: uso no computador, cadastro e consulta.

### Estratégia recomendada

Inspecione o projeto e escolha a implementação que entregue offline real
nas duas plataformas com menor complexidade.

-   Para Windows e navegadores compatíveis: PWA instalável com service
    worker e IndexedDB.
-   Para Android: avaliar PWA instalável e/ou empacotamento com
    Capacitor, conforme o ambiente e os requisitos reais de instalação.
-   Compartilhar o máximo possível da interface e da lógica de negócio.
-   Não afirmar que uma PWA é um APK nativo. Se gerar APK, documentar o
    processo e os requisitos do Android Studio/SDK.

### Requisitos offline obrigatórios

-   Aplicação abre sem internet depois de instalada e com seus recursos
    locais disponíveis.
-   Cadastro, edição, exclusão, programação, cronômetros, histórico e
    relatórios funcionam offline.
-   Dados permanecem após fechar e reabrir o aplicativo.
-   Nenhuma chamada remota é necessária para as operações essenciais.
-   Não usar fontes, ícones, bibliotecas ou imagens carregadas de CDN em
    tempo de execução.
-   Incluir página/estado de disponibilidade offline e tratamento de
    falhas.
-   Service worker deve armazenar os recursos necessários para abrir a
    aplicação.
-   Criar estratégia de backup/exportação local para proteger os dados.

**Importante:** GPS pode fornecer coordenadas em alguns aparelhos sem
conexão, mas disponibilidade e precisão variam. Mapas e trânsito não
estarão disponíveis automaticamente offline. O MVP deve funcionar sem
GPS e sem mapas.

### Persistência

Preferir IndexedDB com Dexie.js para uma PWA. Se a implementação nativa
Android exigir SQLite, encapsular o acesso aos dados atrás de uma
camada/repositório para evitar espalhar dependências pela aplicação.

Não usar `localStorage` como banco principal. Pode ser usado apenas para
preferências pequenas e não críticas.

------------------------------------------------------------------------

## 4. Identidade visual e UX

Criar uma interface profissional, moderna, limpa e consistente com o
conceito visual aprovado:

-   Tema escuro como padrão.
-   Fundo azul-marinho/grafite.
-   Cards em tons ligeiramente mais claros.
-   Azul elétrico para ações primárias e navegação ativa.
-   Verde para estados positivos/em execução quando apropriado.
-   Vermelho apenas para ações destrutivas ou finalizações críticas.
-   Cantos arredondados moderados.
-   Ícones consistentes.
-   Tipografia legível.
-   Animações discretas e rápidas.
-   Excelente contraste e acessibilidade.
-   Layout mobile-first, responsivo também para desktop.

### Regras de usabilidade

-   Botões de ação com área de toque confortável.
-   A ação principal da tela deve ser visualmente óbvia.
-   Evitar formulários longos durante a jornada.
-   Confirmar ações destrutivas.
-   Mostrar feedback após salvar, iniciar, pausar ou finalizar.
-   Não depender apenas de cor para indicar status.
-   Estados vazios devem orientar o próximo passo.
-   Interface e mensagens integralmente em português do Brasil.
-   Formato de data `dd/MM/yyyy` e horário de 24 horas.
-   Moeda não é necessária no MVP.

### Navegação principal

No celular, usar navegação inferior com cinco áreas:

1.  **Meu Dia**
2.  **Clientes**
3.  **Programação**
4.  **Jornada**
5.  **Relatórios**

No desktop, adaptar para sidebar ou navegação superior sem perder a
hierarquia.

------------------------------------------------------------------------

## 5. Módulos e requisitos funcionais

### 5.1 Meu Dia --- Dashboard

Exibir: - Data atual. - Estado da jornada: não iniciada, em andamento,
pausada ou finalizada. - Hora de início, quando existir. - Quantidade de
clientes programados. - Quantidade de clientes concluídos. - Tempo
acumulado em deslocamento. - Tempo acumulado em atendimento. - Tempo
total da jornada. - Próximo cliente, se houver. - Ação principal
contextual.

Estados: - Sem jornada: botão **Iniciar jornada** e acesso à
programação. - Jornada em andamento: mostrar atividade atual e atalho
**Continuar jornada**. - Jornada finalizada: mostrar resumo e opção de
consultar histórico.

Não iniciar a jornada sem clientes programados, exceto se houver um
fluxo explícito para jornada sem visitas.

### 5.2 Clientes

Permitir criar, listar, pesquisar, editar e arquivar/excluir clientes.

Campos: - Nome do cliente (obrigatório). - Endereço em texto
(obrigatório ou claramente opcional, conforme decisão de UX; preferir
obrigatório). - Telefone (opcional). - Nome/empresa (se fizer sentido,
evitar duplicidade com nome). - Observações (opcional). - Tempo previsto
de atendimento em minutos (opcional, valor sugerido padrão de 30
minutos). - Data de criação e atualização.

Requisitos: - Busca por nome e endereço. - Validação de campos. -
Prevenção de cadastro acidental duplicado, sem bloquear clientes com
nomes iguais. - Cliente já utilizado em jornadas anteriores não deve ser
apagado fisicamente sem aviso; preferir arquivamento. - Detalhe do
cliente pode mostrar histórico de visitas, média de atendimento e última
visita quando houver dados.

### 5.3 Programação do Dia

Permitir: - Selecionar clientes cadastrados. - Adicionar cliente novo
sem perder a programação atual. - Definir ordem das visitas. - Reordenar
por arrastar e soltar, com alternativa acessível por botões "Mover para
cima/baixo". - Definir tempo previsto de atendimento por visita; usar o
padrão do cliente como sugestão. - Remover cliente da programação sem
apagar o cadastro. - Adicionar cliente urgente durante jornada. -
Mostrar nome, endereço, ordem e duração prevista. - Confirmar
programação e iniciar jornada.

A programação é uma lista de visitas de uma jornada específica, não uma
alteração permanente na ordem dos clientes cadastrados.

### 5.4 Jornada e controle de etapas

Implementar uma máquina de estados explícita, evitando combinações
inválidas.

Estados mínimos da jornada: - `not_started` - `in_progress` - `paused`
(opcional no MVP, mas útil) - `completed`

Estados mínimos de cada visita: - `pending` - `traveling` - `arrived` -
`servicing` - `completed` - `skipped` - `cancelled`

Fluxo principal:

1.  Usuário confirma a programação.
2.  Clica **Iniciar jornada**.
3.  Sistema registra data/hora real de início.
4.  Usuário seleciona/confirmar o cliente de destino.
5.  Clica **Iniciar deslocamento**.
6.  Sistema registra `startedAt` e inicia a medição.
7.  Ao chegar, clica **Cheguei ao cliente**.
8.  Sistema registra `endedAt` do deslocamento e calcula a duração.
9.  Usuário clica **Iniciar atendimento**.
10. Sistema registra início do atendimento.
11. Ao terminar, clica **Finalizar atendimento**.
12. Sistema registra fim e duração.
13. Sistema apresenta o próximo cliente e permite iniciar o
    deslocamento.
14. Após todas as visitas, usuário escolhe **Retornar à empresa**.
15. Sistema registra o deslocamento de retorno.
16. Usuário clica **Cheguei à empresa / Finalizar jornada**.
17. Sistema registra fim da jornada e gera o resumo.

Se o usuário quiser finalizar a jornada sem concluir todas as visitas,
solicitar confirmação e permitir registrar visitas como não
realizadas/canceladas, preservando o histórico.

### 5.5 Tela de execução

Durante deslocamento: - Nome do cliente atual. - Endereço de destino. -
Status "Em deslocamento". - Cronômetro grande. - Botão principal
**Cheguei ao cliente**. - Próximo cliente, se conhecido.

Durante atendimento: - Nome e endereço do cliente. - Status "Em
atendimento". - Cronômetro grande. - Botão **Finalizar atendimento**. -
Ação secundária para pausar/corrigir, se implementada.

Após atendimento: - Resumo da visita. - Botão **Iniciar deslocamento
para o próximo**. - Acesso para reorganizar a fila ou adicionar cliente.

O usuário precisa conseguir retomar a jornada após fechar e reabrir o
app.

### 5.6 Reorganização durante a jornada

-   Permitir incluir um novo cliente.
-   Permitir reordenar apenas visitas ainda não concluídas.
-   Nunca modificar registros de visitas já concluídas.
-   Se houver deslocamento em andamento, não trocar o destino
    silenciosamente: pedir confirmação e registrar o que ocorreu.
-   Recalcular a previsão dos próximos eventos após alteração.
-   Manter trilha de eventos suficiente para entender mudanças.

### 5.7 Previsões de horário

O sistema não tem dados de trânsito ou mapas no MVP. Portanto: - Não
inventar distância nem duração de rota. - Usar estimativas fornecidas
pelo usuário ou médias históricas quando houver amostra suficiente. -
Mostrar claramente quando um tempo é estimado. - Usar o tempo previsto
de atendimento de cada visita. - Para deslocamento futuro sem histórico,
deixar previsão como "não estimada" ou permitir entrada manual. - Após
registrar deslocamentos reais, calcular médias por par de clientes
quando houver dados suficientes. - Permitir que o usuário corrija uma
previsão sem alterar o registro real já medido.

### 5.8 Relatórios e histórico

Relatório por jornada: - Data. - Horário de início e término. - Clientes
programados, atendidos e não realizados. - Duração total. - Tempo total
em deslocamento. - Tempo total em atendimento. - Lista cronológica dos
eventos e visitas.

Histórico: - Lista de jornadas anteriores. - Filtro por período. -
Detalhe de cada jornada. - Histórico de visitas por cliente.

Indicadores: - Quantidade de atendimentos. - Tempo médio de
atendimento. - Tempo médio de deslocamento registrado. - Tempo total em
campo.

Não chamar "produtividade" de avaliação de desempenho do trabalhador;
apresentar como indicadores operacionais.

### 5.9 Backup e restauração

Como os dados ficam no dispositivo: - Criar exportação completa para
arquivo JSON. - Criar importação com validação de estrutura e versão. -
Antes de restaurar, mostrar aviso de que a importação pode substituir ou
mesclar dados. - Preferir backup com versão e data. - Não enviar dados
para nenhum servidor.

Relatório PDF pode ser uma melhoria posterior; no MVP, priorizar
visualização e exportação JSON/CSV se simples.

------------------------------------------------------------------------

## 6. Regras de tempo --- requisito crítico

Não manter o tempo correto apenas incrementando um contador em memória
ou com `setInterval`.

Persistir timestamps reais: - `startedAt` - `endedAt` - `pausedAt`, se
houver pausa - eventos de retomada, se houver pausa

A duração deve ser calculada pela diferença entre timestamps,
descontando pausas registradas.

Isso garante que: - O cronômetro continue correto se a tela bloquear. -
O app continue correto após fechar e reabrir. - Suspensão do navegador
não corrompa a medição.

Usar relógio local do dispositivo e documentar que alterar manualmente a
hora do aparelho pode afetar registros. Não exigir execução contínua em
segundo plano.

------------------------------------------------------------------------

## 7. Modelo de dados sugerido

Defina tipos TypeScript e tabelas/repositórios equivalentes a:

### `Client`

-   `id`
-   `name`
-   `address`
-   `phone?`
-   `notes?`
-   `defaultServiceMinutes?`
-   `createdAt`
-   `updatedAt`
-   `archivedAt?`

### `Journey`

-   `id`
-   `date`
-   `status`
-   `startedAt?`
-   `endedAt?`
-   `createdAt`
-   `updatedAt`
-   `notes?`

### `JourneyStop`

-   `id`
-   `journeyId`
-   `clientId`
-   `position`
-   `status`
-   `plannedServiceMinutes?`
-   `travelStartedAt?`
-   `arrivedAt?`
-   `serviceStartedAt?`
-   `serviceEndedAt?`
-   `travelEndedAt?`
-   `isReturnToBase`
-   `notes?`

### `JourneyEvent`

-   `id`
-   `journeyId`
-   `stopId?`
-   `type`
-   `occurredAt`
-   `metadata?`

Use IDs estáveis, relacionamentos válidos, índices úteis e
migrações/versionamento do banco. Evite armazenar dados derivados que
podem ser calculados, a menos que haja motivo claro.

------------------------------------------------------------------------

## 8. Arquitetura e organização do código

Adote uma arquitetura simples, modular e testável. Separar: -
componentes de interface; - páginas/rotas; - domínio e regras da
jornada; - serviços de tempo; - persistência local; -
exportação/importação; - hooks; - validações; - testes.

Estrutura sugerida (adapte ao projeto existente):

``` text
src/
  app/
  components/
    layout/
    ui/
  features/
    dashboard/
    clients/
    planning/
    journey/
    reports/
  domain/
    journey/
    time/
    planning/
  db/
    database.ts
    repositories/
    migrations/
  hooks/
  lib/
  styles/
  types/
  tests/
public/
  icons/
  manifest.webmanifest
  service-worker assets (conforme a estratégia escolhida)
```

Tecnologias sugeridas: - React - TypeScript - Vite - Tailwind CSS -
Dexie.js / IndexedDB - React Router ou solução simples de navegação -
Biblioteca de ícones instalada localmente - Biblioteca de drag-and-drop
apenas se agregar valor e funcionar bem em mobile - Vitest e Testing
Library para testes

Não adicionar dependências pesadas sem justificativa.

------------------------------------------------------------------------

## 9. Segurança, privacidade e confiabilidade

-   Os dados pertencem ao usuário e ficam no dispositivo.
-   Não incluir analytics, telemetria ou chamadas externas por padrão.
-   Não registrar informações pessoais desnecessárias.
-   Validar importações e entradas.
-   Tratar falhas de persistência com mensagens claras.
-   Evitar perda de dados em atualizações do app.
-   Criar mecanismo de backup e orientar o usuário a exportar
    periodicamente.
-   Não apresentar o armazenamento local como backup automático: perda
    ou defeito do aparelho pode causar perda dos dados se não houver
    exportação.

------------------------------------------------------------------------

## 10. Critérios de aceite do MVP

O MVP só pode ser considerado funcional quando os seguintes cenários
forem testados:

### Clientes

-   [ ] Criar cliente.
-   [ ] Editar cliente.
-   [ ] Pesquisar cliente.
-   [ ] Arquivar cliente.
-   [ ] Reabrir e confirmar que os dados persistiram.

### Programação

-   [ ] Criar programação com vários clientes.
-   [ ] Reordenar clientes.
-   [ ] Remover visita sem excluir cadastro.
-   [ ] Adicionar cliente durante a jornada.

### Jornada

-   [ ] Iniciar jornada.
-   [ ] Iniciar deslocamento.
-   [ ] Registrar chegada.
-   [ ] Iniciar atendimento.
-   [ ] Finalizar atendimento.
-   [ ] Iniciar deslocamento para o próximo.
-   [ ] Registrar retorno à empresa.
-   [ ] Finalizar jornada.
-   [ ] Fechar e reabrir o app durante uma etapa e confirmar que o tempo
    está correto.
-   [ ] Impedir transições inválidas.

### Offline

-   [ ] Instalar/abrir a aplicação.
-   [ ] Ativar modo avião.
-   [ ] Criar cliente e programação.
-   [ ] Executar uma jornada de teste.
-   [ ] Fechar e reabrir o app offline.
-   [ ] Consultar histórico offline.
-   [ ] Confirmar que não há requisições externas necessárias para as
    funções essenciais.

### Responsividade

-   [ ] Validar telas pequenas Android.
-   [ ] Validar desktop Windows.
-   [ ] Validar botões e navegação por toque.
-   [ ] Validar contraste e mensagens de erro.

### Backup

-   [ ] Exportar dados.
-   [ ] Importar backup válido.
-   [ ] Rejeitar arquivo inválido sem corromper os dados existentes.

------------------------------------------------------------------------

## 11. Plano de implementação

Execute em etapas, mas avance até deixar um MVP executável.

### Etapa 0 --- Inspeção

-   Inspecionar repositório, package manager, estrutura e skills
    disponíveis.
-   Identificar se já existe código.
-   Registrar decisões técnicas breves.
-   Não apagar arquivos existentes sem justificativa.

### Etapa 1 --- Fundação

-   Criar/ajustar projeto.
-   Configurar TypeScript, Tailwind, lint e testes.
-   Implementar tema, layout responsivo, navegação e componentes
    básicos.
-   Configurar persistência local e service worker/PWA.

### Etapa 2 --- Clientes

-   CRUD de clientes.
-   Busca, validação e arquivamento.
-   Persistência real no banco local.

### Etapa 3 --- Programação do Dia

-   Seleção de clientes.
-   Ordem de visitas.
-   Tempo previsto por visita.
-   Confirmação da programação.

### Etapa 4 --- Jornada

-   Máquina de estados.
-   Cronometragem baseada em timestamps.
-   Retomada após reabertura.
-   Inclusão e reorganização de clientes pendentes.

### Etapa 5 --- Dashboard e relatórios

-   Indicadores calculados a partir dos eventos.
-   Histórico de jornadas.
-   Detalhe de jornada e visita.

### Etapa 6 --- Offline, backup e qualidade

-   Validar funcionamento em modo avião.
-   Exportar/importar backup.
-   Testes automatizados.
-   Testes manuais em Android e Windows.
-   Corrigir problemas encontrados.

### Etapa 7 --- Entrega

-   Atualizar README.
-   Documentar comandos.
-   Documentar instalação Android/Windows.
-   Documentar backup e limitações.
-   Informar o que foi testado de verdade.

------------------------------------------------------------------------

## 12. Comandos e entrega

Use o gerenciador de pacotes já adotado no projeto. Se o projeto estiver
vazio, prefira npm.

Ao concluir, forneça: 1. Resumo das funcionalidades implementadas. 2.
Estrutura principal do projeto. 3. Comando para executar em
desenvolvimento. 4. Comando para gerar build. 5. Instruções de
instalação PWA no Windows. 6. Instruções de instalação/empacotamento
Android, se suportado. 7. Como testar em modo avião. 8. Como exportar e
restaurar backup. 9. Testes executados e seus resultados. 10. Limitações
conhecidas e próximos passos.

### Definição de pronto

O resultado deve ser um aplicativo funcional, não apenas um protótipo
visual. O usuário deve conseguir cadastrar clientes, montar a
programação, executar uma jornada com tempos reais, fechar o app e
retomá-lo, consultar histórico e fazer backup --- tudo sem depender de
internet.
