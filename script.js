const SUPABASE_URL = "https://vwisvluidouhawxprsqu.supabase.co";
const SUPABASE_KEY = "sb_publishable_OkUXoo7MZLoDgDwThRwJig_kK8qqehi";


const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const eventsList = document.getElementById("events-list");
const eventsNav = document.getElementById("events-nav");
const sidebar = document.getElementById("sidebar");
const menuToggle = document.getElementById("menu-toggle");

menuToggle.addEventListener("click", () => {
  sidebar.classList.toggle("open");
});

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("sl-SI", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

function formatDateOnly(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString("sl-SI");
}

function isVisibleEvent(endAt) {
  const now = new Date();
  const endDate = new Date(endAt);
  const fiveDaysAfterEnd = new Date(endDate);
  fiveDaysAfterEnd.setDate(fiveDaysAfterEnd.getDate() + 5);
  return now <= fiveDaysAfterEnd;
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text ?? "";
  return div.innerHTML;
}

function renderPeopleList(responses) {
  if (!responses || responses.length === 0) {
    return `<p>Za ta odgovor zaenkrat ni prijav.</p>`;
  }

  return `
    <ul class="people-list">
      ${responses.map(r => `
        <li>
          <strong>${escapeHtml(r.name)}</strong>
          ${r.note ? `<span class="person-note">Opomba: ${escapeHtml(r.note)}</span>` : ""}
        </li>
      `).join("")}
    </ul>
  `;
}

function buildStatusPanel(eventId, statusKey, title, responses) {
  return `
    <div id="panel-${eventId}-${statusKey}" class="status-panel hidden">
      <h3>${title}</h3>
      ${renderPeopleList(responses)}
    </div>
  `;
}

function togglePanel(eventId, statusKey) {
  const panels = [
    document.getElementById(`panel-${eventId}-pridem`),
    document.getElementById(`panel-${eventId}-nepridem`),
    document.getElementById(`panel-${eventId}-mogoce`)
  ];

  const target = document.getElementById(`panel-${eventId}-${statusKey}`);
  if (!target) return;

  const isHidden = target.classList.contains("hidden");

  panels.forEach(panel => {
    if (panel) panel.classList.add("hidden");
  });

  if (isHidden) {
    target.classList.remove("hidden");
  }
}

async function loadMembers() {
  const { data, error } = await supabaseClient
    .from("members")
    .select("full_name")
    .order("full_name", { ascending: true });

  if (error) {
    console.error("Napaka pri nalaganju članov:", error);
    return [];
  }

  return data || [];
}

async function loadEvents() {
  const members = await loadMembers();

  const { data: events, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("start_at", { ascending: true });

  if (error) {
    eventsList.innerHTML = '<div class="no-events"><p>Napaka pri nalaganju dogodkov.</p></div>';
    console.error(error);
    return;
  }

  const visibleEvents = (events || []).filter(event => isVisibleEvent(event.end_at));

  if (visibleEvents.length === 0) {
    eventsList.innerHTML = '<div class="no-events"><p>Trenutno ni dogodkov.</p></div>';
    eventsNav.innerHTML = "<p>Ni dogodkov.</p>";
    return;
  }

  eventsList.innerHTML = "";
  eventsNav.innerHTML = "";

  for (const event of visibleEvents) {
    const { data: responses, error: responsesError } = await supabaseClient
      .from("responses")
      .select("*")
      .eq("event_id", event.id)
      .order("name", { ascending: true });

    if (responsesError) {
      console.error("Napaka pri nalaganju prijav:", responsesError);
    }

    const allResponses = responses || [];
    const pridemList = allResponses.filter(r => r.status === "pridem");
    const nePridemList = allResponses.filter(r => r.status === "ne pridem");
    const mogoceList = allResponses.filter(r => r.status === "mogoce");

    const memberOptions = members.map(member => {
      return `<option value="${escapeHtml(member.full_name)}">${escapeHtml(member.full_name)}</option>`;
    }).join("");

    const navLink = document.createElement("a");
    navLink.href = `#event-${event.id}`;
    navLink.className = "event-link";
    navLink.innerHTML = `
      <span class="event-link-title">${escapeHtml(event.title)}</span>
      <span class="event-link-date">${formatDateOnly(event.start_at)}</span>
    `;
    navLink.addEventListener("click", () => {
      if (window.innerWidth <= 900) {
        sidebar.classList.remove("open");
      }
    });
    eventsNav.appendChild(navLink);

    const article = document.createElement("article");
    article.className = "event-card";
    article.id = `event-${event.id}`;

    article.innerHTML = `
      <h2>${escapeHtml(event.title)}</h2>
      <div class="meta">
        <strong>Začetek:</strong> ${formatDateTime(event.start_at)}<br>
        <strong>Konec:</strong> ${formatDateTime(event.end_at)}<br>
        <strong>Kraj:</strong> ${escapeHtml(event.location || "Ni določen")}
      </div>
      <div class="description">${escapeHtml(event.description || "")}</div>

      <div class="counts">
        <button class="count-button" onclick="togglePanel(${event.id}, 'pridem')">
          Pridem: <strong>${pridemList.length}</strong>
        </button>
        <button class="count-button" onclick="togglePanel(${event.id}, 'nepridem')">
          Ne pridem: <strong>${nePridemList.length}</strong>
        </button>
        <button class="count-button" onclick="togglePanel(${event.id}, 'mogoce')">
          Mogoče: <strong>${mogoceList.length}</strong>
        </button>
      </div>

      ${buildStatusPanel(event.id, "pridem", "Pridem", pridemList)}
      ${buildStatusPanel(event.id, "nepridem", "Ne pridem", nePridemList)}
      ${buildStatusPanel(event.id, "mogoce", "Mogoče", mogoceList)}

      <div class="form-row">
        <select id="name-${event.id}">
          <option value="">Izberite svoje ime</option>
          ${memberOptions}
        </select>

        <select id="status-${event.id}">
          <option value="pridem">Pridem</option>
          <option value="ne pridem">Ne pridem</option>
          <option value="mogoce">Mogoče</option>
        </select>

        <textarea id="note-${event.id}" placeholder="Opomba (neobvezno)"></textarea>

        <button class="submit-btn" onclick="submitResponse(${event.id})">Pošlji odgovor</button>
        <div class="message" id="message-${event.id}"></div>
      </div>
    `;

    eventsList.appendChild(article);
  }
}

async function submitResponse(eventId) {
  const nameInput = document.getElementById(`name-${eventId}`);
  const statusInput = document.getElementById(`status-${eventId}`);
  const noteInput = document.getElementById(`note-${eventId}`);
  const message = document.getElementById(`message-${eventId}`);

  const name = nameInput.value.trim();
  const status = statusInput.value;
  const note = noteInput.value.trim();

  if (!name) {
    message.style.color = "red";
    message.textContent = "Prosim, izberite ime.";
    return;
  }

  const { error } = await supabaseClient
    .from("responses")
    .upsert(
      [
        {
          event_id: eventId,
          name: name,
          status: status,
          note: note
        }
      ],
      {
        onConflict: "event_id,name"
      }
    );

  if (error) {
    console.error("Napaka pri shranjevanju:", error);
    message.style.color = "red";
    message.textContent = "Napaka pri shranjevanju.";
    return;
  }

  message.style.color = "green";
  message.textContent = "Odgovor je shranjen.";

  nameInput.value = "";
  noteInput.value = "";

  await loadEvents();
}

window.togglePanel = togglePanel;
window.submitResponse = submitResponse;

loadEvents();