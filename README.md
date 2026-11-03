# Wallpaper de Anime

Site responsivo de wallpapers com categorias por anime, pesquisa, visualização ampliada, download e painel administrativo protegido.

## Requisitos

- Node.js 18 ou superior
- npm

## Instalação local

1. Extraia o ZIP.
2. Abra a pasta do projeto no terminal.
3. Instale as dependências:

   ```bash
   npm install
   ```

4. Copie `.env.example` para `.env`.
5. Edite `.env` e defina um usuário e uma senha fortes, além de uma chave secreta longa.
6. Inicie o site:

   ```bash
   npm start
   ```

7. Acesse `http://localhost:3000`.

## Como publicar wallpapers

1. Clique em **Área do criador**.
2. Entre com `ADMIN_USER` e `ADMIN_PASSWORD` configurados no `.env`.
3. Escolha a imagem, informe título e anime.
4. Clique em **Publicar wallpaper**.

Visitantes podem visualizar e baixar. Somente uma sessão autenticada como administrador pode publicar ou excluir imagens.

## Categorias

A galeria inclui filtros para Bleach, Naruto, One Piece, Hunter x Hunter, Dragon Ball e Outros. O formulário de publicação também aceita categorias adicionais; para que elas apareçam como filtro fixo, adicione um botão em `public/index.html` dentro de `#categoryList`.

## Colocar na internet

Você precisará hospedar a aplicação em um serviço que execute Node.js e permita armazenamento persistente em disco (para `uploads/` e `data/`). Configure as variáveis do `.env` no painel do provedor e use HTTPS. Defina `NODE_ENV=production`.

**Importante:** não use hospedagem estática simples (que serve apenas HTML). O login, o envio de arquivos e a proteção de administrador dependem do servidor Node.js. O armazenamento local pode ser apagado por alguns provedores ao reiniciar ou redeploy; escolha disco persistente ou adapte o projeto para armazenamento de objetos antes de usar em produção.

## Segurança e observações

- Não publique o arquivo `.env`.
- Troque a senha de exemplo por uma senha longa e exclusiva.
- O cookie de sessão é HTTP-only e SameSite Strict; em produção ele exige HTTPS.
- O limite de upload é 20 MB e os formatos aceitos são JPG, PNG, WEBP e GIF.
- Para um projeto com muitos usuários, configure um armazenamento de sessão persistente e armazenamento de imagens dedicado.
