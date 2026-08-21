# Guia de Deploy — Gás Pago

## Requisitos do Servidor

- Ubuntu 22.04 ou superior
- Docker e Docker Compose instalados
- Git instalado
- Portas 80 e 443 abertas no firewall

## Configuração Inicial (Primeira Vez)

1. Clone o repositório no servidor:
   ```bash
   git clone <url-do-repositorio> /opt/gaspago
   cd /opt/gaspago
   ```

2. Configure o arquivo de variáveis de ambiente:
   ```bash
   cp .env.example .env
   nano .env
   ```

3. Suba os containers:
   ```bash
   docker compose up --build -d
   ```

4. Execute as migrações do banco de dados:
   ```bash
   docker exec gaspago-api npx prisma migrate deploy
   ```

## Secrets do GitHub Actions

Configure os seguintes secrets no repositório GitHub (Settings > Secrets and variables > Actions):

| Secret        | Descrição                                      |
|---------------|------------------------------------------------|
| `VPS_HOST`    | Endereço IP ou domínio do servidor VPS         |
| `VPS_USER`    | Usuário SSH do servidor (ex: `root` ou `ubuntu`) |
| `VPS_SSH_KEY` | Chave SSH privada para autenticação             |
| `VPS_PORT`    | Porta SSH do servidor (padrão: `22`)            |

## Variáveis de Ambiente Necessárias

| Variável          | Descrição                                                   |
|-------------------|-------------------------------------------------------------|
| `MASTER_KEY`      | Chave mestre para criptografia. Gere com: `openssl rand -hex 32` |
| `ADMIN_EMAIL`     | E-mail do administrador principal                           |
| `ADMIN_PASSWORD`  | Senha do administrador principal                            |

As demais credenciais (banco de dados, integrações) devem ser configuradas via painel SuperAdmin após o primeiro acesso.

## Como Funciona o CI/CD

- **Push para `master`**: O GitHub Actions executa automaticamente o deploy no servidor VPS via SSH.
- **Pull Request para `master`**: O GitHub Actions valida o TypeScript antes de permitir o merge.
- **Deploy manual**: Acesse a aba "Actions" no GitHub e execute o workflow "Deploy to VPS" manualmente, ou utilize o script `deploy.sh` diretamente no servidor.

## Deploy Manual via Script

Para executar o deploy manualmente no servidor:

```bash
cd /opt/gaspago
bash deploy.sh
```
