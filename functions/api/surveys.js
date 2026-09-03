/* ==========================================================================
   VKU FIELD SURVEY PWA - CLOUDFLARE PAGES FUNCTION BACKEND API
   Endpoint: /api/surveys
   Handles cross-device synchronization (Push & Pull)
   ========================================================================== */

// Global in-memory storage fallback for worker instance
let memorySurveysStore = [
  {
    id: 'VKU-CLOUD-INIT-001',
    surveyorName: 'Hệ thống VKU Cloud',
    surveyorId: 'VKU-ADMIN',
    building: 'Khu A',
    roomDetails: 'Phòng Hội đồng A101',
    overallCondition: 'good',
    items: [
      { category: 'Máy tính / Lab', condition: 'good', description: 'Hệ thống máy tính hoạt động ổn định.', photoBase64: null },
      { category: 'Mạng & Wi-Fi', condition: 'good', description: 'Wi-Fi VKU-Campus tốc độ cao 100Mbps.', photoBase64: null }
    ],
    gpsLocation: { lat: '15.975300', lng: '108.253200' },
    timestamp: new Date().toISOString(),
    synced: true
  }
];

export async function onRequestGet(context) {
  try {
    let surveysList = memorySurveysStore;

    // Read from Cloudflare KV Binding if configured
    if (context.env && context.env.SURVEYS_KV) {
      const kvData = await context.env.SURVEYS_KV.get('vku_surveys', { type: 'json' });
      if (Array.isArray(kvData)) {
        surveysList = kvData;
      }
    }

    return new Response(JSON.stringify(surveysList), {
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

    let surveysList = memorySurveysStore;
    if (context.env && context.env.SURVEYS_KV) {
      const kvData = await context.env.SURVEYS_KV.get('vku_surveys', { type: 'json' });
      if (Array.isArray(kvData)) {
        surveysList = kvData;
      }
    }

    // Merge or Insert
    const existingIndex = surveysList.findIndex(s => s.id === item.id);
    if (existingIndex >= 0) {
      surveysList[existingIndex] = item;
    } else {
      surveysList.unshift(item);
    }

    // Update KV if available
    if (context.env && context.env.SURVEYS_KV) {
      await context.env.SURVEYS_KV.put('vku_surveys', JSON.stringify(surveysList));
    } else {
      memorySurveysStore = surveysList;
    }

    return new Response(JSON.stringify({ success: true, message: 'Survey saved to Cloud', item }), {
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
