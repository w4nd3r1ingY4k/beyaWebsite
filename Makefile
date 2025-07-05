.PHONY: build deploy clean

clean:
	@cd frontend && rm -rf build

build: clean
	@cd frontend && npm run build

deploy: build
	@cd frontend && firebase deploy

all: deploy