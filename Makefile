# UnivChain local dev — Anvil + Foundry deploy + frontend sync
# Run `make help` for targets.

SHELL := /bin/bash

ROOT_DIR        := $(abspath $(dir $(lastword $(MAKEFILE_LIST))))
BLOCKCHAIN_DIR  := $(ROOT_DIR)/blockchain
FRONTEND_DIR    := $(ROOT_DIR)/frontend
INDEXER_DIR     := $(ROOT_DIR)/indexer
SCRIPTS_DIR     := $(ROOT_DIR)/scripts

INDEXER_PORT    ?= 8787
export INDEXER_PORT

ANVIL_RPC       ?= http://127.0.0.1:8545
ANVIL_CHAIN_ID  ?= 31337
ANVIL_PORT      ?= 8545
# Anvil 1.5+ default account (0) — see `anvil` startup "Private Keys" list
ANVIL_PRIVATE_KEY ?= 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

ANVIL_PID_FILE  := $(BLOCKCHAIN_DIR)/.anvil.pid
ANVIL_LOG_FILE  := $(BLOCKCHAIN_DIR)/anvil.log
DEPLOY_SCRIPT   := script/DeployUniversity.s.sol:DeployUniversity
SETUP_SCRIPT    := script/SetupAnvilDev.s.sol:SetupAnvilDev

export PRIVATE_KEY := $(ANVIL_PRIVATE_KEY)
export ANVIL_PORT ANVIL_CHAIN_ID

.DEFAULT_GOAL := help

.PHONY: help anvil anvil-stop anvil-logs anvil-status check-anvil build test deploy deploy-anvil \
        sync-frontend setup-dev local frontend-dev indexer-install indexer-dev indexer-sync dev \
        redeploy clean-anvil-state clean-indexer-data

help:
	@echo "UnivChain — common commands"
	@echo ""
	@echo "  make anvil            Start Anvil in the background (chain $(ANVIL_CHAIN_ID))"
	@echo "  make anvil-stop       Stop background Anvil"
	@echo "  make anvil-status     Show whether Anvil is running"
	@echo "  make anvil-logs       Tail Anvil log"
	@echo "  make deploy           Deploy contracts to running Anvil"
	@echo "  make sync-frontend    Copy addresses from broadcast/ into frontend constants"
	@echo "  make setup-dev        deploy + sync + Mock USDC + setTokenFee on Core"
	@echo "  make local            Fresh Anvil + deploy + sync + setup-dev + clear indexer DB"
	@echo "  make clean-indexer-data  Remove indexer/data (SQLite)"
	@echo "  make redeploy         anvil-stop, fresh anvil, deploy, sync-frontend"
	@echo "  make test             forge test"
	@echo "  make build            forge build"
	@echo "  make frontend-dev     Next.js dev server"
	@echo "  make indexer-dev      Enrollment indexer API (port $(INDEXER_PORT))"
	@echo "  make dev              indexer + frontend in parallel (Anvil must be running)"
	@echo ""
	@echo "Env: ANVIL_RPC=$(ANVIL_RPC)  ANVIL_CHAIN_ID=$(ANVIL_CHAIN_ID)"

anvil:
	@bash "$(SCRIPTS_DIR)/dev-anvil.sh" start

anvil-stop:
	@bash "$(SCRIPTS_DIR)/dev-anvil.sh" stop

anvil-status:
	@bash "$(SCRIPTS_DIR)/dev-anvil.sh" status || true

anvil-logs:
	@tail -f "$(ANVIL_LOG_FILE)"

check-anvil:
	@curl -sf "$(ANVIL_RPC)" -X POST -H "Content-Type: application/json" \
		-d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
		| grep -q "$$(printf '0x%x' $(ANVIL_CHAIN_ID))" \
		|| (echo "Anvil not reachable at $(ANVIL_RPC). Run: make anvil" && exit 1)

build:
	@cd "$(BLOCKCHAIN_DIR)" && forge build

test:
	@cd "$(BLOCKCHAIN_DIR)" && forge test

deploy deploy-anvil: check-anvil build
	@echo "Deploying UnivChain (admin = Anvil account 0)..."
	@cd "$(BLOCKCHAIN_DIR)" && \
		PRIVATE_KEY="$(ANVIL_PRIVATE_KEY)" forge script "$(DEPLOY_SCRIPT)" \
			--rpc-url "$(ANVIL_RPC)" \
			--broadcast
	@echo "Done. Run: make sync-frontend"

sync-frontend:
	@node "$(SCRIPTS_DIR)/sync-frontend-addresses.mjs"

setup-dev: deploy sync-frontend
	@echo "Setting up Mock USDC + registration fee..."
	@cd "$(BLOCKCHAIN_DIR)" && \
		UNIVERSITY_CORE="$$(node "$(SCRIPTS_DIR)/sync-frontend-addresses.mjs" --print UniversityCore)" && \
		PRIVATE_KEY="$(ANVIL_PRIVATE_KEY)" UNIVERSITY_CORE="$$UNIVERSITY_CORE" \
		forge script "$(SETUP_SCRIPT)" --rpc-url "$(ANVIL_RPC)" --broadcast
	@$(MAKE) sync-frontend
	@echo "Mock USDC synced to frontend (enrollmentToken). Students: /enroll"

redeploy: anvil-stop anvil deploy sync-frontend
	@echo "Redeploy complete."

clean-indexer-data:
	@rm -rf "$(INDEXER_DIR)/data"
	@echo "Removed indexer data: $(INDEXER_DIR)/data"

local: anvil-stop clean-indexer-data anvil setup-dev indexer-install
	@echo "Local stack ready."
	@echo "  make dev            — indexer + frontend"
	@echo "  make indexer-dev    — indexer only"
	@echo "  make frontend-dev   — frontend only"

indexer-install:
	@if [ ! -d "$(INDEXER_DIR)/node_modules" ]; then \
		echo "Installing indexer dependencies..."; \
		cd "$(INDEXER_DIR)" && npm install; \
	fi

indexer-dev: indexer-install
	@cd "$(INDEXER_DIR)" && npm run dev

indexer-sync: indexer-install
	@cd "$(INDEXER_DIR)" && npm run sync

frontend-dev:
	@cd "$(FRONTEND_DIR)" && npm run dev

dev: indexer-install
	@echo "Starting indexer (port $(INDEXER_PORT)) + frontend (port 3000)…"
	@$(MAKE) -j2 indexer-dev frontend-dev

clean-anvil-state:
	@rm -rf "$(BLOCKCHAIN_DIR)/broadcast" "$(BLOCKCHAIN_DIR)/cache" "$(ANVIL_LOG_FILE)"
	@echo "Removed local Foundry broadcast/cache and anvil.log"
