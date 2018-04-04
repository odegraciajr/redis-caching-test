// settings
const DELAY_PER_REQUEST = 1000; // millisecond
const TWEED_BASE_URL = 'http://localhost:4435';
const REDIS_HOST = 'localhost';
const REDIS_PORT = '6379';
const REDIS_PASS = 'lB9LDTRbM7T6p*b!';
const CARDNUM_START = 8888881000000000;
const CARDNUM_LIMIT = 100; // number of cards to add

const RedisClient = require('redis-client');
const Promise = require('bluebird');
const rp = require('request-promise');
const colors = require('colors/safe');
const Table = require('cli-table2');

const table = new Table();
const table2 = new Table();
let cardsAdded = 0;
let errorCount = 0;
let mismatchCount = 0;

const redis = new RedisClient({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASS
});

function bytesToSize(bytes) {
  var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes == 0) return '0 Byte';
  var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
}

function cardCount() {
  return new Promise((resolve, reject) => {
    redis.client.keys('db:card:*', (e, obj) => {
      if (e !== null) {
        reject(e);
      }

      resolve(obj.length);
    });
  });
}

async function addCardSecure(number) {
  const options = {
    method: 'POST',
    uri: `${TWEED_BASE_URL}/api/v1/card/addCardSecure`,
    headers: {
      'x-auth-token': '&nsrBrNHWCSk$8#4'
    },
    json: true,
    body: {
      number
    }
  };

  return rp(options);
}

const makeRequest = async (cardNum) => {
  try {
    const cCount = await cardCount();
    console.log(`${cCount}-${cardNum}`);

    // Add a new card
    const res = await addCardSecure(cardNum);

    if (res.status === 'SUCCESS') {
      console.log('Card Added! ', colors.green(`${cardNum}|${res.hash}`));
      // check again the card count, it should greater than the cCount since we added a new card
      const updatedCount = await cardCount();

      // compare the old card count before addCard if cCount is greater or equal
      // it means that the cache had a mismatch
      if (cCount >= updatedCount) {
        console.log(colors.red('cCount is >= updatedCount!'));
        errorCount += 1;
        mismatchCount += 1;
      } else {
        console.log('Prev Card Count: ', cCount);
        console.log('Updated Card Count: ', updatedCount);
        cardsAdded += 1;
      }
    } else {
      console.log('AddCard Error!');
      errorCount += 1;
    }
  } catch (err) { // mainly promise errors or addCard errors
    console.log(colors.red(err.message));
    errorCount += 1;
  }
};

function generateCards(start, limit) {
  const cards = [];

  for (let i = 0; i < limit; i += 1) {
    cards.push(start + i);
  }

  return cards;
}

function myDelay(x) {
  return new Promise(r => setTimeout(
    () => r(makeRequest(x)),
    DELAY_PER_REQUEST
  ));
}

async function redisTest(arr) {
  await arr.reduce((p, e, i) => p.then(async () => {
    await myDelay(e);
  }), Promise.resolve());

  const redisInfo = redis.client.server_info;
  console.log(colors.blue('Redis Server Info'));

  table.push(
    [colors.green('OS'), redisInfo.os],
    [colors.green('Max Memory'), bytesToSize(redisInfo.maxmemory)],
    [colors.green('Max Memory Policy'), redisInfo.maxmemory_policy],
    [colors.green('Expired Keys'), redisInfo.expired_keys],
    [colors.green('Evicted Keys'), redisInfo.evicted_keys]
  );
  console.log(table.toString());

  console.log(colors.blue('Test Results'));
  table2.push(
    [colors.green('Number of cards'), CARDNUM_LIMIT],
    [colors.green('Cards added'), cardsAdded],
    [colors.green('Redis mismatch'), colors.red(mismatchCount)],
    [colors.green('Total error count'), colors.red(errorCount)]
  );

  console.log(table2.toString());
  // console.log(redis.client.server_info);
}

const cards = generateCards(CARDNUM_START, CARDNUM_LIMIT);
redisTest(cards);
// redisTest([8888882310000006]);
