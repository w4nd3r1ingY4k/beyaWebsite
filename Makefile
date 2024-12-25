.PHONY: build deploy

build:
	@cd my-app && npm run build

deploy: build
	@cd my-app && firebase deploy

all: deploy