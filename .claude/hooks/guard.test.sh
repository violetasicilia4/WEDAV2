#!/usr/bin/env bash
# Casos de la guardia (.claude/hooks/guard.sh). Uso: bash .claude/hooks/guard.test.sh
# Cada fila: decisión esperada (deny | ask | allow), herramienta y comando o ruta.
# Necesita jq para armar el JSON de entrada.

dir=$(cd "$(dirname "$0")" && pwd)
root=$(cd "$dir/../.." && pwd)
fail=0

# Modo de permisos que recibe el hook: default salvo que la sección fije otro. Con mode='' no se envía.
mode=default

run() { # $1 = esperado, $2 = herramienta, $3 = comando o ruta, $4 = cwd (opcional)
  local json out got
  if [[ $2 == Bash ]]; then
    json=$(jq -n --arg c "$3" --arg d "${4:-$root}" '{tool_name:"Bash",tool_input:{command:$c},cwd:$d}')
  else
    json=$(jq -n --arg t "$2" --arg p "$3" --arg d "$root" '{tool_name:$t,tool_input:{file_path:$p,path:$p},cwd:$d}')
  fi
  json=$(printf '%s' "$json" | jq --arg m "$mode" 'if $m == "" then . else . + {permission_mode: $m} end')
  out=$(printf '%s' "$json" | "$dir/guard.sh")
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
run ask   Bash  'git commit -m "documenta rm -rf y sqlite3"'
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

exit $fail
