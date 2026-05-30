.PHONY: api api-build extension-help

api-build:
	cd backend && go build -o ../bin/priora-api .

api:
	cd backend && go run .

extension-help:
	@echo "Carga la extensión en chrome://extensions → Modo desarrollador → Cargar descomprimida → carpeta extension/"
