#!/usr/bin/env bash
# Guardia PreToolUse de Weda (Way of Working, E3).
# Los permisos de .claude/settings.json comparan solo el comienzo del comando; este hook mira
# la llamada entera: rutas sensibles en cualquier posición, flags peligrosos de git en cualquier
# lugar, escrituras de tags, merge de PR y escrituras por gh api, también envueltos
# (bash -c, sh -c, eval, xargs, npx, env, $(...)).
# Entrada: el JSON del hook por stdin. Salida: JSON con permissionDecision deny/ask, o nada
# (la llamada sigue el flujo normal de permisos). Compatible con el bash 3.2 de macOS.

input=$(cat)

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

# Motivo de las operaciones que requieren a la dueña. Se bloquean en vez de preguntar porque en modo
# auto una regla ask no frenó la llamada (prueba de E3, 2026-10-31: git tag se ejecutó sin aprobación).
needs_owner='Requiere la aprobación de la dueña, y en modo auto la pregunta no frena la llamada.'

tool=$(field .tool_name) || decide ask "La guardia de Weda no encontró jq ni python3 para leer la llamada; confirmala a mano."
cwd=$(field .cwd)
mode=$(field .permission_mode)

# Operaciones que la dueña aprueba una por una (commit, push, crear PR, esquema): en modo default se
# pregunta; en cualquier otro modo, o si el modo no llega, se bloquea, porque ahí la pregunta no frena
# la llamada (opción A de E3, 2026-10-31).
mode_gate() { # $1 = operación, $2 = motivo
  if [[ $mode == default ]]; then
    decide ask "$1: $2 Necesita la aprobación de la dueña."
  fi
  block "$1 en modo ${mode:-desconocido}" "$2 Fuera del modo default la pregunta de aprobación no frena la llamada, así que se bloquea: que lo haga la dueña o que pase la sesión a modo default."
}

# Rutas sensibles: .env y .env.* (salvo .env.example), .dev.vars, .data*/, ~/.ssh/, ~/.config/gh/.
# Deja la regla aplicada en $why.
sensitive() {
  local p=$1 base
  while [[ $p == */ && $p != / ]]; do p=${p%/}; done
  base=${p##*/}
  if [[ ($base == .env || $base == .env.*) && $base != .env.example ]]; then
    why='archivos .env con secretos (solo se permite .env.example)'; return 0
  fi
  if [[ $base == .dev.vars ]]; then why='secretos locales en .dev.vars'; return 0; fi
  if [[ /$p/ =~ /\.data[^/]*/ ]]; then why='datos locales en .data*/ (bases SQLite con datos personales)'; return 0; fi
  if [[ /$p/ == */.ssh/* ]]; then why='claves en ~/.ssh/'; return 0; fi
  if [[ /$p/ == */.config/gh/* ]]; then why='credenciales de GitHub en ~/.config/gh/'; return 0; fi
  return 1
}

# Igual que sensitive, pero para una palabra suelta de un comando: expande ~ y comodines.
sensitive_word() {
  local t=$1 m
  [[ -z $t ]] && return 1
  [[ $t == '~'* ]] && t=$HOME${t#\~}
  # Un comodín se juzga por lo que expande (.env.ex* sí, .e* con un .env presente no);
  # si no expande a nada, por la palabra tal cual.
  if [[ $t == *[*?[]* ]]; then
    local found=0
    while IFS= read -r m; do
      [[ -z $m ]] && continue
      found=1
      sensitive "$m" && return 0
    done < <(cd "${cwd:-.}" 2>/dev/null && compgen -G "$t")
    (( found )) && return 1
  fi
  sensitive "$t"
}

# Ruta de un argumento de cd o git -C, relativa a la carpeta actual del comando ($wd).
resolve() {
  local d=$1
  [[ $d == '~'* ]] && d=$HOME${d#\~}
  [[ $d == /* ]] || d=$wd/$d
  printf '%s' "$d"
}

# Analiza un tramo de comando (ya separado por ; & | y subcomandos). Deja la regla en $rule.
check_segment() {
  local -a a=("$@")
  local n=$# i=0 t cmd sub r f del force
  # Saltea asignaciones, flags y envoltorios hasta llegar al comando real.
  while (( i < n )); do
    t=${a[i]}
    if [[ $t == -* || $t =~ ^[A-Za-z_][A-Za-z0-9_]*= ]]; then ((i++)); continue; fi
    case ${t##*/} in
      sudo|env|command|builtin|exec|time|nohup|nice|xargs|eval|npx|bunx|pnpx|dlx|npm|pnpm|yarn|bash|sh|zsh) ((i++)); continue ;;
    esac
    break
  done
  (( i >= n )) && return 1
  cmd=${a[i]##*/}; ((i++))

  case $cmd in
    cd)
      # Sigue los cd del comando para saber en qué repo corre cada git.
      [[ -z ${a[i]} ]] && wd=$HOME || wd=$(resolve "${a[i]}")
      return 1 ;;
    git)
      repo=$wd
      while (( i < n )); do
        case ${a[i]} in
          -C) repo=$(resolve "${a[i+1]}"); ((i += 2)) ;;
          -c|--git-dir|--work-tree|--namespace) ((i += 2)) ;;
          -*) ((i++)) ;;
          *) break ;;
        esac
      done
      sub=${a[i]}; ((i++))
      case $sub in
        push)
          local remote=''
          for t in "${a[@]:i}"; do
            case $t in
              --force|--force-with-lease*|--force-if-includes|--mirror|--delete|--prune)
                rule="git push $t"; return 0 ;;
              --tags|--follow-tags)
                rule="publicar tags (git push $t)"; reason=$needs_owner; return 0 ;;
              --*) ;;
              -*) if [[ $t == *[fd]* ]]; then rule="git push $t (-f fuerza, -d borra)"; return 0; fi ;;
              +*) rule="git push con refspec forzado ($t)"; return 0 ;;
              :*) rule="git push con refspec que borra una rama remota ($t)"; return 0 ;;
              *refs/tags/*) rule="publicar tags (git push $t)"; reason=$needs_owner; return 0 ;;
              *)
                # El primer argumento es el remoto; los demás son refspecs. Solo pasa un refspec que sea
                # HEAD o una rama confirmada en el repo del comando: cualquier otro podría ser un tag.
                if [[ -z $remote ]]; then remote=$t; continue; fi
                local src=${t%%:*}
                case $src in HEAD|@|refs/heads/*) continue ;; esac
                if ! git -C "$repo" show-ref --verify --quiet "refs/heads/$src" 2>/dev/null; then
                  rule="publicar tags o refs que no son una rama confirmada (git push … $t)"; reason=$needs_owner; return 0
                fi ;;
            esac
          done
          gate='git push' ;;
        commit) gate='git commit' ;;
        tag)
          # Leer tags pasa; crear, mover o borrar se bloquea (en modo auto, ask no frena la llamada).
          local list=0 write=0
          for t in "${a[@]:i}"; do
            case $t in
              -l|--list|-n|-n[0-9]*|--contains*|--no-contains*|--points-at*|--merged*|--no-merged*|--sort*|--column*|--no-column|--format*|-v|--verify|-i|--ignore-case|--color*) list=1 ;;
              -a|-s|-u|-m|-F|-f|-d|-e|--annotate|--sign|--local-user*|--message*|--file*|--force|--delete|--edit|--create-reflog|--cleanup*|--trailer*) write=1 ;;
              --*) ;;
              -*) [[ $t == *[asumFfde]* ]] && write=1 ;;
              *) [[ $list == 0 ]] && write=1 ;;
            esac
          done
          (( write )) && { rule='crear, mover o borrar tags (git tag)'; reason=$needs_owner; return 0; } ;;
        reset)
          for t in "${a[@]:i}"; do
            [[ $t == --hard ]] && { rule='git reset --hard'; return 0; }
          done ;;
        clean) rule='git clean'; return 0 ;;
        branch)
          del=0; force=0
          for t in "${a[@]:i}"; do
            case $t in
              --delete) del=1 ;;
              --force) force=1 ;;
              --*) ;;
              -*)
                [[ $t == *D* ]] && { rule="git branch $t"; return 0; }
                [[ $t == *d* ]] && del=1
                [[ $t == *f* ]] && force=1 ;;
            esac
          done
          (( del && force )) && { rule='git branch -D (borrado forzado)'; return 0; } ;;
      esac ;;
    rm)
      r=0; f=0
      for t in "${a[@]:i}"; do
        case $t in
          --recursive) r=1 ;;
          --force) f=1 ;;
          --*) ;;
          -*) [[ $t == *[rR]* ]] && r=1; [[ $t == *f* ]] && f=1 ;;
        esac
      done
      (( r && f )) && { rule='rm -rf (borrado recursivo forzado)'; return 0; } ;;
    gh)
      # Prioriza no dejar pasar nada: ante la duda, bloquea.
      local -a pos=()
      local method='' fields=0 input=0 mutation=0
      while (( i < n )); do
        t=${a[i]}
        case $t in
          -X|--method) method=${a[i+1]}; ((i += 2)); continue ;;
          -X*) method=${t#-X} ;;
          --method=*) method=${t#--method=} ;;
          -f|-F|--field|--raw-field) fields=1; [[ ${a[i+1]} == *@* ]] && input=1; ((i += 2)); continue ;;
          -f*|-F*|--field=*|--raw-field=*) fields=1; [[ $t == *@* ]] && input=1 ;;
          --input|--input=*) input=1 ;;
          -R|--repo|-H|--header|-q|--jq|-t|--template|--hostname|-p|--preview|--cache) ((i += 2)); continue ;;
          -*) ;;
          *) pos+=("$t") ;;
        esac
        ((i++))
      done
      [[ $(printf '%s' "$fullcmd" | tr '[:upper:]' '[:lower:]') == *mutation* ]] && mutation=1
      method=$(printf '%s' "$method" | tr '[:lower:]' '[:upper:]')
      case ${pos[0]} in
        pr)
          for t in "${pos[@]:1}"; do
            [[ $t == merge ]] && { rule='merge de PR (gh pr merge)'; reason=$needs_owner; return 0; }
            [[ $t == create ]] && gate='crear un PR (gh pr create)'
          done ;;
        api)
          if [[ ${pos[1]} == graphql || ${pos[1]} == /graphql ]]; then
            (( mutation || input )) && { rule='mutación GraphQL (gh api graphql)'; reason=$needs_owner; return 0; }
          elif [[ -n $method && $method != GET && $method != HEAD ]]; then
            rule="escritura por la API de GitHub (gh api -X $method)"; reason=$needs_owner; return 0
          elif [[ -z $method ]] && (( fields || input )); then
            rule='escritura por la API de GitHub (gh api con campos usa POST; para leer, agregá -X GET)'; reason=$needs_owner; return 0
          fi ;;
        alias)
          [[ ${pos[1]} == set || ${pos[1]} == import ]] && { rule="gh alias ${pos[1]} (un alias puede esconder un merge o una escritura)"; reason=$needs_owner; return 0; } ;;
      esac ;;
    sqlite3) rule='sqlite3 (SQL a mano sobre la base)'; return 0 ;;
    vercel|wrangler|netlify|fly|flyctl|railway) rule="deploy con $cmd"; return 0 ;;
  esac
  return 1
}

case $tool in
  Read|Edit|MultiEdit|Write|NotebookEdit|Grep)
    path=$(field .tool_input.file_path)
    [[ -z $path ]] && path=$(field .tool_input.notebook_path)
    [[ -z $path ]] && path=$(field .tool_input.path)
    [[ -z $path ]] && exit 0
    if sensitive "$path"; then
      block "$why" "$tool no puede abrir ni modificar esta ruta."
    fi
    if [[ $tool == Edit || $tool == MultiEdit || $tool == Write ]] && [[ $path == src/server/db.ts || $path == */src/server/db.ts ]]; then
      mode_gate 'Cambio de esquema (src/server/db.ts)' "Ese archivo define la base y sus MIGRATIONS. Las migraciones corren solas al abrir la base y son de solo agregado: no se edita ni se reordena una existente, la nueva va al final."
    fi
    ;;

  Bash)
    fullcmd=$(field .tool_input.command)
    [[ -z $fullcmd ]] && exit 0

    # 1) Rutas sensibles en cualquier palabra del comando (cat, less, head, source, <, rutas absolutas, --x=ruta).
    words=$(printf '%s' "$fullcmd" | tr -d "\"'\\\\" | tr '`(){}<>=:,;&|\n\t' '                ')
    read -r -a toks <<< "$words"
    for t in "${toks[@]}"; do
      if sensitive_word "$t"; then
        block "$why" "El comando menciona una ruta protegida ($t), lo armes como lo armes."
      fi
    done

    # 2) Comandos peligrosos en cualquier tramo: separa por ; & | saltos de línea, $( ) y comillas invertidas.
    # Antes quita las redirecciones (2>&1, >&2, 2>, >>): su número de descriptor no es un argumento.
    segments=$(printf '%s' "$fullcmd" | sed -E 's/[0-9]*[<>]+&?[0-9-]*//g' | tr -d "\"'\\\\" | tr '`();&|' '\n\n\n\n\n\n' | tr '{}<>' '    ')
    # Un tramo bloqueado corta en el acto; las operaciones con aprobación se deciden al final, para que
    # «git commit && git push --force» se bloquee y no quede en una pregunta.
    wd=${cwd:-$PWD}
    gate=''
    while IFS= read -r line; do
      read -r -a seg <<< "$line"
      (( ${#seg[@]} == 0 )) && continue
      reason=""
      if check_segment "${seg[@]}"; then
        block "$rule" "${reason:-Es destructivo o difícil de revertir (historia de git, archivos, base de datos o deploy).}"
      fi
    done <<< "$segments"
    [[ -n $gate ]] && mode_gate "$gate" 'Commit, push y PR los aprueba la dueña (CLAUDE.md).'
    ;;
esac

exit 0
