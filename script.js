const SUPABASE_URL = "https://vwisvluidouhawxprsqu.supabase.co";
const SUPABASE_KEY = "sb_publishable_OkUXoo7MZLoDgDwThRwJig_kK8qqehi";

const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const eventsList = document.getElementById("events-list");

function formatDateTime(dateString) {
  const date = new Date(dateString);
  return date.toLocaleString("sl-SI", {
    dateStyle: "short",
    timeStyle: "short"
  });
}

async function loadEvents() {
  const { data: events, error } = await supabaseClient
    .from("events")
    .select("*")
    .order("start_at", { ascending: true });

  if (error) {
    eventsList.innerHTML = "<p>Napaka pri nalaganju dogodkov.</p>";
    console.error(error);
    return;
  }

  if (!events || events.length === 0) {
    eventsList.innerHTML = "<p>Trenutno ni dogodkov.</p>";
    return;
  }

  eventsList.innerHTML = "";

  for (const event of events) {
    const { data: responses, error: responsesError } = await supabaseClient
      .from("responses")
      .select("*")
      .eq("event_id", event.id)
      .order("created_at", { ascending: true });

    if (responsesError) {
      console.error(responsesError);
    }

    const pride = (responses || []).filter(r => r.status === "pridem").length;
    const nePride = (responses || []).filter(r => r.status === "ne pridem").length;
    const mogoce = (responses || []).filter(r => r.status === "mogoce").length;

    const responseItems = (responses || []).map(r => {
      return `<li><strong>${r.name}</strong> – ${r.status}${r.note ? ` (${r.note})` : ""}</li>`;
    }).join("");

    const article = document.createElement("article");
    article.className = "event-card";

    article.innerHTML = `
      <h2>${event.title}</h2>
      <div class="meta">
        <strong>Začetek:</strong> ${formatDateTime(event.start_at)}<br>
        <strong>Konec:</strong> ${formatDateTime(event.end_at)}
      </div>
      <div class="description">${event.description || ""}</div>

      <div class="counts">
        <div class="count-box">Pride: <strong>${pride}</strong></div>
        <div class="count-box">Ne pride: <strong>${nePride}</strong></div>
        <div class="count-box">Mogoče: <strong>${mogoce}</strong></div>
      </div>

      <h3>Prijavljeni</h3>
      <ul class="responses-list">
        ${responseItems || "<li>Zaenkrat še ni prijav.</li>"}
      </ul>

      <div class="form-row">
        <input type="text" id="name-${event.id}" placeholder="Vaše ime" />
        <select id="status-${event.id}">
          <option value="pridem">Pridem</option>
          <option value="ne pridem">Ne pridem</option>
          <option value="mogoce">Mogoče</option>
        </select>
        <textarea id="note-${event.id}" placeholder="Opomba (neobvezno)"></textarea>
        <button onclick="submitResponse(${event.id})">Pošlji odgovor</button>
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
    message.textContent = "Prosim, vpišite ime.";
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
    console.error(error);
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

loadEvents();