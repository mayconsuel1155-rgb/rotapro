# RotaPro — Gestão de Atendimento Externo

**Versão:** 1.0 (MVP Funcional Offline-First)  
**Público-alvo:** Profissionais de campo, representantes, técnicos e consultores externos.  
**Plataformas:** Android e Windows (PWA Instalável 100% Offline).

---

## 🚀 Visão Geral do Sistema

O **RotaPro** é um aplicativo mobile-first e desktop desenvolvido com foco absoluto em usabilidade rápida, persistência local e confiabilidade em campo sem necessidade de conexão com a internet.

### Diferenciais Técnicos:
- **100% Offline Real:** Opera integralmente sem servidor remoto, sem login em nuvem, sem taxas ou chamadas de API externas em tempo de execução. Todos os dados permanecem estritamente no dispositivo do usuário através do IndexedDB (via Dexie.js).
- **Tempo Confiável Baseado em Timestamps Reais:** Conforme especificado na Seção 6 do projeto, os cronômetros nunca dependem apenas de contadores voláteis de memória. A duração é calculada pela diferença matemática entre timestamps persistidos (`startedAt`, `arrivedAt`, `serviceStartedAt`, etc.). Se a tela for bloqueada, o app fechado ou o navegador entrar em suspensão, o tempo é recalculado com 100% de exatidão ao reabrir.
- **Service Worker & Cache PWA Integrado:** Recursos (HTML, JS, CSS, fontes e ícones vetoriais) são cacheados localmente no momento da instalação.
- **Design System Moderno:** Tema escuro padrão azul-marinho/grafite (`#0B132B`, `#141E38`, `#1C2951`), azul elétrico para ações prioritárias, verde para estados em execução e vermelho reservado a ações destrutivas.

---

## 📦 Módulos Implementados

1. **Dashboard (Meu Dia)**
   - Resumo dinâmico da data atual (`dd/MM/yyyy`).
   - Estado em tempo real da jornada (Não Iniciada, Ao Vivo / Em Andamento, Concluída).
   - Indicadores consolidados: paradas concluídas/programadas, tempo em deslocamento, tempo em atendimento e tempo total em campo.
   - Ação principal contextual (Programar visitas, Continuar jornada, Ver relatório).
   - Fila de clientes do dia com status instantâneo.

2. **Cadastro de Clientes**
   - Criação, edição, busca em tempo real (por nome, endereço e telefone) e arquivamento de clientes.
   - Proteção de exclusão física: se o cliente já possuir histórico em jornadas, o sistema preserva os registros arquivando o cliente em vez de corromper o banco.
   - Modal com histórico detalhado de visitas concluídas e notas de atendimento por cliente.

3. **Programação de Visitas**
   - Seleção de clientes cadastrados para compor a rota do dia.
   - Reordenação acessível por botões "Mover para cima" / "Mover para baixo".
   - Ajuste individual de tempo estimado de atendimento.
   - Cálculo dinâmico do tempo previsto total.
   - Adição automática da etapa de encerramento ("Retorno à Empresa / Base").

4. **Jornada em Campo (Execução ao Vivo)**
   - Máquina de estados explícita:
     1. `Iniciar Deslocamento`
     2. `Em Deslocamento` (Cronômetro grande em tempo real)
     3. `Cheguei ao Cliente`
     4. `Iniciar Atendimento`
     5. `Em Atendimento` (Cronômetro grande em tempo real)
     6. `Finalizar Atendimento` (com modal para anotações do atendimento)
     7. Próxima parada ou `Retorno à Empresa`
     8. `Cheguei à Empresa / Finalizar Jornada`
   - Inclusão rápida de **Cliente Urgente** durante a rota sem travar o cronômetro ativo.
   - Opção de pular ou cancelar visita com justificativa.
   - Resumo e celebração ao término do dia.

5. **Relatórios e Histórico Operacional**
   - Histórico cronológico de jornadas passadas com filtro por período (7 dias, 30 dias ou tudo).
   - Indicadores consolidados: total de visitas realizadas, tempo total em campo, média de atendimento e média de deslocamento.
   - Modal com detalhamento de cada jornada, horários de chegada, saída e notas.
   - Exportação offline em arquivo **CSV**.

6. **Backup e Restauração Local**
   - Exportação completa do banco de dados em arquivo `.json` formatado e versionado.
   - Importação com validação de esquema (modos Substituição total ou Mesclagem).
   - Opção de restauração de dados de demonstração (seed) ou limpeza total.

---

## 🛠️ Como Executar o Projeto

### Pré-requisitos:
- **Node.js**: v18+ (testado e homologado no Node v24)
- **Navegador moderno**: Chrome, Edge, Brave ou Firefox.

### 1. Instalar Dependências:
```bash
npm install
```

### 2. Executar em Modo de Desenvolvimento:
```bash
npm run dev
```
Acesse no navegador: `http://localhost:5173/`

### 3. Compilar Build de Produção e PWA:
```bash
npm run build
```

### 4. Executar o Preview da Versão de Produção (com Service Worker):
```bash
npm run preview
```
Acesse: `http://localhost:4173/`

---

## 🧪 Como Rodar os Testes Automatizados

O projeto conta com suite completa de testes unitários e de integração em Vitest:

```bash
npm test
```
Resultados cobertos pelos testes:
- `timeService.test.ts`: cálculos de timestamps, durações e formatos 24h.
- `journeyEngine.test.ts`: máquina de estados, cálculos de tempos e regras de reordenação.
- `repositories.test.ts`: persistência IndexedDB, CRUD de clientes, ciclo de vida da jornada e backup.
- `App.e2e.test.tsx`: fluxos reais de tela, criação de clientes, montagem de rota e transição de etapas.

---

## 📱 Como Instalar no Android

1. Abra o navegador **Google Chrome** no smartphone Android.
2. Acesse o endereço do aplicativo (seja na rede local `http://<IP-DO-PC>:4173/` ou hospedado em seu ambiente local).
3. Toque no ícone de **3 pontos** (canto superior direito) do Chrome.
4. Toque em **"Instalar aplicativo"** ou **"Adicionar à tela inicial"**.
5. O ícone do **RotaPro** será criado na grade de aplicativos do seu Android.
6. Ao abrir pelo ícone, ele executa em tela cheia (standalone), sem barra de endereços, como um aplicativo nativo.

---

## 💻 Como Instalar no Windows

1. Abra o **Google Chrome**, **Microsoft Edge** ou **Brave** no Windows.
2. Acesse `http://localhost:4173/` (ou a URL de produção).
3. Na barra de endereços, clique no ícone de instalação (**"Instalar RotaPro"**) que surge à direita da barra de URL, ou acesse Menu do navegador > **Aplicativos** > **Instalar este site como um aplicativo**.
4. O RotaPro abrirá em uma janela nativa independente, podendo ser fixado na Barra de Tarefas do Windows e no Menu Iniciar.

---

## ✈️ Como Testar Completamente Offline

1. Com o RotaPro aberto no navegador ou instalado como PWA:
2. **Ative o Modo Avião** no celular ou desconecte a rede/Wi-Fi do computador.
3. Recarregue a página (`F5` ou reabra o app instalado): o Service Worker servirá todos os arquivos do cache instantaneamente.
4. Cadastre um novo cliente.
5. Monte uma programação de visitas na aba **Programação**.
6. Inicie a jornada, execute os botões de **Iniciar Deslocamento**, **Cheguei ao Cliente**, **Iniciar Atendimento** e **Finalizar Atendimento**.
7. Feche a aba ou aplicativo por alguns minutos e reabra: o cronômetro manterá o tempo real rigorosamente exato.
8. Finalize a jornada, consulte os **Relatórios** e faça um **Backup JSON**: tudo funciona sem nenhuma conexão externa.

---

## 🔮 Sugestões de Melhorias Futuras (Pós-MVP)

- Mapas offline compactos (integração Leaflet com tiles vetoriais locais pré-carregados).
- Coleta de assinatura digital do cliente na tela de finalização de atendimento (canvas HTML5 local).
- Empacotamento em APK nativo via Capacitor caso seja necessária distribuição na Google Play Store.
- Exportação de ordem de serviço em PDF gerado diretamente no cliente via jsPDF.
