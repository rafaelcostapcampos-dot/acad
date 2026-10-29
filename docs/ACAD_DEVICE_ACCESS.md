# Autorização inicial dos dispositivos — ACAD

O código de autorização funciona sem contas tradicionais. Os segredos ficam no Worker da Cloudflare; não os coloque no GitHub, em mensagens ou no JavaScript do navegador.

## Configuração (Cloudflare → Workers & Pages → acad-preview → Settings → Variables and Secrets)

Adicione **dois segredos criptografados**, não variáveis públicas:
- `ACAD_ACCESS_CODE`: uma frase de acesso aleatória com no mínimo 16 caracteres; prefira 24–32+ caracteres gerados por gerenciador de senhas. Use a mesma frase para autorizar os dois dispositivos, sem compartilhá-la publicamente.
- `ACAD_SESSION_KEY`: outra chave aleatória e independente, com 32+ caracteres. Não use a frase de acesso como chave de sessão.

Salve/deploy da configuração. **Não configure** `ACAD_API_TOKEN` no navegador: esse token é reservado para integrações confiáveis entre servidores.

## Funcionamento

A tela de entrada do ACAD oferece um campo de autorização. Ao inserir a frase correta, o servidor gera um cookie assinado HMAC-SHA256, HttpOnly, Secure e SameSite=Strict, com validade de 30 dias. A frase não é gravada no navegador pelo nosso código. O endpoint `GET /acad-api/session` informa se há sessão válida.

O endpoint de perfis aceita cookie válido e requisições de alteração com Origin igual ao do Worker. Gravações continuam usando a revisão do documento para evitar sobrescritas acidentais.

## Limitações antes de habilitar uso real

- A autorização de dispositivo **não** integra automaticamente o estado do openGym ao D1. Os botões dos dois perfis permanecem desabilitados.
- Uma única frase compartilhada dá acesso aos dois perfis; não é isolamento por usuário. Antes de liberar dados reais, avaliar permissões individuais e revogação de dispositivos.
- A autenticação por frase não possui ainda limitação persistente de tentativas. Use uma frase longa e imprevisível e considere proteção adicional por Cloudflare Access/WAF.
- O dispositivo pode precisar de nova autorização após 30 dias, ou ao apagar cookies.
- Testar sessões, segurança, troca de perfis, sincronização, concorrência e backups antes de começar os treinos reais.
