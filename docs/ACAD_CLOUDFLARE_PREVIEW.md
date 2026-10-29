# ACAD — primeiro deploy de teste (somente frontend)

Esta etapa publica **apenas arquivos estáticos** do openGym em um Worker chamado `acad-preview`. Não migra a API Node.js, o armazenamento JSON, os dados dos perfis ou a sincronização. Não utilize este endereço como sistema definitivo de registro de treinos.

## Pré-requisitos

- Node.js e npm instalados, além de acesso à sua conta Cloudflare.
- Um clone desta branch do repositório.
- Não modificar nem reutilizar o Worker do seu sistema de guias.

## Comandos (na raiz do repositório)

```powershell
git checkout feat/cloudflare-two-profiles
cd frontend
npm ci
npm run build
npx wrangler@4 deploy --config wrangler.jsonc
```

O Wrangler pode solicitar autenticação no primeiro uso. Confirme o nome **acad-preview** antes de publicar. O endereço gerado será um subdomínio `workers.dev` da sua conta, sem necessidade de configurar domínio próprio nesta fase.

## O que conferir

1. Se a interface inicial abre e permite escolher o idioma **Português (Brasil)**.
2. Se navegação, catálogo de exercícios, imagens e temporizador funcionam. Algumas mídias originalmente servidas pelo Docker podem estar ausentes e exigem empacotamento/publicação específica.
3. Se há erros no console/rede do navegador (especialmente chamadas a `/api`). Sem a API original, **recursos que dependem do servidor não devem funcionar**.
4. Se não houve alterações no Worker do sistema de guias.

## Segurança e dados

- Não registrar dados reais dos dois usuários no ambiente de teste.
- Não publicar endpoints de leitura/escrita anônimos na migração posterior: perfil sem login não equivale a armazenamento público.
- A migração posterior deve preservar controle de revisão, conflitos de sincronização, exportação e restauração de backup.
- O frontend do openGym contém service worker e armazenamento local: teste com dados descartáveis e separe o ambiente de produção.

## Próxima etapa

Mapear o contrato de API e implementar um protótipo de persistência em D1, **sem afirmar compatibilidade total antes dos testes**.
