# Requisitos e Regras de Segurança — Email de Confirmação e Recuperação de Password

---

## 1. Princípios Gerais

- Sessão persistente ("remember me") **não é suportada** — a sessão termina sempre com o fecho do browser ou expiração do JWT.
- Todos os tokens de email são de **uso único** e armazenados no banco de dados (tabela `EmailToken`).
- Nenhum endpoint de autenticação revela se um email existe ou não na plataforma.
- Todas as credenciais SMTP ficam exclusivamente em variáveis de ambiente.
- Tokens seguem as recomendações da **OWASP**: aleatórios, suficientemente longos, armazenados com segurança e restritos ao fluxo para o qual foram gerados. O processo de reset de password deve ter o mesmo nível de cuidado que a autenticação em si.

---

## 2. Duração dos Tokens por Cenário (OWASP)

| Cenário | Duração | Token Type |
|---|---|---|
| Recuperação de password | 15 minutos | `PASSWORD_RESET` |
| Confirmação de email de cadastro | 24 horas | `EMAIL_CONFIRMATION` |
| Convite para projeto | 72 horas | `ACCOUNT_INVITE` |
| Operações sensíveis (alterar email, MFA) | 10 minutos | `SENSITIVE_OPERATION` |

---

## 3. Confirmação de Cadastro

### Fluxo
1. O formulário de registo é preenchido.
2. O sistema verifica se já existe uma conta com esse email:
   - Se existir com status `ACTIVE` → rejeita com erro de email já registado.
   - Se existir com status `PENDING` e token **ainda válido** → rejeita o registo e informa que um email de confirmação já foi enviado.
   - Se existir com status `PENDING` e token **expirado** → remove a conta e o token antigos e permite um novo registo (ver secção abaixo).
3. A conta é criada com status `PENDING` (não ativa).
4. Um token único é gerado e o email de confirmação é enviado.
5. O link no email é clicado → token validado → conta ativada para `ACTIVE`.
6. Após ativação, redireciona para o ecrã de login:
   `A:/Arquivos/zynix_template/dist/html/sign-in-basic.html`

### Re-cadastro após Token Expirado

Quando se tenta registar com um email que já existe no sistema em estado `PENDING`, o comportamento depende da validade do token de confirmação associado a essa conta.

**Se o token ainda estiver válido**, significa que o registo foi feito recentemente mas o email ainda não foi confirmado. O novo registo é rejeitado e é apresentada a mensagem: _"Um email de confirmação já foi enviado. Verifica a tua caixa de entrada."_ O registo anterior é preservado.

**Se o token já estiver expirado**, o email não foi confirmado dentro do prazo e a conta ficou inativa. O sistema remove automaticamente a conta `PENDING` e o token associado, como se o registo anterior nunca tivesse existido, e permite um novo registo de forma normal — sem erros de email duplicado e sem expor que o endereço já tinha sido utilizado.

> Em nenhum cenário o sistema confirma ou nega se um email específico está registado na plataforma.

### Regras do Token
| Propriedade | Valor |
|---|---|
| Geração | `crypto.randomBytes(32).toString('hex')` (64 chars, OWASP) |
| Duração | 24 horas |
| Uso | Único — invalidado imediatamente após uso |
| Armazenamento | Tabela `EmailToken` no banco (não no JWT) |

### Regras de Segurança
- Conta com status `PENDING` **não pode fazer login**.
- Reenvio do email de confirmação limitado a **3 tentativas por hora por email**.
- O link de confirmação deve usar **HTTPS** obrigatoriamente.
- Após confirmação bem-sucedida, o token é marcado como `used: true` e não pode ser reutilizado.

### Rate Limiting
| Camada | Limite |
|---|---|
| Por IP | 10 requisições / 10 minutos |
| Por email (banco) | 3 reenvios / 60 minutos |

---

## 4. Convite para Projeto

### Problema Identificado
> ⚠️ **Bug reportado:** ao criar um convite, o utilizador convidado não está a receber o email de notificação. O envio do email de convite deve ser disparado no momento em que o convite é registado na plataforma.

### Fluxo
1. Um convite é criado para um email associado a um projeto.
2. O sistema gera um token de convite (`ACCOUNT_INVITE`) com duração de 72 horas.
3. O email de convite é enviado imediatamente para o endereço indicado.
4. O link do email é clicado — o sistema verifica o estado da conta:
   - **Se já existir conta ativa** → redireciona para o ecrã de login:
     `A:/Arquivos/zynix_template/dist/html/sign-in-basic.html`
     Após autenticação, o convite é associado à conta existente.
   - **Se não existir conta** → redireciona para o ecrã de criação de password:
     `A:/Arquivos/zynix_template/dist/html/create-password-basic.html`
     O email é pré-preenchido e marcado como confirmado automaticamente.
5. Após a aceitação, o token é marcado como `used: true`.

### Email Pré-confirmado por Convite

Ao clicar no link do convite fica implícito que existe acesso à caixa de correio — o que equivale a uma confirmação de email. Por isso:

- O campo `emailVerified` da conta é marcado como `true` no momento da aceitação do convite.
- Após criar a conta através do convite, **não é enviado nenhum email adicional de confirmação**.
- Este comportamento aplica-se exclusivamente a contas criadas via convite. Registos normais continuam a exigir confirmação por email.

### Regras do Token
| Propriedade | Valor |
|---|---|
| Geração | `crypto.randomBytes(32).toString('hex')` (64 chars, OWASP) |
| Duração | 72 horas |
| Uso | Único — invalidado imediatamente após uso |
| Armazenamento | Tabela `EmailToken` no banco |

### Regras de Segurança
- O link de convite não deve revelar informações sobre o projeto ou permissões antes da autenticação.
- Um mesmo email não pode ter mais de um convite ativo em simultâneo — ao criar novo convite, o anterior é invalidado.
- O reenvio de convite gera um novo token e invalida o anterior.

### Rate Limiting
| Camada | Limite |
|---|---|
| Por IP | 10 requisições / 10 minutos |
| Por email (banco) | 3 convites / 24 horas |

---

## 5. Recuperação de Password

### Fluxo
1. O ecrã de login é acedido e o link **Forgot Password** é clicado:
   `A:/Arquivos/zynix_template/dist/html/sign-in-basic.html`
2. O email é inserido — o sistema responde sempre com mensagem neutra, independentemente de o email existir.
3. Se o email existir com status `ACTIVE`, um token é gerado e o email de recuperação é enviado.
4. O link no email é clicado → redireciona para o ecrã de reset de password:
   `A:/Arquivos/zynix_template/dist/html/reset-password-basic.html`
5. A nova password é definida → token invalidado → redireciona para o ecrã de login.

### Regras do Token
| Propriedade | Valor |
|---|---|
| Geração | `crypto.randomBytes(32).toString('hex')` (64 chars, OWASP) |
| Duração | 15 minutos |
| Uso | Único — invalidado imediatamente após uso |
| Armazenamento | Tabela `EmailToken` no banco |

### Regras de Segurança
- Resposta do endpoint é sempre neutra: _"Se o email existir, receberás as instruções."_
- Apenas contas com status `ACTIVE` recebem email de recuperação.
- Token expirado ou já utilizado retorna erro genérico sem indicar o motivo específico — ver secção de Páginas de Erro.
- Após redefinição bem-sucedida, **todas as sessões JWT ativas são invalidadas**.
- A nova password não pode ser igual à password anterior.
- O link de recuperação deve usar **HTTPS** obrigatoriamente.

> O campo **Remember Password** presente em `sign-in-basic.html` não é implementado.

### Rate Limiting
| Camada | Limite |
|---|---|
| Por IP | 5 requisições / 10 minutos |
| Por email (banco) | 3 tentativas / 15 minutos |

---

## 6. Páginas de Erro

Deve ser criado um local centralizado para gerir todas as páginas de erro da aplicação. Centralizar evita que mensagens de erro sejam definidas em vários sítios do código, tornando a manutenção mais simples e garantindo consistência visual e de linguagem.

### Localização sugerida
```
src/
  errors/
    pages/
      TokenExpiredPage.tsx
      TokenUsedPage.tsx
      NotFoundPage.tsx
      UnauthorizedPage.tsx
    components/
      ErrorLayout.tsx        ← layout comum a todas as páginas de erro
    constants/
      errorMessages.ts       ← todas as mensagens de erro centralizadas aqui
```

### Erros a cobrir neste fluxo

| Situação | Página | Mensagem ao utilizador |
|---|---|---|
| Token de confirmação expirado | `TokenExpiredPage` | Mensagem genérica sem revelar o motivo |
| Token de convite expirado | `TokenExpiredPage` | Mensagem genérica sem revelar o motivo |
| Token de reset expirado | `TokenExpiredPage` | Mensagem genérica sem revelar o motivo |
| Token já utilizado | `TokenUsedPage` | Mensagem genérica sem revelar o motivo |
| Link inválido ou adulterado | `NotFoundPage` | Mensagem genérica |

> Nenhuma página de erro deve indicar o motivo técnico específico da falha — apenas informar que o link não é válido e sugerir repetir o processo.

---

## 7. Regras de Password

> ⚠️ **Nota de desenvolvimento:** as regras abaixo definem o comportamento esperado para produção. Enquanto a aplicação estiver em fase de desenvolvimento, **não é necessário implementar validações de password**. A validação deve ser activada antes da passagem a produção.

Regras a implementar:
- Mínimo de **8 caracteres**
- Pelo menos **1 letra maiúscula**
- Pelo menos **1 número**
- Pelo menos **1 caractere especial** (`!@#$%^&*`)
- Não pode ser igual à password anterior
- Armazenada com **bcrypt** (salt rounds: 12)

---

## 8. Documentação de Envio de Emails

> 📄 **Ação necessária:** a documentação de envio de emails da aplicação deve ser atualizada para refletir os fluxos descritos neste documento, nomeadamente:
> - Confirmação de cadastro
> - Convite para projeto (incluindo correção do bug de envio)
> - Recuperação de password
>
> Cada fluxo deve indicar o template de email utilizado, o momento do disparo e as condições que o acionam.

---

## 9. Tabela EmailToken (Prisma)

```prisma
model EmailToken {
  id        String    @id @default(uuid())
  token     String    @unique
  type      TokenType
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  expiresAt DateTime
  used      Boolean   @default(false)
  createdAt DateTime  @default(now())
}

enum TokenType {
  EMAIL_CONFIRMATION
  PASSWORD_RESET
  ACCOUNT_INVITE
  SENSITIVE_OPERATION
}
```

O modelo `User` deve incluir o campo `emailVerified` para suportar a confirmação automática por convite:

```prisma
model User {
  emailVerified Boolean @default(false)
  // ... restantes campos
}
```

---

## 10. Limpeza de Dados (Cleanup)

> ⏳ **Para o futuro:** quando a aplicação estiver estável, implementar um job periódico (ex: cron diário) para eliminar registos obsoletos do banco — contas `PENDING` com token expirado, tokens já usados e convites não aceites fora do prazo.

---

*Documento gerado com base nas recomendações da OWASP para autenticação e gestão de tokens.*
