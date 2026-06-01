#!/usr/bin/env bash
set -euo pipefail

# =============================================================================
# spec-center-template init.sh
# Interactive scaffold for creating multi-repo workspaces
# =============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEMPLATES_DIR="$SCRIPT_DIR/templates"

# ---------------------------------------------------------------------------
# Colors
# ---------------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

info()  { echo -e "${CYAN}[INFO]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
error() { echo -e "${RED}[ERROR]${NC} $*" >&2; }
success() { echo -e "${GREEN}[OK]${NC} $*"; }

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------
PROJECT_NAME=""
TARGET_DIR=""
MODULES=""
DRY_RUN=false

ALL_MODULES=("spec-center" "server" "web" "mobile" "admin")
DEFAULT_MODULES=("spec-center" "server")

# ---------------------------------------------------------------------------
# Usage
# ---------------------------------------------------------------------------
usage() {
    cat <<EOF
Usage: $(basename "$0") [OPTIONS]

Initialize a multi-repo workspace from scaffold templates.

Options:
  -n, --name      Project name (skip interactive prompt)
  -d, --dir       Target directory (default: ./{name}-workspace)
  -m, --modules   Comma-separated modules (skip interactive selection)
  --dry-run       Show what would be created without writing anything
  -h, --help      Show this help

Examples:
  ./init.sh
  ./init.sh -n acme -d ~/projects/acme -m spec-center,server,web
  ./init.sh --dry-run -n myapp
EOF
    exit 0
}

# ---------------------------------------------------------------------------
# Argument parsing
# ---------------------------------------------------------------------------
parse_args() {
    while [[ $# -gt 0 ]]; do
        case "$1" in
            -n|--name)
                PROJECT_NAME="$2"
                shift 2
                ;;
            -d|--dir)
                TARGET_DIR="$2"
                shift 2
                ;;
            -m|--modules)
                MODULES="$2"
                shift 2
                ;;
            --dry-run)
                DRY_RUN=true
                shift
                ;;
            -h|--help)
                usage
                ;;
            *)
                error "Unknown option: $1"
                usage
                ;;
        esac
    done
}

# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------
validate_project_name() {
    local name="$1"
    if [[ ! "$name" =~ ^[a-z][a-z0-9]*(-[a-z0-9]+)*$ ]]; then
        error "Invalid project name: '$name'"
        echo "  Must match: ^[a-z][a-z0-9]*(-[a-z0-9]+)*\$"
        echo "  - Start with lowercase letter"
        echo "  - Only lowercase letters, digits, and hyphens"
        echo "  - No trailing hyphen"
        echo "  - Length 2-50 characters"
        exit 1
    fi
    if [[ ${#name} -lt 2 || ${#name} -gt 50 ]]; then
        error "Project name must be 2-50 characters, got: ${#name}"
        exit 1
    fi
}

validate_module() {
    local mod="$1"
    local found=false
    for m in "${ALL_MODULES[@]}"; do
        if [[ "$m" == "$mod" ]]; then
            found=true
            break
        fi
    done
    if [[ "$found" == false ]]; then
        error "Unknown module: '$mod'. Available: ${ALL_MODULES[*]}"
        exit 1
    fi
}

# ---------------------------------------------------------------------------
# Interactive prompts
# ---------------------------------------------------------------------------
prompt_project_name() {
    echo ""
    info "Project name is used as prefix for all repositories."
    echo "  Example: 'acme' creates acme-spec-center/, acme-server/, etc."
    echo ""
    while true; do
        read -rp "Project name: " PROJECT_NAME
        if [[ -z "$PROJECT_NAME" ]]; then
            warn "Project name is required."
            continue
        fi
        if validate_project_name "$PROJECT_NAME"; then
            break
        fi
    done
}

prompt_target_dir() {
    local default="./${PROJECT_NAME}-workspace"
    echo ""
    read -rp "Target directory [${default}]: " input
    TARGET_DIR="${input:-$default}"
}

prompt_modules() {
    echo ""
    info "Select modules to include:"
    echo "  spec-center and server are always included."
    echo ""
    echo "  Available optional modules:"
    echo "    1) web"
    echo "    2) mobile"
    echo "    3) admin"
    echo ""
    read -rp "Enter numbers, comma-separated (e.g. 1,3) or 'all' [none]: " selection

    local selected=("${DEFAULT_MODULES[@]}")

    if [[ -z "$selection" ]]; then
        MODULES="$(IFS=,; echo "${selected[*]}")"
        return
    fi

    if [[ "$selection" == "all" ]]; then
        MODULES="$(IFS=,; echo "${ALL_MODULES[*]}")"
        return
    fi

    IFS=',' read -ra choices <<< "$selection"
    for choice in "${choices[@]}"; do
        choice="$(echo "$choice" | tr -d '[:space:]')"
        case "$choice" in
            1) selected+=("web") ;;
            2) selected+=("mobile") ;;
            3) selected+=("admin") ;;
            *) warn "Skipping unknown selection: $choice" ;;
        esac
    done

    # Remove duplicates while preserving order
    local seen=()
    local unique=()
    for item in "${selected[@]}"; do
        if [[ ! " ${seen[*]} " =~ " ${item} " ]]; then
            seen+=("$item")
            unique+=("$item")
        fi
    done

    MODULES="$(IFS=,; echo "${unique[*]}")"
}

# ---------------------------------------------------------------------------
# Dry run
# ---------------------------------------------------------------------------
dry_run() {
    echo ""
    info "=== DRY RUN — nothing will be written ==="
    echo ""
    echo "Project name : $PROJECT_NAME"
    echo "Target dir   : $TARGET_DIR"
    echo "Modules      : $MODULES"
    echo ""
    echo "Would create:"
    echo "  $TARGET_DIR/                          (workspace root, NOT a git repo)"
    echo "  $TARGET_DIR/AGENTS.md"
    echo "  $TARGET_DIR/CLAUDE.md"

    IFS=',' read -ra mods <<< "$MODULES"
    for mod in "${mods[@]}"; do
        mod="$(echo "$mod" | tr -d '[:space:]')"
        local dir_name="${PROJECT_NAME}-${mod}"
        echo ""
        echo "  $TARGET_DIR/$dir_name/               (git repo: $dir_name)"
        find "$TEMPLATES_DIR/$mod" -type f 2>/dev/null | while read -r f; do
            local rel="${f#$TEMPLATES_DIR/$mod/}"
            echo "    $dir_name/$rel"
        done
    done
    echo ""
    info "=== END DRY RUN ==="
}

# ---------------------------------------------------------------------------
# Scaffold execution
# ---------------------------------------------------------------------------
replace_placeholders() {
    local dir="$1"
    # Cross-platform sed: use -i.bak then delete .bak files
    find "$dir" -type f -exec sed -i.bak "s/{{PROJECT}}/$PROJECT_NAME/g" {} +
    find "$dir" -name '*.bak' -delete
}

init_module() {
    local mod="$1"
    local mod_dir="$TARGET_DIR/${PROJECT_NAME}-${mod}"
    local template_dir="$TEMPLATES_DIR/$mod"

    if [[ ! -d "$template_dir" ]]; then
        error "Template directory not found: $template_dir"
        return 1
    fi

    info "Creating ${PROJECT_NAME}-${mod}/ ..."
    mkdir -p "$mod_dir"
    cp -r "$template_dir/." "$mod_dir/"
    replace_placeholders "$mod_dir"

    # Initialize git repo
    (
        cd "$mod_dir"
        git init
        git branch -M main
        git add .
        git commit -m "chore: initialize $mod from scaffold"
    )

    success "Created ${PROJECT_NAME}-${mod}/"
}

init_root() {
    local template_dir="$TEMPLATES_DIR/root"

    info "Creating workspace root files ..."
    cp -r "$template_dir/." "$TARGET_DIR/"
    replace_placeholders "$TARGET_DIR"
    success "Created workspace root files"
}

# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
main() {
    parse_args "$@"

    # Ensure templates directory exists
    if [[ ! -d "$TEMPLATES_DIR" ]]; then
        error "Templates directory not found: $TEMPLATES_DIR"
        error "Ensure you are running init.sh from the scaffold repo root."
        exit 1
    fi

    # Interactive prompts for missing values
    if [[ -z "$PROJECT_NAME" ]]; then
        prompt_project_name
    else
        validate_project_name "$PROJECT_NAME"
    fi

    if [[ -z "$TARGET_DIR" ]]; then
        prompt_target_dir
    fi

    if [[ -z "$MODULES" ]]; then
        prompt_modules
    else
        # Validate provided modules
        IFS=',' read -ra mods <<< "$MODULES"
        for mod in "${mods[@]}"; do
            mod="$(echo "$mod" | tr -d '[:space:]')"
            validate_module "$mod"
        done
        # Ensure spec-center and server are always included
        local has_spec=false has_server=false
        for mod in "${mods[@]}"; do
            mod="$(echo "$mod" | tr -d '[:space:]')"
            [[ "$mod" == "spec-center" ]] && has_spec=true
            [[ "$mod" == "server" ]] && has_server=true
        done
        if [[ "$has_spec" == false ]]; then
            MODULES="spec-center,$MODULES"
        fi
        if [[ "$has_server" == false ]]; then
            MODULES="server,$MODULES"
        fi
    fi

    # Dry run
    if [[ "$DRY_RUN" == true ]]; then
        dry_run
        exit 0
    fi

    # Check target directory
    if [[ -d "$TARGET_DIR" ]]; then
        warn "Target directory already exists: $TARGET_DIR"
        read -rp "Continue? Files may be overwritten. [y/N]: " confirm
        if [[ "$confirm" != "y" && "$confirm" != "Y" ]]; then
            info "Aborted."
            exit 0
        fi
    fi

    # Create workspace
    mkdir -p "$TARGET_DIR"
    info "Creating workspace at $TARGET_DIR"
    echo ""

    # Init root files (AGENTS.md, CLAUDE.md at workspace root)
    init_root
    echo ""

    # Init each module
    IFS=',' read -ra mods <<< "$MODULES"
    for mod in "${mods[@]}"; do
        mod="$(echo "$mod" | tr -d '[:space:]')"
        init_module "$mod"
    done

    # Summary
    echo ""
    echo "=========================================="
    success "Workspace created successfully!"
    echo "=========================================="
    echo ""
    echo "  Location : $TARGET_DIR"
    echo "  Project  : $PROJECT_NAME"
    echo "  Modules  :"
    for mod in "${mods[@]}"; do
        mod="$(echo "$mod" | tr -d '[:space:]')"
        echo "              ${PROJECT_NAME}-${mod}/"
    done
    echo ""
    info "Next steps:"
    echo "  1. cd $TARGET_DIR"
    echo "  2. Review and customize each module's AGENTS.md"
    echo "  3. Define tech stack and build commands per module"
    echo ""
}

main "$@"
