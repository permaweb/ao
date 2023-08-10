import { TagsParser } from '../../core/modules/impl/TagsParser';
import { GQLNodeInterface } from '../../legacy/gqlResult';

describe('TagsParser', () => {
  const sut = new TagsParser();

  // the https://github.com/ArweaveTeam/SmartWeave/pull/51/files suite
  describe('for multiple contract interactions in one tx', () => {
    it('should return input tag (1)', () => {
      // given
      const interactionTx = {
        tags: [
          { name: 'foo', value: 'bar' },
          { name: 'wtf', value: 'omg' },
          { name: 'Contract', value: 'contractTxId_1' },
          { name: 'Input', value: 'contractTxId1_value' },
          { name: 'duh', value: 'blah' },
          { name: 'Contract', value: 'contractTxId_2' },
          { name: 'Input', value: 'contractTxId2_value' }
        ]
      };

      // when
      const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
      const input2 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_2');
      const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

      // then
      expect(input1.value).toEqual('contractTxId1_value');
      expect(input2.value).toEqual('contractTxId2_value');
      expect(allContracts).toEqual(
        new Map([
          ['contractTxId_1', { name: 'Input', value: 'contractTxId1_value' }],
          ['contractTxId_2', { name: 'Input', value: 'contractTxId2_value' }]
        ])
      );
    });

    it('should return input tag (2)', () => {
      // given
      const interactionTx = {
        tags: [
          { name: 'Contract', value: 'contractTxId_1' },
          { name: 'Input', value: 'contractTxId11_value' },
          { name: 'Contract', value: 'contractTxId_2' },
          { name: 'Input', value: 'contractTxId22_value' }
        ]
      };

      // when
      const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
      const input2 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_2');
      const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

      // then
      expect(input1.value).toEqual('contractTxId11_value');
      expect(input2.value).toEqual('contractTxId22_value');
      expect(allContracts).toEqual(
        new Map([
          ['contractTxId_1', { name: 'Input', value: 'contractTxId11_value' }],
          ['contractTxId_2', { name: 'Input', value: 'contractTxId22_value' }]
        ])
      );
    });

    it('should return input tag (3)', () => {
      // given
      const interactionTx = {
        tags: [
          { name: 'Contract', value: 'contractTxId_2' },
          { name: 'Input', value: 'contractTxId22_value' },
          { name: 'Contract', value: 'contractTxId_1' },
          { name: 'Input', value: 'contractTxId11_value' },
          { name: 'foo', value: 'bar' },
          { name: 'Contract', value: 'contractTxId_3' },
          { name: 'Input', value: 'contractTxId33_value' },
          { name: 'Contract', value: 'contractTxId_4' },
          { name: 'Input', value: 'contractTxId44_value' }
        ]
      };

      // when
      const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
      const input2 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_2');
      const input3 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_3');
      const input4 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_4');
      const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

      // then
      expect(input1.value).toEqual('contractTxId11_value');
      expect(input2.value).toEqual('contractTxId22_value');
      expect(input3.value).toEqual('contractTxId33_value');
      expect(input4.value).toEqual('contractTxId44_value');
      expect(allContracts).toEqual(
        new Map([
          ['contractTxId_1', { name: 'Input', value: 'contractTxId11_value' }],
          ['contractTxId_2', { name: 'Input', value: 'contractTxId22_value' }],
          ['contractTxId_3', { name: 'Input', value: 'contractTxId33_value' }],
          ['contractTxId_4', { name: 'Input', value: 'contractTxId44_value' }]
        ])
      );
    });

    it('should return undefined if ordering is not proper', () => {
      // given
      const interactionTx = {
        tags: [
          { name: 'Contract', value: 'contractTxId_2' },
          { name: 'foo', value: 'bar' },
          { name: 'Input', value: 'contractTxId22_value' },
          { name: 'Contract', value: 'contractTxId_1' },
          { name: 'bar', value: 'foo' },
          { name: 'Input', value: 'contractTxId11_value' },
          { name: 'Contract', value: 'contractTxId_3' },
          { name: 'Input', value: 'contractTxId33_value' }
        ]
      };

      // when
      const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
      const input2 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_2');
      const input3 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_3');
      const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

      // then
      expect(input1).toBeUndefined();
      expect(input2).toBeUndefined();
      expect(input3.value).toEqual('contractTxId33_value');
      expect(allContracts).toEqual(
        new Map([
          ['contractTxId_1', undefined],
          ['contractTxId_2', undefined],
          ['contractTxId_3', { name: 'Input', value: 'contractTxId33_value' }]
        ])
      );
    });
  });

  // a suite for "traditional" tags format - where not a single fuck is given re. tags order.
  describe('for exactly one interaction in one tx', () => {
    it('should return the first occurrence of the input tag (1)', () => {
      // given
      const interactionTx = {
        tags: [
          { name: 'Contract', value: 'contractTxId_1' },
          { name: 'foo', value: 'bar' },
          { name: 'wtf', value: 'omg' },
          { name: 'duh', value: 'blah' },
          { name: 'Input', value: 'contractTxId1_value' }
        ]
      };

      // when
      const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
      const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

      // then
      expect(input1.value).toEqual('contractTxId1_value');
      expect(allContracts).toEqual(new Map([['contractTxId_1', { name: 'Input', value: 'contractTxId1_value' }]]));
    });
  });

  it('should return the first occurrence of the input tag (2)', () => {
    // given
    const interactionTx = {
      tags: [
        { name: 'Input', value: 'contractTxId1_value' },
        { name: 'foo', value: 'bar' },
        { name: 'duh', value: 'blah' }
      ]
    };

    // when
    const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
    const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

    // then
    expect(input1.value).toEqual('contractTxId1_value');
    expect(allContracts).toEqual(new Map());
  });

  it('should return the first occurrence of the input tag (3)', () => {
    // given
    const interactionTx = {
      tags: [
        { name: 'Input', value: 'contractTxId1_value' },
        { name: 'Input', value: 'contractTxId2_value' },
        { name: 'Input', value: 'contractTxId3_value' }
      ]
    };

    // when
    const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
    const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

    // then
    expect(input1.value).toEqual('contractTxId1_value');
    expect(allContracts).toEqual(new Map());
  });

  it('should return the first occurrence of the input tag (4)', () => {
    // given
    const interactionTx = {
      tags: [
        { name: 'foo', value: 'bar' },
        { name: 'Input', value: 'contractTxId666_value' },
        { name: 'wtf', value: 'omg' },
        { name: 'duh', value: 'blah' },
        { name: 'Contract', value: 'contractTxId_1' }
      ]
    };

    // when
    const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
    const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

    // then
    expect(input1.value).toEqual('contractTxId666_value');
    expect(allContracts).toEqual(new Map([['contractTxId_1', { name: 'Input', value: 'contractTxId666_value' }]]));
  });

  it('should return undefined if no "Input" tag', () => {
    // given
    const interactionTx = {
      tags: [
        { name: 'foo', value: 'bar' },
        { name: 'duh', value: 'blah' },
        { name: 'one', value: 'two' }
      ]
    };

    // when
    const input1 = sut.getInputTag(interactionTx as GQLNodeInterface, 'contractTxId_1');
    const allContracts = sut.getContractsWithInputs(interactionTx as GQLNodeInterface);

    // then
    expect(input1).toBeUndefined();
    expect(allContracts).toEqual(new Map());
  });

  it('should return single interact write contract', () => {
    // given
    const interactionTx = {
      tags: [
        { name: 'foo', value: 'bar' },
        { name: 'duh', value: 'blah' },
        { name: 'Interact-Write', value: 'Contract A' },
        { name: 'one', value: 'two' }
      ]
    };

    // when
    const result = sut.getInteractWritesContracts(interactionTx as GQLNodeInterface);
    // then
    expect(result).toEqual(['Contract A']);
  });

  it('should return multiple interact write contracts', () => {
    // given
    const interactionTx = {
      tags: [
        { name: 'foo', value: 'bar' },
        { name: 'Interact-Write', value: 'Contract C' },
        { name: 'Interact-Write', value: 'Contract D' },
        { name: 'duh', value: 'blah' },
        { name: 'Interact-Write', value: 'Contract A' },
        { name: 'one', value: 'two' },
        { name: 'Interact-Write', value: 'Contract E' }
      ]
    };

    // when
    const result = sut.getInteractWritesContracts(interactionTx as GQLNodeInterface);
    // then
    expect(result).toEqual(['Contract C', 'Contract D', 'Contract A', 'Contract E']);
  });

  it('should return empty interact write contract', () => {
    // given
    const interactionTx = {
      tags: [
        { name: 'foo', value: 'bar' },
        { name: 'duh', value: 'blah' },
        { name: 'one', value: 'two' },
        { name: 'Interact-Writee', value: 'Contract E' }
      ]
    };

    // when
    const result = sut.getInteractWritesContracts(interactionTx as GQLNodeInterface);
    // then
    expect(result).toEqual([]);
  });
});
