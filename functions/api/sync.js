let memoryStore = {
  survey_requests: [],
  inspections: []
};

async function getStore(env) {
  if (env && env.SURVEY_KV) {
    try {
      const data = await env.SURVEY_KV.get('vku_store', { type: 'json' });
      if (data) return data;
    } catch (e) {}
  }
  return memoryStore;
}

async function saveStore(env, store) {
  memoryStore = store;
  if (env && env.SURVEY_KV) {
    try {
      await env.SURVEY_KV.put('vku_store', JSON.stringify(store));
    } catch (e) {}
  }
}

export async function onRequestGet(context) {
  const store = await getStore(context.env);
  return new Response(JSON.stringify(store), {
    status: 200,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}

export async function onRequestPost(context) {
  try {
    const store = await getStore(context.env);
    const body = await context.request.json();

    if (body && body.type === 'ADD_REQUEST' && body.payload) {
      const exists = store.survey_requests.some(r => String(r.id) === String(body.payload.id));
      if (!exists) {
        store.survey_requests.unshift(body.payload);
      }
    } else if (body && body.type === 'DELETE_REQUEST' && body.id) {
      store.survey_requests = store.survey_requests.filter(r => String(r.id) !== String(body.id));
    } else if (body && body.type === 'ADD_INSPECTION' && body.payload) {
      const exists = store.inspections.some(i => String(i.id) === String(body.payload.id));
      if (!exists) {
        store.inspections.unshift(body.payload);
      }
    } else if (body && body.type === 'DELETE_INSPECTION' && body.id) {
      store.inspections = store.inspections.filter(i => String(i.id) !== String(body.id));
    } else if (body && body.type === 'FULL_SYNC' && body.payload) {
      if (Array.isArray(body.payload.survey_requests)) {
        for (const req of body.payload.survey_requests) {
          if (!store.survey_requests.some(r => String(r.id) === String(req.id))) {
            store.survey_requests.unshift(req);
          }
        }
      }
      if (Array.isArray(body.payload.inspections)) {
        for (const insp of body.payload.inspections) {
          if (!store.inspections.some(i => String(i.id) === String(insp.id))) {
            store.inspections.unshift(insp);
          }
        }
      }
    }

    await saveStore(context.env, store);

    return new Response(JSON.stringify({ success: true, store }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS, DELETE',
        'Access-Control-Allow-Headers': 'Content-Type'
      }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
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
      'Access-Control-Allow-Headers': 'Content-Type'
    }
  });
}
