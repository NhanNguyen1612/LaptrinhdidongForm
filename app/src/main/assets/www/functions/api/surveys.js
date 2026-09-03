/* ==========================================================================
   VKU FIELD SURVEY PWA - CLOUDFLARE PAGES FUNCTION BACKEND API
   Endpoint: /api/surveys
   Handles persistent cross-device synchronization (GET, POST, DELETE)
   ========================================================================== */

const PERSISTENT_API_URL = 'https://api.restful-api.dev/objects';
const ITEM_TYPE_NAME = 'VKU-SURVEY-ITEM';

let memorySurveysStore = [];

async function fetchCloudObjects() {
  try {
    const res = await fetch(PERSISTENT_API_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    if (!res.ok) return [];
    const list = await res.json();
    if (!Array.isArray(list)) return [];

    const surveys = [];
    list.forEach(obj => {
      if (obj && obj.name === ITEM_TYPE_NAME && obj.data && obj.data.id) {
        const item = obj.data;
        item.cloudObjectId = obj.id;
        item.synced = true;
        surveys.push(item);
      }
    });

    surveys.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    return surveys;
  } catch (err) {
    console.warn('[Cloud Function] Fetch cloud objects error:', err.message);
    return memorySurveysStore;
  }
}

export async function onRequestGet(context) {
  try {
    let surveysList = [];

    // Read from KV Binding if available
    if (context.env && context.env.SURVEYS_KV) {
      const kvData = await context.env.SURVEYS_KV.get('vku_surveys', { type: 'json' });
      if (Array.isArray(kvData)) {
        surveysList = kvData;
      }
    }

    // Merge with Persistent Cloud Objects
    const cloudObjects = await fetchCloudObjects();
    const map = new Map();
    surveysList.forEach(s => map.set(s.id, s));
    cloudObjects.forEach(s => map.set(s.id, s));

    const mergedSurveys = Array.from(map.values());
    mergedSurveys.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return new Response(JSON.stringify(mergedSurveys), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Accept'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestPost(context) {
  try {
    const item = await context.request.json();
    if (!item || !item.id) {
      return new Response(JSON.stringify({ error: 'Missing survey item or item id' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    item.synced = true;
    item.syncedAt = new Date().toISOString();

    // 1. Write to Persistent Cloud Database
    try {
      await fetch(PERSISTENT_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: ITEM_TYPE_NAME,
          data: item
        })
      });
    } catch (dbErr) {
      console.warn('[Cloud Function] DB POST error:', dbErr.message);
    }

    // 2. Write to Cloudflare KV if bound
    if (context.env && context.env.SURVEYS_KV) {
      let kvList = (await context.env.SURVEYS_KV.get('vku_surveys', { type: 'json' })) || [];
      const idx = kvList.findIndex(s => s.id === item.id);
      if (idx >= 0) kvList[idx] = item;
      else kvList.unshift(item);
      await context.env.SURVEYS_KV.put('vku_surveys', JSON.stringify(kvList));
    }

    // 3. Fallback memory store
    const memIdx = memorySurveysStore.findIndex(s => s.id === item.id);
    if (memIdx >= 0) memorySurveysStore[memIdx] = item;
    else memorySurveysStore.unshift(item);

    return new Response(JSON.stringify({ success: true, message: 'Survey saved to Cloud Store', item }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Accept'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestDelete(context) {
  try {
    const url = new URL(context.request.url);
    let targetId = url.searchParams.get('id');

    if (!targetId) {
      try {
        const body = await context.request.json();
        targetId = body?.id;
      } catch (e) {
        /* Ignore body parse error */
      }
    }

    if (!targetId) {
      return new Response(JSON.stringify({ error: 'Missing target survey id to delete' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 1. Delete from Persistent Cloud Database
    try {
      const res = await fetch(PERSISTENT_API_URL, { method: 'GET' });
      if (res.ok) {
        const list = await res.json();
        if (Array.isArray(list)) {
          for (const obj of list) {
            if (obj && obj.name === ITEM_TYPE_NAME && obj.data && obj.data.id === targetId) {
              await fetch(`${PERSISTENT_API_URL}/${obj.id}`, { method: 'DELETE' });
            }
          }
        }
      }
    } catch (dbErr) {
      console.warn('[Cloud Function] DB DELETE error:', dbErr.message);
    }

    // 2. Delete from Cloudflare KV if bound
    if (context.env && context.env.SURVEYS_KV) {
      let kvList = (await context.env.SURVEYS_KV.get('vku_surveys', { type: 'json' })) || [];
      kvList = kvList.filter(s => s.id !== targetId);
      await context.env.SURVEYS_KV.put('vku_surveys', JSON.stringify(kvList));
    }

    // 3. Delete from memory store
    memorySurveysStore = memorySurveysStore.filter(s => s.id !== targetId);

    return new Response(JSON.stringify({ success: true, deletedId: targetId, message: 'Survey deleted from Cloud' }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type, Accept'
      }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      }
    });
  }
}

export async function onRequestOptions() {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type, Accept'
    }
  });
}
