import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
// import path from 'path';

// eslint-disable-next-line
export const writeImplementationFile = async (bindings: any, actions: any[]) => {
  let resImpl = ``;
  const actionsView = getActionsName(actions[0]);
  const actionsWrite = getActionsName(actions[1]);

  resImpl = `
  /**
 * This file was automatically generated. Do not modify it, if you encounter any problems \n- please raise an issue: https://github.com/warp-contracts/warp-wasm-templates/issues.
 */\n\n
  import { WriteInteractionOptions, WriteInteractionResponse, Contract, Warp, ArWallet, ContractError, EvaluationOptions } from '../../../../../..';\nimport { ${actionsView} } from './View';\nimport { ${actionsWrite} } from './WriteAction';\nimport { State } from './ContractState';\n\n`;
  resImpl += `
  export interface BaseInput {
    function: string;
  }

  export class ${makeFirstCharUpper(implName)}Contract {
        readonly contract: Contract<State>;

        constructor(contractId: string, warp: Warp) {
          this.contract = warp.contract<State>(contractId);
        }

        connect(wallet: ArWallet) {
          this.contract.connect(wallet);
          return this;
        }

        setEvaluationOptions(evaluationOptions: Partial<EvaluationOptions>) {
          this.contract.setEvaluationOptions(evaluationOptions);
          return this;
        }

        async currentState(): Promise<State> {
          const { cachedValue } = await this.contract.readState();
          return cachedValue.state;
        }

        \n`;
  for (const readObj of actions[0].oneOf) {
    resImpl += generateInteractions(readObj, true);
  }
  for (const writeObj of actions[1].oneOf) {
    resImpl += generateInteractions(writeObj, false);
  }
  resImpl += `}`;
  writeFileSync(join(bindings, `${makeFirstCharUpper(implName)}Contract.ts`), resImpl);
};

const generateInteractions = (functionObj, read: boolean) => {
  const interactionName = functionObj.title;
  const interactionNameUpper = makeFirstCharUpper(interactionName);
  if (read) {
    if (functionObj.title.includes('Result')) {
      return '';
    } else {
      return `async ${interactionName}(${interactionName}: ${interactionNameUpper}): Promise<${interactionNameUpper}Result> {
            const interactionResult = await this.contract.viewState<BaseInput & ${makeFirstCharUpper(
              interactionNameUpper
            )}, ${interactionNameUpper}Result>({ function: '${interactionName}', ...${interactionName} });
            if (interactionResult.type == 'error') {
              throw new ContractError(interactionResult.error);
            } else if (interactionResult.type == 'exception') {
                throw Error(interactionResult.errorMessage);
            }
            return interactionResult.result;
          }\n\n`;
    }
  } else {
    return `async ${interactionName}(
            ${interactionName}: ${interactionNameUpper},
            options?: WriteInteractionOptions
            ): Promise<WriteInteractionResponse | null> {
            return await this.contract.writeInteraction<BaseInput & ${interactionNameUpper}>(
                { function: '${interactionName}', ...${interactionName} },
                options
                );
          }\n\n`;
  }
};

export const interfaceString = (interfaceName: string, properties: string) => {
  return `export interface ${interfaceName}{ ${properties}}\n`;
};

// eslint-disable-next-line
const getFunctionNames = (list: any[]) => {
  const functionNames = [] as string[];
  for (const typeObj of list) {
    const functionName = typeObj.title;
    functionName != 'function' && functionNames.push(functionName.charAt(0).toUpperCase() + functionName.slice(1));
  }
  return functionNames;
};

const getActionsName = (action) => {
  let actionsName = ``;
  let actionsFunctions = [] as string[];
  actionsFunctions = [...actionsFunctions, ...getFunctionNames(action.oneOf || action.anyOf)];
  actionsFunctions.forEach((a) => {
    actionsFunctions.indexOf(a) == actionsFunctions.length - 1 ? (actionsName += a) : (actionsName += `${a}, `);
  });
  return actionsName;
};

// const implName = path.basename(process.cwd());
const implName = 'pst';

const makeFirstCharUpper = (s: string) => {
  return s.charAt(0).toUpperCase() + s.slice(1);
};
