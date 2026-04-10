<script>
  import { onMount, onDestroy } from 'svelte';
  import { escHtml } from '../lib/parser.js';

  let relayUrl = $state('');
  let eventSource = $state(null);
  let sessions = $state({});
  let connectionStatus = $state('disconnected');

  onMount(() => {
    const meta = document.querySelector('meta[name="progress-relay-url"]');
    relayUrl = meta ? meta.content : 'http://localhost:8001';
    connect();
  });

  onDestroy(() => {
    if (eventSource) eventSource.close();
  });

  function connect() {
    if (eventSource) eventSource.close();
    connectionStatus = 'connecting';

    const es = new EventSource(relayUrl + '/events');

    es.addEventListener('init', (e) => {
      const snapshot = JSON.parse(e.data);
      const newSessions = {};
      snapshot.forEach((s) => { newSessions[s.session_id] = s; });
      sessions = newSessions;
      connectionStatus = 'connected';
    });

    es.addEventListener('update', (e) => {
      const data = JSON.parse(e.data);
      sessions = { ...sessions, [data.session_id]: data };

      if (data.current_step >= data.total_steps && data.current_competitor >= data.total_competitors) {
        setTimeout(() => {
          const { [data.session_id]: _, ...rest } = sessions;
          sessions = rest;
        }, 5000);
      }
    });

    es.addEventListener('session_end', (e) => {
      const data = JSON.parse(e.data);
      const { [data.session_id]: _, ...rest } = sessions;
      sessions = rest;
    });

    es.onopen = () => {
      connectionStatus = 'connected';
    };

    es.onerror = () => {
      connectionStatus = 'disconnected';
    };

    eventSource = es;
  }

  function normalizeLocation(loc) {
    const l = (loc || '').toLowerCase();
    if (l.indexOf('dobromir') !== -1) return 'dobromir';
    return 'sewera';
  }

  function getSessionsForLocation(loc) {
    return Object.values(sessions).filter((s) => normalizeLocation(s.location) === loc);
  }

  function getPct(s) {
    return s.total_steps > 0 ? Math.round((s.current_step / s.total_steps) * 100) : 0;
  }
</script>

<div class="card scraping-progress" id="scraping-progress">
  <div class="scraping-progress-header">
    <h2>Scraping Progress</h2>
    <span class="progress-connection-status" class:status-connected={connectionStatus === 'connected'} class:status-connecting={connectionStatus === 'connecting'} class:status-disconnected={connectionStatus === 'disconnected'}>
      {#if connectionStatus === 'connected'}
        ● Connected
      {:else if connectionStatus === 'connecting'}
        ○ Connecting…
      {:else}
        <a href={relayUrl} target="_blank" rel="noopener noreferrer" class="status-disconnected-link">○ Disconnected — click to authorize</a>
      {/if}
    </span>
  </div>
  <div class="progress-columns">
    {#each ['sewera', 'dobromir'] as loc}
      <div class="progress-block" id="progress-{loc}">
        <h3 class="progress-block-title">{loc.charAt(0).toUpperCase() + loc.slice(1)}</h3>
        <div class="progress-sessions" id="progress-sessions-{loc}">
          {#if getSessionsForLocation(loc).length === 0}
            <div class="empty-state empty-state-sm">No active sessions</div>
          {:else}
            {#each getSessionsForLocation(loc) as s (s.session_id)}
              {@const pct = getPct(s)}
              <div class="progress-session" class:complete={s.current_step >= s.total_steps && s.current_competitor >= s.total_competitors}>
                <div class="progress-session-header">
                  <span class="progress-competitor-label">{s.competitor || ''}
                    <span class="progress-meta">({s.current_competitor}/{s.total_competitors})</span>
                  </span>
                  <span class="progress-pct">{pct}%</span>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill" style="width:{pct}%"></div>
                </div>
              </div>
            {/each}
          {/if}
        </div>
      </div>
    {/each}
  </div>
</div>
