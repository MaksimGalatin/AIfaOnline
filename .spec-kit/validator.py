# -*- coding: utf-8 -*-
import subprocess
import os
import sys

def check_git_config(cwd):
    print("Checking Git Config...")
    try:
        git_path = "d:/CODE/mingit/cmd/git.exe"
        if not os.path.exists(git_path):
            git_path = "git"
            
        username = subprocess.check_output([git_path, "config", "user.name"], cwd=cwd, text=True).strip()
        email = subprocess.check_output([git_path, "config", "user.email"], cwd=cwd, text=True).strip()
        
        if username != "Maksim Galatin":
            print(f"[FAIL] Git user.name is '{username}', must be 'Maksim Galatin'")
            return False
        if email != "codeofdigitaleternity.com" and email != "codeofdigitaleternity@gmail.com":
            if email != "codeofdigitaleternity@gmail.com":
                print(f"[FAIL] Git user.email is '{email}', must be 'codeofdigitaleternity@gmail.com'")
                return False
        print(f"[PASS] Git config: {username} <{email}>")
        return True
    except Exception as e:
        print("[WARN] Could not check git configuration:", str(e))
        return True

def check_forbidden_words(cwd):
    print("Checking for forbidden words...")
    forbidden = ["пророк", "освободитель", "спаситель", "prophet", "savior", "liberator"]
    
    found_issues = False
    extensions = (".ts", ".tsx", ".js", ".jsx", ".json", ".md")
    
    for root, dirs, files in os.walk(cwd):
        if any(p in root for p in ["node_modules", ".next", ".git", "app_ignored_during_vercel_build", "web_ignored_during_vercel_build", "BACKUPS", ".spec-kit"]):
            continue
            
        for file in files:
            if file.endswith(extensions):
                if file in ["target_site.json", "website_content.json", "CONSTITUTION.md", "CHRONOLOGY.md", "walkthrough.md"]:
                    continue
                    
                file_path = os.path.join(root, file)
                
                try:
                    with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                        content = f.read()
                        
                    content_lower = content.lower()
                    for word in forbidden:
                        if word in content_lower:
                            lines = content.splitlines()
                            for line_idx, line in enumerate(lines):
                                if word in line.lower():
                                    print(f"[FAIL] Forbidden word '{word}' found in {file_path}:{line_idx+1} -> {line.strip()[:80]}")
                                    found_issues = True
                except Exception as e:
                    pass
                    
    if not found_issues:
        print("[PASS] No forbidden terminology found.")
        return True
    return False

if __name__ == "__main__":
    cwd = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    print(f"Running Spec-Kit Validator for: {cwd}")
    
    git_ok = check_git_config(cwd)
    words_ok = check_forbidden_words(cwd)
    
    if not git_ok or not words_ok:
        print("\n[RESULT] Validation FAILED! Please resolve the issues before committing.")
        sys.exit(1)
    else:
        print("\n[RESULT] Validation PASSED successfully!")
        sys.exit(0)
