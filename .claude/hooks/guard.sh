#!/usr/bin/env bash
# Guardia PreToolUse de Weda (Way of Working, E3). Documentación: .claude/hooks/README.md.
# Los permisos de .claude/settings.json comparan el comienzo de cada subcomando; este hook revisa la
# llamada entera y decide deny (bloquea), ask (pregunta, solo en modo default) o nada (sigue el flujo
# normal de permisos). Prioriza no dejar pasar operaciones peligrosas aunque genere falsos positivos.
# Entrada: el JSON del hook por stdin. Compatible con el bash 3.2 de macOS.

input=$(cat)
max_cmd=65536   # bytes: un comando más largo no se revisa a tiempo (timeout de 10 s) y se bloquea

if command -v jq >/dev/null 2>&1; then
  field() { printf '%s' "$input" | jq -r "$1 // empty" 2>/dev/null; }
elif command -v python3 >/dev/null 2>&1; then
  field() {
    printf '%s' "$input" | python3 -I -c 'import json, sys
d = json.load(sys.stdin)
for k in sys.argv[1].lstrip(".").split("."):
    d = d.get(k) if isinstance(d, dict) else None
print("" if d is None else d, end="")' "$1" 2>/dev/null
  }
else
  field() { return 1; }
fi

decide() { # $1 = deny|ask, $2 = mensaje
  local msg=${2//\\/}
  msg=${msg//\"/}
  msg=$(printf '%s' "$msg" | tr -d '\000-\037')
  printf '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"%s","permissionDecisionReason":"%s"}}\n' "$1" "$msg"
  exit 0
}

block() { # $1 = regla, $2 = motivo
  decide deny "Bloqueado por la guardia de Weda (.claude/hooks/guard.sh). Regla: $1. $2 Si de verdad hace falta, pedile a la dueña que lo haga a mano."
}

# Motivo de lo que solo hace la dueña. Se bloquea en vez de preguntar porque en modo auto una regla
# ask no frena la llamada (comprobado en E3, 2026-10-31).
needs_owner='Requiere la aprobación de la dueña, y fuera del modo default la pregunta no frena la llamada.'

# Falla cerrada: sin parser o con JSON inválido no se puede revisar la llamada.
tool=$(field .tool_name) || block 'no se pudo leer la llamada' 'Falta jq y python3, o el JSON es inválido.'
cwd=$(field .cwd)
mode=$(field .permission_mode)
proj=${CLAUDE_PROJECT_DIR:-$cwd}

# Operaciones que la dueña aprueba una por una: en modo default se pregunta (comprobado que frena); en
# cualquier otro modo, o si el modo no llega, se bloquea.
gate='' gate_why=''
add_gate() { [[ -z $gate ]] && { gate=$1; gate_why=$2; }; }
mode_gate() { # $1 = operación, $2 = motivo
  if [[ $mode == default ]]; then
    decide ask "$1: $2 Necesita la aprobación de la dueña."
  fi
  block "$1 en modo ${mode:-desconocido}" "$2 Fuera del modo default la pregunta de aprobación no frena la llamada, así que se bloquea: que lo haga la dueña o que pase la sesión a modo default."
}

lower() { printf '%s' "$1" | tr '[:upper:]' '[:lower:]'; }

# Rutas en minúsculas (el disco de macOS no distingue mayúsculas). Deja la regla en $why.
sensitive() {
  local p=$1 base
  while [[ $p == */ && $p != / ]]; do p=${p%/}; done
  base=${p##*/}
  if [[ ($base == .env || $base == .env.*) && $base != .env.example ]]; then
    why='archivos .env con secretos (solo se permite .env.example)'; return 0
  fi
  case $base in .dev.vars|.netrc|.git-credentials|.npmrc|.pypirc) why="credenciales en $base"; return 0 ;; esac
  if [[ /$p/ =~ /\.data[^/]*/ ]]; then why='datos locales en .data*/ (bases SQLite con datos personales)'; return 0; fi
  if [[ /$p/ == */.ssh/* ]]; then why='claves en ~/.ssh/'; return 0; fi
  if [[ /$p/ == */.config/gh/* ]]; then why='credenciales de GitHub en ~/.config/gh/'; return 0; fi
  if [[ /$p/ == */.aws/* ]]; then why='credenciales en ~/.aws/'; return 0; fi
  return 1
}

# Una palabra suelta de un comando: expande ~ y comodines (en la carpeta de la sesión).
sensitive_word() {
  local t=$1 m
  [[ -z $t ]] && return 1
  [[ $t == '~'* ]] && t=$HOME${t#\~}
  if [[ $t == *[*?[]* ]]; then
    local found=0
    while IFS= read -r m; do
      [[ -z $m ]] && continue
      found=1
      sensitive "$(lower "$m")" && return 0
    done < <(cd "${cwd:-.}" 2>/dev/null && compgen -G "$t")
    (( found )) && return 1
  fi
  sensitive "$t"
}

# Configuración de Claude Code: la guardia, los permisos y las instrucciones (ruta en minúsculas).
protected() {
  case /$1 in
    */claude.md|*/agents.md) return 0 ;;
    */.claude/settings*.json) return 0 ;;
    */.claude/hooks|*/.claude/hooks/*|*/.claude/rules|*/.claude/rules/*|*/.claude|*/.claude/) return 0 ;;
  esac
  return 1
}
dbfile() { [[ /$1 == */src/server/db.ts ]]; }

# Ruta de un argumento de cd, git -C o una lectura recursiva, relativa a la carpeta del comando ($wd).
resolve() {
  local d=$1
  [[ $d == '~'* ]] && d=$HOME${d#\~}
  [[ $d == /* ]] || d=$wd/$d
  printf '%s' "$d"
}

# ¿La carpeta tiene secretos o datos en su primer nivel, o contiene al proyecto y el proyecto los tiene?
dir_has_secrets() {
  local d=$1 f real
  [[ -d $d ]] || return 1
  for f in "$d"/.env "$d"/.env.* "$d"/.dev.vars "$d"/.data* "$d"/.netrc "$d"/.git-credentials; do
    [[ -e $f && ${f##*/} != .env.example ]] && return 0
  done
  real=$(cd "$d" 2>/dev/null && pwd -P)
  if [[ -n $real && -n $proj && $proj/ == "$real"/* && $proj != "$real" ]]; then dir_has_secrets "$proj" && return 0; fi
  return 1
}

# Opción larga peligrosa, aceptando abreviaturas (git acepta --har por --hard). $1 = palabra.
is_opt() {
  local w=${1%%=*} o
  [[ $w == --* ]] || return 1
  shift
  for o in "$@"; do
    [[ $w == "$o" ]] && return 0
    (( ${#w} >= 4 )) && [[ $o == "$w"* ]] && return 0
  done
  return 1
}

# Claves de git -c que no ejecutan nada ni cambian a dónde se publica.
git_c_safe() {
  case $(lower "${1%%=*}") in
    user.name|user.email|color.*|advice.*|init.defaultbranch|log.*|i18n.*|core.quotepath) return 0 ;;
  esac
  return 1
}

# Subcomandos de git y grupos de gh que se analizan aunque git o gh lleguen por $(...) o una variable.
git_subs=' push reset clean commit tag branch config fetch ls-remote pull merge rebase cherry-pick revert am apply restore checkout switch stash update-ref reflog filter-branch filter-repo send-pack gc '
gh_groups=' pr api repo auth secret variable release workflow extension ext alias gist ssh-key gpg-key '

# --- Analizadores. Trabajan sobre el tramo actual (T, NT) desde el índice $1. Devuelven 0 para
# bloquear (dejan la regla en $rule y, si aplica, $reason) o 1; pueden sumar una aprobación (add_gate).

analyze_git() {
  local j=$1 t k sub repo=$wd
  while (( j < NT )); do
    t=${T[j]}
    case $t in
      -C) repo=$(resolve "${T[j+1]}"); ((j += 2)); continue ;;
      -c) k=${T[j+1]}; git_c_safe "$k" || { rule="git -c ${k%%=*} (puede ejecutar comandos, crear alias o cambiar a dónde se publica)"; return 0; }; ((j += 2)); continue ;;
      -c?*) k=${t#-c}; git_c_safe "$k" || { rule="git -c ${k%%=*} (puede ejecutar comandos, crear alias o cambiar a dónde se publica)"; return 0; } ;;
      --config-env*|--exec-path*) rule="git ${t%%=*}"; return 0 ;;
      --git-dir|--work-tree|--namespace|--super-prefix) ((j += 2)); continue ;;
      -*) ;;
      *) break ;;
    esac
    ((j++))
  done
  sub=${T[j]}; ((j++))
  local -a A=("${T[@]:j}")
  case $sub in
    push)
      local remote=0 skip=0 src
      for t in "${A[@]}"; do
        if (( skip )); then skip=0; continue; fi
        if is_opt "$t" --force --force-with-lease --force-if-includes --mirror --delete --prune; then rule="git push $t"; return 0; fi
        if is_opt "$t" --tags --follow-tags; then rule="publicar tags (git push $t)"; reason=$needs_owner; return 0; fi
        if is_opt "$t" --receive-pack --exec; then rule="git push $t (ejecuta un programa)"; return 0; fi
        if is_opt "$t" --repo; then remote=1; [[ $t == *=* ]] || skip=1; continue; fi
        if is_opt "$t" --push-option; then [[ $t == *=* ]] || skip=1; continue; fi
        case $t in
          --*) ;;
          -o) skip=1 ;;
          -*) if [[ $t == *[fd]* ]]; then rule="git push $t (-f fuerza, -d borra)"; return 0; fi ;;
          +*) rule="git push con refspec forzado ($t)"; return 0 ;;
          :*) rule="git push con refspec que borra una rama remota ($t)"; return 0 ;;
          *refs/tags/*) rule="publicar tags (git push $t)"; reason=$needs_owner; return 0 ;;
          *)
            # El primer argumento es el remoto; los demás son refspecs. Solo pasa HEAD o una rama
            # confirmada en el repo del comando: cualquier otro podría ser un tag.
            if (( ! remote )); then remote=1; continue; fi
            src=${t%%:*}
            case $src in HEAD|@|refs/heads/*) continue ;; esac
            if ! git -C "$repo" show-ref --verify --quiet "refs/heads/$src" 2>/dev/null; then
              rule="publicar tags o refs que no son una rama confirmada (git push … $t)"; reason=$needs_owner; return 0
            fi ;;
        esac
      done
      add_gate 'git push' 'Commit, push y PR los aprueba la dueña (CLAUDE.md).' ;;
    commit) add_gate 'git commit' 'Commit, push y PR los aprueba la dueña (CLAUDE.md).' ;;
    reset)
      for t in "${A[@]}"; do
        is_opt "$t" --hard && { rule="git reset $t"; return 0; }
      done ;;
    clean) rule='git clean'; return 0 ;;
    branch)
      local del=0 force=0
      for t in "${A[@]}"; do
        if is_opt "$t" --delete; then del=1; continue; fi
        if is_opt "$t" --force; then force=1; continue; fi
        case $t in
          --*) ;;
          -*)
            if [[ $t == *[DMC]* ]]; then rule="git branch $t (borra, mueve o copia a la fuerza)"; return 0; fi
            [[ $t == *d* ]] && del=1
            [[ $t == *f* ]] && force=1 ;;
        esac
      done
      (( force )) && { rule='git branch --force (mueve o pisa una rama)'; return 0; } ;;
    tag)
      # Como git: lista sin argumentos, o con -l, -n, --contains, --no-contains, --points-at, --merged o
      # --no-merged. --sort, --format, --column o -i con un nombre CREAN un tag.
      local list=0 verify=0 write=0 pos=0
      for t in "${A[@]}"; do
        if is_opt "$t" --list --contains --no-contains --points-at --merged --no-merged; then list=1; continue; fi
        if is_opt "$t" --verify; then verify=1; continue; fi
        if is_opt "$t" --annotate --sign --no-sign --local-user --message --file --force --delete --edit --create-reflog --cleanup --trailer; then write=1; continue; fi
        case $t in
          -n|-n[0-9]*) list=1 ;;
          --*) ;;
          -*) [[ $t == *[asumFfde]* ]] && write=1; [[ $t == *l* ]] && list=1; [[ $t == *v* ]] && verify=1 ;;
          *) pos=1 ;;
        esac
      done
      if (( write || (pos && !list && !verify) )); then rule='crear, mover o borrar tags (git tag)'; reason=$needs_owner; return 0; fi ;;
    config)
      for t in "${A[@]}"; do
        case $(lower "${t%%=*}") in
          alias.*|core.*|remote.*|url.*|push.*|include.*|includeif.*|credential.*|filter.*|diff.*|merge.*|uploadpack.*|receive.*|help.*|gpg.*|sequence.*|transfer.*|protocol.*|http.*|submodule.*|pager.*|safe.*)
            rule="git config ${t%%=*} (puede ejecutar comandos, crear alias o cambiar a dónde se publica)"; return 0 ;;
        esac
      done ;;
    fetch|pull|ls-remote|clone|archive|submodule)
      for t in "${A[@]}"; do
        if is_opt "$t" --upload-pack --exec --receive-pack; then rule="git $sub $t (ejecuta un programa)"; return 0; fi
        if [[ $sub == clone && $t == -u ]]; then rule='git clone -u (ejecuta un programa)'; return 0; fi
        if [[ $sub == fetch || $sub == pull ]]; then
          if is_opt "$t" --force; then rule="git $sub $t (pisa ramas locales)"; return 0; fi
          case $t in
            --*) ;;
            -*) [[ $t == *f* ]] && { rule="git $sub $t (pisa ramas locales)"; return 0; } ;;
            +*) rule="git $sub con refspec forzado ($t)"; return 0 ;;
          esac
        fi
      done
      [[ $sub == pull ]] && add_gate 'git pull' 'Mezcla cambios en la rama y puede tocar el esquema.' ;;
    log|diff|show|format-patch|whatchanged|range-diff)
      for t in "${A[@]}"; do
        is_opt "$t" --output && { rule="git $sub $t (escribe un archivo)"; return 0; }
      done ;;
    update-ref|filter-branch|filter-repo|send-pack|replace|symbolic-ref) rule="git $sub (reescribe referencias o historia)"; return 0 ;;
    reflog) case ${A[0]} in expire|delete) rule="git reflog ${A[0]} (borra la red de seguridad del historial)"; return 0 ;; esac ;;
    gc) for t in "${A[@]}"; do [[ $t == --prune* ]] && { rule="git gc $t"; return 0; }; done ;;
    stash)
      case ${A[0]} in
        clear|drop) rule="git stash ${A[0]} (borra cambios guardados)"; return 0 ;;
        pop|apply) add_gate "git stash ${A[0]}" 'Aplica cambios guardados y puede tocar el esquema.' ;;
      esac ;;
    restore)
      local staged=0 worktree=0
      for t in "${A[@]}"; do
        case $t in --staged|-S) staged=1 ;; --worktree|-W) worktree=1 ;; esac
      done
      (( staged && !worktree )) || add_gate 'git restore' 'Descarta cambios de archivos.' ;;
    checkout)
      for t in "${A[@]}"; do
        if [[ $t == -- || $t == . || $t == -f || $t == -B || $t == -p || $t == --ours || $t == --theirs ]] || is_opt "$t" --force --patch --pathspec-from-file; then
          add_gate 'git checkout de archivos' 'Descarta o reemplaza archivos.'; break
        fi
      done ;;
    switch)
      for t in "${A[@]}"; do
        if [[ $t == -f || $t == -C ]] || is_opt "$t" --force --discard-changes --force-create; then
          add_gate 'git switch forzado' 'Descarta cambios o pisa una rama.'; break
        fi
      done ;;
    merge|rebase|cherry-pick|revert|am|apply) add_gate "git $sub" 'Cambia el historial o los archivos de la rama y puede tocar el esquema.' ;;
    rm)
      local rec=0 cached=0
      for t in "${A[@]}"; do
        case $t in --cached) cached=1 ;; -r|--recursive) rec=1 ;; --*) ;; -*) [[ $t == *r* ]] && rec=1 ;; esac
      done
      (( rec && !cached )) && add_gate 'git rm -r' 'Borra carpetas del repositorio.' ;;
  esac
  return 1
}

analyze_gh() {
  local j=$1 t method='' fields=0 input=0 dollar=0 showtok=0
  local -a P=()
  while (( j < NT )); do
    t=${T[j]}
    [[ $t == *'$'* ]] && dollar=1
    [[ $t == -t && ${P[0]} == auth ]] && showtok=1
    case $t in
      -X|--method) method=${T[j+1]}; [[ $method == *'$'* ]] && dollar=1; ((j += 2)); continue ;;
      -X?*) method=${t#-X} ;;
      --method=*) method=${t#--method=} ;;
      -f|-F|--field|--raw-field)
        fields=1; [[ ${T[j+1]} == *@* ]] && input=1; [[ ${T[j+1]} == *'$'* ]] && dollar=1
        ((j += 2)); continue ;;
      -f?*|-F?*|--field=*|--raw-field=*) fields=1; [[ $t == *@* ]] && input=1 ;;
      --input|--input=*) input=1 ;;
      --show-token) showtok=1 ;;
      # Opciones con valor: el valor no es un subcomando (así «--title merge» no cuenta como merge).
      -R|--repo|-H|--header|-q|--jq|-t|--template|--hostname|-p|--preview|--cache|--title|-b|--body|--body-file|-B|--base|--head|-a|--assignee|-l|--label|-m|--milestone|-r|--reviewer|-s|--search|-S|--state|-L|--limit|--json|-A|--author)
        ((j += 2)); continue ;;
      -*) ;;
      *) P+=("$t") ;;
    esac
    ((j++))
  done
  local g=${P[0]} s=${P[1]}
  case $g in
    pr)
      case $s in
        merge) rule='merge de PR (gh pr merge)'; reason=$needs_owner; return 0 ;;
        create|new) add_gate 'crear un PR (gh pr create)' 'Commit, push y PR los aprueba la dueña (CLAUDE.md).' ;;
        close|reopen) add_gate "gh pr $s" 'Cambia el estado de un PR.' ;;
      esac ;;
    api)
      if [[ $s == graphql || $s == /graphql || $s == *api.github.com/graphql ]]; then
        if (( mutation || input || dollar )); then rule='mutación GraphQL o consulta que no está escrita en el comando (gh api graphql)'; reason=$needs_owner; return 0; fi
      else
        method=$(printf '%s' "$method" | tr '[:lower:]' '[:upper:]')
        if [[ -n $method && $method != GET && $method != HEAD ]]; then
          rule="escritura por la API de GitHub (gh api -X $method)"; reason=$needs_owner; return 0
        elif [[ -z $method ]] && (( fields || input )); then
          rule='escritura por la API de GitHub (gh api con campos usa POST; para leer, agregá -X GET)'; reason=$needs_owner; return 0
        fi
      fi ;;
    auth)
      case $s in
        token|login|logout|refresh|setup-git|switch) rule="gh auth $s (credenciales de GitHub)"; return 0 ;;
        status) (( showtok )) && { rule='gh auth status --show-token (muestra el token)'; return 0; } ;;
      esac ;;
    repo)
      case $s in
        delete|edit|rename|archive|unarchive|sync|create|new|fork|set-default|deploy-key|autolink)
          rule="gh repo $s"; reason=$needs_owner; return 0 ;;
      esac ;;
    secret|variable|ssh-key|gpg-key|extension|ext|extensions|codespace|cs|ruleset|attestation|org|project|config|alias)
      case $s in list|ls|view|get|'') ;; *) rule="gh $g $s"; reason=$needs_owner; return 0 ;; esac ;;
    release|workflow|run|cache|label|gist)
      case $s in list|ls|view|download|watch|'') ;; *) rule="gh $g $s"; reason=$needs_owner; return 0 ;; esac ;;
    issue)
      case $s in delete|transfer) rule="gh issue $s"; reason=$needs_owner; return 0 ;; esac ;;
  esac
  return 1
}

analyze_curl() {
  local j=$1 t m github=0 write=0
  while (( j < NT )); do
    t=${T[j]}
    case $t in
      *github.com*|*githubusercontent.com*) github=1 ;;
      -X|--request) m=$(printf '%s' "${T[j+1]}" | tr '[:lower:]' '[:upper:]'); [[ $m != GET && $m != HEAD ]] && write=1; ((j += 2)); continue ;;
      -X?*|--request=*|--method=*) m=$(printf '%s' "${t#*[X=]}" | tr '[:lower:]' '[:upper:]'); [[ $m != GET && $m != HEAD ]] && write=1 ;;
      -d|--data*|-F|--form*|-T|--upload-file*|--json*|--post-data*|--post-file*|--body-data*|--body-file*) write=1 ;;
    esac
    ((j++))
  done
  (( github && write )) && { rule='escritura a GitHub con curl o wget'; reason=$needs_owner; return 0; }
  return 1
}

analyze_rm() {
  local j=$1 t r=0 f=0
  for t in "${T[@]:j}"; do
    case $t in
      --recursive) r=1 ;;
      --force) f=1 ;;
      --*) ;;
      -*) [[ $t == *[rR]* ]] && r=1; [[ $t == *f* ]] && f=1 ;;
    esac
  done
  (( r && f )) && { rule='rm -rf (borrado recursivo forzado)'; return 0; }
  return 1
}

# Lecturas recursivas o copias de una carpeta: se bloquean si alcanzan .env, .data u otras credenciales.
analyze_bulk() { # $1 = comando, $2 = índice de sus argumentos
  local c=$1 j=$2 t rec=0 skipfirst=0 inexpr=0 p
  local -a paths=()
  case $c in
    tar|ack) rec=1 ;;
    grep|egrep|fgrep|ack) skipfirst=1 ;;
    rg|ag) skipfirst=1 ;;
  esac
  while (( j < NT )); do
    t=${T[j]}
    case $c in
      find)
        case $t in
          -exec|-execdir|-ok|-okdir) rec=1; inexpr=1 ;;
          -*) inexpr=1 ;;
          *) (( inexpr )) || paths+=("$t") ;;
        esac ;;
      grep|egrep|fgrep)
        case $t in
          -r|-R|--recursive|--dereference-recursive|--directories=recurse) rec=1 ;;
          -e|-f|--regexp*|--file*) skipfirst=0 ;;
          --*) ;;
          -*) [[ $t == *[rR]* ]] && rec=1 ;;
          *) paths+=("$t") ;;
        esac ;;
      rg|ag)
        case $t in
          -u|-uu|-uuu|--no-ignore*|--hidden|--unrestricted|--skip-vcs-ignores) rec=1 ;;
          -e|-f|--regexp*|--file*) skipfirst=0 ;;
          -*) ;;
          *) paths+=("$t") ;;
        esac ;;
      *)
        case $t in
          -r|-R|-a|--recursive|--archive) rec=1 ;;
          --*) ;;
          -*) [[ $t == *[rRa]* ]] && rec=1 ;;
          *) paths+=("$t") ;;
        esac ;;
    esac
    ((j++))
  done
  (( rec )) || return 1
  (( skipfirst )) && paths=("${paths[@]:1}")
  (( ${#paths[@]} == 0 )) && paths=(.)
  for p in "${paths[@]}"; do
    if dir_has_secrets "$(resolve "$p")"; then
      rule="$c recursivo sobre una carpeta con secretos o datos ($p)"; return 0
    fi
  done
  return 1
}

# Lectura de una ruta armada en tiempo de ejecución: no se puede saber qué lee.
analyze_reader() {
  local j=$1
  while (( j < NT )); do
    [[ ${T[j]} == *'$'* ]] && { rule="lectura de una ruta que no está escrita literalmente (${T[j]})"; return 0; }
    ((j++))
  done
  return 1
}

env_bare() {
  local j=$1
  while (( j < NT )); do
    [[ ${T[j]} == -* || ${T[j]} =~ ^[A-Za-z_][A-Za-z0-9_]*= ]] || return 1
    ((j++))
  done
  rule='env sin comando (muestra variables de entorno, que pueden tener secretos)'; return 0
}

# Índice del comando real del tramo (saltea asignaciones, flags, envoltorios y palabras de control).
cmd_index() {
  ci=0
  while (( ci < NT )); do
    t=${T[ci]}
    if [[ $t == -* || $t =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then ((ci++)); continue; fi
    case ${t##*/} in
      sudo|env|command|builtin|exec|time|nohup|nice|xargs|eval|npx|bunx|pnpx|dlx|npm|pnpm|yarn|bash|sh|zsh|timeout|caffeinate|stdbuf|if|then|do|else|elif|while|until|'!') ((ci++)); continue ;;
    esac
    break
  done
}

# ¿El tramo solo lee? Sirve para permitir leer la configuración de Claude Code y db.ts.
classify_readonly() {
  (( ci >= NT )) && return
  local c=${T[ci]##*/} s j
  case $c in
    cat|head|tail|less|more|grep|egrep|fgrep|rg|wc|diff|cmp|nl|sort|uniq|cut|file|stat|ls|tree|bat|jq|echo|printf|test|'['|true|shasum|md5|guard.test.sh) ;;
    sed) for s in "${T[@]:ci+1}"; do case $s in -i*|--in-place*) readonly_all=0 ;; esac; done ;;
    git)
      j=$((ci + 1))
      while (( j < NT )) && [[ ${T[j]} == -* ]]; do
        [[ ${T[j]} == -C || ${T[j]} == -c ]] && ((j++))
        ((j++))
      done
      # tag y branch llegan acá solo si ya pasaron los controles de escritura de arriba.
      case ${T[j]} in status|log|diff|show|blame|ls-files|grep|rev-parse|cat-file|ls-tree|shortlog|tag|branch|describe|remote|ls-remote|fetch) ;; *) readonly_all=0 ;; esac ;;
    *) readonly_all=0 ;;
  esac
}

check_segment() {
  local i t name nx
  cmd_index
  if (( ci < NT )) && [[ ${T[ci]} == cd ]]; then
    if [[ -z ${T[ci+1]} ]]; then wd=$HOME; else wd=$(resolve "${T[ci+1]}"); fi
    return 1
  fi
  classify_readonly
  if (( ci < NT )); then
    case ${T[ci]} in
      export|declare|typeset)
        if (( NT - ci == 1 )) || [[ ${T[ci+1]} == -p || ${T[ci+1]} == -x ]]; then rule="${T[ci]} (muestra variables de entorno)"; return 0; fi ;;
      set) (( NT - ci == 1 )) && { rule='set (muestra variables de entorno)'; return 0; } ;;
      .) analyze_reader $((ci + 1)) && return 0 ;;
    esac
  fi
  # git o gh invocados por $(...) o una variable: el tramo empieza en el subcomando.
  [[ $git_subs == *" ${T[0]} "* ]] && { analyze_git 0 && return 0; }
  [[ $gh_groups == *" ${T[0]} "* ]] && { analyze_gh 0 && return 0; }
  # Cualquier palabra del tramo puede ser el comando real (if/then, timeout 60, nice -n 5, find -exec…).
  for (( i = 0; i < NT; i++ )); do
    t=${T[i]}; name=${t##*/}; name=${name%%@*}
    [[ $t == @railway/cli* ]] && name=railway
    case $name in
      git) analyze_git $((i + 1)) && return 0 ;;
      gh) analyze_gh $((i + 1)) && return 0 ;;
      rm) analyze_rm $((i + 1)) && return 0 ;;
      sqlite3|sqlite|litecli) rule="$name (SQL a mano sobre la base)"; return 0 ;;
      vercel|vc|wrangler|netlify|netlify-cli|ntl|fly|flyctl|railway) rule="deploy con $name"; return 0 ;;
      printenv) rule='printenv (muestra variables de entorno, que pueden tener secretos)'; return 0 ;;
      env) env_bare $((i + 1)) && return 0 ;;
      curl|wget|http|https|xh) analyze_curl $((i + 1)) && return 0 ;;
      grep|egrep|fgrep|rg|ag|ack|tar|zip|rsync|cp|scp|find) analyze_bulk "$name" $((i + 1)) && return 0 ;;
      cat|head|tail|less|more|source|bat|xxd|od|strings|base64|nl|tac) analyze_reader $((i + 1)) && return 0 ;;
    esac
    if [[ $t == '$'* ]]; then
      nx=${T[i+1]}
      [[ $git_subs == *" $nx "* ]] && { analyze_git $((i + 1)) && return 0; }
      [[ $gh_groups == *" $nx "* ]] && { analyze_gh $((i + 1)) && return 0; }
    fi
  done
  return 1
}

case $tool in
  Read|Edit|MultiEdit|Write|NotebookEdit|Grep)
    path=$(field .tool_input.file_path)
    [[ -z $path ]] && path=$(field .tool_input.notebook_path)
    [[ -z $path ]] && path=$(field .tool_input.path)
    lp=$(lower "$path")
    if [[ -n $lp ]] && sensitive "$lp"; then
      block "$why" "$tool no puede abrir ni modificar esta ruta."
    fi
    if [[ $tool != Read && $tool != Grep ]]; then
      content=$(field .tool_input.content)$(field .tool_input.new_string)$(field .tool_input.edits)$(field .tool_input.new_source)
      if [[ $(lower "$content") == *disableallhooks* ]]; then
        block 'disableAllHooks' 'Apagaría esta guardia y todos los hooks del proyecto.'
      fi
      if [[ -n $lp ]] && protected "$lp"; then
        mode_gate 'Configuración de Claude Code (.claude/, CLAUDE.md)' 'Cambia la guardia, los permisos o las instrucciones con que trabaja Claude.'
      fi
      if [[ -n $lp ]] && dbfile "$lp"; then
        mode_gate 'Cambio de esquema (src/server/db.ts)' 'Ese archivo define la base y sus MIGRATIONS. Las migraciones corren solas al abrir la base y son de solo agregado: no se edita ni se reordena una existente, la nueva va al final.'
      fi
    fi
    ;;

  Bash)
    fullcmd=$(field .tool_input.command)
    [[ -z $fullcmd ]] && exit 0
    if (( ${#fullcmd} > max_cmd )); then
      block "comando de más de $((max_cmd / 1024)) KB" 'Es demasiado largo para revisarlo a tiempo. Partilo, o escribí el contenido con la herramienta Write.'
    fi
    lowcmd=$(lower "$fullcmd")
    if [[ $lowcmd == *disableallhooks* ]]; then block 'disableAllHooks' 'Apagaría esta guardia y todos los hooks del proyecto.'; fi
    if [[ $lowcmd == *node:sqlite* || $lowcmd == *experimental-sqlite* ]]; then block 'node:sqlite (SQL a mano sobre la base)' 'Es destructivo o difícil de revertir.'; fi
    mutation=0; [[ $lowcmd == *mutation* ]] && mutation=1
    # ${IFS} y $IFS separan palabras igual que un espacio.
    norm=$(printf '%s' "$fullcmd" | sed -E 's/\$\{?IFS\}?/ /g')

    # 1) Rutas sensibles y configuración en cualquier palabra (cat, source, <, rutas absolutas, --x=ruta).
    words=$(printf '%s' "$norm" | tr '[:upper:]' '[:lower:]' | tr -d "\"'\\\\" | tr '`(){}<>=:,;&|[]\n\t' '                 ')
    read -r -a toks <<< "$words"
    prot=0 db=0
    for t in "${toks[@]}"; do
      if sensitive_word "$t"; then
        block "$why" "El comando menciona una ruta protegida ($t), lo armes como lo armes."
      fi
      protected "$t" && prot=1
      dbfile "$t" && db=1
    done

    # 2) Comandos peligrosos en cualquier tramo: separa por ; & | saltos de línea, $( ) y comillas
    # invertidas. Antes quita las redirecciones (2>&1, >&2, 2>, >>): su número no es un argumento.
    segments=$(printf '%s' "$norm" | sed -E 's/[0-9]*[<>]+&?[0-9-]*//g' | tr -d "\"'\\\\" | tr '`();&|' '\n\n\n\n\n\n' | tr '{}<>,[]' '       ')
    # Un tramo bloqueado corta en el acto; las aprobaciones se deciden al final, para que
    # «git commit && git push --force» se bloquee y no quede en una pregunta.
    wd=${cwd:-$PWD}
    readonly_all=1
    while IFS= read -r line; do
      read -r -a T <<< "$line"
      NT=${#T[@]}
      (( NT == 0 )) && continue
      reason=''
      if check_segment; then
        block "$rule" "${reason:-Es destructivo, difícil de revertir o expone secretos.}"
      fi
    done <<< "$segments"

    # 3) Escribir la configuración de Claude Code o db.ts desde Bash (sed -i, >, cp, mv, chmod, git checkout…).
    if (( prot || db )); then
      # Una redirección cuenta como escritura solo si apunta a uno de esos archivos.
      while IFS= read -r tgt; do
        tgt=${tgt#>}; tgt=${tgt#>}
        tgt=${tgt#"${tgt%%[![:space:]]*}"}
        tgt=$(lower "$tgt")
        if protected "$tgt" || dbfile "$tgt"; then readonly_all=0; fi
      done < <(printf '%s' "$fullcmd" | tr -d "\"'" | grep -oE '>>?[[:space:]]*[^[:space:]&|;<>()]+')
      if (( ! readonly_all )); then
        (( prot )) && add_gate 'Configuración de Claude Code (.claude/, CLAUDE.md)' 'Cambia la guardia, los permisos o las instrucciones con que trabaja Claude.'
        (( db )) && add_gate 'Cambio de esquema (src/server/db.ts)' 'Ese archivo define la base y sus MIGRATIONS (de solo agregado).'
      fi
    fi
    [[ -n $gate ]] && mode_gate "$gate" "$gate_why"
    ;;
esac

exit 0
