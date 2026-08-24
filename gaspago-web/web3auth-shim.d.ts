// @web3auth/modal's real declarations transitively reach into viem's ABI-parsing
// generics (via its peer dep on viem) and blow past TypeScript's type-instantiation
// depth limit during `next build`'s type check ("Type instantiation is excessively
// deep and possibly infinite" in viem/ox's AbiItem.ts). This app only calls
// Web3Auth's own connect/login surface — never any ABI/contract machinery — so
// typing the module as `any` loses nothing and avoids the crash entirely.
declare module '@web3auth/modal' {
  export const Web3Auth: any
  export const WALLET_CONNECTORS: any
  export const WEB3AUTH_NETWORK: any
}
