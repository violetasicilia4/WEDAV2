#!/usr/bin/env bash
# Casos de la guardia (.claude/hooks/guard.sh). Uso: bash .claude/hooks/guard.test.sh
# Cada fila: decisión esperada (deny | ask | allow), herramienta y comando o ruta.
# Le pasa al hook el JSON de cada llamada; no ejecuta ningún comando. Necesita jq.
# GUARD_HOOK y GUARD_ROOT permiten probar una copia del hook contra este repo.

dir=$(cd "$(dirname "$0")" && pwd)
root=${GUARD_ROOT:-$(cd "$dir/../.." && pwd)}
hook=${GUARD_HOOK:-$dir/guard.sh}
fail=0

# Modo de permisos que recibe el hook: default salvo que la sección fije otro. Con mode='' no se envía.
mode=default

run() { # $1 = esperado, $2 = herramienta, $3 = comando o ruta, $4 = cwd (Bash) o contenido (Write)
  local json out got
  if [[ $2 == Bash ]]; then
    json=$(jq -n --arg c "$3" --arg d "${4:-$root}" '{tool_name:"Bash",tool_input:{command:$c},cwd:$d}')
  else
    json=$(jq -n --arg t "$2" --arg p "$3" --arg d "$root" --arg x "${4:-}" '{tool_name:$t,tool_input:{file_path:$p,path:$p,content:$x},cwd:$d}')
  fi
  json=$(printf '%s' "$json" | jq --arg m "$mode" 'if $m == "" then . else . + {permission_mode: $m} end')
  out=$(printf '%s' "$json" | CLAUDE_PROJECT_DIR=$root "$hook")
  got=$(printf '%s' "$out" | jq -r '.hookSpecificOutput.permissionDecision // "allow"' 2>/dev/null)
  [[ -z $got ]] && got=allow
  if [[ $got == "$1" ]]; then
    printf 'ok    %-5s %-6s %s\n' "$got" "$2" "$3"
  else
    printf 'FALLA esperaba %s, dio %s: %s %s\n' "$1" "$got" "$2" "$3"
    fail=1
  fi
}

# Secretos y datos locales
run deny  Read  "$root/.env"
run deny  Read  "$root/.env.local"
run deny  Read  "$root/.env.production"
run allow Read  "$root/.env.example"
run deny  Read  "$root/.dev.vars"
run deny  Read  "$root/.data/weda.db"
run deny  Read  "$root/.data-e2e/weda.db"
run deny  Read  "$HOME/.ssh/id_ed25519"
run deny  Read  "$HOME/.config/gh/hosts.yml"
run deny  Write "$root/.env"
run deny  Edit  "$root/.env.local"
run deny  Grep  "$root/.env"
run allow Read  "$root/src/server/api.ts"
run deny  Bash  'cat .env'
run deny  Bash  'head .env'
run deny  Bash  'less ./.env'
run deny  Bash  "tail -n 5 $root/.env"
run deny  Bash  'source .env'
run deny  Bash  '. ./.env.local'
run deny  Bash  'node -e "1" < .env'
run deny  Bash  'grep KEY .env.production'
run deny  Bash  'cat .e""nv'
run deny  Bash  'cat \.env'
run deny  Bash  'cat "$(pwd)/.env"'
run deny  Bash  'export $(cat .env | xargs)'
run deny  Bash  'node --env-file=.env server.js'
run deny  Bash  'ls .data'
run deny  Bash  'node -e "require(\"fs\").readFileSync(\".data/weda.db\")"'
run deny  Bash  'cat ~/.ssh/id_ed25519'
run deny  Bash  'cat $HOME/.ssh/config'
run deny  Bash  'cat ${HOME}/.config/gh/hosts.yml'
run allow Bash  'cat .env.example'
run allow Bash  'head -5 .env.example'
run allow Bash  'cat .env.ex*'

# git push en cualquier posición
run deny  Bash  'git push --dry-run origin main --force'
run deny  Bash  'git push origin main -f'
run deny  Bash  'git push -uf origin main'
run deny  Bash  'git push origin main --force-with-lease=main'
run deny  Bash  'git push --mirror'
run deny  Bash  'git push origin --delete chore/x'
run deny  Bash  'git push origin :chore/x'
run deny  Bash  'git push origin +main'
run deny  Bash  'git -C . push origin main --force'
run deny  Bash  'git status && git push origin main --force'
run deny  Bash  'bash -c "git push origin main --force"'
run ask   Bash  'git push --dry-run -u origin chore/claude-hooks'
run ask   Bash  'git push origin chore/claude-hooks'

# Otros comandos destructivos
run deny  Bash  'git reset --hard'
run deny  Bash  'git reset HEAD~1 --hard'
run allow Bash  'git reset --soft HEAD~1'
run deny  Bash  'git clean -n'
run deny  Bash  'git clean -fd'
run deny  Bash  'git branch -D chore/x'
run deny  Bash  'git branch --delete --force chore/x'
run deny  Bash  'git branch -df chore/x'
run allow Bash  'git branch -d chore/x'
run allow Bash  'git branch --show-current'
run deny  Bash  'rm -rf dist'
run deny  Bash  'rm -fr dist'
run deny  Bash  'rm -r -f dist'
run deny  Bash  'rm -Rf dist'
run deny  Bash  'rm --recursive --force dist'
run deny  Bash  'npm run build && rm -rf dist'
run allow Bash  'rm dist/index.html'
run deny  Bash  'sqlite3 --version'
run deny  Bash  '/usr/bin/sqlite3 x.db ".tables"'
run deny  Bash  'vercel --prod'
run deny  Bash  'npx vercel deploy'
run deny  Bash  'npx wrangler deploy'
run deny  Bash  'netlify deploy'
run deny  Bash  'fly deploy'
run deny  Bash  'flyctl deploy'
run deny  Bash  'railway up'
run deny  Bash  'FOO=1 npx -y vercel'
# Falso positivo aceptado: el hook no distingue un mensaje de un comando. Usar git commit -F archivo.
run deny  Bash  'git commit -m "documenta rm -rf y sqlite3"'
run allow Bash  'npm run typecheck'
run allow Bash  'git log --oneline -5'

# Tags: leer pasa; crear, mover, borrar y publicar se bloquea
tags=$(mktemp -d)
git -C "$tags" init -q && git -C "$tags" -c user.name=t -c user.email=t@t commit -q --allow-empty -m x && git -C "$tags" tag v1
run allow Bash  'git tag'
run allow Bash  'git tag --list'
run allow Bash  'git tag -l "v*"'
run allow Bash  'git tag -n5 v1*'
run allow Bash  'git tag --contains HEAD'
run allow Bash  'git tag --sort=-creatordate --format=%(refname)'
run allow Bash  'git describe --tags'
run allow Bash  'git ls-remote --tags origin'
run deny  Bash  'git tag prueba-e3'
run deny  Bash  'git tag -a v2 -m nota'
run deny  Bash  'git tag -am nota v2'
run deny  Bash  'git tag -f v1'
run deny  Bash  'git tag -d v1'
run deny  Bash  'git tag --delete v1'
run deny  Bash  'bash -c "git tag -d v1"'
# Las reglas allow de settings (git tag, git tag -n…, git tag -l…, git tag --list…) comparan el comienzo;
# lo que impide que habiliten una escritura es este deny del hook.
run allow Bash  'git tag -n'
run allow Bash  'git tag -n3'
run allow Bash  'git tag -n "v*"'
run deny  Bash  'git tag -n -d v1'
run deny  Bash  'git tag -n -a v2 -m nota'
run deny  Bash  'git tag -n5 -f v1'
run deny  Bash  'git tag -nd v1'
run deny  Bash  'git tag -l -d v1'
run deny  Bash  'git tag -l --delete v1'
run deny  Bash  'git tag --list -f v1'
run deny  Bash  'git tag --list v1 --force'
run deny  Bash  'git tag -n && git tag v2'
run deny  Bash  'git tag; git tag -d v1'
run deny  Bash  'sh -c "git tag -n -d v1"'
run deny  Bash  'eval "git tag -l -d v1"'
run deny  Bash  'echo v1 | xargs git tag -d'
run deny  Bash  'git -C /tmp tag -d v1'
run deny  Bash  'git tag -s v2'
run deny  Bash  'git tag -u clave v2'
run deny  Bash  'git tag -F nota.txt v2'
run deny  Bash  'git tag v2 HEAD~1'
run deny  Bash  'git push --tags'
run deny  Bash  'git push origin --follow-tags'
run deny  Bash  'git push origin refs/tags/v1'
run deny  Bash  'git push origin v1'                     "$tags"
run deny  Bash  'git push origin v1:v1'                  "$tags"
run ask   Bash  'git push origin main'                   "$tags"
run ask   Bash  'git push -u origin HEAD'                "$tags"
run ask   Bash  'git push origin main 2>&1 | tail -1'    "$tags"
run ask   Bash  'git push origin main >&2'               "$tags"
run deny  Bash  'git push origin v1 2>&1 | tail -1'      "$tags"
run deny  Bash  'git push --force 2>/dev/null'
run deny  Bash  'git push origin main --force &> /dev/null'
# El hook tiene que seguir el cd o el -C del comando, no la carpeta de la sesión.
run deny  Bash  "cd $tags && git push origin v1"
run deny  Bash  "git -C $tags push origin v1"
run ask   Bash  "cd $tags && git push origin main"
run deny  Bash  "cd $tags && git push origin rama-que-no-existe"
rm -r "$tags"

# FN-1: merge de PR, también envuelto
run deny  Bash  'gh pr merge 99999'
run deny  Bash  'gh pr merge --squash 99999'
run deny  Bash  'gh pr -R violetasicilia4/WEDAV2 merge 99999'
run deny  Bash  'git status && gh pr merge 99999'
run deny  Bash  'bash -c "gh pr merge 99999"'
run deny  Bash  'sh -c "gh pr merge 99999"'
run deny  Bash  'zsh -c "gh pr merge 99999"'
run deny  Bash  'eval "gh pr merge 99999"'
run deny  Bash  'echo 99999 | xargs gh pr merge'
run deny  Bash  'env GH_REPO=x/y gh pr merge 99999'
run deny  Bash  '/opt/homebrew/bin/gh pr merge 99999'
run deny  Bash  'gh alias set m "pr merge"'
run allow Bash  'gh pr view 2 --json mergedAt'
run allow Bash  'gh pr list --state all'
run allow Bash  'gh pr checks 2'

# FN-2: escrituras por gh api (REST y GraphQL); lecturas pasan
run deny  Bash  'gh api -X PUT repos/violetasicilia4/WEDAV2/pulls/99999/merge'
run deny  Bash  'gh api --method PUT repos/o/r/pulls/1/merge'
run deny  Bash  'gh api --method=delete repos/o/r'
run deny  Bash  'gh api -XPATCH repos/o/r/git/refs/heads/main -f sha=abc -F force=true'
run deny  Bash  'gh api repos/o/r/git/refs/heads/main -X PATCH -F force=true'
run deny  Bash  'gh api repos/o/r/issues -f title=x'
run deny  Bash  'gh api repos/o/r/actions/secrets/X --input body.json'
run deny  Bash  'gh api graphql -f query="mutation { mergePullRequest(input: {pullRequestId: \"x\"}) { clientMutationId } }"'
run deny  Bash  'gh api graphql -F query=@consulta.graphql'
run deny  Bash  'bash -c "gh api -X DELETE repos/o/r"'
run deny  Bash  'sh -c "gh api --method=PATCH repos/o/r -f name=x"'
run deny  Bash  'eval "gh api repos/o/r/pulls/1/merge -X PUT"'
run deny  Bash  'env GH_TOKEN=x gh api -X POST repos/o/r/issues'
run deny  Bash  'echo x | xargs gh api -X DELETE'
run deny  Bash  'gh api repos/o/r/git/refs -F ref=refs/tags/v1 -F sha=abc'
run deny  Bash  'gh api -X post repos/o/r/issues'
run deny  Bash  'gh api graphql --input mutacion.json'
run deny  Bash  'gh api graphql -f query="MUTATION { x }"'
run allow Bash  'gh api repos/violetasicilia4/WEDAV2/pulls'
run allow Bash  'gh api -X GET repos/o/r/pulls -f per_page=100'
run allow Bash  'gh api repos/o/r/pulls --jq .[].number'
run allow Bash  'gh api graphql -f query="query { viewer { login } }"'

# Esquema
run ask   Edit  "$root/src/server/db.ts"
run ask   Write "$root/src/server/db.ts"
run allow Read  "$root/src/server/db.ts"
run allow Edit  "$root/src/server/service.ts"

# Opción A: commit, push, crear PR y esquema preguntan en modo default y se bloquean en cualquier otro
# modo (o si el modo no llega), porque ahí la pregunta no frena la llamada.
run ask   Bash  'gh pr create --title x --body y'
run ask   Bash  'gh pr -R violetasicilia4/WEDAV2 create --fill'
run ask   Bash  'bash -c "git commit -m x"'
run ask   Bash  'git add -A && git commit -m x'
run deny  Bash  'git commit -m x && git push --force'
run deny  Bash  'git commit -m x && gh pr merge 1'
run allow Bash  'git status'
for mode in auto acceptEdits bypassPermissions dontAsk plan ''; do
  run deny  Bash  'git commit -m x'
  run deny  Bash  'git commit --amend --no-edit'
  run deny  Bash  'bash -c "git commit -m x"'
  run deny  Bash  'git push origin chore/claude-hooks'
  run deny  Bash  'git push --dry-run -u origin chore/claude-hooks'
  run deny  Bash  'sh -c "git push origin chore/claude-hooks"'
  run deny  Bash  'gh pr create --title x --body y'
  run deny  Bash  'eval "gh pr create --fill"'
  run deny  Edit  "$root/src/server/db.ts"
  run deny  Write "$root/src/server/db.ts"
  run deny  MultiEdit "$root/src/server/db.ts"
  run allow Bash  'git status'
  run allow Bash  'git log --oneline -3'
  run allow Bash  'gh pr view 2'
  run allow Bash  'git tag -n'
  run allow Edit  "$root/src/server/service.ts"
done
mode=default

# ---------------------------------------------------------------------------------------------------
# Auditoría independiente (2026-10-31): cada fila es una evasión o un falso positivo encontrado.
# ---------------------------------------------------------------------------------------------------
mode=auto

# A1. Estructuras de control
run deny  Bash  'if true; then git push origin main --force; fi'
run deny  Bash  'for i in 1; do git push origin main --force; done'
run deny  Bash  '! git push origin main --force'
run deny  Bash  'if true; then git commit -m x; fi'
run deny  Bash  'then git reset --hard'
run deny  Bash  'if true; then gh pr merge 3; fi'

# A2. Envoltorios con argumento o fuera de la lista
run deny  Bash  'timeout 60 git push origin main --force'
run deny  Bash  'nice -n 5 git push origin main --force'
run deny  Bash  'env -u FOO git push origin main --force'
run deny  Bash  'sudo -u otra git push origin main --force'
run deny  Bash  'xargs -n 1 git push origin main --force'
run deny  Bash  'bash -o pipefail -c "git push origin main --force"'
run deny  Bash  'caffeinate -i git push origin main --force'
run deny  Bash  'arch -arm64 git push origin main --force'
run deny  Bash  'find . -maxdepth 0 -exec git push origin main --force ;'
run deny  Bash  'timeout 60 gh pr merge 3'
run deny  Bash  'python3 -c "import subprocess; subprocess.run([\"git\",\"push\",\"--force\"])"'

# A3. Autoprotección: la guardia, los permisos y las instrucciones
run deny  Bash  'chmod -x .claude/hooks/guard.sh'
run deny  Bash  "sed -i '' 's/deny/allow/' .claude/hooks/guard.sh"
run deny  Bash  'echo "{\"disableAllHooks\":true}" > .claude/settings.local.json'
run deny  Bash  'echo x | tee -a ~/.claude/settings.json'
run deny  Bash  'git checkout main -- .claude/settings.json'
run deny  Bash  'mv .claude /tmp/x'
run deny  Bash  "sed -i '' 's/a/b/' CLAUDE.md"
run deny  Bash  'cat nuevo.md > CLAUDE.md'
run deny  Edit  "$root/.claude/settings.json"
run deny  Write "$root/.claude/settings.local.json"
run deny  Write "$root/.claude/hooks/guard.sh"
run deny  Edit  "$root/CLAUDE.md"
run deny  Write "$HOME/.claude/settings.json"
run deny  Write "$root/notas.json"                      '{"disableAllHooks": true}'
run allow Read  "$root/.claude/settings.json"
run allow Bash  'bash .claude/hooks/guard.test.sh'
run allow Bash  'bash .claude/hooks/guard.test.sh > /tmp/resultado.txt 2>&1'
run allow Bash  'cat CLAUDE.md > /tmp/copia.md'
run allow Bash  'git log --oneline -2 && git tag --list && grep -c x .claude/hooks/README.md'
run deny  Bash  'cd .claude/hooks && sed -i "" s/a/b/ guard.sh'
run deny  Bash  'echo x >> .claude/settings.local.json'
run deny  Bash  'printf x >CLAUDE.md'
run deny  Bash  'echo "export const x = 1" >> src/server/db.ts'
run allow Bash  'jq . .claude/settings.json'
run allow Bash  'git diff .claude/ CLAUDE.md'
run allow Bash  'cat CLAUDE.md'
run allow Bash  'grep -n hook CLAUDE.md'
run allow Write "$HOME/.claude/projects/x/memory/nota.md"
mode=default
run ask   Edit  "$root/.claude/settings.json"
run ask   Bash  'chmod -x .claude/hooks/guard.sh'
run ask   Edit  "$root/CLAUDE.md"
run deny  Bash  'echo "{\"disableAllHooks\":true}" > .claude/settings.local.json'
run deny  Write "$root/.claude/settings.local.json"       '{"disableAllHooks": true}'
mode=auto

# A4. Otras formas de escribir git
run deny  Bash  'git reset --har HEAD~1'
run deny  Bash  'git reset --ha HEAD~1'
run deny  Bash  'git push origin main --forc'
run deny  Bash  'git push --mirr origin'
run deny  Bash  'git push --delet origin rama'
run deny  Bash  'git push origin --tag'
run deny  Bash  'git push --prun origin'
run deny  Bash  'git -c alias.p="push --force" p origin main'
run deny  Bash  'git -c alias.c=commit c -m x'
run deny  Bash  'git config alias.fp "push --force"'
run deny  Bash  'git config --global core.sshCommand "sh -c x"'
run deny  Bash  'git -c remote.origin.mirror=true push origin'
run deny  Bash  'git -c core.hooksPath=/tmp/h commit -m x'
run deny  Bash  '$(which git) push origin main --force'
run deny  Bash  'G=git; $G push origin main --force'
run deny  Bash  'git${IFS}push${IFS}origin${IFS}main${IFS}--force'
run deny  Bash  'git$IFS''reset$IFS--hard'
run allow Bash  'git -c user.name=a -c user.email=a@b log -1'
run allow Bash  'git config user.name'
mode=default
run deny  Bash  'git push origin main --forc'
run deny  Bash  'git push --repo=origin v1'
mode=auto

# B1. Deploys con versión
run deny  Bash  'npx --yes vercel@latest deploy --prod'
run deny  Bash  'npx wrangler@3 deploy'
run deny  Bash  'vc deploy'
run deny  Bash  'pnpm dlx netlify-cli@17 deploy'
run deny  Bash  'npx @railway/cli up'

# B2. GraphQL y curl
run deny  Bash  'gh api graphql -f query="$(cat m.graphql)"'
run deny  Bash  'Q=$(cat m.graphql); gh api graphql -f query="$Q"'
run deny  Bash  'curl -X PUT -H "Authorization: token $(gh auth token)" https://api.github.com/repos/o/r/pulls/3/merge'
run deny  Bash  'curl -X PUT https://api.github.com/repos/o/r/pulls/3/merge'
run deny  Bash  'curl -d "{}" https://api.github.com/repos/o/r/issues'
run deny  Bash  'wget --method=DELETE https://api.github.com/repos/o/r'
run allow Bash  'curl -s https://api.github.com/repos/o/r'
run allow Bash  'curl -X POST https://example.com/x'

# B3. Secretos sin nombrarlos y credenciales
run deny  Bash  'gh auth token'
run deny  Bash  'gh auth status --show-token'
run deny  Bash  'gh auth status -t'
run deny  Bash  'printenv'
run deny  Bash  'printenv GH_TOKEN'
run deny  Bash  'env'
run deny  Bash  'env | grep TOKEN'
run deny  Bash  'export -p'
run deny  Bash  'set'
run deny  Bash  'cat ~/.netrc'
run deny  Bash  'cat ~/.git-credentials'
run deny  Bash  'cat ~/.npmrc'
run deny  Bash  'cat ~/.aws/credentials'
run deny  Bash  'f=.en; cat ${f}v'
run deny  Bash  'cat $(printf .e%sv n)'
run deny  Bash  'cat $(echo LmVudg== | base64 -d)'
run deny  Bash  'cat .ENV'
run deny  Bash  'cat .Env.local'
run deny  Bash  'ls .DATA'
run deny  Bash  'python3 -c "import sqlite3; sqlite3.connect(x)"'
run deny  Bash  'node --experimental-sqlite -e "x"'
run deny  Bash  'node -e "require(\"node:sqlite\")"'
run allow Bash  'gh auth status'
run allow Bash  'env FOO=1 npm test'
# Lectura recursiva: se bloquea si la carpeta tiene secretos o datos.
sec=$(mktemp -d)
mkdir -p "$sec/src" && : > "$sec/.env" && : > "$sec/src/a.ts"
run deny  Bash  'grep -r RESEND .'                    "$sec"
run deny  Bash  'grep -rn RESEND'                     "$sec"
run deny  Bash  "grep -R x $sec"
run deny  Bash  'tar czf /tmp/repo.tgz .'             "$sec"
run deny  Bash  'cp -r . /tmp/copia'                  "$sec"
run deny  Bash  'rg --hidden --no-ignore KEY'         "$sec"
run deny  Bash  'find . -type f -exec cat {} +'       "$sec"
run allow Bash  'grep -rn RESEND src'                 "$sec"
run allow Bash  'grep -n RESEND src/a.ts'             "$sec"
run allow Bash  'rg KEY'                              "$sec"
run allow Bash  'find . -name "*.ts"'                 "$sec"
rm -r "$sec"
run allow Bash  'grep -rn RESEND .'

# B4. Administración de GitHub, también envuelta
run deny  Bash  'bash -c "gh repo delete violetasicilia4/WEDAV2 --yes"'
run deny  Bash  'bash -c "gh secret set X --body y"'
run deny  Bash  'bash -c "gh repo edit --visibility public"'
run deny  Bash  'bash -c "gh release create v1"'
run deny  Bash  'gh workflow run deploy.yml'
run deny  Bash  'gh extension install alguien/algo'
run deny  Bash  'gh gist create notas.md --public'
run deny  Bash  'gh variable set X'
run deny  Bash  'gh repo create otro --public'
run allow Bash  'gh repo view'
run allow Bash  'gh release list'
run allow Bash  'gh workflow list'
run allow Bash  'gh secret list'

# B5. Esquema por Bash
run deny  Bash  "sed -i '' 's/a/b/' src/server/db.ts"
run deny  Bash  'cat migracion.sql >> src/server/db.ts'
run deny  Bash  'git checkout otra-rama -- src/server/db.ts'
run deny  Bash  'git apply cambio.patch'
run deny  Bash  'cp /tmp/db.ts src/server/db.ts'
run allow Bash  'grep -n MIGRATIONS src/server/db.ts'
run allow Bash  'git diff src/server/db.ts'
run allow Bash  "sed -n '1,20p' src/server/db.ts"
mode=default
run ask   Bash  "sed -i '' 's/a/b/' src/server/db.ts"
run ask   Bash  'git apply cambio.patch'
mode=auto

# B6. Opciones de git que ejecutan programas, escriben archivos o mueven ramas
run deny  Bash  'git fetch --upload-pack="touch /tmp/x" origin'
run deny  Bash  'git ls-remote --upload-pack="touch /tmp/x" origin'
run deny  Bash  'git ls-remote --upl=x origin'
run deny  Bash  'git clone -u x https://example.com/r.git'
run deny  Bash  'git log --output=/tmp/x -1'
run deny  Bash  'git diff --output=/tmp/x'
run deny  Bash  'git branch -f main HEAD~3'
run deny  Bash  'git branch --force main HEAD~3'
run deny  Bash  'git branch -M otra main'
run deny  Bash  'git branch -C otra main'
run deny  Bash  'git fetch origin +main:main'
run deny  Bash  'git fetch -f origin main:main'
run allow Bash  'git fetch origin'
run allow Bash  'git fetch --prune origin'
run allow Bash  'git ls-remote --tags origin'
run allow Bash  'git log --oneline -3'
run allow Bash  'git diff --output-indicator-new=+ HEAD'
run allow Bash  'git branch -m vieja nueva'
run allow Bash  'git branch -d vieja'

# B7. Tags: opciones que no implican listado crean un tag
run deny  Bash  'git tag --sort=refname v9'
run deny  Bash  'git tag --format=x v9'
run deny  Bash  'git tag --column v9'
run deny  Bash  'git tag -i v9'
run deny  Bash  'git tag --no-column v9'
run allow Bash  'git tag --sort=-creatordate'
run allow Bash  'git tag -l --sort=refname "v*"'
run allow Bash  'git tag --contains HEAD'
run allow Bash  'git tag -v v1'

# C4 parcial. Historial y archivos de trabajo
run deny  Bash  'git stash clear'
run deny  Bash  'git stash drop'
run deny  Bash  'git update-ref -d refs/heads/main'
run deny  Bash  'git reflog expire --expire=now --all'
run deny  Bash  'git gc --prune=now'
run deny  Bash  'git restore .'
run deny  Bash  'git checkout -- .'
run deny  Bash  'git rebase main'
run deny  Bash  'git merge otra'
run deny  Bash  'git rm -r -q src'
run allow Bash  'git restore --staged x.ts'
run allow Bash  'git checkout chore/x'
run allow Bash  'git rm --cached -r viejo'
run allow Bash  'git stash list'

# C1. Comandos demasiado largos (el hook no llegaría a revisarlos antes del timeout)
largo=$(printf 'x%.0s' $(seq 1 70000))
run deny  Bash  "echo $largo"

# Falsos positivos corregidos o aceptados
run deny  Bash  'gh pr create --title "merge de ramas" --body x'
mode=default
run ask   Bash  'gh pr create --title "merge de ramas" --body x'
run allow Bash  'gh pr comment 3 --body "listo para merge"'
run allow Bash  'gh pr list --search merge'
run allow Bash  'gh pr view 3 --json mergeable'
run allow Bash  'git status'
run allow Bash  'npm run typecheck'
mode=auto

# C2. Falla cerrada sin parser
sinparser=$(mktemp -d)
for t in bash tr sed cat git dirname; do ln -s "$(command -v "$t")" "$sinparser/$t"; done
got=$(printf '%s' '{"tool_name":"Bash","tool_input":{"command":"ls"},"permission_mode":"default"}' | env PATH="$sinparser" bash "$hook" | jq -r '.hookSpecificOutput.permissionDecision // "allow"')
if [[ $got == deny ]]; then echo 'ok    deny  sin jq ni python3: falla cerrada'; else echo "FALLA esperaba deny sin parser, dio $got"; fail=1; fi
rm -r "$sinparser"
got=$(printf '%s' '{"tool_name":"Bash", roto' | "$hook" | jq -r '.hookSpecificOutput.permissionDecision // "allow"')
if [[ $got == deny ]]; then echo 'ok    deny  JSON inválido: falla cerrada'; else echo "FALLA esperaba deny con JSON inválido, dio $got"; fail=1; fi
mode=default

exit $fail
