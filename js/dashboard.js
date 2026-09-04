(() => {
  const charts = {
    lineas: null,
    dona: null,
    comparativa: null,
    barras: null,
  };

  const state = {
    raw: null,
  };

  const money = (value) =>
    new Intl.NumberFormat("es-GT", {
      style: "currency",
      currency: "GTQ",
      maximumFractionDigits: 0,
    }).format(Number(value || 0));

  const number = (value) =>
    new Intl.NumberFormat("es-GT").format(Number(value || 0));

  function showToast(message) {
    const toast = document.getElementById("toast");
    toast.hidden = false;
    toast.textContent = message;
    clearTimeout(showToast._t);
    showToast._t = setTimeout(() => {
      toast.hidden = true;
    }, 5000);
  }

  function destroyChart(key) {
    if (charts[key]) {
      charts[key].destroy();
      charts[key] = null;
    }
  }

  function filterByMonthRange(rows, desde, hasta) {
    return rows.filter((row) => {
      const mes = row.mes;
      if (desde && mes < desde) return false;
      if (hasta && mes > hasta) return false;
      return true;
    });
  }

  function getFilters() {
    return {
      desde: document.getElementById("filtro-desde").value || null,
      hasta: document.getElementById("filtro-hasta").value || null,
      tipo: document.getElementById("filtro-tipo").value || "TODOS",
    };
  }

  function renderKpis(kpis, evolucionFiltrada) {
    // Si hay filtro de fechas, estimamos KPIs a partir de la serie mensual filtrada.
    const filters = getFilters();
    if ((filters.desde || filters.hasta) && evolucionFiltrada.length) {
      const monto = evolucionFiltrada.reduce((acc, r) => acc + Number(r.ingresos || 0), 0);
      const compras = evolucionFiltrada.reduce((acc, r) => acc + Number(r.total_compras || 0), 0);
      document.getElementById("kpi-monto").textContent = money(monto);
      document.getElementById("kpi-compras").textContent = number(compras);
      document.getElementById("kpi-ticket").textContent = money(compras ? monto / compras : 0);
      document.getElementById("kpi-clientes").textContent = number(kpis.clientes_activos);
      document.getElementById("meta-fechas").textContent =
        `Intervalo filtrado: ${filters.desde || "…"} → ${filters.hasta || "…"}`;
      return;
    }

    document.getElementById("kpi-monto").textContent = money(kpis.monto_total);
    document.getElementById("kpi-compras").textContent = number(kpis.total_compras);
    document.getElementById("kpi-ticket").textContent = money(kpis.ticket_promedio);
    document.getElementById("kpi-clientes").textContent = number(kpis.clientes_activos);

    const min = kpis.intervalo?.fecha_min?.slice(0, 10) || "N/D";
    const max = kpis.intervalo?.fecha_max?.slice(0, 10) || "N/D";
    document.getElementById("meta-fechas").textContent = `Intervalo: ${min} → ${max}`;
  }

  function renderLineChart(rows) {
    destroyChart("lineas");
    const options = {
      chart: {
        type: "area",
        height: 340,
        toolbar: { show: false },
        animations: { enabled: true, speed: 700 },
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      series: [
        {
          name: "Ingresos (Q)",
          data: rows.map((r) => Number(r.ingresos || 0)),
        },
      ],
      xaxis: {
        categories: rows.map((r) => r.mes),
        labels: { rotate: -45 },
      },
      yaxis: {
        labels: {
          formatter: (v) => `Q${Math.round(v / 1000)}k`,
        },
      },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 3 },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 0.4,
          opacityFrom: 0.45,
          opacityTo: 0.05,
        },
      },
      colors: ["#0f6b4c"],
      tooltip: {
        y: {
          formatter: (v, opts) => {
            const row = rows[opts.dataPointIndex];
            const variacion =
              row?.variacion_pct == null ? "N/D" : `${row.variacion_pct}%`;
            return `${money(v)} · var. ${variacion}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    };
    charts.lineas = new ApexCharts(document.querySelector("#chart-lineas"), options);
    charts.lineas.render();

    const foot = document.getElementById("foot-lineas");
    if (rows.length) {
      const promedio = rows[0].promedio_mensual;
      foot.textContent =
        `Fuente: /api/tiempo/evolucion-mensual · Promedio mensual ${money(promedio)} · ${rows.length} meses`;
    }
  }

  function renderDonut(marcas) {
    destroyChart("dona");
    const options = {
      chart: {
        type: "donut",
        height: 300,
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      labels: marcas.map((m) => m.nombre_marca),
      series: marcas.map((m) => Number(m.participacion_pct || 0)),
      colors: ["#0f6b4c", "#c45c26", "#1d4e89", "#7a5c29"],
      legend: { position: "bottom" },
      dataLabels: {
        formatter: (val) => `${val.toFixed(1)}%`,
      },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const row = marcas[opts.seriesIndex];
            return `${val}% · ${money(row.monto_total)}`;
          },
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: "62%",
            labels: {
              show: true,
              total: {
                show: true,
                label: "Participación",
                formatter: () => "100%",
              },
            },
          },
        },
      },
    };
    charts.dona = new ApexCharts(document.querySelector("#chart-dona"), options);
    charts.dona.render();
  }

  function renderComparativa(rows) {
    destroyChart("comparativa");
    const filters = getFilters();
    let data = rows;
    if (filters.tipo !== "TODOS") {
      data = rows.filter((r) => String(r.tipo_tarjeta).toUpperCase() === filters.tipo);
    }

    const options = {
      chart: {
        type: "bar",
        height: 300,
        toolbar: { show: false },
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      series: [
        {
          name: "Monto total (Q)",
          data: data.map((r) => Number(r.monto_total || 0)),
        },
      ],
      xaxis: {
        categories: data.map((r) => r.tipo_tarjeta),
      },
      colors: ["#c45c26"],
      plotOptions: {
        bar: {
          borderRadius: 8,
          columnWidth: "42%",
          distributed: true,
        },
      },
      legend: { show: false },
      dataLabels: {
        enabled: true,
        formatter: (v) => money(v),
        style: { fontSize: "11px" },
      },
      yaxis: {
        labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` },
      },
      tooltip: {
        y: {
          formatter: (val, opts) => {
            const row = data[opts.dataPointIndex];
            return `${money(val)} · ${number(row.total_compras)} compras · avg ${money(row.promedio_gasto)}`;
          },
        },
      },
      grid: { borderColor: "#d7e0db" },
    };
    charts.comparativa = new ApexCharts(
      document.querySelector("#chart-comparativa"),
      options
    );
    charts.comparativa.render();
  }

  function renderBarras(productos) {
    destroyChart("barras");
    const options = {
      chart: {
        type: "bar",
        height: 360,
        toolbar: { show: false },
        fontFamily: "IBM Plex Sans, sans-serif",
      },
      series: [
        {
          name: "Ingresos (Q)",
          data: productos.map((p) => Number(p.ingresos_generados || 0)),
        },
      ],
      plotOptions: {
        bar: {
          horizontal: true,
          borderRadius: 6,
          barHeight: "70%",
        },
      },
      dataLabels: { enabled: false },
      xaxis: {
        categories: productos.map((p) => p.nombre_producto),
        labels: { formatter: (v) => `Q${Math.round(v / 1000)}k` },
      },
      colors: ["#1d4e89"],
      tooltip: {
        y: { formatter: (v) => money(v) },
      },
      grid: { borderColor: "#d7e0db" },
    };
    charts.barras = new ApexCharts(document.querySelector("#chart-barras"), options);
    charts.barras.render();
  }

  function renderRanking(rows) {
    const tbody = document.getElementById("tabla-ranking");
    const top = rows.slice(0, 12);
    tbody.innerHTML = top
      .map(
        (r) => `
      <tr>
        <td>${r.ranking}</td>
        <td>${r.nombre_cliente}</td>
        <td>${number(r.num_compras)}</td>
        <td>${money(r.monto_total)}</td>
      </tr>`
      )
      .join("");
    document.getElementById("foot-ranking").textContent =
      `Fuente: /api/clientes/ranking · Mostrando top ${top.length} de ${rows.length}`;
  }

  function renderInsights(payload, evolucionFiltrada) {
    const k = payload.kpis.data;
    const marcas = payload.marcas.data || [];
    const tipos = payload.creditoDebito.data || [];
    const productos = payload.topProductos.data || [];
    const lista = [];

    if (marcas[0]) {
      lista.push(
        `${marcas[0].nombre_marca} lidera la participación con ${marcas[0].participacion_pct}% del monto.`
      );
    }
    if (tipos[0] && tipos[1]) {
      lista.push(
        `${tipos[0].tipo_tarjeta} supera a ${tipos[1].tipo_tarjeta} en monto (${money(tipos[0].monto_total)} vs ${money(tipos[1].monto_total)}).`
      );
    }
    if (productos[0]) {
      lista.push(
        `Producto top por ingresos: ${productos[0].nombre_producto} (${money(productos[0].ingresos_generados)}).`
      );
    }
    if (k.producto_mas_vendido) {
      lista.push(
        `Producto más vendido en unidades: ${k.producto_mas_vendido.nombre_producto}.`
      );
    }
    if (k.categoria_mayor_venta) {
      lista.push(
        `Categoría con mayor venta: ${k.categoria_mayor_venta.nombre_categoria} (${money(k.categoria_mayor_venta.monto_ventas)}).`
      );
    }
    if (evolucionFiltrada.length) {
      const topMes = [...evolucionFiltrada].sort(
        (a, b) => Number(b.ingresos) - Number(a.ingresos)
      )[0];
      lista.push(`Mes de mayor facturación en la vista: ${topMes.mes} (${money(topMes.ingresos)}).`);
    }

    document.getElementById("lista-hallazgos").innerHTML = lista
      .map((item) => `<li>${item}</li>`)
      .join("");
  }

  function applyView() {
    if (!state.raw) return;
    const filters = getFilters();
    const evolucion = filterByMonthRange(
      state.raw.evolucion.data || [],
      filters.desde,
      filters.hasta
    );

    renderKpis(state.raw.kpis.data, evolucion);
    renderLineChart(evolucion);
    renderDonut(state.raw.marcas.data || []);
    renderComparativa(state.raw.creditoDebito.data || []);
    renderBarras(state.raw.topProductos.data || []);
    renderRanking(state.raw.ranking.data || []);
    renderInsights(state.raw, evolucion);
  }

  function initFilterBounds(evolucion) {
    const meses = (evolucion.data || []).map((r) => r.mes).sort();
    if (!meses.length) return;
    const desde = document.getElementById("filtro-desde");
    const hasta = document.getElementById("filtro-hasta");
    desde.min = meses[0];
    desde.max = meses[meses.length - 1];
    hasta.min = meses[0];
    hasta.max = meses[meses.length - 1];
  }

  async function loadDashboard() {
    try {
      document.getElementById("meta-estado").textContent = "API: conectando…";
      const health = await Api.health();
      document.getElementById("meta-estado").textContent =
        health.database?.ok ? "API: Oracle OK" : "API: activa";

      const [kpis, evolucion, marcas, creditoDebito, topProductos, ranking] =
        await Promise.all([
          Api.kpis(),
          Api.evolucion(),
          Api.marcas(),
          Api.creditoDebito(),
          Api.topProductos(),
          Api.rankingClientes(),
        ]);

      state.raw = { kpis, evolucion, marcas, creditoDebito, topProductos, ranking };
      initFilterBounds(evolucion);
      applyView();
    } catch (error) {
      console.error(error);
      document.getElementById("meta-estado").textContent = "API: error";
      showToast(
        "No se pudo cargar el dashboard. Verifica que el backend esté en http://127.0.0.1:8000"
      );
    }
  }

  document.getElementById("btn-aplicar").addEventListener("click", applyView);
  document.getElementById("btn-limpiar").addEventListener("click", () => {
    document.getElementById("filtro-desde").value = "";
    document.getElementById("filtro-hasta").value = "";
    document.getElementById("filtro-tipo").value = "TODOS";
    applyView();
  });

  loadDashboard();
})();
