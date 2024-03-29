const qs = require('querystring');
const url = require('url');
const https = require('https');
const csv = require('csv-write-stream');
const zlib = require('zlib');
const wkt = require('terraformer-wkt-parser');
const terraformer = require('terraformer');
const stream = require('readable-stream')
module.exports = createStream;
const makeSQL = (headers, table) =>
  `COPY ${table} (${headers.join(',')}) FROM STDIN WITH (FORMAT csv, HEADER true)`

class ToCSV extends stream.Transform {
  constructor(headers) {
    super({
      objectMode: true
    });
    this.headers = headers;
  }
  _transform(chunk, _, next) {
    let out = chunk.properties;
    if (chunk.geometry) {
      out.the_geom = `SRID=4326;${wkt.convert(chunk.geometry)}`;
      out.the_geom_webmercator = `SRID=3857;${wkt.convert(terraformer.toMercator(chunk.geometry))}`;
    }
    this.push(out);
    next();
  }
}

function createBaseUrl(user, credentials) {
  if (!credentials.domain && !credentials.subdomainless) {
    return `https://${user}.carto.com`;
  }
  if (credentials.domain) {
    if (credentials.subdomainless) {
      return `https://${credentials.domain}/user/${user}`;
    } else {
      return `https://${user}.${credentials.domain}`;
    }
  } else if (credentials.subdomainless) {
    return `https://carto.com/user/${user}`;
  }
}
function createStream(user, key, table, headers, cartoOpts, cb) {
  if (typeof cartoOpts === 'function') {
    cb = cartoOpts;
    cartoOpts = {};
  }
  if (!cartoOpts) {
    cartoOpts = {};
  }
  if (typeof cb !== 'function') {
    cb = ()=>{}
  }
  if (!Array.isArray(headers)) {
    return cb(new TypeError('headers must be an array'))
  }
  if (headers.length === 0){
    return cb(new TypeError('headers array must have stuff in it'))
  }

  headers = headers.slice();
  if (!headers.includes('the_geom')) {
    headers.push('the_geom');
  }
  if (!headers.includes('the_geom_webmercator')) {
    headers.push('the_geom_webmercator');
  }
  let sql = makeSQL(headers, table);
  let ourURL = `${createBaseUrl(user, cartoOpts)}/api/v2/sql/copyfrom?${qs.stringify({
    api_key: key,
    q: sql
  })}`;
  const opts = url.parse(ourURL);
  opts.method='post';
  opts.headers = {
    'transfer-encoding': 'chunked',
    'content-type': 'application/octet-stream',
    'content-encoding': 'gzip'
  }
  const res = https.request(opts, res => {
    const out = [Buffer.alloc(0)];
    res.on('data', d=>out.push(d));
    res.on('error', cb);
    res.on('end', ()=>{
      let resp = Buffer.concat(out).toString();
      try {
        resp = JSON.parse(resp);
      } catch (e) {
        console.log('err', resp);
      }
      if (res.statusCode > 299) {
        return cb(resp)
      } else {
        return cb(null, resp);
      }
    })
  });
  var input = new ToCSV(headers);
  stream.pipeline(input, csv({headers}), zlib.createGzip({
    level: 2
  }), res, e=> {
    if (e) {
      return cb(e);
    }
  });
  return input;
}
