"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { Eip1193Provider, ethers } from "ethers";
import { useEip6963 } from "./useEip6963";

interface ProviderConnectInfo {
  readonly chainId: string;
}

interface ProviderRpcError extends Error {
  message: string;
  code: number;
  data?: unknown;
}

type ConnectListenerFn = (connectInfo: ProviderConnectInfo) => void;
type DisconnectListenerFn = (error: ProviderRpcError) => void;
type ChainChangedListenerFn = (chainId: string) => void;
type AccountsChangedListenerFn = (accounts: string[]) => void;

type Eip1193EventMap = {
  connect: ConnectListenerFn;
  chainChanged: ChainChangedListenerFn;
  accountsChanged: AccountsChangedListenerFn;
  disconnect: DisconnectListenerFn;
};

type Eip1193EventFn = <E extends keyof Eip1193EventMap>(
  event: E,
  fn: Eip1193EventMap[E]
) => void;

interface Eip1193ProviderWithEvent extends ethers.Eip1193Provider {
  on?: Eip1193EventFn;
  off?: Eip1193EventFn;
  addListener?: Eip1193EventFn;
  removeListener?: Eip1193EventFn;
}

export interface UseMetaMaskState {
  provider: Eip1193Provider | undefined;
  chainId: number | undefined;
  accounts: string[] | undefined;
  isConnected: boolean;
  error: Error | undefined;
  connect: () => void;
}

function useMetaMaskInternal(): UseMetaMaskState {
  const { error: eip6963Error, providers } = useEip6963();
  const [_currentProvider, _setCurrentProvider] = useState<
    Eip1193ProviderWithEvent | undefined
  >(undefined);
  const [chainId, _setChainId] = useState<number | undefined>(undefined);
  const [accounts, _setAccounts] = useState<string[] | undefined>(undefined);

  const connectListenerRef = useRef<ConnectListenerFn | undefined>(undefined);
  const disconnectListenerRef = useRef<DisconnectListenerFn | undefined>(
    undefined
  );
  const chainChangedListenerRef = useRef<ChainChangedListenerFn | undefined>(
    undefined
  );
  const accountsChangedListenerRef = useRef<
    AccountsChangedListenerFn | undefined
  >(undefined);

  const metaMaskProviderRef = useRef<Eip1193ProviderWithEvent | undefined>(
    undefined
  );

  const hasProvider = Boolean(_currentProvider);
  const hasAccounts = (accounts?.length ?? 0) > 0;
  const hasChain = typeof chainId === "number";

  const isConnected = hasProvider && hasAccounts && hasChain;

  const connect = useCallback(() => {
    if (!_currentProvider) {
      return;
    }

    if (accounts && accounts.length > 0) {
      return;
    }

    _currentProvider.request({ method: "eth_requestAccounts" });
  }, [_currentProvider, accounts]);

  // Restore connection silently using eth_accounts
  useEffect(() => {
    if (typeof window === "undefined") return;

    const restoreConnection = async () => {
      const lastConnectorId = localStorage.getItem("wallet.lastConnectorId");
      const lastChainId = localStorage.getItem("wallet.lastChainId");
      const lastAccounts = localStorage.getItem("wallet.lastAccounts");

      if (!lastConnectorId || !lastAccounts) return;

      try {
        const parsedAccounts = JSON.parse(lastAccounts);
        if (parsedAccounts && parsedAccounts.length > 0) {
          const targetProvider = providers.find(
            (p) => p.info.uuid === lastConnectorId
          );
          if (targetProvider) {
            const accountsArray = await targetProvider.provider.request({
              method: "eth_accounts",
            });
            if (accountsArray && accountsArray.length > 0) {
              _setCurrentProvider(targetProvider.provider);
              if (lastChainId) {
                _setChainId(Number.parseInt(lastChainId, 10));
              }
              _setAccounts(accountsArray);
            }
          }
        }
      } catch (e) {
        console.error("Failed to restore connection:", e);
      }
    };

    restoreConnection();
  }, [providers]);

  useEffect(() => {
    let next: Eip1193ProviderWithEvent | undefined = undefined;
    for (let i = 0; i < providers.length; ++i) {
      if (providers[i].info.name.toLowerCase() === "metamask") {
        next = providers[i].provider;
        break;
      }
    }

    const prev = metaMaskProviderRef.current;
    if (prev === next) {
      return;
    }

    if (prev) {
      if (connectListenerRef.current) {
        prev.off?.("connect", connectListenerRef.current);
        prev.removeListener?.("connect", connectListenerRef.current);
        connectListenerRef.current = undefined;
      }

      if (disconnectListenerRef.current) {
        prev.off?.("disconnect", disconnectListenerRef.current);
        prev.removeListener?.("disconnect", disconnectListenerRef.current);
        disconnectListenerRef.current = undefined;
      }

      if (chainChangedListenerRef.current) {
        prev.off?.("chainChanged", chainChangedListenerRef.current);
        prev.removeListener?.("chainChanged", chainChangedListenerRef.current);
        chainChangedListenerRef.current = undefined;
      }

      if (accountsChangedListenerRef.current) {
        prev.off?.("accountsChanged", accountsChangedListenerRef.current);
        prev.removeListener?.(
          "accountsChanged",
          accountsChangedListenerRef.current
        );
        accountsChangedListenerRef.current = undefined;
      }
    }

    metaMaskProviderRef.current = next;

    let nextConnectListener: ConnectListenerFn | undefined = undefined;
    let nextDisconnectListener: DisconnectListenerFn | undefined = undefined;
    let nextChainChangedListener: ChainChangedListenerFn | undefined =
      undefined;
    let nextAccountsChangedListener: AccountsChangedListenerFn | undefined =
      undefined;

    connectListenerRef.current = undefined;
    disconnectListenerRef.current = undefined;
    chainChangedListenerRef.current = undefined;
    accountsChangedListenerRef.current = undefined;

    if (next) {
      nextConnectListener = (connectInfo: ProviderConnectInfo) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(
          `[useMetaMask] on('connect') chainId=${connectInfo.chainId}`
        );
        _setCurrentProvider(next);
        _setChainId(Number.parseInt(connectInfo.chainId, 16));
      };
      connectListenerRef.current = nextConnectListener;

      nextDisconnectListener = (error: ProviderRpcError) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(`[useMetaMask] on('disconnect') error code=${error.code}`);
        _setCurrentProvider(undefined);
        _setChainId(undefined);
        _setAccounts(undefined);
        // Clear persistence
        localStorage.removeItem("wallet.lastConnectorId");
        localStorage.removeItem("wallet.lastAccounts");
        localStorage.removeItem("wallet.lastChainId");
        localStorage.removeItem("wallet.connected");
      };
      disconnectListenerRef.current = nextDisconnectListener;

      nextChainChangedListener = (chainId: string) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(`[useMetaMask] on('chainChanged') chainId=${chainId}`);
        const chainIdNum = Number.parseInt(chainId, 16);
        _setCurrentProvider(next);
        _setChainId(chainIdNum);
        localStorage.setItem("wallet.lastChainId", chainIdNum.toString());
      };
      chainChangedListenerRef.current = nextChainChangedListener;

      nextAccountsChangedListener = (accounts: string[]) => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }
        console.log(
          `[useMetaMask] on('accountsChanged') accounts.length=${accounts.length}`
        );
        _setCurrentProvider(next);
        _setAccounts(accounts);
        if (accounts && accounts.length > 0) {
          localStorage.setItem("wallet.lastAccounts", JSON.stringify(accounts));
          localStorage.setItem("wallet.connected", "true");
        } else {
          localStorage.removeItem("wallet.lastAccounts");
          localStorage.setItem("wallet.connected", "false");
        }
      };
      accountsChangedListenerRef.current = nextAccountsChangedListener;

      if (next.on) {
        next.on("connect", nextConnectListener);
        next.on("disconnect", nextDisconnectListener);
        next.on("chainChanged", nextChainChangedListener);
        next.on?.("accountsChanged", nextAccountsChangedListener);
      } else {
        next.addListener?.("connect", nextConnectListener);
        next.addListener?.("disconnect", nextDisconnectListener);
        next.addListener?.("chainChanged", nextChainChangedListener);
        next.addListener?.("accountsChanged", nextAccountsChangedListener);
      }

      const updateChainId = async () => {
        if (next !== metaMaskProviderRef.current) {
          return;
        }

        try {
          const [chainIdHex, accountsArray] = await Promise.all([
            next.request({ method: "eth_chainId" }),
            next.request({ method: "eth_accounts" }),
          ]);

          console.log(
            `[useMetaMask] connected to chainId=${chainIdHex} accounts.length=${accountsArray.length}`
          );

          const chainIdNum = Number.parseInt(chainIdHex as string, 16);
          _setCurrentProvider(next);
          _setChainId(chainIdNum);
          _setAccounts(accountsArray as string[]);

          // Persist connection state
          if (accountsArray && (accountsArray as string[]).length > 0) {
            const providerDetail = providers.find((p) => p.provider === next);
            if (providerDetail) {
              localStorage.setItem(
                "wallet.lastConnectorId",
                providerDetail.info.uuid
              );
              localStorage.setItem(
                "wallet.lastAccounts",
                JSON.stringify(accountsArray)
              );
              localStorage.setItem("wallet.lastChainId", chainIdNum.toString());
              localStorage.setItem("wallet.connected", "true");
            }
          }
        } catch {
          console.log(`[useMetaMask] not connected!`);
          _setCurrentProvider(next);
          _setChainId(undefined);
          _setAccounts(undefined);
        }
      };

      updateChainId();
    }
  }, [providers]);

  useEffect(() => {
    return () => {
      const current = metaMaskProviderRef.current;

      if (current) {
        const chainChangedListener = chainChangedListenerRef.current;
        const accountsChangedListener = accountsChangedListenerRef.current;
        const connectListener = connectListenerRef.current;
        const disconnectListener = disconnectListenerRef.current;

        if (connectListener) {
          current.off?.("connect", connectListener);
          current.removeListener?.("connect", connectListener);
        }
        if (disconnectListener) {
          current.off?.("disconnect", disconnectListener);
          current.removeListener?.("disconnect", disconnectListener);
        }
        if (chainChangedListener) {
          current.off?.("chainChanged", chainChangedListener);
          current.removeListener?.("chainChanged", chainChangedListener);
        }
        if (accountsChangedListener) {
          current.off?.("accountsChanged", accountsChangedListener);
          current.removeListener?.("accountsChanged", accountsChangedListener);
        }
      }

      chainChangedListenerRef.current = undefined;
      metaMaskProviderRef.current = undefined;
    };
  }, []);

  return {
    provider: _currentProvider,
    chainId,
    accounts,
    isConnected,
    error: eip6963Error,
    connect,
  };
}

interface MetaMaskProviderProps {
  children: ReactNode;
}

const MetaMaskContext = createContext<UseMetaMaskState | undefined>(undefined);

export const MetaMaskProvider: React.FC<MetaMaskProviderProps> = ({
  children,
}) => {
  const { provider, chainId, accounts, isConnected, error, connect } =
    useMetaMaskInternal();
  return (
    <MetaMaskContext.Provider
      value={{
        provider,
        chainId,
        accounts,
        isConnected,
        error,
        connect,
      }}
    >
      {children}
    </MetaMaskContext.Provider>
  );
};

export function useMetaMask() {
  const context = useContext(MetaMaskContext);
  if (context === undefined) {
    throw new Error("useMetaMask must be used within a MetaMaskProvider");
  }
  return context;
}



