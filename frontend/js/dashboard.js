/*
 * FillPro — resumen del dashboard (main.html).
 *
 * Solo LEE datos que ya existen: el porcentaje del perfil (localStorage,
 * lo calcula profile.js), la lista de perfiles (GET /profile/list) y el
 * historial (GET /logs). No escribe nada. Si el backend no responde, las
 * secciones muestran su estado vacío y el resto de la página sigue igual.
 */
(function () {
    "use strict";

    const API = "http://localhost:3000";
    const token = localStorage.getItem("token");
    const ICONS = "../assets/icons.svg";

    const $ = (id) => document.getElementById(id);

    // ── Progreso del perfil (mismo valor que usa el anillo) ──
    const progress = parseInt(localStorage.getItem("profileProgress"), 10) || 0;
    $("statProfileBar")?.style.setProperty("--value", progress);
    $("heroHint").textContent = progress >= 100
        ? "Tu perfil está completo. FillPro tiene todo lo que necesita."
        : progress === 0
            ? "Empieza por tus datos personales: toman menos de un minuto."
            : `Te falta un ${100 - progress}% para completarlo.`;

    if (!token) return;

    async function get(path) {
        const response = await fetch(API + path, { headers: { Authorization: `Bearer ${token}` } });
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
    }

    function relativeDate(value) {
        const date = new Date(value);
        const days = Math.floor((Date.now() - date.getTime()) / 86400000);
        if (days <= 0) return "Hoy, " + date.toLocaleTimeString("es-CO", { timeStyle: "short" });
        if (days === 1) return "Ayer";
        if (days < 7) return `Hace ${days} días`;
        return date.toLocaleDateString("es-CO", { day: "numeric", month: "short", year: "numeric" });
    }

    function initial(website) {
        const host = String(website).replace(/^www\./, "");
        return (host.match(/[a-z0-9]/i)?.[0] || "?").toUpperCase();
    }

    // textContent en todo: el sitio web viene de la base de datos.
    function activityItem(log) {
        const item = document.createElement("li");
        item.className = "list-item";

        const media = document.createElement("span");
        media.className = "list-item__media";
        media.setAttribute("aria-hidden", "true");
        media.textContent = initial(log.website);

        const body = document.createElement("div");
        body.className = "list-item__body";
        const title = document.createElement("p");
        title.className = "list-item__title";
        title.textContent = log.website;
        const meta = document.createElement("time");
        meta.className = "list-item__meta";
        meta.dateTime = log.date;
        meta.textContent = relativeDate(log.date);
        body.append(title, meta);

        const count = document.createElement("span");
        count.className = "badge badge--success";
        const n = log.fieldsCompleted.length;
        count.textContent = n === 1 ? "1 campo" : `${n} campos`;

        item.append(media, body, count);
        return item;
    }

    async function loadActivity() {
        const list = $("activityList");
        const empty = $("activityEmpty");
        try {
            const logs = await get("/logs");
            const now = new Date();
            const thisMonth = logs.filter((log) => {
                const d = new Date(log.date);
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
            });
            $("statMonthValue").textContent = String(thisMonth.length);

            if (logs.length > 0) {
                $("statLastValue").textContent = logs[0].website;
                $("statLastMeta").textContent = relativeDate(logs[0].date);
                list.replaceChildren(...logs.slice(0, 4).map(activityItem));
            } else {
                list.replaceChildren();
                empty.hidden = false;
            }
        } catch {
            list.replaceChildren();
            $("activityEmptyText").textContent = "No se pudo cargar el historial. Comprueba que el backend esté activo.";
            empty.hidden = false;
        } finally {
            list.removeAttribute("aria-busy");
        }
    }

    async function loadProfiles() {
        const list = $("profilesList");
        try {
            const { profiles = [] } = await get("/profile/list");
            const active = localStorage.getItem("activeProfileId");
            if (profiles.length === 0) {
                list.replaceChildren();
                $("profilesEmpty").hidden = false;
                return;
            }
            $("profilesCount").textContent = String(profiles.length);
            $("profilesCount").hidden = false;
            list.replaceChildren(...profiles.map((profile) => {
                const item = document.createElement("li");
                item.className = "profiles__item";
                const name = document.createElement("span");
                name.className = "profiles__name";
                name.textContent = profile.name || "Perfil sin nombre";
                item.append(name);
                const isActive = active ? String(profile.id) === active : profile === profiles[0];
                if (isActive) {
                    const badge = document.createElement("span");
                    badge.className = "badge badge--primary";
                    badge.textContent = "Activo";
                    item.append(badge);
                }
                return item;
            }));
        } catch {
            list.replaceChildren();
            $("profilesEmpty").textContent = "No se pudieron cargar tus perfiles.";
            $("profilesEmpty").hidden = false;
        } finally {
            list.removeAttribute("aria-busy");
        }
    }

    loadActivity();
    loadProfiles();
})();
