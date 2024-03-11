// Auction close client.
// Run:
// npm run auction:close

const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('crypto');
const b4a = require('b4a');

const main = async () => {
  // Hypercore / Hyperbee DB for auctions data.
  const hCore = new Hypercore('./db/auction-client');
  const hBee = new Hyperbee(hCore, {
    keyEncoding: 'utf-8',
    valueEncoding: 'binary',
  });
  await hBee.ready();

  // Resolve DHT seed for key pair. If not found, generate and store in DB.
  let dhtSeed = (await hBee.get('dht-seed'))?.value;
  if (!dhtSeed) {
    dhtSeed = crypto.randomBytes(32);
    await hBee.put('dht-seed', dhtSeed);
  }

  // Start DHT. It is used for RPC service discovery.
  const dht = new DHT({
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: '127.0.0.1', port: 30001 }],
  });
  await dht.ready();

  // PK of RPC server, used instead of address.
  const serverPK = Buffer.from(
    '60ab46885e212a4d72d57ba176e55db56697b0df39d2f8221a416ffd359325d0',
    'hex',
  );

  console.log('Close by:', b4a.toString(hCore.key, 'hex'));

  // RPC.
  const rpc = new RPC({ dht });
  const payload = {
    id: 'Pic#1',
    owner: b4a.toString(hCore.key, 'hex'),
  };

  const payloadRaw = Buffer.from(JSON.stringify(payload), 'utf-8');

  // Call closeAuction.
  const responseRaw = await rpc.request(serverPK, 'closeAuction', payloadRaw);
  const response = b4a.toString(responseRaw);
  console.log(response);

  // Close connections.
  await rpc.destroy();
  await dht.destroy();
};

main().catch(console.error);
