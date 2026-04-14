/**
 * CloudVault — storage tracker (vanilla JS + localStorage)
 * Modular CRUD: load/save, filter, render, modal, toast
 */
(function () {
    "use strict";

    // --- Config ---
    var STORAGE_KEY = "cloudDashboard_v1";
    var CAPACITY_BYTES = 100 * 1024 * 1024 * 1024;
    var MODAL_CLOSE_MS = 300;

    var CATEGORY_COLORS = {
        Documents: "#2563eb",
        Images: "#7c3aed",
        Video: "#db2777",
        Audio: "#0891b2",
        Archives: "#d97706",
        Other: "#64748b"
    };

    var FOLDER_GRADIENTS = [
        ["#3b82f6", "#2563eb"],
        ["#8b5cf6", "#6d28d9"],
        ["#ec4899", "#db2777"],
        ["#06b6d4", "#0891b2"],
        ["#f59e0b", "#d97706"]
    ];

    var AVATAR_INITIALS = ["EJ", "AK", "MR", "LS", "TC"];

    // --- DOM helpers ---
    function $(sel, root) {
        return (root || document).querySelector(sel);
    }

    function $all(sel, root) {
        return Array.prototype.slice.call((root || document).querySelectorAll(sel));
    }

    // --- Formatting & IDs ---
    function generateId() {
        if (typeof crypto !== "undefined" && crypto.randomUUID) {
            return crypto.randomUUID();
        }
        return "id-" + Date.now() + "-" + Math.random().toString(36).slice(2, 9);
    }

    function parseSizeToBytes(value, unit) {
        var n = Number(value);
        if (isNaN(n) || n < 0) return 0;
        var mult = 1;
        if (unit === "KB") mult = 1024;
        if (unit === "MB") mult = 1024 * 1024;
        if (unit === "GB") mult = 1024 * 1024 * 1024;
        return Math.round(n * mult);
    }

    function formatBytes(bytes) {
        if (bytes === 0) return "0 B";
        var k = 1024;
        var sizes = ["B", "KB", "MB", "GB", "TB"];
        var i = Math.floor(Math.log(bytes) / Math.log(k));
        var v = bytes / Math.pow(k, i);
        return (i === 0 ? v : v.toFixed(i >= 3 ? 2 : 1)) + " " + sizes[i];
    }

    function formatBytesGbShort(bytes) {
        var gb = bytes / (1024 * 1024 * 1024);
        if (gb < 0.01) return (bytes / (1024 * 1024)).toFixed(1) + " MB";
        return gb.toFixed(2) + " GB";
    }

    function escapeHtml(s) {
        var div = document.createElement("div");
        div.textContent = s;
        return div.innerHTML;
    }

    // --- Persistence ---
    function seedItems() {
        var today = new Date();
        function isoDaysAgo(d) {
            var t = new Date(today);
            t.setDate(t.getDate() - d);
            return t.toISOString().slice(0, 10);
        }
        return [
            {
                id: generateId(),
                name: "Q4 Strategy Brief.pdf",
                category: "Documents",
                sizeBytes: Math.round(2.4 * 1024 * 1024),
                date: isoDaysAgo(1)
            },
            {
                id: generateId(),
                name: "Product Screens.png",
                category: "Images",
                sizeBytes: Math.round(8.1 * 1024 * 1024),
                date: isoDaysAgo(2)
            },
            {
                id: generateId(),
                name: "Demo Reel 2026.mp4",
                category: "Video",
                sizeBytes: Math.round(1.2 * 1024 * 1024 * 1024),
                date: isoDaysAgo(3)
            },
            {
                id: generateId(),
                name: "Archive-2025.zip",
                category: "Archives",
                sizeBytes: Math.round(420 * 1024 * 1024),
                date: isoDaysAgo(5)
            },
            {
                id: generateId(),
                name: "Podcast Intro.wav",
                category: "Audio",
                sizeBytes: Math.round(15 * 1024 * 1024),
                date: isoDaysAgo(6)
            },
            {
                id: generateId(),
                name: "Notes.md",
                category: "Other",
                sizeBytes: Math.round(12 * 1024),
                date: isoDaysAgo(0)
            }
        ];
    }

    function loadState() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            if (!raw) {
                return { items: seedItems() };
            }
            var data = JSON.parse(raw);
            if (!data.items || !Array.isArray(data.items)) {
                return { items: seedItems() };
            }
            return data;
        } catch (e) {
            return { items: seedItems() };
        }
    }

    function saveState(state) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    }

    // --- Filter (search name + category) ---
    function applyItemFilters(items, searchQuery, categoryFilter) {
        var q = (searchQuery || "").trim().toLowerCase();
        var cat = (categoryFilter || "").trim();
        return items.filter(function (it) {
            var nameMatch = !q || it.name.toLowerCase().indexOf(q) !== -1;
            var catMatch = !cat || it.category === cat;
            return nameMatch && catMatch;
        });
    }

    // --- Aggregates ---
    function totalBytes(items) {
        return items.reduce(function (sum, it) {
            return sum + (it.sizeBytes || 0);
        }, 0);
    }

    function recentCountLastDays(items, days) {
        var cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);
        var c = 0;
        items.forEach(function (it) {
            var d = new Date(it.date);
            if (!isNaN(d.getTime()) && d >= cutoff) c += 1;
        });
        return c;
    }

    function bytesByCategory(items) {
        var map = {};
        items.forEach(function (it) {
            var cat = it.category || "Other";
            map[cat] = (map[cat] || 0) + (it.sizeBytes || 0);
        });
        return map;
    }

    // --- Charts ---
    function buildDonutSvg(usedBytes, freeBytes, size) {
        var total = usedBytes + freeBytes;
        if (total <= 0) total = 1;
        var usedPct = (usedBytes / total) * 100;
        var r = 45;
        var c = 50;
        var circumference = 2 * Math.PI * r;
        var usedLen = (usedPct / 100) * circumference;
        var freeLen = circumference - usedLen;
        var usedColor = "#2563eb";
        var freeColor = "rgba(148, 163, 184, 0.35)";

        return (
            '<svg viewBox="0 0 100 100" width="' +
            size +
            '" height="' +
            size +
            '" aria-hidden="true">' +
            '<circle cx="' +
            c +
            '" cy="' +
            c +
            '" r="' +
            r +
            '" fill="none" stroke="' +
            freeColor +
            '" stroke-width="12" />' +
            '<circle cx="' +
            c +
            '" cy="' +
            c +
            '" r="' +
            r +
            '" fill="none" stroke="' +
            usedColor +
            '" stroke-width="12" ' +
            'stroke-dasharray="' +
            usedLen +
            " " +
            freeLen +
            '" ' +
            'stroke-dashoffset="0" transform="rotate(-90 ' +
            c +
            " " +
            c +
            ')" ' +
            'stroke-linecap="round" style="transition: stroke-dasharray 0.8s ease;" />' +
            '<text x="50" y="46" text-anchor="middle" fill="#0f172a" font-size="11" font-weight="700" font-family="Inter, sans-serif">' +
            Math.round(usedPct) +
            "%</text>" +
            '<text x="50" y="60" text-anchor="middle" fill="#64748b" font-size="6" font-family="Inter, sans-serif">used</text>' +
            "</svg>"
        );
    }

    function renderDonutContainers(usedBytes) {
        var freeBytes = Math.max(0, CAPACITY_BYTES - usedBytes);
        var d1 = $("#donutChart");
        var d2 = $("#donutChartStorage");
        if (d1) d1.innerHTML = buildDonutSvg(usedBytes, freeBytes, 160);
        if (d2) d2.innerHTML = buildDonutSvg(usedBytes, freeBytes, 200);

        var pct = Math.min(100, (usedBytes / CAPACITY_BYTES) * 100);
        var legendHtml =
            "<li><span class=\"donut-legend__swatch\" style=\"background:#2563eb\"></span> Used · <strong>" +
            formatBytesGbShort(usedBytes) +
            "</strong></li>" +
            "<li><span class=\"donut-legend__swatch\" style=\"background:rgba(148,163,184,0.5)\"></span> Free · <strong>" +
            formatBytesGbShort(freeBytes) +
            "</strong></li>";

        var leg1 = $("#donutLegend");
        var leg2 = $("#donutLegendStorage");
        if (leg1) leg1.innerHTML = legendHtml;
        if (leg2) leg2.innerHTML = legendHtml;

        var label = Math.round(pct * 10) / 10 + "% of 100 GB";
        var fill = $("#storageProgressFill");
        var fillL = $("#storageProgressFillLarge");
        var bar = $("#storageProgressBar");
        var barL = $("#storageProgressBarLarge");
        if (fill) fill.style.width = pct + "%";
        if (fillL) fillL.style.width = pct + "%";
        if (bar) bar.setAttribute("aria-valuenow", String(Math.round(pct)));
        if (barL) barL.setAttribute("aria-valuenow", String(Math.round(pct)));
        var pl = $("#progressLabel");
        var pls = $("#progressLabelStorage");
        if (pl) pl.textContent = label;
        if (pls) pls.textContent = label;
    }

    function renderCategoryBreakdown(items) {
        var el = $("#categoryBreakdown");
        if (!el) return;
        var byCat = bytesByCategory(items);
        var total = totalBytes(items) || 1;
        var entries = Object.keys(byCat).sort(function (a, b) {
            return byCat[b] - byCat[a];
        });
        if (entries.length === 0) {
            el.innerHTML = "<li>No data yet.</li>";
            return;
        }
        el.innerHTML = entries
            .map(function (cat) {
                var b = byCat[cat];
                var p = (b / total) * 100;
                var color = CATEGORY_COLORS[cat] || CATEGORY_COLORS.Other;
                return (
                    "<li><div><strong>" +
                    escapeHtml(cat) +
                    "</strong><div class=\"category-breakdown__bar\"><div class=\"category-breakdown__fill\" style=\"width:" +
                    p +
                    "%;background:" +
                    color +
                    "\"></div></div></div><span>" +
                    formatBytes(b) +
                    "</span></li>"
                );
            })
            .join("");
    }

    function folderIconSvg() {
        return (
            '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' +
            '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>'
        );
    }

    function renderFolderGrid(container, items) {
        if (!container) return;
        if (items.length === 0) {
            container.innerHTML =
                '<p class="empty-state" style="margin:0;padding:1rem;text-align:center;color:var(--text-muted)">No items yet. Add your first item to see it here.</p>';
            return;
        }
        container.innerHTML = items
            .map(function (it, idx) {
                var grad = FOLDER_GRADIENTS[idx % FOLDER_GRADIENTS.length];
                var a1 = AVATAR_INITIALS[idx % AVATAR_INITIALS.length];
                var a2 = AVATAR_INITIALS[(idx + 2) % AVATAR_INITIALS.length];
                var style = "background:linear-gradient(135deg," + grad[0] + "," + grad[1] + ")";
                return (
                    '<article class="folder-tile" style="--delay:' +
                    idx * 0.04 +
                    's"><div class="folder-tile__icon" style="' +
                    style +
                    '">' +
                    folderIconSvg() +
                    '</div><p class="folder-tile__name" title="' +
                    escapeHtml(it.name) +
                    '">' +
                    escapeHtml(it.name) +
                    '</p><div class="folder-tile__meta"><span class="folder-tile__avatars">' +
                    '<span class="folder-tile__avatar" style="background:#6366f1;margin-left:0">' +
                    a1 +
                    "</span>" +
                    '<span class="folder-tile__avatar" style="background:#8b5cf6">' +
                    a2 +
                    '</span></span>' +
                    escapeHtml(it.category || "—") +
                    "</div></article>"
                );
            })
            .join("");
    }

    function renderTable(tbody, items, dataState) {
        if (!tbody) return;
        if (items.length === 0) {
            tbody.innerHTML = "";
            return;
        }
        tbody.innerHTML = items
            .map(function (it, idx) {
                return (
                    '<tr data-row-id="' +
                    escapeHtml(it.id) +
                    '" style="animation-delay:' +
                    idx * 0.03 +
                    's">' +
                    "<td><strong>" +
                    escapeHtml(it.name) +
                    "</strong></td><td>" +
                    escapeHtml(it.category || "—") +
                    "</td><td>" +
                    formatBytes(it.sizeBytes || 0) +
                    "</td><td>" +
                    escapeHtml(it.date || "—") +
                    '</td><td class="data-table__actions"><div class="table-actions">' +
                    '<button type="button" class="btn btn--icon js-edit" data-id="' +
                    escapeHtml(it.id) +
                    '" aria-label="Edit ' +
                    escapeHtml(it.name) +
                    '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg></button>' +
                    '<button type="button" class="btn btn--icon js-delete" data-id="' +
                    escapeHtml(it.id) +
                    '" aria-label="Delete ' +
                    escapeHtml(it.name) +
                    '"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/></svg></button>' +
                    "</div></td></tr>"
                );
            })
            .join("");

        tbody.querySelectorAll(".js-edit").forEach(function (btn) {
            btn.addEventListener("click", function () {
                openEditModal(dataState, btn.getAttribute("data-id"));
            });
        });
        tbody.querySelectorAll(".js-delete").forEach(function (btn) {
            btn.addEventListener("click", function () {
                deleteItem(dataState, btn.getAttribute("data-id"));
            });
        });
    }

    function renderActivity(listEl, items) {
        if (!listEl) return;
        var sorted = items
            .slice()
            .sort(function (a, b) {
                return new Date(b.date) - new Date(a.date);
            })
            .slice(0, 5);
        if (sorted.length === 0) {
            listEl.innerHTML = "<li>No recent activity.</li>";
            return;
        }
        listEl.innerHTML = sorted
            .map(function (it, idx) {
                var color = CATEGORY_COLORS[it.category] || CATEGORY_COLORS.Other;
                return (
                    "<li style=\"animation-delay:" +
                    idx * 0.06 +
                    's"><span class="activity-list__dot" style="background:' +
                    color +
                    '"></span><div class="activity-list__text">Updated <strong>' +
                    escapeHtml(it.name) +
                    '</strong><div class="activity-list__meta">' +
                    escapeHtml(it.category || "") +
                    " · " +
                    escapeHtml(it.date || "") +
                    "</div></div></li>"
                );
            })
            .join("");
    }

    function updateDashboardStats(appState, itemsAll) {
        var used = totalBytes(itemsAll);
        var tf = $("#statTotalFiles");
        var su = $("#statStorageUsed");
        var rc = $("#statRecentCount");
        var fc = $("#filesCount");
        if (tf) tf.textContent = String(itemsAll.length);
        if (su) su.textContent = formatBytesGbShort(used);
        if (rc) rc.textContent = String(recentCountLastDays(itemsAll, 7));
        if (fc) fc.textContent = String(appState.filtered.length);
        renderDonutContainers(used);
        renderCategoryBreakdown(itemsAll);
    }

    // --- App state ---
    var appState = {
        data: loadState(),
        filtered: []
    };

    function getFilterInputs() {
        var q = ($("#globalSearch") && $("#globalSearch").value) || "";
        var cat = ($("#categoryFilter") && $("#categoryFilter").value) || "";
        return { search: q, category: cat };
    }

    function refresh() {
        var f = getFilterInputs();
        appState.filtered = applyItemFilters(appState.data.items, f.search, f.category);
        var itemsAll = appState.data.items.slice();
        var filtered = appState.filtered;

        updateDashboardStats(appState, itemsAll);
        renderActivity($("#activityList"), itemsAll);
        renderFolderGrid($("#folderGridDashboard"), filtered.slice(0, 6));
        renderFolderGrid($("#folderGridMain"), filtered);

        renderTable($("#filesTableBody"), filtered, appState.data);

        var empty = $("#filesEmpty");
        var emptyText = $("#filesEmptyText");
        if (empty && emptyText) {
            if (itemsAll.length === 0) {
                emptyText.textContent = "No items yet. Use Add item to create your first entry.";
                empty.hidden = false;
            } else if (filtered.length === 0) {
                emptyText.textContent = "No items match your search or category filter.";
                empty.hidden = false;
            } else {
                empty.hidden = true;
            }
        }
    }

    // --- Toast ---
    function showToast(message) {
        var host = $("#toastHost");
        if (!host) return;
        var t = document.createElement("div");
        t.className = "toast";
        t.textContent = message;
        host.appendChild(t);
        setTimeout(function () {
            if (t.parentNode) t.parentNode.removeChild(t);
        }, 3200);
    }

    // --- Modal (animated) ---
    function openModalShell() {
        var modal = $("#itemModal");
        if (!modal) return;
        modal.removeAttribute("hidden");
        document.body.style.overflow = "hidden";
        requestAnimationFrame(function () {
            requestAnimationFrame(function () {
                modal.classList.add("modal--open");
            });
        });
    }

    function closeModalShell() {
        var modal = $("#itemModal");
        if (!modal) return;
        if (modal.hasAttribute("hidden")) return;
        modal.classList.remove("modal--open");
        document.body.style.overflow = "";
        setTimeout(function () {
            if (modal && !modal.classList.contains("modal--open")) {
                modal.setAttribute("hidden", "");
            }
        }, MODAL_CLOSE_MS);
    }

    function openAddModal() {
        var form = $("#itemForm");
        if (!form) return;
        var title = $("#modalTitle");
        var editId = $("#editItemId");
        var btn = $("#modalSubmitBtn");
        var fd = $("#fieldDate");
        if (title) title.textContent = "Add item";
        if (editId) editId.value = "";
        if (btn) btn.textContent = "Save item";
        form.reset();
        if (fd) fd.value = new Date().toISOString().slice(0, 10);
        openModalShell();
        setTimeout(function () {
            var name = $("#fieldName");
            if (name) name.focus();
        }, 80);
    }

    function openEditModal(dataState, id) {
        var item = dataState.items.find(function (i) {
            return i.id === id;
        });
        if (!item) return;
        var title = $("#modalTitle");
        var editId = $("#editItemId");
        var btn = $("#modalSubmitBtn");
        if (title) title.textContent = "Edit item";
        if (editId) editId.value = id;
        if (btn) btn.textContent = "Update item";
        var fn = $("#fieldName");
        var fc = $("#fieldCategory");
        var fv = $("#fieldSizeValue");
        var fu = $("#fieldSizeUnit");
        var fd = $("#fieldDate");
        if (fn) fn.value = item.name;
        if (fc) fc.value = item.category || "";

        var bytes = item.sizeBytes || 0;
        var unit = "MB";
        var val = bytes / (1024 * 1024);
        if (bytes >= 1024 * 1024 * 1024) {
            unit = "GB";
            val = bytes / (1024 * 1024 * 1024);
        } else if (bytes < 1024 * 1024 && bytes >= 1024) {
            val = bytes / (1024 * 1024);
        }
        if (fv) fv.value = Math.round(val * 10000) / 10000;
        if (fu) fu.value = unit;
        if (fd) fd.value = item.date || "";

        openModalShell();
    }

    function handleFormSubmit(e) {
        e.preventDefault();
        var editEl = $("#editItemId");
        var editId = (editEl && editEl.value) || "";
        var nameEl = $("#fieldName");
        var catEl = $("#fieldCategory");
        var sizeEl = $("#fieldSizeValue");
        var unitEl = $("#fieldSizeUnit");
        var dateEl = $("#fieldDate");
        var name = (nameEl && nameEl.value.trim()) || "";
        var category = (catEl && catEl.value) || "";
        var sizeVal = sizeEl && sizeEl.value;
        var sizeUnit = (unitEl && unitEl.value) || "MB";
        var date = (dateEl && dateEl.value) || "";

        if (!name || !category || !date) {
            showToast("Please fill all required fields");
            return;
        }

        var sizeBytes = parseSizeToBytes(sizeVal, sizeUnit);

        if (editId) {
            var ix = appState.data.items.findIndex(function (i) {
                return i.id === editId;
            });
            if (ix === -1) return;
            appState.data.items[ix] = {
                id: editId,
                name: name,
                category: category,
                sizeBytes: sizeBytes,
                date: date
            };
            saveState(appState.data);
            showToast("Item updated");
        } else {
            appState.data.items.push({
                id: generateId(),
                name: name,
                category: category,
                sizeBytes: sizeBytes,
                date: date
            });
            saveState(appState.data);
            showToast("Item added");
        }
        closeModalShell();
        refresh();
    }

    function performDelete(dataState, id) {
        dataState.items = dataState.items.filter(function (i) {
            return i.id !== id;
        });
        saveState(dataState);
        showToast("Item deleted");
        refresh();
    }

    function deleteItem(dataState, id) {
        var item = dataState.items.find(function (i) {
            return i.id === id;
        });
        if (!item) return;
        if (!window.confirm('Delete "' + item.name + '"? This cannot be undone.')) {
            return;
        }

        var row = document.querySelector('#filesTableBody tr[data-row-id="' + id + '"]');
        if (row) {
            var finished = false;
            function done() {
                if (finished) return;
                finished = true;
                row.removeEventListener("transitionend", onEnd);
                clearTimeout(fallback);
                performDelete(dataState, id);
            }
            function onEnd(e) {
                if (e.propertyName === "opacity") {
                    done();
                }
            }
            row.classList.add("data-table__row--removing");
            row.addEventListener("transitionend", onEnd);
            var fallback = setTimeout(done, 450);
        } else {
            performDelete(dataState, id);
        }
    }

    // --- Navigation & listeners ---
    function setupNavigation() {
        var panels = {
            dashboard: $("#panel-dashboard"),
            files: $("#panel-files"),
            storage: $("#panel-storage"),
            settings: $("#panel-settings")
        };

        function showPanel(name) {
            Object.keys(panels).forEach(function (key) {
                var p = panels[key];
                if (!p) return;
                p.hidden = key !== name;
            });
            $all(".nav-item").forEach(function (btn) {
                var active = btn.getAttribute("data-panel") === name;
                btn.classList.toggle("nav-item--active", active);
                if (active) btn.setAttribute("aria-current", "page");
                else btn.removeAttribute("aria-current");
            });
        }

        $all(".nav-item").forEach(function (btn) {
            btn.addEventListener("click", function () {
                var name = btn.getAttribute("data-panel");
                if (name) showPanel(name);
                closeSidebarMobile();
            });
        });

        showPanel("dashboard");
    }

    function closeSidebarMobile() {
        var sidebar = $("#sidebar");
        var backdrop = $("#sidebarBackdrop");
        var toggle = $("#sidebarToggle");
        if (sidebar) sidebar.classList.remove("is-open");
        if (backdrop) backdrop.classList.remove("is-open");
        if (toggle) toggle.setAttribute("aria-expanded", "false");
    }

    function setupSidebarToggle() {
        var sidebar = $("#sidebar");
        var backdrop = $("#sidebarBackdrop");
        var toggle = $("#sidebarToggle");
        if (!toggle) return;
        toggle.addEventListener("click", function () {
            var open = !sidebar.classList.contains("is-open");
            sidebar.classList.toggle("is-open", open);
            if (backdrop) backdrop.classList.toggle("is-open", open);
            toggle.setAttribute("aria-expanded", open ? "true" : "false");
        });
        if (backdrop) backdrop.addEventListener("click", closeSidebarMobile);
    }

    function setupSearchAndFilters() {
        var input = $("#globalSearch");
        var cat = $("#categoryFilter");
        var t;
        function debouncedRefresh() {
            clearTimeout(t);
            t = setTimeout(refresh, 160);
        }
        if (input) input.addEventListener("input", debouncedRefresh);
        if (cat) cat.addEventListener("change", debouncedRefresh);
    }

    function setupModal() {
        var modal = $("#itemModal");
        var form = $("#itemForm");
        var closeBtn = $("#closeModal");
        var addBtn = $("#openAddModal");
        $all("[data-close-modal]").forEach(function (el) {
            el.addEventListener("click", closeModalShell);
        });
        if (closeBtn) closeBtn.addEventListener("click", closeModalShell);
        if (form) form.addEventListener("submit", handleFormSubmit);
        if (addBtn) addBtn.addEventListener("click", openAddModal);
        document.addEventListener("keydown", function (e) {
            if (e.key === "Escape" && modal && !modal.hasAttribute("hidden")) {
                closeModalShell();
            }
        });
    }

    function setupReset() {
        var btn = $("#resetDataBtn");
        if (!btn) return;
        btn.addEventListener("click", function () {
            if (!window.confirm("Reset all data to the default demo set?")) return;
            localStorage.removeItem(STORAGE_KEY);
            appState.data = loadState();
            showToast("Demo data restored");
            refresh();
        });
    }

    function init() {
        appState.data = loadState();
        saveState(appState.data);
        setupNavigation();
        setupSidebarToggle();
        setupSearchAndFilters();
        setupModal();
        setupReset();
        refresh();
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
