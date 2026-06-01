ifneq (,$(wildcard .env))
    include .env
    export
endif

.PHONY: help install dev build test lint clean

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies
	@echo "TODO: define install command"

dev: ## Start dev server
	@echo "TODO: define dev command"

build: ## Build for production
	@echo "TODO: define build command"

test: ## Run tests
	@echo "TODO: define test command"

lint: ## Run linter
	@echo "TODO: define lint command"

clean: ## Clean build artifacts
	@echo "TODO: define clean command"
