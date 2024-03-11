// Server.
// Run:
// npm run dht:start
// npm run serve

const RPC = require('@hyperswarm/rpc');
const DHT = require('hyperdht');
const Hypercore = require('hypercore');
// const RAM = require('random-access-memory')
const Hyperbee = require('hyperbee');
const crypto = require('crypto');
const b4a = require('b4a');

// Auction object.
const Auction = {
  id: null,
  item: null,
  price: null,
  owner: null,
  topBidValue: null,
  topBidUser: null,
  isClosed: false,
};

const main = async () => {
  // Hypercore / Hyperbee DB for auctions data.
  const hCore = new Hypercore('./db/auction-server');
  const hBee = new Hyperbee(hCore, { keyEncoding: 'utf-8', valueEncoding: 'binary' });
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
    bootstrap: [{ host: '127.0.0.1', port: 30001 }], // Boostrap points to DHT, that is started via CLI.
  });
  await dht.ready();

  // Resolve RPC server seed for key pair.
  let rpcSeed = (await hBee.get('rpc-seed'))?.value;
  if (!rpcSeed) {
    rpcSeed = crypto.randomBytes(32);
    await hBee.put('rpc-seed', rpcSeed);
  }

  // Setup RPC server.
  const rpc = new RPC({ seed: rpcSeed, dht });
  const rpcServer = rpc.createServer();
  await rpcServer.listen(); // rpcServer.refresh();
  console.log('RPC server started listening on public key:', rpcServer.publicKey.toString('hex'));
  // Eg: 60ab46885e212a4d72d57ba176e55db56697b0df39d2f8221a416ffd359325d0

  const auctionsMap = new Map();

  // Open auction RPC request handler.
  rpcServer.respond('openAuction', async (params /* , PK */) => {
    // const decodedParams = JSON.parse(params.toString('utf-8'));
    const decodedParams = JSON.parse(b4a.toString(params));

    const {
      id,
      item,
      price,
      owner,
    } = decodedParams;

    // Check for common errors / collisions.
    if (!id || !item || !price) {
      throw new Error('Error: Auction required parameters are missing (id, item or price).');
    }

    if (auctionsMap.has(id)) {
      throw new Error('Error: Auction with this ID does already exist.');
    }

    // OK, auction can be opened.
    auctionsMap.set(id, {
      ...Auction,
      id,
      item,
      price,
      owner,
    });

    return b4a.from('Success. Your auction is active!', 'utf-8');
  });

  // New bid RPC request handler.
  rpcServer.respond('makeBid', async (params) => {
    const decodedParams = JSON.parse(b4a.toString(params));

    const {
      id,
      bid,
      bidUserPK,
    } = decodedParams;

    // Check for common errors.
    if (!id || !bid || !bidUserPK) {
      throw new Error('Error: Bid required parameters are missing (id, bid or bidUserPK).');
    }

    const auction = auctionsMap.get(id);
    if (!auction) {
      throw new Error('Error: No such auction ID.');
    }

    if (auction.isClosed) {
      throw new Error('Error: Auction already closed.');
    }

    if (bid <= auction.topBidValue) {
      throw new Error('Error: Your bid value must be higher than current top bid value.');
    }

    // Make new bid.
    auction.topBidValue = bid;
    auction.topBidUser = bidUserPK;

    console.log(`User ${bidUserPK} placed a new bid (${bid}) for auction: ${auction.item} (${auction.id}).`);

    return b4a.from('Success: New bid placed!', 'utf-8');
  });

  // Close auction RPC request handler.
  rpcServer.respond('closeAuction', async (params) => {
    const decodedParams = JSON.parse(b4a.toString(params));

    const {
      id,
      owner,
    } = decodedParams;

    if (!id || !owner) {
      throw new Error('Error: Missing parameters (id or owner).');
    }

    const auction = auctionsMap.get(id);

    if (!auction) {
      throw new Error('Error: No such auction found.');
    }

    if (auction.owner !== owner) {
      throw new Error('Error: You are not the owner of this auction.');
    }

    if (auction.isClosed) {
      throw new Error('Error: This auction is already closed.');
    }

    // OK, close the auction.
    auction.isClosed = true;

    const output = {
      topBidValue: auction.topBidValue,
      topBidUser: auction.topBidUser,
    };

    console.log(`User ${auction.topBidUser} won this auction with value: ${auction.topBidValue}. Auction closed.`);

    auctionsMap.delete(id);

    return b4a.from(JSON.stringify(output), 'utf-8');
  });
};

main().catch(console.error);
