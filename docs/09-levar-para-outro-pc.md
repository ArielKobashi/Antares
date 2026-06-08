# Levar o ANTARES para outro PC

Este guia prepara o projeto para continuar em outra maquina Windows.

## 1. Gerar o pacote

No PC atual, dentro de `C:\Users\davi.souza\Documents\Antares`, rode:

```bat
scripts\package-project.cmd
```

O script cria um `.zip` na pasta acima do projeto, sem:

- `node_modules`
- `.tools`
- `.env`
- banco SQLite local
- builds gerados

Esses itens devem ser recriados no outro PC.

## 2. Copiar para casa

Copie o `.zip` gerado para pendrive, nuvem ou outro meio.

No PC de casa, extraia em uma pasta simples, por exemplo:

```text
C:\Projetos\Antares
```

Evite pastas com acentos ou caminhos muito longos.

## 3. Preparar Node

### Opcao A: Node instalado no PC

Instale Node.js 20 ou superior e rode os scripts normalmente.

### Opcao B: Node portatil

Crie a pasta:

```text
C:\Projetos\Antares\.tools
```

Copie uma pasta de Node portatil para dentro dela. O script reconhece automaticamente:

```text
.tools\node-v24.16.0-win-x64
.tools\node-v22.22.3-win-x64
```

Se a pasta tiver outro nome, renomeie para um desses nomes ou instale Node no sistema.

## 4. Instalar dependencias

Dentro do projeto extraido:

```bat
scripts\portable-install.cmd
```

## 5. Criar banco demo

```bat
scripts\portable-db.cmd
```

Esse comando recria o SQLite local com dados de demonstracao.

## 6. Rodar o sistema

```bat
scripts\portable-dev.cmd
```

URLs:

- Web: `http://localhost:5173`
- API: `http://localhost:3333`

Login:

- Email: `admin@antares.local`
- Senha: `admin123`

## 7. Parar o sistema

```bat
scripts\portable-stop.cmd
```

## 8. Observacoes importantes

- Nao precisa Docker para desenvolvimento local.
- O banco local fica em `packages\database\prisma\dev.db`.
- Se der erro `EPERM` no Prisma, feche as janelas da API/Web ou rode `scripts\portable-stop.cmd` e tente novamente.
- Para zerar os dados demo, rode `scripts\portable-db.cmd` outra vez.
- Para levar dados reais junto, copie manualmente o arquivo `packages\database\prisma\dev.db`, mas isso nao e recomendado para desenvolvimento inicial.
