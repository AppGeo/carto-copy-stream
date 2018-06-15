carto-copy-stream
======

Import a table into carto using the new copy api, make sure the table exists


API
---

```js
const copyStream = require('carto-copy-stream');
var writableStream = copyStream(user, key, table, headers, cb);
```

It takes:

- the carto username (the one for the api, not for logging in)
- api key
- table name
- array of headers
- a callback for when it's done importing

it returns a writable object stream that takes geojson objects.
