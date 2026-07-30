# =============================================================================
# Makefile — Kýdos Belote (workflows unifiés).
# -----------------------------------------------------------------------------
# Toutes les commandes fréquentes en une ligne. Documentation détaillée :
#   docs/mobile-connection.md — connexion mobile ↔ serveur (les 4 cibles)
#   docs/ai/TESTING.md        — tests, couverture, TNR, E2E
#   docs/ai/DEPLOYMENT.md     — production
#
# Usage : `make help` pour lister les cibles, `make check` pour diagnostiquer.
# ==============================================================================

# --- Configuration ------------------------------------------------------------
PORT       ?= 4000
API_PORT   ?= $(PORT)
WEB_PORT   ?= 5173
NODE       := node
NPM        := npm
UNAME_S    := $(shell uname -s)
IP         := $(shell $(NODE) -e "const n=require('os').networkInterfaces();let ip='';for(const a of Object.values(n))for(const x of a||[])if(x.family==='IPv4'&&!x.internal){if(x.address.startsWith('192.168.'))ip=x.address;else if(!ip)ip=x.address;}console.log(ip||'')")

# Couleurs pour l'aide
B := \033[1m
D := \033[2m
C := \033[36m
G := \033[32m
X := \033[0m

.DEFAULT_GOAL := help
.PHONY: help check ip install \
        dev dev-server dev-web dev-server-permissive \
        cap-sync cap-android cap-ios cap-open-android cap-open-ios cap-add-android cap-add-ios \
        android-device android-emulator ios-sim ios-device remote \
        logs-android logs-ios inspect-android inspect-ios \
        build prod tnr tnr-server coverage e2e-web test typecheck \
        clean clean-all

# --- Aide ---------------------------------------------------------------------
help:  ## Affiche cette aide
	@printf "$(B)Kýdos Belote — Makefile$(X)\n"
	@printf "IP LAN détectée : $(C)$(IP)$(X)  ·  port serveur : $(C)$(PORT)$(X)\n\n"
	@printf "$(B)Diagnostic$(X)\n"
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z_-]+:.*## / && /^(help|check|ip|install)/ {printf "  $(C)%-22s$(X) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n$(B)Développement$(X)\n"
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z_-]+:.*## / && /^(dev|dev-server|dev-web|dev-server-permissive)/ {printf "  $(C)%-22s$(X) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n$(B)Mobile — 4 cibles$(X)\n"
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z_-]+:.*## / && /^(android-device|android-emulator|ios-sim|ios-device|remote|cap-)/ {printf "  $(C)%-22s$(X) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n$(B)Debug$(X)\n"
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z_-]+:.*## / && /^(logs|inspect)/ {printf "  $(C)%-22s$(X) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n$(B)Prod & CI$(X)\n"
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z_-]+:.*## / && /^(build|prod|tnr|coverage|e2e-web|test|typecheck)/ {printf "  $(C)%-22s$(X) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n$(B)Nettoyage$(X)\n"
	@awk 'BEGIN{FS=":.*## "} /^[a-zA-Z_-]+:.*## / && /^clean/ {printf "  $(C)%-22s$(X) %s\n", $$1, $$2}' $(MAKEFILE_LIST)
	@printf "\n$(D)Doc : docs/mobile-connection.md · docs/ai/TESTING.md · docs/ai/DEPLOYMENT.md$(X)\n"

# --- Diagnostic ---------------------------------------------------------------
check:  ## Diagnostique la connexion mobile↔serveur (7 vérifications)
	@$(NODE) scripts/healthcheck.mjs --port=$(PORT) --target=$${TARGET:-device}

ip:  ## Affiche l'IP LAN à utiliser sur un device Android physique
	@printf "IP LAN : $(C)$(IP)$(X)  ·  URL device : $(C)http://$(IP):$(PORT)/api$(X)\n"

install:  ## Installe toutes les dépendances (npm ci)
	@$(NPM) ci --no-audit --no-fund

# --- Développement ------------------------------------------------------------
dev: ## Lance serveur + web + met à jour mobile/.env — parallèle
	@$(MAKE) -j 2 dev-server-permissive dev-web

dev-server: ## Serveur Node (MongoDB attendu sur mongodb://127.0.0.1:27017)
	@$(NPM) --workspace belote-server run dev

dev-server-permissive: ## Serveur Node avec CORS_ORIGIN=* et Mongo en mémoire (dev fluide)
	@CORS_ORIGIN=* USE_MEMORY_DB=1 $(NPM) --workspace belote-server run dev

dev-web: ## Application web (Vite)
	@$(NPM) --workspace belote-web run dev

# --- Capacitor : socle mobile -------------------------------------------------
cap-add-android: ## Ajoute le projet natif Android (1re fois — Android Studio requis)
	@cd mobile && npx cap add android

cap-add-ios: ## Ajoute le projet natif iOS (1re fois — macOS + Xcode requis)
	@cd mobile && npx cap add ios

cap-sync: ## Build web + copie dans les projets natifs (à faire après chaque changement)
	@$(NPM) --workspace belote-mobile run cap:sync

cap-open-android: ## Ouvre Android Studio sur le projet
	@cd mobile && npx cap open android

cap-open-ios: ## Ouvre Xcode sur le projet
	@cd mobile && npx cap open ios

# --- Mobile : 4 cibles --------------------------------------------------------
android-device: ## Device Android physique branché (Wi-Fi + USB) — configure et lance
	@printf "$(B)Cible : device Android physique$(X) — IP $(C)$(IP)$(X)\n"
	@$(NODE) mobile/scripts/set-dev-ip.mjs $(PORT)
	@$(NPM) --workspace belote-mobile run cap:sync
	@cd mobile && npx cap run android

android-emulator: ## Émulateur AVD (Android Studio) — utilise 10.0.2.2 automatiquement
	@printf "$(B)Cible : émulateur Android (AVD)$(X)\n"
	@$(NODE) mobile/scripts/set-dev-ip.mjs $(PORT) 10.0.2.2
	@$(NPM) --workspace belote-mobile run cap:sync
	@cd mobile && npx cap run android --target=emulator

ios-sim: ## Simulateur iOS (macOS + Xcode requis) — utilise localhost
	@printf "$(B)Cible : simulateur iOS$(X)\n"
	@$(NODE) mobile/scripts/set-dev-ip.mjs $(PORT) localhost
	@$(NPM) --workspace belote-mobile run cap:sync
	@cd mobile && npx cap run ios

ios-device: ## iPhone physique (macOS + Xcode + Apple ID configuré)
	@printf "$(B)Cible : device iOS physique$(X) — IP $(C)$(IP)$(X)\n"
	@$(NODE) mobile/scripts/set-dev-ip.mjs $(PORT)
	@$(NPM) --workspace belote-mobile run cap:sync
	@cd mobile && npx cap run ios --target=device

remote: ## Serveur DISTANT : passe REMOTE=https://api.example.com pour configurer
	@if [ -z "$(REMOTE)" ]; then \
		printf "Usage : $(C)make remote REMOTE=https://api.kydosbelote.com$(X)\n"; exit 1; \
	fi
	@printf "$(B)Cible : serveur distant$(X) $(C)$(REMOTE)$(X)\n"
	@printf "VITE_API_URL=$(REMOTE)/api\n" > mobile/.env
	@$(NPM) --workspace belote-mobile run cap:sync

# --- Debug --------------------------------------------------------------------
logs-android: ## adb logcat filtré (WebView + erreurs) — device Android
	@adb logcat -v time chromium:V console:V *:E

inspect-android: ## Ouvre chrome://inspect (Android — device branché en USB debug)
	@printf "Ouvrez dans Chrome : $(C)chrome://inspect$(X)\n"
	@printf "Votre device doit apparaître ; cliquez sur 'inspect' sous la WebView Kýdos.\n"

logs-ios: ## Console iOS (macOS uniquement)
	@log stream --predicate 'process == "Kýdos Belote"' --level=debug

inspect-ios: ## Web Inspector iOS (macOS uniquement — Safari > Développement)
	@printf "1) Sur l'iPhone : Réglages > Safari > Avancé > Web Inspector = ON\n"
	@printf "2) Sur le Mac  : Safari > Développement > <votre iPhone> > Kýdos Belote\n"

# --- Prod, tests, CI ----------------------------------------------------------
build: ## Build de tous les workspaces
	@$(NPM) --workspaces --if-present run build

prod: ## Serveur en production (attend un vrai MongoDB + variables d'env)
	@$(NPM) --workspace belote-server run start

tnr: ## TNR global (typecheck + tests + builds + démo moteur)
	@$(NPM) run tnr

tnr-server: ## TNR serveur (avec intégration Mongo si MONGOMS_AVAILABLE=1)
	@$(NPM) run tnr:server

coverage: ## Rapport de couverture consolidé (5 workspaces)
	@$(NPM) run coverage

e2e-web: ## E2E web (Playwright, navigateur réel — CI ou local si Chromium installé)
	@$(NPM) run e2e:web

test: ## Tests unitaires de tous les workspaces
	@$(NPM) --workspaces --if-present run test

typecheck: ## Typecheck des 5 workspaces
	@$(NPM) --workspace belote-core run typecheck
	@$(NPM) --workspace @kydos/table-pixi run typecheck
	@$(NPM) --workspace belote-server run typecheck
	@$(NPM) --workspace belote-web run typecheck
	@$(NPM) --workspace belote-mobile run typecheck

# --- Nettoyage ----------------------------------------------------------------
clean: ## Supprime les artefacts (dist, coverage, tsbuildinfo, reports)
	@find . -name "*.tsbuildinfo" -delete 2>/dev/null || true
	@find . -type d \( -name "dist" -o -name "coverage" -o -name ".results" \) -not -path "*/node_modules/*" -exec rm -rf {} + 2>/dev/null || true
	@rm -rf reports web/e2e/report test-results 2>/dev/null || true
	@printf "$(G)Artefacts supprimés.$(X)\n"

clean-all: clean ## Nettoie tout, y compris node_modules (nécessite `make install` après)
	@find . -type d -name "node_modules" -not -path "*/mobile/android/*" -not -path "*/mobile/ios/*" -exec rm -rf {} + 2>/dev/null || true
	@printf "$(G)Reset complet.$(X)\n"
