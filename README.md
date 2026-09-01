# Rutas Turísticas Peatonales — MTC

Sistema Web de Rutas Turísticas Peatonales desde Estaciones Ferroviarias. Permite planificar
recorridos a pie entre estaciones de tren y zonas turísticas cercanas, con datos logísticos
(estaciones, horarios, tarifas) provistos por PeruRail, zonas turísticas provistas por Travel
Group, clima sincronizado automáticamente desde Open-Meteo (SENAMHI), y publicación final a
cargo del MTC.

## Estructura del proyecto

```
RutasMTC/
├── Backend/     API REST (Node.js + Express + MySQL)
└── Frontend/    Aplicación web (Angular)
```

## Requisitos previos

- Node.js 20+ y npm
- MySQL 8+ en ejecución local, con la base de datos ya creada

## Backend

```bash
cd Backend
npm install
cp .env.example .env   # y completar credenciales de la BD
npm run dev            # http://localhost:3000
```

## Frontend

```bash
cd Frontend
npm install
npm start               # http://localhost:4200
```

El frontend consume la API en `http://localhost:3000` por defecto (configurable vía
`CORS_ORIGIN` en el backend y los environments de Angular).
