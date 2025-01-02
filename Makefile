.PHONY: build deploy clean

clean:
	@cd my-app && rm -rf build

build: clean
	@cd my-app && npm run build

deploy: build
	@cd my-app && firebase deploy

all: deploy