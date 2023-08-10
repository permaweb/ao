import { bundledTxsFilter } from '../../core/modules/impl/ArweaveGatewayInteractionsLoader';
import { GQLEdgeInterface } from '../../legacy/gqlResult';

describe('Bundled transactions filtering', () => {
  it('should properly filter bundled transaction if only "parent" field available', async () => {
    // given
    const tx = {
      node: {
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY',
        parent: {
          id: 'kCdI59JIWPp6VTC9IKbSr9dRVgd1MxLk3z10N3NnUX4'
        }
      }
    };

    // when
    const result = bundledTxsFilter(tx as unknown as GQLEdgeInterface);

    // then
    expect(result).toBeFalsy();
  });

  it('should properly filter bundled transaction if only "bundledIn" field available', async () => {
    // given
    const tx = {
      node: {
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY',
        bundledIn: {
          id: 'kCdI59JIWPp6VTC9IKbSr9dRVgd1MxLk3z10N3NnUX4'
        }
      }
    };

    // when
    const result = bundledTxsFilter(tx as unknown as GQLEdgeInterface);

    // then
    expect(result).toBeFalsy();
  });

  it('should properly filter bundled transaction if both "bundledIn" and "parent" field available', async () => {
    // given
    const tx = {
      node: {
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY',
        bundledIn: {
          id: 'kCdI59JIWPp6VTC9IKbSr9dRVgd1MxLk3z10N3NnUX4'
        },
        parent: {
          id: 'kCdI59JIWPp6VTC9IKbSr9dRVgd1MxLk3z10N3NnUX4'
        }
      }
    };

    // when
    const result = bundledTxsFilter(tx as unknown as GQLEdgeInterface);

    // then
    expect(result).toBeFalsy();
  });

  it('should not filter transaction if "bundledIn" and "parent" not available', async () => {
    // given
    const tx = {
      node: {
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY'
      }
    };

    // when
    const result = bundledTxsFilter(tx as unknown as GQLEdgeInterface);

    // then
    expect(result).toBeTruthy();
  });

  it('should not filter bundled transaction if "parent" field available and no id', async () => {
    // given
    const tx = {
      node: {
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY',
        parent: {}
      }
    };

    // when
    const result = bundledTxsFilter(tx as unknown as GQLEdgeInterface);

    // then
    expect(result).toBeTruthy();
  });

  it('should not filter bundled transaction if "bundledIn" field available and no id', async () => {
    // given
    const tx = {
      node: {
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY',
        bundledIn: {}
      }
    };

    // when
    const result = bundledTxsFilter(tx as unknown as GQLEdgeInterface);

    // then
    expect(result).toBeTruthy();
  });

  it('should not filter bundled transaction if both "bundledIn" and "parent" fields available with no ids', async () => {
    // given
    const tx = {
      node: {
        id: 'DSan2S2AwuyZZwragrI_5L8RiraWjOsgMxaEpiYN2BY',
        parent: {},
        bundledIn: {}
      }
    };

    // when
    const result = bundledTxsFilter(tx as unknown as GQLEdgeInterface);

    // then
    expect(result).toBeTruthy();
  });
});
