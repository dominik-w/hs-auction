// From tips.
const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const Hypercore = require('hypercore');
const Hyperbee = require('hyperbee');
const crypto = require('crypto');

const main = async () => {
  const hCore = new Hypercore('./db/auction-storage');
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
    port: 40001,
    keyPair: DHT.keyPair(dhtSeed),
    bootstrap: [{ host: '127.0.0.1', port: 30001 }], // note boostrap points to dht that is started via cli
  });
  await dht.ready();

  // resolve rpc server seed for key pair
  let rpcSeed = (await hBee.get('rpc-seed'))?.value;
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32);
    await hBee.put('rpc-seed', rpcSeed);
  }

  // setup rpc server
  const rpc = new RPC({ seed: rpcSeed, dht });
  const rpcServer = rpc.createServer();
  await rpcServer.listen();
  console.log('rpc server started listening on public key:', rpcServer.publicKey.toString('hex'));
  // rpc server started listening on public key:
  // c0d650d779b78fa3ed151d2c447d37526811e304739e43fa4dd1a3e2542eac35

  // bind handlers to rpc server
  rpcServer.respond('ping', async (reqRaw) => {
    // reqRaw is Buffer, we need to parse it
    const req = JSON.parse(reqRaw.toString('utf-8'));

    const resp = { nonce: req.nonce + 1 };

    // we also need to return buffer response
    const respRaw = Buffer.from(JSON.stringify(resp), 'utf-8');
    return respRaw;
  });
};

main().catch(console.error);
