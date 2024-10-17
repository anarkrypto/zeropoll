import { BaseController, BaseState, Store } from "./base-controller";

export const tickInterval = 1000;

export interface ComputedTransactionJSON {
  argsFields: string[];
  argsJSON: string[];
  methodId: string;
  nonce: string;
  sender: string;
  signature: {
    r: string;
    s: string;
  };
}

export interface ComputedBlockJSON {
  txs?: {
    status: boolean;
    statusMessage?: string;
    tx: ComputedTransactionJSON;
  }[];
}

export interface ChainState extends BaseState {
  loading: boolean;
  online: boolean;
  block?: {
    height: string;
  } & ComputedBlockJSON;
}

export interface BlockQueryResponse {
  data: {
    network: {
      unproven?: {
        block: {
          height: string;
        };
      };
    };
    block: ComputedBlockJSON;
  };
}

export class ChainController extends BaseController<ChainState> {
  private interval: NodeJS.Timeout | undefined;

  constructor(store: Store<ChainState>) {
    super(store);
  }

  async loadBlock() {
    this.store.setState({ loading: true });

    try {
      const graphql = process.env.NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL;
      if (graphql === undefined) {
        throw new Error(
          "Environment variable NEXT_PUBLIC_PROTOKIT_GRAPHQL_URL not set, can't execute graphql requests",
        );
      }

      const response = await fetch(graphql, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `
                query {
                network {
                    unproven {
                    block {
                        height
                    }
                    }
                }
                block {
                    txs {
                    status
                    statusMessage
                    tx {
                        argsFields
                        argsJSON
                        methodId
                        nonce
                        sender
                        signature {
                        r
                        s
                        }
                    }
                    }
                }
                }
            `,
        }),
      });

      const { data }: BlockQueryResponse = await response.json();

      const block = data.network.unproven
        ? {
            height: data.network.unproven.block.height,
            ...data.block,
          }
        : undefined;

      this.store.setState({
        block,
        loading: false,
      });
    } catch (error) {
      throw error;
    } finally {
      this.store.setState({ loading: false });
    }
  }

  async start() {
    await this.loadBlock();
    this.interval = setInterval(() => this.loadBlock(), tickInterval);
  }

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }
}
