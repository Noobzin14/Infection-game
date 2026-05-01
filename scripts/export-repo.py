#!/usr/bin/env python3
import os
import json
from datetime import datetime

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

SECTIONS = [
    ("1. DOCUMENTAÇÃO DO PROJETO", [
        ("README.md", None),
        ("MEMORY.json", None),
    ]),
    ("2. ARQUITETURA E INVARIANTES", [
        ("ARCHITECTURE.md", None),
        ("INVARIANTS.md", None),
        ("REPO_MAP.md", None),
    ]),
    ("3. CÓDIGO FONTE", [
        ("index.html", "html"),
        ("style.css", "css"),
        ("game.js", "javascript"),
        ("logger.js", "javascript"),
        ("dev-mode.js", "javascript"),
    ]),
    ("4. ROTEIRO E DADOS DO JOGO", [
        ("story/chapter1.json", "json"),
        ("data/items.json", "json"),
        ("data/character.json", "json"),
    ]),
    ("5. PIPELINE E WORKFLOW", [
        ("AI_WORKFLOW.md", None),
        (".github/workflows/ai-review.yml", "yaml"),
        (".github/workflows/process-logs.yml", "yaml"),
        ("AGENTS.md", None),
    ]),
]


def read_text(path):
    abs_path = os.path.join(ROOT, path)
    if not os.path.exists(abs_path):
        print(f"⚠️ Arquivo não encontrado: {path}")
        return None
    with open(abs_path, "r", encoding="utf-8") as f:
        return f.read()


def count_nonempty_lines(text):
    return sum(1 for line in text.splitlines() if line.strip())


def load_json(path):
    content = read_text(path)
    if content is None:
        return None
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        print(f"⚠️ JSON inválido em: {path}")
        return None


def extract_known_issues(repo_map_text):
    if not repo_map_text:
        return ["- Não foi possível extrair problemas conhecidos (REPO_MAP.md ausente)."]

    lines = repo_map_text.splitlines()
    issues = []
    capture = False
    for line in lines:
        lower = line.lower()
        if "próximas cenas a escrever" in lower:
            capture = True
            continue
        if capture and line.startswith("## "):
            break
        if capture and line.strip().startswith("-"):
            issues.append(line.strip())

    for line in lines:
        if "não escrita" in line.lower() or "pendên" in line.lower():
            bullet = f"- {line.strip()}"
            if bullet not in issues:
                issues.append(bullet)

    return issues or ["- Nenhum problema conhecido identificado automaticamente."]


def build_summary():
    game_js = read_text("game.js") or ""
    dev_mode_js = read_text("dev-mode.js") or ""
    logger_js = read_text("logger.js") or ""
    style_css = read_text("style.css") or ""
    chapter = load_json("story/chapter1.json") or {}
    items = load_json("data/items.json") or []
    character = load_json("data/character.json") or {}
    invariants = read_text("INVARIANTS.md") or ""

    cenas = chapter.get("cenas", []) if isinstance(chapter, dict) else []
    if isinstance(items, dict):
        raw_items = items.get("items", [])
    else:
        raw_items = items if isinstance(items, list) else []
    if isinstance(character, dict):
        tracos = character.get("tracos", [])
    else:
        tracos = []

    inv_count = sum(1 for line in invariants.splitlines() if line.strip().startswith("### I"))

    workflows = 0
    wf_dir = os.path.join(ROOT, ".github", "workflows")
    if os.path.isdir(wf_dir):
        workflows = len([f for f in os.listdir(wf_dir) if f.endswith((".yml", ".yaml"))])

    items_by_category = {}
    for item in raw_items:
        if isinstance(item, dict):
            cat = item.get("categoria", "sem_categoria")
            items_by_category[cat] = items_by_category.get(cat, 0) + 1

    scene_lines = []
    for cena in cenas:
        if isinstance(cena, dict):
            scene_lines.append(f"- `{cena.get('id', 'sem_id')}`: {cena.get('texto', '').splitlines()[0][:120]}")

    return {
        "js_lines": count_nonempty_lines(game_js) + count_nonempty_lines(dev_mode_js) + count_nonempty_lines(logger_js),
        "css_lines": count_nonempty_lines(style_css),
        "scene_count": len(cenas),
        "items_count": len(raw_items),
        "traits_count": len(tracos),
        "invariants_count": inv_count,
        "workflow_count": workflows,
        "scene_lines": scene_lines,
        "items_by_category": items_by_category,
    }


def main():
    memory = load_json("MEMORY.json") or {}
    version = memory.get("ultima_atualizacao", "desconhecida") if isinstance(memory, dict) else "desconhecida"
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    output = []
    output.append("# Infection Game — Exportação Completa do Repositório")
    output.append(f"**Data:** {now}")
    output.append(f"**Versão:** {version}")

    total_files = sum(len(files) for _, files in SECTIONS)
    output.append(f"**Total de arquivos:** {total_files}")
    output.append("\n---\n")

    output.append("## ÍNDICE")
    output.append("1. Documentação do Projeto")
    output.append("2. Arquitetura e Invariantes")
    output.append("3. Código Fonte")
    output.append("4. Roteiro e Dados do Jogo")
    output.append("5. Pipeline e Workflow")
    output.append("6. Sumário Técnico")
    output.append("\n---\n")

    for section_title, files in SECTIONS:
        output.append(f"## {section_title}\n")
        for file_path, code_lang in files:
            output.append(f"### {file_path}")
            content = read_text(file_path)
            if content is None:
                output.append("_Arquivo não encontrado._\n")
                output.append("---\n")
                continue
            if code_lang:
                output.append(f"```{code_lang}\n{content}\n```\n")
            else:
                output.append(content)
                output.append("")
            output.append("---\n")

    summary = build_summary()
    repo_map_text = read_text("REPO_MAP.md") or ""
    known_issues = extract_known_issues(repo_map_text)

    output.append("## 6. SUMÁRIO TÉCNICO")
    output.append("[gerado automaticamente pelo script]\n")
    output.append("### Estatísticas")
    output.append(f"- Total de linhas de código JavaScript: {summary['js_lines']}")
    output.append(f"- Total de linhas de CSS: {summary['css_lines']}")
    output.append(f"- Total de cenas no roteiro: {summary['scene_count']}")
    output.append(f"- Total de itens em data/items.json: {summary['items_count']}")
    output.append(f"- Total de traços em data/character.json: {summary['traits_count']}")
    output.append(f"- Total de invariantes documentados: {summary['invariants_count']}")
    output.append(f"- Total de workflows GitHub Actions: {summary['workflow_count']}\n")

    output.append("### Cenas do capítulo 1")
    output.extend(summary["scene_lines"] or ["- Nenhuma cena encontrada."])
    output.append("")

    output.append("### Itens por categoria")
    if summary["items_by_category"]:
        for cat, count in sorted(summary["items_by_category"].items()):
            output.append(f"- {cat}: {count}")
    else:
        output.append("- Nenhum item encontrado.")
    output.append("")

    output.append("### Problemas conhecidos")
    output.extend(known_issues)

    final_text = "\n".join(output).rstrip() + "\n"
    out_path = os.path.join(ROOT, "repo-export.md")
    with open(out_path, "w", encoding="utf-8") as f:
        f.write(final_text)

    size_kb = os.path.getsize(out_path) // 1024
    line_count = len(final_text.splitlines())
    print(f"✅ Exportado: repo-export.md ({size_kb} KB, {line_count} linhas)")


if __name__ == "__main__":
    main()
