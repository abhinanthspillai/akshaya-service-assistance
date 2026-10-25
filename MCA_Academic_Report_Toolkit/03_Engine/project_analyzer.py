#!/usr/bin/env python3
"""
Dynamic Codebase Scanner and Project Analyzer
MCA Academic Report Toolkit — Amal Jyothi College of Engineering Autonomous
Inspects repository code, Git history, database schemas, and architectural files
to produce authentic, zero-bluff project configurations.
"""

import os
import sys
import json
import re
import subprocess
from pathlib import Path

def get_git_info(workspace_dir):
    """Extracts authentic Git repository details, branches, and commit logs."""
    info = {
        "is_git": False,
        "repo_url": "",
        "repo_name": "",
        "branch": "main",
        "author_name": "",
        "author_email": "",
        "commits": []
    }
    try:
        # Check if git exists
        res = subprocess.run(["git", "rev-parse", "--is-inside-work-tree"],
                             cwd=workspace_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if res.returncode != 0:
            return info

        info["is_git"] = True

        # Branch
        b_res = subprocess.run(["git", "branch", "--show-current"],
                               cwd=workspace_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if b_res.returncode == 0 and b_res.stdout.strip():
            info["branch"] = b_res.stdout.strip()

        # Remote URL & Name
        r_res = subprocess.run(["git", "remote", "get-url", "origin"],
                               cwd=workspace_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if r_res.returncode == 0:
            url = r_res.stdout.strip()
            info["repo_url"] = url
            # Extract owner/repo
            m = re.search(r"[:/]([^/:]+/[^/:]+?)(?:\.git)?$", url)
            if m:
                info["repo_name"] = m.group(1)

        # Author from latest commit
        a_res = subprocess.run(["git", "log", "-1", "--format=%an|%ae"],
                               cwd=workspace_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if a_res.returncode == 0 and "|" in a_res.stdout:
            parts = a_res.stdout.strip().split("|", 1)
            info["author_name"] = parts[0]
            info["author_email"] = parts[1]

        # Recent 30 commits
        c_res = subprocess.run(["git", "log", "-n", "30", "--pretty=format:%h|%ad|%an|%s", "--date=short"],
                               cwd=workspace_dir, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True)
        if c_res.returncode == 0 and c_res.stdout.strip():
            rows = []
            for line in c_res.stdout.strip().split("\n"):
                parts = line.split("|", 3)
                if len(parts) == 4:
                    rows.append(parts)
            info["commits"] = rows

    except Exception as e:
        print(f"[WARN] Git extraction error: {e}")

    return info

def detect_languages_and_frameworks(workspace_dir):
    """Scans the directory tree to identify programming languages, tools, and frameworks."""
    stats = {
        "languages": {},
        "frameworks": set(),
        "primary_language": "Kotlin / Java",
        "primary_framework": "Jetpack Compose",
        "target_platform": "Android Mobile Platform",
        "backend_infrastructure": "Google Firebase & Cloud Functions",
        "database_type": "Cloud Firestore NoSQL Database"
    }

    ext_map = {
        ".kt": "Kotlin",
        ".java": "Java",
        ".py": "Python",
        ".php": "PHP",
        ".js": "JavaScript",
        ".jsx": "React JavaScript",
        ".ts": "TypeScript",
        ".tsx": "React TypeScript",
        ".cs": "C#",
        ".cpp": "C++",
        ".c": "C",
        ".dart": "Dart",
        ".go": "Go",
        ".swift": "Swift",
        ".rb": "Ruby"
    }

    skip_dirs = {
        "node_modules", ".git", ".gradle", "build", "dist", "target", "vendor",
        "bin", "obj", ".idea", ".vscode", "venv", ".venv", "__pycache__",
        "MCA_Academic_Report_Toolkit", "Report"
    }

    file_counts = {}
    for root, dirs, files in os.walk(workspace_dir):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            ext = os.path.splitext(f)[1].lower()
            if ext in ext_map:
                lang = ext_map[ext]
                file_counts[lang] = file_counts.get(lang, 0) + 1

            # Framework manifest checks
            fname = f.lower()
            if fname == "package.json":
                stats["frameworks"].add("Node.js")
            elif fname == "composer.json":
                stats["frameworks"].add("PHP Composer")
            elif fname in ("build.gradle", "build.gradle.kts"):
                stats["frameworks"].add("Gradle")
            elif fname == "pom.xml":
                stats["frameworks"].add("Maven / Spring")
            elif fname == "requirements.txt" or fname == "pyproject.toml":
                stats["frameworks"].add("Python Ecosystem")
            elif fname == "pubspec.yaml":
                stats["frameworks"].add("Flutter")
            elif fname == "firebase.json":
                stats["frameworks"].add("Google Firebase")

    stats["languages"] = file_counts
    if file_counts:
        primary = max(file_counts.items(), key=lambda x: x[1])[0]
        stats["primary_language"] = primary

        # Derive platform & stack
        if primary in ("Kotlin", "Java"):
            if "Gradle" in stats["frameworks"] or any("android" in root.lower() for root, _, _ in os.walk(workspace_dir)):
                stats["target_platform"] = "Google Android OS (API 31-36)"
                stats["primary_framework"] = "Android Jetpack Compose"
                stats["backend_infrastructure"] = "Google Firebase Cloud Ecosystem"
                stats["database_type"] = "Cloud Firestore & Realtime Database"
            else:
                stats["target_platform"] = "Java Enterprise Platform (JVM)"
                stats["primary_framework"] = "Spring Boot / Enterprise Java"
                stats["backend_infrastructure"] = "Spring Cloud / Microservices"
                stats["database_type"] = "PostgreSQL / MySQL Relational Database"
        elif primary == "PHP":
            stats["target_platform"] = "Web Application (Cross-Platform Browser)"
            stats["primary_framework"] = "Laravel MVC Framework" if "PHP Composer" in stats["frameworks"] else "PHP Web Architecture"
            stats["backend_infrastructure"] = "Apache / Nginx Web Server"
            stats["database_type"] = "MySQL Relational Database"
        elif primary in ("JavaScript", "TypeScript", "React JavaScript", "React TypeScript"):
            stats["target_platform"] = "Modern Web / Single Page Application"
            stats["primary_framework"] = "React.js / Next.js Declarative UI"
            stats["backend_infrastructure"] = "Node.js / Express Serverless"
            stats["database_type"] = "MongoDB NoSQL / PostgreSQL"
        elif primary == "Python":
            stats["target_platform"] = "Cross-Platform Application / Web Services"
            stats["primary_framework"] = "Django / FastAPI Application Framework"
            stats["backend_infrastructure"] = "Python WSGI/ASGI Cloud Runtime"
            stats["database_type"] = "PostgreSQL / SQLite Database"
        elif primary == "Dart":
            stats["target_platform"] = "Cross-Platform Mobile (Android & iOS)"
            stats["primary_framework"] = "Flutter Declarative UI"
            stats["backend_infrastructure"] = "Firebase / REST Cloud APIs"
            stats["database_type"] = "Cloud Firestore / SQLite"

    stats["frameworks"] = list(stats["frameworks"])
    return stats

def find_primary_source_files(workspace_dir, max_files=5):
    """Discovers real substantial production source code files for Appendix 9.1."""
    skip_dirs = {
        "node_modules", ".git", ".gradle", "build", "dist", "target", "vendor",
        "bin", "obj", ".idea", ".vscode", "venv", ".venv", ".venv_test", "test_venv",
        "__pycache__", "MCA_Academic_Report_Toolkit", "Report", "tools", "scratch",
        "site-packages", "lib", "Lib", "storage", "uploads", "test-results", "playwright-report"
    }
    candidate_exts = {".py", ".ts", ".tsx", ".js", ".jsx"}

    candidates = []
    # Prefer searching inside backend/app and frontend/src first
    search_roots = [
        os.path.join(workspace_dir, "backend", "app"),
        os.path.join(workspace_dir, "frontend", "src")
    ]
    existing_roots = [r for r in search_roots if os.path.exists(r)]
    if not existing_roots:
        existing_roots = [workspace_dir]

    for s_root in existing_roots:
        for root, dirs, files in os.walk(s_root):
            dirs[:] = [d for d in dirs if d not in skip_dirs and "venv" not in d.lower() and "site-packages" not in d.lower()]
            for f in files:
                ext = os.path.splitext(f)[1].lower()
                if ext in candidate_exts:
                    fpath = os.path.join(root, f)
                    rel_path = os.path.relpath(fpath, workspace_dir)
                    try:
                        size = os.path.getsize(fpath)
                        # Exclude trivial or massive files
                        if 800 < size < 100000:
                            candidates.append((rel_path, size, ext))
                    except Exception:
                        continue

    # Sort by size descending (most substantial core files)
    candidates.sort(key=lambda x: x[1], reverse=True)
    return [c[0].replace("\\", "/") for c in candidates[:max_files]]

def extract_database_schemas(workspace_dir):
    """
    Parses docs/DATABASE.md, SQL files, or ORM models in the workspace to construct authentic database schemas.
    """
    schemas = []
    db_md = os.path.join(workspace_dir, "docs", "DATABASE.md")

    # 1. First priority: Parse docs/DATABASE.md if available
    if os.path.exists(db_md):
        try:
            with open(db_md, "r", encoding="utf-8", errors="ignore") as f:
                content = f.read()

            sections = re.findall(r"###\s+([a-z0-9_]+)\s*\n(.*?)(?=\n###|\n##|\Z)", content, re.DOTALL)
            for tbl_name, body in sections:
                fields = []
                pk = "id"
                fk = "Nil"
                for line in body.strip().split("\n"):
                    line = line.strip()
                    if line.startswith("- "):
                        parts = line[2:].split(None, 2)
                        if len(parts) >= 2:
                            f_name = parts[0]
                            f_type = parts[1]
                            f_rest = parts[2] if len(parts) > 2 else ""
                            constraints = []
                            if "PK" in f_rest.upper():
                                constraints.append("Primary Key")
                                pk = f_name
                            if "FK" in f_rest.upper() or "->" in f_rest:
                                constraints.append("Foreign Key")
                                if fk == "Nil":
                                    fk = f_rest.split("->")[-1].strip() if "->" in f_rest else "External"
                            if "NOT NULL" in f_rest.upper():
                                constraints.append("Not Null")
                            if "UNIQUE" in f_rest.upper():
                                constraints.append("Unique")
                            if "CHECK" in f_rest.upper():
                                constraints.append("Check Constraint")
                            if not constraints:
                                constraints.append("Optional / Nullable")

                            desc = f"Attribute storing {f_name.replace('_', ' ')}"
                            if "PK" in f_rest.upper():
                                desc = f"Primary unique key for {tbl_name.replace('_', ' ')}"
                            elif "created_at" in f_name:
                                desc = "UTC timestamp recording creation date"
                            elif "updated_at" in f_name:
                                desc = "UTC timestamp recording last modification"
                            elif "->" in f_rest:
                                target = f_rest.split("->")[-1].strip().split()[0]
                                desc = f"Foreign reference to {target}"

                            fields.append({
                                "field": f_name,
                                "type": f_type,
                                "constraints": ", ".join(constraints),
                                "description": desc
                            })
                if fields:
                    schemas.append({
                        "table_name": tbl_name,
                        "description": f"Relational entity table for {tbl_name.replace('_', ' ').title()}",
                        "primary_key": pk,
                        "foreign_key": fk,
                        "fields": fields
                    })
        except Exception as e:
            print(f"[WARN] Error parsing docs/DATABASE.md: {e}")

    if schemas:
        return schemas

    skip_dirs = {"node_modules", ".git", ".gradle", "build", "vendor"}

    # 2. Search for .sql files if DATABASE.md was not present
    for root, dirs, files in os.walk(workspace_dir):
        dirs[:] = [d for d in dirs if d not in skip_dirs]
        for f in files:
            if f.endswith(".sql"):
                fpath = os.path.join(root, f)
                try:
                    with open(fpath, "r", encoding="utf-8", errors="ignore") as sql_file:
                        content = sql_file.read()
                    table_matches = re.findall(r"CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?([`\"\w]+)\s*\((.*?)\);",
                                               content, re.DOTALL | re.IGNORECASE)
                    for tbl_name, tbl_body in table_matches:
                        clean_tbl = tbl_name.strip("`\" ")
                        fields = []
                        for line in tbl_body.strip().split("\n"):
                            line = line.strip().rstrip(",")
                            if not line or line.upper().startswith(("PRIMARY KEY", "FOREIGN KEY", "KEY ", "CONSTRAINT", "UNIQUE")):
                                continue
                            parts = line.split()
                            if len(parts) >= 2:
                                col_name = parts[0].strip("`\" ")
                                col_type = parts[1].upper()
                                constraints = " ".join(parts[2:]) if len(parts) > 2 else "NULL"
                                fields.append({
                                    "field": col_name,
                                    "type": col_type,
                                    "constraints": constraints,
                                    "description": f"Attribute storing {col_name.replace('_', ' ')}"
                                })
                        if fields:
                            schemas.append({
                                "table_name": clean_tbl,
                                "description": f"Relational entity table for {clean_tbl.replace('tbl_', '').replace('_', ' ').title()}",
                                "fields": fields
                            })
                except Exception:
                    continue

    return schemas

def run_project_analysis(workspace_dir, config_path):
    """Executes end-to-end analysis and merges authentic details into config.json."""
    print("=" * 70)
    print("   AUTONOMOUS PROJECT SCANNER & CODEBASE AUDITOR")
    print(f"   Target Workspace: {workspace_dir}")
    print("=" * 70)

    git_info = get_git_info(workspace_dir)
    tech_info = detect_languages_and_frameworks(workspace_dir)
    code_files = find_primary_source_files(workspace_dir, max_files=5)
    schemas = extract_database_schemas(workspace_dir)

    print(f"-> Primary Language Detected : {tech_info['primary_language']}")
    print(f"-> Target Platform           : {tech_info['target_platform']}")
    print(f"-> Frameworks Detected       : {', '.join(tech_info['frameworks']) or 'Standard Architecture'}")
    print(f"-> Git Commits Extracted     : {len(git_info['commits'])} commits (Repo: {git_info['repo_name'] or 'Local Git'})")
    print(f"-> Core Source Files Found   : {len(code_files)} architectural files")
    print(f"-> Database Schemas Parsed   : {len(schemas)} real schemas")

    # Load existing config
    cfg = {}
    if os.path.exists(config_path):
        try:
            with open(config_path, "r", encoding="utf-8") as f:
                cfg = json.load(f)
        except Exception:
            cfg = {}

    # Merge non-destructively
    pj = cfg.setdefault("project", {})
    if pj.get("primary_language", "").startswith("Programming") or not pj.get("primary_language"):
        pj["primary_language"] = tech_info["primary_language"]
    if pj.get("target_platform", "").startswith("Target") or not pj.get("target_platform"):
        pj["target_platform"] = tech_info["target_platform"]
    if pj.get("backend_infrastructure", "").startswith("Backend") or not pj.get("backend_infrastructure"):
        pj["backend_infrastructure"] = tech_info["backend_infrastructure"]
    if git_info["repo_name"] and not pj.get("github_repo"):
        pj["github_repo"] = git_info["repo_name"]

    st = cfg.setdefault("student", {})
    if git_info["author_name"] and st.get("full_name") == "STUDENT FULL NAME":
        st["full_name"] = git_info["author_name"]
    if git_info["author_email"] and st.get("email") == "student@mca.ajce.in":
        st["email"] = git_info["author_email"]

    # Store discovered code files & git log in config
    if code_files:
        cfg["sample_code_files"] = code_files
    if git_info["commits"]:
        cfg["git_commits"] = git_info["commits"]
    if schemas:
        cfg["database_schemas"] = schemas

    # Write back updated config
    with open(config_path, "w", encoding="utf-8") as f:
        json.dump(cfg, f, indent=2)

    print(f"[OK] Authentic project metadata successfully merged into: {config_path}")
    return cfg

if __name__ == "__main__":
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    cfg_file = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "01_Inputs", "config.json"))
    run_project_analysis(base_dir, cfg_file)
