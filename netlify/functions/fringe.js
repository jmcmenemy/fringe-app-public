// Signed server-side proxy for the Edinburgh Festivals Listings API.
//
// The API access key + secret signing key are read from Netlify ENVIRONMENT VARIABLES,
// never from the client. The browser calls THIS function; the secret never leaves the server.
//
// Set in Netlify: Site settings -> Environment variables
//   FRINGE_API_KEY      = your access key
//   FRINGE_API_SECRET   = your secret signing key
//   FRINGE_FESTIVAL     = (leave UNSET for demo; set to "fringe" only once approved for live data)
//
// Test after deploy:  https://<your-site>/.netlify/functions/fringe?endpoint=events&size=3

const crypto = require('crypto');

const API_HOST = 'https://api.edinburghfestivalcity.com';

// Only these params are passed through from the browser; anything else is ignored.
const ALLOWED = [
  'size', 'from', 'title', 'genre', 'sub_genre', 'venue_name', 'venue_code',
  'code', 'country', 'age_category', 'pricefrom', 'priceto', 'datefrom', 'dateto',
  'modified_from', 'sort_by', 'post_code'
];

exports.handler = async (event) => {
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers: cors, body: '' };

  const KEY = process.env.FRINGE_API_KEY;
  const SECRET = process.env.FRINGE_API_SECRET;
  const FESTIVAL = process.env.FRINGE_FESTIVAL || 'demofringe'; // forced to demo until you're approved

  if (!KEY || !SECRET) {
    return {
      statusCode: 500, headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing credentials. Set FRINGE_API_KEY and FRINGE_API_SECRET in Netlify environment variables.' })
    };
  }

  const qs = (event.queryStringParameters) || {};
  // e.g. 'events'  (default)  or  'events/<id>/performances'
  const endpoint = String(qs.endpoint || 'events').replace(/[^a-z0-9_\-\/]/gi, '');

  // Build the query string (order is fixed by URLSearchParams so the signature is reproducible).
  const params = new URLSearchParams();
  params.set('key', KEY);
  params.set('festival', FESTIVAL);
  ALLOWED.forEach((k) => { if (qs[k] != null && qs[k] !== '') params.set(k, qs[k]); });

  // The Fringe API signs the path + query with HMAC-SHA1 (hex), appended as &signature=
  const pathAndQuery = '/' + endpoint + '?' + params.toString();
  const signature = crypto.createHmac('sha1', SECRET).update(pathAndQuery).digest('hex');
  const url = API_HOST + pathAndQuery + '&signature=' + signature;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await res.text();
    return {
      statusCode: res.status,
      headers: { ...cors, 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=3600', 'Netlify-CDN-Cache-Control': 'public, s-maxage=21600, stale-while-revalidate=86400' },
      body
    };
  } catch (e) {
    return {
      statusCode: 502, headers: { ...cors, 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Upstream request failed', detail: String((e && e.message) || e) })
    };
  }
};
