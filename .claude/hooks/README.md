# Guardia de Claude Code en Weda (`guard.sh`)

Hook `PreToolUse` registrado en `../settings.json` para `Bash|Read|Edit|MultiEdit|Write|NotebookEdit|Grep`. Revisa cada llamada entera y responde una de tres cosas:
- **deny**: la bloquea.
- **ask**: pide aprobación (solo en modo `default`).
- **nada**: la llamada sigue el flujo normal de permisos.

Este documento describe el estado vigente. Cómo se llegó hasta acá (pruebas, decisiones y auditoría de E3) está en [HISTORIAL.md](HISTORIAL.md).

## Por qué existe

Las reglas `Bash(...)` de `settings.json` comparan el **comienzo** de cada subcomando, y la documentación oficial aclara que no son un límite de seguridad. No ven, por ejemplo:
- `git push origin main --force` (el flag va al final);
- `if true; then …; fi`, `timeout 60 …` o `bash -c "…"`;
- `git reset --har` (git acepta abreviaturas);
- `npx vercel@latest`.

Además, **en modo `auto` (y en `acceptEdits`) una regla `ask` no frena la llamada**, ni la de settings ni la del hook. Se comprobó el 2026-10-31. En modo `default`, la pregunta aparece y frena.

## Qué cubre

| Qué | Decisión | Notas |
|---|---|---|
| `.env`, `.env.*` (salvo `.env.example`), `.dev.vars`, `.data*/`, `~/.ssh/`, `~/.config/gh/`, `~/.aws/`, `.netrc`, `.git-credentials`, `.npmrc`, `.pypirc` | deny | En cualquier herramienta y en cualquier palabra de un comando, sin distinguir mayúsculas. |
| Lecturas de rutas no literales (`cat $X`, `cat $(…)`, `. $X`) | deny | No se puede saber qué leen. |
| `grep -r`, `rg --hidden`/`--no-ignore`, `tar`, `cp -r`, `rsync`, `zip -r`, `find -exec` sobre una carpeta con `.env*`, `.data*` u otras credenciales | deny | Solo mira el primer nivel de la carpeta, o el proyecto si la carpeta lo contiene. |
| `printenv`, `env` sin comando, `export -p`, `set`, `gh auth token`, `gh auth status --show-token`, `gh auth login/logout/…` | deny | Muestran o cambian credenciales. |
| `sqlite3`, `node:sqlite`, `--experimental-sqlite` | deny | |
| `git push`: `--force`, `--force-with-lease`, `--mirror`, `--delete`, `--prune`, `-f`, `-d`, `+ref`, `:ref` | deny | En cualquier posición y abreviados (`--forc`). |
| `git push` de tags: `--tags`, `--follow-tags`, `refs/tags/…`, o un ref que no es una rama confirmada | deny | |
| `git reset --hard` (y `--har`), `git clean`, `git branch -D/-M/-C/--force`, `rm -rf` | deny | |
| `git update-ref`, `filter-branch`, `filter-repo`, `send-pack`, `replace`, `reflog expire/delete`, `gc --prune`, `stash clear/drop` | deny | |
| `git -c` con claves que no son de la lista segura (`user.*`, `color.*`, `advice.*`, `init.defaultBranch`, `log.*`, `i18n.*`, `core.quotepath`); `git config alias.*`, `core.*`, `remote.*`, `url.*`, `push.*`, etc. | deny | Evita alias e inyección de comandos. |
| `--upload-pack`, `--receive-pack`, `--exec`, `git clone -u`, `git log/diff/show --output`, `git fetch +ref` o `-f` | deny | Ejecutan programas, escriben archivos o pisan ramas. |
| Crear, mover o borrar tags (con la regla real de git: `--sort`, `--format`, `--column` o `-i` con un nombre **crean** un tag) | deny | Leer tags pasa. |
| Merge de PR (`gh pr merge`) | deny | |
| `gh api`: método distinto de GET/HEAD, campos sin `-X GET`, `--input`; en GraphQL, `mutation` o una consulta no literal (`$`, `@archivo`) | deny | |
| `curl`/`wget` con escritura a `github.com` | deny | |
| `gh repo delete/edit/rename/archive/create/fork/sync…`, `secret`, `variable`, `release`, `workflow`, `extension`, `gist`, `alias`, `config`, `ssh-key`… (salvo listar o ver) | deny | |
| Deploys: `vercel`, `vc`, `wrangler`, `netlify`, `netlify-cli`, `ntl`, `fly`, `flyctl`, `railway`, `@railway/cli` (también con `@versión`) | deny | |
| Texto `disableAllHooks` en un comando o en el contenido de un archivo | deny | Apagaría todos los hooks. |
| Comandos de más de 64 KB | deny | No se podrían revisar antes del timeout (10 s). El peor caso admitido tarda unos 3 s. |
| **Según el modo**: `git commit`, `git push` normal, `gh pr create`, `gh pr close/reopen`, `git merge/rebase/pull/cherry-pick/revert/am/apply`, `git stash pop/apply`, `git restore`, `git checkout -- …`, `git switch -f`, `git rm -r` | ask en `default`, **deny** en cualquier otro modo o si el modo no llega | |
| **Según el modo**: escribir la configuración de Claude Code (`.claude/settings*.json`, también `~/.claude/settings*.json`; `.claude/hooks/`, `.claude/rules/`; `CLAUDE.md`, `AGENTS.md`), con Edit/Write o desde Bash | ask en `default`, **deny** en otro modo | La guardia se protege a sí misma. Leer esos archivos pasa. |
| **Según el modo**: escribir `src/server/db.ts` (esquema), con Edit/Write o desde Bash (`sed -i`, `>`, `cp`, `git checkout --`…) | ask en `default`, **deny** en otro modo | |

Cómo encuentra los comandos:
- Separa el comando en tramos por `;`, `&`, `|`, saltos de línea, `$(…)`, comillas invertidas y paréntesis.
- En cada tramo, **cualquier palabra** puede ser el comando real. Así ve `if …; then git push …`, `timeout 60 git …`, `find -exec git …` o `python3 -c "subprocess.run(['git','push',…])"`.
- Si git o gh llegan por una variable o por `$(which git)`, analiza lo que sigue.
- `${IFS}` cuenta como espacio.
- Sigue los `cd` y el `git -C` para saber en qué repo corre cada `git push`.

## Qué pasa si el hook falla

| Situación | Resultado |
|---|---|
| Falta `jq` (usa `python3`) | Funciona igual. |
| Faltan `jq` y `python3`, o el JSON es inválido | **deny** (falla cerrada). |
| No llega `permission_mode` | Las operaciones según modo se bloquean. |
| El script se pasa del timeout, devuelve un error distinto de 2 o no se puede ejecutar | **La llamada sigue** (los hooks de Claude Code fallan abiertos). `onFailure: "block"` existe recién desde la 2.1.295; mientras la CLI de terminal sea 2.1.84 no se usa. |
| Alguien edita `guard.sh`, `settings*.json` o agrega `disableAllHooks` | deny fuera del modo `default`; en `default`, pregunta. |
| CLI de terminal 2.1.84 | **Revisada por código, no validada en ejecución.** El paquete instalado acepta `hookSpecificOutput.permissionDecision` (`allow`, `deny`, `ask`) con `permissionDecisionReason`, trata `deny` como bloqueo y le pasa `permission_mode` al hook. La prueba real se intentó el 2026-10-31 en un repo descartable con una copia exacta del hook y de los permisos, pero la CLI respondió `401 OAuth access token is invalid` antes de usar herramientas, en modo no interactivo e interactivo, dentro de la app. El hook nunca llegó a ejecutarse. **Pendiente:** repetir las pruebas desde Terminal.app con la CLI autenticada. **Riesgo mientras tanto:** si esa versión no aplicara la decisión, el hook no protegería nada desde la terminal. Todas las pruebas reales se hicieron con la app 2.1.309. |

## Límites conocidos (no cubiertos)

- **Análisis léxico, no un intérprete de shell.** No ve lo que hace un script (`sh deploy.sh`, `npm run x`, un `.py`), ni comandos armados con variables que no empiezan por git o gh, ni alias de git ya guardados en la configuración.
- **Borrado masivo sin `-f`:** `rm -r`, `find -delete` y `mv` sobre carpetas no se controlan.
- **Lectura recursiva:** solo detecta secretos en el primer nivel de la carpeta (o del proyecto).
- **Herramientas fuera del matcher:** las herramientas MCP y el navegador no pasan por el hook.
- **Deploys desde GitHub:** la integración de Vercel conectada al repo despliega cada push (vista previa) y cada merge. El hook no la controla.
- **Reglas `ask` de settings:** las que no repite el hook (`npm install`, `Edit(./package.json)`…) no frenan nada fuera del modo `default`.

## Falsos positivos conocidos y cómo evitarlos

| Caso | Por qué | Alternativa |
|---|---|---|
| Un comando que solo *menciona* una ruta protegida o un comando peligroso (por ejemplo `git commit -m "… rm -rf …"`, un heredoc con `.env`, un `grep` de `git push`) | No distingue un texto de un comando | `git commit -F archivo`, `gh pr create --body-file archivo`, escribir el texto con Write, o la herramienta Grep. |
| `;`, `&&` o `\|` dentro de comillas | Parten el comando | Lo mismo. |
| `gh api … -f x=y` para leer | Sin `-X GET`, gh usa POST | Agregar `-X GET`. |
| `git push --dry-run`, `git push origin <sha>:rama`, rama que no existe localmente | Se tratan como push o como ref no confirmado | Hacerlo en modo `default` o pedírselo a la dueña. |
| `cat "$(git rev-parse --show-toplevel)/README.md"` | Ruta no literal | Escribir la ruta. |
| `grep -r` sobre el repo cuando existen `.env` o `.data` | Leería secretos | Buscar en una subcarpeta o usar la herramienta Grep (respeta `.gitignore`). |
| Commit, push y PR fuera del modo `default` | Por diseño | Pasar la sesión a `default`. Ojo: la app a veces la devuelve sola a `auto` o `acceptEdits`. |

## Probar

```bash
bash .claude/hooks/guard.test.sh
```

Le pasa al hook el JSON de cada caso, sin ejecutar ningún comando: cada fila es una decisión esperada. Incluye las sondas de la auditoría del 2026-10-31. Para probar una copia del hook antes de reemplazarlo:

```bash
GUARD_HOOK=/ruta/a/guard.sh bash .claude/hooks/guard.test.sh
```

Cambiar el hook o este README necesita modo `default`: la guardia protege `.claude/`.
