// settings
const DELAY_PER_REQUEST = 100; // millisecond
const REDIS_HOST = 'localhost';
const REDIS_PORT = '6379';
const REDIS_PASS = 'lB9LDTRbM7T6p*b!';
const CARDNUM_START = 9888880000000000;
const CARDNUM_LIMIT = 10; // number of cards to add

const RedisClient = require('redis-client');
const Promise = require('bluebird');
const colors = require('colors/safe');
const Table = require('cli-table2');

const table = new Table();
const table2 = new Table();
let cardsAdded = 0;
let errorCount = 0;
let mismatchCount = 0;
const cardHashes = [];
let cacheMissed = 0;

const redis = new RedisClient({
  host: REDIS_HOST,
  port: REDIS_PORT,
  password: REDIS_PASS
});
/* eslint-disable no-console */
function bytesToSize(bytes) {
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  if (bytes === 0) return '0 Byte';
  const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${Math.round(bytes / (1024 ** i), 2)} ${sizes[i]}`;
}

function cardCount() {
  return new Promise((resolve, reject) => {
    redis.client.get('card::*', (e, obj) => {
      if (e !== null) {
        reject(e);
      }

      resolve(obj && obj.length);
    });
  });
}

async function addCardSecure(number) {
  return new Promise((resolve, reject) => {
    redis.client.set(`card:${number}`, number.toString(16), 'EX', 100, (err) => {
      if (err) {
        reject(err);
      } else {
        resolve(number);
      }
    });
  });
}

function generateCards(start, limit) {
  const cards = [];

  for (let i = 0; i < limit; i += 1) {
    cards.push(start + i);
  }

  return cards;
}

const testCards = generateCards(CARDNUM_START, CARDNUM_LIMIT);

const searchCache = async (cacheKey) => {
  return new Promise((resolve, reject) => {
    redis.client.get(`${cacheKey}`, (err, res) => {
      if (err || !res) {
        cacheMissed += 1;
        reject(err);
      } else {
        console.log(`${cacheKey} is ${res}`);
        resolve(res);
      }
    });
  });
};

function cacheDelay(key) {
  return new Promise(resolve => setTimeout(
    () => resolve(searchCache(key)),
    DELAY_PER_REQUEST - 50
  ));
}

async function cacheTest(arr) {
  await arr.reduce((p, e) => p.then(async () => {
    await cacheDelay(e);
  }), Promise.resolve());

  const redisInfo = redis.client.server_info;
  console.log(colors.blue('Redis Server Info'));

  table.push(
    [colors.green('OS'), redisInfo.os],
    [colors.green('Max Memory'), bytesToSize(redisInfo.maxmemory)],
    [colors.green('Max Memory Policy'), redisInfo.maxmemory_policy],
    [colors.green('Expired Keys'), redisInfo.expired_keys],
    [colors.green('Evicted Keys'), redisInfo.evicted_keys],
    [colors.green('Cache Missed'), cacheMissed]
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
}

const makeRequest = async (cardNum) => {
  try {

    // Add a new card
    const res = await addCardSecure(cardNum);

    if (res) {
      cardHashes.push(`card:${res}`);
      console.log('Card Added! ', colors.green(`${cardNum}|${res}`));
    } else {
      console.log('AddCard Error!');
      errorCount += 1;
    }
  } catch (err) { // mainly promise errors or addCard errors
    console.log(colors.red(err.message));
    errorCount += 1;
  }
};

function myDelay(x) {
  return new Promise(resolve => setTimeout(
    () => resolve(makeRequest(x)),
    DELAY_PER_REQUEST
  ));
}

async function redisTest(arr) {
  await arr.reduce((p, e) => p.then(async () => {
    await myDelay(e);
  }), Promise.resolve());

  console.log(colors.green('Done adding cards'));
  cacheTest(cardHashes);
}

// Run test
redisTest(testCards);
