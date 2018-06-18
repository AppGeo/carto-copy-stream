let data = require('./data.json');
let config = require('./config.json');
let cartoStream = require('./');

let stream = cartoStream(config.user, config.key, 'copy_test', ['the_geom', 'foo', 'bar'], (err, resp) => {
  console.log('done', err, resp.total_rows);
})
// stream.write(data[2], e => console.log('item done', e));

for (let item of data) {
  // console.log('item', item)
  stream.write(item, e => console.log('item done', e));
}
stream.end(e=> {
  console.log('all done', e)
});
