## P2P Auctions Project

A simplified P2P auction solution based on Hyperswarm RPC and Hypercores.

To get started, run:

```
npm i
```

Note: there is eslint configured for airbnb JS style.

To fix styles automatically, run:

```
npm run lint:fix
```

## Starting auctions

There are script commands defined as below.

Bootstrap hyperdht

```
npm run dht:start
```

Run server

```
npm run serve
```

Operate auctions

```
npm run auction:open
```

```
npm run auction:bid
```

```
npm run auction:close
```

### TODO

- add more flexible config
- add automated tests

