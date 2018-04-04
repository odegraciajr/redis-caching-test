# How to use
Make sure superbox and washington are running with the correct ports.

### tweedle-dum create a bin
```NODE_ENV=development REDIS_PASSWORD=passpasspass npm run generator -- 888888 1```

### start the app
```npm start```

# Settings

```
const DELAY_PER_REQUEST = 1000; // millisecond
const TWEED_BASE_URL = 'http://localhost:4435';
const REDIS_HOST = 'localhost';
const REDIS_PORT = '6379';
const REDIS_PASS = 'passpasspass';
const CARDNUM_START = 8888882000000000;
const CARDNUM_LIMIT = 100; // number of cards to add
```

# Redis

### Remove previous cards in redis
`redis-cli -a 'passpasspass' FLUSHALL`

### Monitor redis
`redis-cli -a 'passpasspass' MONITOR`
