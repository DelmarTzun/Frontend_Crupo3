# Frontend Grupo 3 — Dashboard de Compras

Dashboard interactivo con **HTML + CSS + JavaScript** y **ApexCharts**, consumiendo la API FastAPI del backend.

## Requisitos del enunciado cubiertos

| Requisito | Implementación |
|-----------|----------------|
| 4 KPIs | Monto total, compras, ticket promedio, clientes activos |
| Gráfica de líneas | Tendencia mensual de ingresos |
| Gráfica de barras | Top 10 productos por ingresos |
| Gráfica de dona | Participación % por marca de tarjeta |
| Tabla de ranking | Clientes por monto (DENSE_RANK) |
| Gráfica comparativa | Crédito vs débito |
| 2+ filtros | Rango de fechas (mes) y tipo de tarjeta |
| Título + descripción | En cada panel |
| Unidad de medida | Visible en cada gráfica |
| Fuente e intervalo | Pie de panel + encabezado |

## Estructura

```
Frontend_Crupo3/
├── index.html
├── css/styles.css
├── js/
│   ├── config.js      ← URL del backend
│   ├── api.js         ← llamadas fetch
│   └── dashboard.js   ← KPIs, gráficas y filtros
└── README.md
```

## Cómo probarlo

1. Arranca el backend:

```powershell
cd "C:\Users\delma\OneDrive - Panamericano\Desktop\backend_Grupo3"
.\.venv\Scripts\Activate.ps1
python run.py
```

2. Abre el frontend con Live Server (VS Code/Cursor) sobre `index.html`,  
   o cualquier servidor estático en el puerto `5500` / `5173` (ya están en CORS).

3. Si el backend está en otra URL, edita `js/config.js`:

```js
window.APP_CONFIG = {
  API_BASE: "https://backendgrupo3analisis-cpcncvc9fxbrbwc9.eastus2-01.azurewebsites.net",
};
```

> Si desarrollas contra backend local, usa temporalmente `http://127.0.0.1:8000`.

## Endpoints que consume

- `GET /health?check_db=true`
- `GET /api/kpis/resumen`
- `GET /api/tiempo/evolucion-mensual`
- `GET /api/tarjetas/marcas`
- `GET /api/tarjetas/credito-vs-debito`
- `GET /api/productos/top-ingresos`
- `GET /api/clientes/ranking`

## Filtros

- **Fecha desde / hasta**: filtran la serie mensual y recalculan KPIs de monto/compras/ticket sobre ese rango.
- **Tipo de tarjeta**: filtra la gráfica comparativa crédito vs débito.

> Nota: los filtros de fecha se aplican en el frontend sobre la serie mensual ya cargada. Si más adelante quieren filtrar todo en Oracle, se pueden agregar query params al backend.
