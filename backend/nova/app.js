const statusEl = document.querySelector('#runtime-status');
const resultsEl = document.querySelector('#results');
const apodStateEl = document.querySelector('#apod-state');
const apodContentEl = document.querySelector('#apod-content');
const asteroidStateEl = document.querySelector('#asteroid-state');
const asteroidContentEl = document.querySelector('#asteroid-content');

async function refreshStatus() {
  try {
    const response = await fetch('/api/status', { signal: AbortSignal.timeout(2500) });
    const status = await response.json();
    if (status.localModelReady) {
      statusEl.innerHTML = '<span class="status-dot"></span><span>Local AI ready</span>';
      statusEl.title = `Ollama connected · ${status.model}`;
    } else {
      statusEl.innerHTML = '<span class="status-dot" style="background:#ffb86c;box-shadow:none"></span><span>Fallback mode</span>';
      statusEl.title = 'Offline answers and online lookup are available; local language model is not ready.';
    }
    statusEl.title += status.nasaApiKeyConfigured ? ' · NASA API key configured.' : ' · NASA demo key in use; add NASA_API_KEY to .env for your team key.';
  } catch {
    statusEl.innerHTML = '<span class="status-dot" style="background:#ff7e7e;box-shadow:none"></span><span>Backend not connected</span>';
    statusEl.title = 'Run npm start from the project folder.';
  }
}

function setState(el, message, kind = '') {
  el.textContent = message;
  el.classList.toggle('state-error', kind === 'error');
}

async function loadApod() {
  const button = document.querySelector('#refresh-apod');
  button.disabled = true;
  setState(apodStateEl, 'Contacting NASA…');
  apodContentEl.hidden = true;
  try {
    const response = await fetch('/api/nasa/apod', { signal: AbortSignal.timeout(12000) });
    const result = await response.json();
    if (!response.ok || !result.ok || !result.data) throw new Error(result.error || 'NASA did not return an APOD item.');
    const data = result.data;
    document.querySelector('#apod-date').textContent = data.date || 'NASA Astronomy Picture of the Day';
    document.querySelector('#apod-title').textContent = data.title || 'Astronomy Picture of the Day';
    document.querySelector('#apod-explanation').textContent = data.explanation || 'NASA did not provide an explanation for this item.';
    document.querySelector('#apod-credit').textContent = data.credit ? `Credit: ${data.credit}` : '';
    const imageLink = document.querySelector('#apod-image-link');
    const image = document.querySelector('#apod-image');
    const source = document.querySelector('#apod-source');
    source.href = data.link || 'https://science.nasa.gov/solar-system/';
    if (data.mediaType === 'image' && data.imageUrl) {
      image.src = data.imageUrl;
      image.alt = data.alt || data.title || 'NASA astronomy image';
      imageLink.href = source.href;
      imageLink.hidden = false;
    } else {
      image.removeAttribute('src');
      imageLink.hidden = true;
    }
    apodContentEl.hidden = false;
    setState(apodStateEl, result.apiKeyConfigured ? 'Live NASA data · key configured' : 'Live NASA data · demo key / public rate limits');
  } catch (error) {
    setState(apodStateEl, error.name === 'TimeoutError' ? 'NASA took too long to respond. Try refreshing.' : (error.message || 'Could not load NASA data.'), 'error');
  } finally {
    button.disabled = false;
  }
}

async function loadAsteroids() {
  const button = document.querySelector('#refresh-asteroids');
  button.disabled = true;
  setState(asteroidStateEl, 'Contacting NASA/JPL…');
  asteroidContentEl.hidden = true;
  try {
    const response = await fetch('/api/nasa/asteroids', { signal: AbortSignal.timeout(12000) });
    const result = await response.json();
    if (!response.ok || !result.ok || !result.data) throw new Error(result.error || 'NASA/JPL did not return asteroid data.');
    const data = result.data;
    const summary = document.querySelector('#asteroid-summary');
    summary.textContent = `${data.elementCount} near-Earth object${data.elementCount === 1 ? '' : 's'} in the feed · ${data.startDate} to ${data.endDate}`;
    const list = document.querySelector('#asteroid-list');
    list.replaceChildren();
    data.asteroids.slice(0, 6).forEach(item => {
      const row = document.createElement('article');
      row.className = 'asteroid-row';
      const title = document.createElement('h4');
      title.textContent = item.name;
      const details = document.createElement('p');
      const distance = item.missDistanceKm ? `${Math.round(item.missDistanceKm).toLocaleString('en-US')} km miss distance` : 'Distance unavailable';
      const velocity = item.velocityKph ? `${Math.round(item.velocityKph).toLocaleString('en-US')} km/h` : 'Velocity unavailable';
      details.textContent = `${item.closeApproachDate || 'Date unavailable'} · ${distance} · ${velocity}`;
      row.append(title, details);
      if (item.potentiallyHazardous) {
        const flag = document.createElement('span');
        flag.className = 'hazard-flag';
        flag.textContent = 'Potentially hazardous classification';
        row.append(flag);
      }
      if (item.nasaJplUrl) {
        const link = document.createElement('a');
        link.href = item.nasaJplUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.className = 'nasa-text-link';
        link.textContent = 'Object details ↗';
        row.append(link);
      }
      list.append(row);
    });
    if (!data.asteroids.length) list.textContent = 'No objects were returned for this date range.';
    asteroidContentEl.hidden = false;
    setState(asteroidStateEl, result.apiKeyConfigured ? 'Live NASA/JPL data · key configured' : 'Live NASA/JPL data · demo key / public rate limits');
  } catch (error) {
    setState(asteroidStateEl, error.name === 'TimeoutError' ? 'NASA/JPL took too long to respond. Try refreshing.' : (error.message || 'Could not load asteroid data.'), 'error');
  } finally {
    button.disabled = false;
  }
}

function askNova(question) {
  if (window.NovaBot) {
    window.NovaBot.open();
    window.NovaBot.ask(question);
  }
}

document.querySelector('#open-nova').addEventListener('click', () => {
  if (window.NovaBot) window.NovaBot.open();
});
document.querySelector('#start-tour').addEventListener('click', () => {
  if (window.NovaBot) window.NovaBot.startTour();
});
document.querySelectorAll('.ask-topic').forEach(button => {
  button.addEventListener('click', () => askNova(button.dataset.question));
});

document.querySelector('#mission-form').addEventListener('submit', event => {
  event.preventDefault();
  const destination = document.querySelector('#destination-select').value;
  const crew = Number(document.querySelector('#crew-size').value);
  const days = Number(document.querySelector('#mission-days').value);
  if (!Number.isInteger(crew) || crew < 1 || crew > 12 || !Number.isInteger(days) || days < 1 || days > 1200) return;
  resultsEl.innerHTML = `
    <div class="result-icon">✦</div>
    <div><span class="eyebrow">MISSION BRIEF GENERATED</span>
    <h3>${destination} · ${crew} crew · ${days} days</h3>
    <p>This is a planning prompt, not a validated engineering simulation. Consider life support, food and water reserves, power, radiation protection, communications, medical contingencies, and return strategy. Ask Nova to help you explore the trade-offs.</p>
    <button class="secondary" id="ask-brief">Ask Nova to review this plan <span>→</span></button></div>`;
  document.querySelector('#ask-brief').addEventListener('click', () => {
    askNova(`Help me think through an educational ${destination} mission with ${crew} crew members lasting ${days} days. Identify key planning constraints and uncertainties; do not pretend this is a validated engineering plan.`);
  });
});

document.querySelector('#refresh-apod').addEventListener('click', loadApod);
document.querySelector('#refresh-asteroids').addEventListener('click', loadAsteroids);

refreshStatus();
loadApod();
loadAsteroids();
setInterval(refreshStatus, 30000);
