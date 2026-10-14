#!/usr/bin/env bash
set -euo pipefail
MODEL="${OLLAMA_MODEL:-qwen2.5:1.5b-instruct}"

if ! command -v curl >/dev/null 2>&1; then
  echo "curl is required. On Ubuntu, install it with: sudo apt update && sudo apt install curl"
  exit 1
fi

if ! command -v ollama >/dev/null 2>&1; then
  echo "Ollama is not installed. The official installer will download and install it."
  echo "This may request your Linux password through sudo."
  read -r -p "Install Ollama now? [y/N] " answer
  case "$answer" in y|Y|yes|YES) curl -fsSL https://ollama.com/install.sh | sh ;; *) echo "Skipped Ollama installation. Nova still runs with its fallback mode."; exit 0 ;; esac
fi

if ! curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then
  if command -v systemctl >/dev/null 2>&1 && systemctl list-unit-files ollama.service 2>/dev/null | grep -q ollama.service; then
    echo "Starting the Ollama service..."
    sudo systemctl enable --now ollama
  else
    echo "Starting Ollama in the background for this user session..."
    mkdir -p "$HOME/.cache/nova"
    nohup ollama serve > "$HOME/.cache/nova/ollama.log" 2>&1 &
  fi
fi

ready=0
for _ in $(seq 1 30); do
  if curl -fsS --max-time 2 http://127.0.0.1:11434/api/tags >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
if [ "$ready" -ne 1 ]; then
  echo "Ollama did not become ready. Check: ~/.cache/nova/ollama.log or: journalctl -u ollama"
  exit 1
fi

echo "Downloading model $MODEL (roughly 1 GB for the default 1.5B model)."
echo "This is a pretrained model download, not training from scratch."
ollama pull "$MODEL"
echo
echo "Setup complete. In VS Code, run: npm start"
echo "Then open: http://127.0.0.1:4173"
