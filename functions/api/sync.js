let memoryStore = {
  survey_requests: [],
  inspections: []
};

export async function onRequestGet(context) {
  return new Response(JSON.stringify(memoryStore), {
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
    const body = await context.request.json();
    if (body && body.type === 'ADD_REQUEST' && body.payload) {
      const exists = memoryStore.survey_requests.some(r => String(r.id) === String(body.payload.id));
      if (!exists) {
        memoryStore.survey_requests.unshift(body.payload);
      }
    } else if (body && body.type === 'DELETE_REQUEST' && body.id) {
      memoryStore.survey_requests = memoryStore.survey_requests.filter(r => String(r.id) !== String(body.id));
    } else if (body && body.type === 'ADD_INSPECTION' && body.payload) {
      const exists = memoryStore.inspections.some(i => String(i.id) === String(body.payload.id));
      if (!exists) {
        memoryStore.inspections.unshift(body.payload);
      }
    } else if (body && body.type === 'DELETE_INSPECTION' && body.id) {
      memoryStore.inspections = memoryStore.inspections.filter(i => String(i.id) !== String(body.id));
    } else if (body && body.type === 'FULL_SYNC' && body.payload) {
      if (Array.isArray(body.payload.survey_requests)) {
        for (const req of body.payload.survey_requests) {
          if (!memoryStore.survey_requests.some(r => String(r.id) === String(req.id))) {
            memoryStore.survey_requests.unshift(req);
          }
        }
      }
      if (Array.isArray(body.payload.inspections)) {
        for (const insp of body.payload.inspections) {
          if (!memoryStore.inspections.some(i => String(i.id) === String(insp.id))) {
            memoryStore.inspections.unshift(insp);
          }
        }
      }
    }

    return new Response(JSON.stringify({ success: true, store: memoryStore }), {
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
