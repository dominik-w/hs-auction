// From tips.
const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('crypto');

const main = async () => {
  // hyperbee db
  const hCore = new Hypercore('./db/rpc-client');
  const hBee = new Hyperbee(hCore, { keyEncoding: 'utf-8', valueEncoding: 'binary' });
  await hBee.ready();

  // resolved distributed hash table seed for key pair
  let dhtSeed = (await hBee.get('dht-seed'))?.value;
  if (!dhtSeed) {
    // not found, generate and store in db
    dhtSeed = crypto.randomBytes(32);
    await hBee.put('dht-seed', dhtSeed);
  }

  // start distributed hash table, it is used for rpc service discovery
  const dht = new DHT({
    port: 50001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: '127.0.0.1', port: 30001 }], // note boostrap points to dht that is started via cli
  });
  await dht.ready();

  // public key of rpc server, used instead of address, the address is discovered via dht
  const serverPubKey = Buffer.from('c0d650d779b78fa3ed151d2c447d37526811e304739e43fa4dd1a3e2542eac35', 'hex');

  // rpc lib
  const rpc = new RPC({ dht });

  // payload for request
  const payload = { nonce: 126 };
  const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');

  // sending request and handling response
  // see console output on server code for public key as this changes on different instances
  const respRaw = await rpc.request(serverPubKey, 'ping', payloadRaw);
  const resp = JSON.parse(respRaw.toString('utf-8'));
  console.log(resp); // { nonce: 127 }

  // closing connection
  await rpc.destroy();
  await dht.destroy();
};

main().catch(console.error);
