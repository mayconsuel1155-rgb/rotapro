# Uso offline e sincronização pela rede local

O telefone usa uma cópia instalada do aplicativo, com os registros no IndexedDB. O computador pode ficar desligado durante o trabalho. Quando o servidor estiver ligado, os aparelhos estiverem na mesma rede e o aplicativo estiver aberto, ele troca os registros com o computador e verifica novas versões.

## Preparar o computador

```powershell
npm run setup:local
npm start
```

O primeiro comando cria uma autoridade de certificação local e um certificado HTTPS para o IP atual. Os arquivos privados ficam em `.certs`, fora do Git e da pasta publicada. Não compartilhe essa pasta. O terminal mostra o endereço e o código de pareamento. `npm start` compila a versão atual antes de servi-la; `npm run serve:local` serve a última compilação.

Reserve o IP do computador no roteador. Se ele mudar, o endereço instalado e o certificado antigo deixarão de corresponder. O certificado do servidor tem validade de um ano; preserve a autoridade local para renovar o certificado sem precisar trocar a confiança dos aparelhos. A renovação não é automática.

## Instalar no telefone uma vez

1. Conecte computador e telefone à mesma rede Wi-Fi, sem isolamento entre dispositivos.
2. Abra o endereço HTTP de instalação mostrado no terminal, por exemplo `http://192.168.0.12:8081`.
3. Baixe o certificado público e instale-o como certificado de CA nas configurações do telefone. Instale somente o certificado gerado pelo seu próprio computador. No Android, o caminho costuma ser Segurança → Criptografia e credenciais → Instalar certificado → Certificado de CA. No iPhone, instale o perfil e habilite sua confiança em Ajustes → Geral → Sobre → Confiança de Certificados.
4. Abra o endereço HTTPS mostrado no terminal, por exemplo `https://192.168.0.12:8443`. Ele precisa abrir sem aviso de certificado; ignorar o aviso não basta para habilitar o funcionamento offline.
5. Aguarde “Disponível offline neste aparelho”. No Android/Chrome, use “Instalar aplicativo”; no iPhone/Safari, Compartilhar → Adicionar à Tela de Início.
6. Abra pelo ícone, expanda “Sincronização”, informe o código do terminal e toque em “Conectar e sincronizar agora”. Faça o mesmo no navegador do computador, usando o mesmo endereço HTTPS da rede. No Windows, também é necessário confiar na CA; importe o certificado público no repositório de autoridades raiz confiáveis do usuário.
7. Confirme “Dados sincronizados com o computador”. Desligue o servidor, ative o modo avião e abra novamente pelo ícone para verificar a instalação no aparelho.

O navegador pode pedir permissão para acessar dispositivos da rede local. Autorize o acesso ao seu servidor. Se o endereço não abrir nem com o servidor ligado, confira a rede e a liberação das portas TCP 8443 e 8081 no Firewall do Windows para a rede privada. Não é necessário abrir portas no roteador nem expor o servidor à internet.

### Se o Chrome no Android disser que não é possível instalar

O Chrome pode usar um serviço externo para gerar o pacote WebAPK. Uma falha nessa etapa não significa, por si só, que o cache offline está com defeito. A [documentação de instalação](https://web.dev/learn/pwa/installation) descreve a diferença entre WebAPK e atalho.

No menu do Chrome, procure “Adicionar à tela inicial” e, se disponível, “Criar atalho”. Se o navegador oferecer apenas a instalação que está falhando, abra o mesmo endereço HTTPS no Firefox ou Edge para Android e use a opção de adicionar à tela inicial. Confirme novamente “Disponível offline neste aparelho” e teste em modo avião. A instalação e a confiança do certificado no telefone continuam sendo necessárias.

Cada navegador mantém seus próprios dados. Antes de trocar, exporte um backup no navegador antigo ou sincronize-o com o computador; depois importe ou faça o pareamento no novo navegador. O atalho não tem necessariamente uma entrada na lista de aplicativos do Android.

Para configurar o Firewall em outro computador, execute `scripts/allow-local-network.ps1` em um PowerShell como administrador. A regra permite apenas conexões da sub-rede local ao Node nessas duas portas, nos perfis privado e público do Windows.

## Uso diário

- Fora da rede: abra pelo ícone. Clientes, jornadas, cronômetros, relatórios e backup usam os dados locais.
- De volta à rede: ligue o computador, execute `npm start` e abra o aplicativo nos aparelhos que deseja sincronizar. Ele tenta ao abrir, ao retornar à tela e a cada 30 segundos enquanto estiver visível. Também existe o botão de sincronização manual.
- Novas versões são verificadas ao abrir/retomar e a cada minuto. O aplicativo baixa os arquivos e mostra “Atualizar aplicativo”. Salve os formulários antes de tocar para recarregar. Os dados do IndexedDB permanecem.
- Não é possível garantir sincronização com o aplicativo fechado ou suspenso pelo sistema do telefone. A conexão à mesma rede, sozinha, não executa o aplicativo.

## Navegação no Waze

Na tela **Jornada**, expanda **Waze · Endereço da empresa** e salve o endereço completo da base, incluindo cidade e estado. Essa configuração fica salva apenas no navegador/aparelho atual; configure também no celular.

Depois de iniciar um deslocamento, toque em **Abrir no Waze**. O destino será o endereço cadastrado do cliente ou, no retorno, o endereço da empresa. O Waze usa a posição GPS atual do telefone como origem. Ao desviar o retorno para uma emergência, o botão passa a apontar para o cliente urgente.

A abertura usa os [links oficiais do Waze](https://developers.google.com/waze/deeplinks/). Confira o destino encontrado no Waze antes de navegar. O Apontamento não recebe distância, posição ou confirmação de chegada do Waze: volte ao aplicativo para registrar a chegada e o atendimento. A navegação depende do Waze e da conexão disponível, enquanto os registros do Apontamento continuam locais.

## Dados, conflitos e recuperação

Clientes são sincronizados individualmente. Cada jornada é sincronizada junto com suas paradas e eventos para preservar a consistência. Mudanças em registros diferentes são mescladas. Alterações diferentes no mesmo registro geram um conflito, sem sobrescrever a cópia local. Em “Sincronização”, compare as duas versões e escolha qual manter. Relógios dos aparelhos não definem o vencedor.

Exclusões também são sincronizadas. Um aparelho com uma cópia antiga não recria automaticamente um registro excluído. Limpar dados ou restaurar um backup por substituição pode enviar exclusões para os demais aparelhos; exporte um backup antes.

O servidor guarda os registros em `.local-data/sync.json`, a versão imediatamente anterior em `sync.previous.json` e o código em `pairing-key`. Preserve essa pasta entre inicializações. Nenhum dado é enviado para serviços externos. O código permite acessar os dados do servidor: compartilhe somente com seus próprios aparelhos.

Os dados antigos de `http://localhost:5173`, de `http://192.168.0.12:5174` e do novo HTTPS pertencem a origens diferentes e não são transferidos pelo navegador. Exporte um backup no endereço antigo e importe-o no aplicativo HTTPS antes de trabalhar com registros existentes. Não limpe dados/cache do telefone sem ter um backup.

## Verificação de desenvolvimento

```powershell
npm test
npm run test:server
npm run build
npm run test:offline
```

`npm run dev` serve apenas o ambiente de desenvolvimento. Use `npm start` e HTTPS para instalar e testar offline no celular.

O teste `test:offline` exige Chrome ou Edge no Windows e os certificados locais já gerados. Usa perfil e banco de teste temporários, abre a compilação em HTTPS, encerra o servidor para verificar a reabertura offline e depois religa-o para sincronizar um registro com um segundo navegador isolado. Não altera os registros do servidor de uso diário. A confiança do certificado e a instalação precisam ser confirmadas no aparelho físico.
