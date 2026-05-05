# awesome-project-app

Base de desenvolvimento 100% em Docker, preparada para Portainer, com:

- PostgreSQL
- Backend NestJS
- Prisma
- ValidationPipe global
- Helmet
- hash de passwords com bcrypt
- JWT
- guards para rotas protegidas
- variáveis de ambiente
- frontend React + TypeScript

## Estrutura

```text
/volume2/data-ssd/AppData/Awesome-Project-App
├── .env
├── docker-compose.yml
├── backend
│   ├── package.json
│   ├── nest-cli.json
│   ├── tsconfig.json
│   ├── prisma
│   └── src
└── frontend
    ├── package.json
    ├── tsconfig.json
    ├── vite.config.ts
    └── src
```

## Credenciais iniciais geradas

- Database user: `awesome_project_user`
- Database password: `IJHU-OpDIRsAVX4JY9-px_if`
- Database name: `awesome_project_db`
- Admin email: `admin@awesome-project-app.local`
- Admin password: `uurCGuBJmKDUNEuA7h`

## Como usar no Portainer

1. Copia todo o conteúdo desta pasta para:
   `/volume2/data-ssd/AppData/Awesome-Project-App`

2. No Portainer, vai a **Stacks** > **Add stack**.

3. Nome da stack:
   `awesome-project-app`

4. Usa **Upload** e envia o ficheiro `docker-compose.yml`.

5. Na secção de variáveis de ambiente, carrega os valores do ficheiro `.env`
   ou copia manualmente os pares chave=valor.

6. Faz **Deploy the stack**.

## URLs esperadas

- Frontend: `http://IP_DO_HOST:5173`
- Backend: `http://IP_DO_HOST:3000/api`
- Hello world: `http://IP_DO_HOST:3000/api/hello`

## Notas

- O primeiro arranque demora mais porque os containers instalam dependências.
- O seed cria ou atualiza o admin com os valores definidos no `.env`.
- O backend expõe:
  - `POST /api/auth/register`
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `GET /api/users`
  - `GET /api/hello`
  - `GET /api/hello/protected`
