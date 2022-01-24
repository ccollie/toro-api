// https://github.com/lezer-parser/javascript/blob/main/test/expression.txt
import { Completion, type CompletionContext } from '@codemirror/autocomplete';
import { syntaxTree } from '@codemirror/language';
import { suggestGlobals, suggestMembers } from './utils';
import { Suggestible, isTypeDefinition } from './types';

const completePropertyAfter = ['PropertyName', '.', '?.'];
const dontCompleteIn = [
  'TemplateString',
  'LineComment',
  'BlockComment',
  'VariableDefinition',
  'PropertyDefinition',
];

export function completeFromGlobalScope(context: CompletionContext) {
  const nodeBefore = syntaxTree(context.state).resolveInner(context.pos, -1);
  const { text = '' } = context.matchBefore(/\w*/) || {};

  if (
    completePropertyAfter.includes(nodeBefore.name) &&
    nodeBefore.parent?.name == 'MemberExpression'
  ) {
    const object = nodeBefore.parent.getChild('Expression');
    if (object?.name == 'VariableName') {
      const from = /\./.test(nodeBefore.name) ? nodeBefore.to : nodeBefore.from;
      const variableName = context.state.sliceDoc(object.from, object.to);
      return completeProperties(from, variableName);
    }
  } else if (nodeBefore.name == 'VariableName') {
    return completeVariables(nodeBefore.from, text);
  } else if (context.explicit && !dontCompleteIn.includes(nodeBefore.name)) {
    return completeVariables(context.pos, text);
  }
  return null;
}


function getCompletionType(item: Suggestible): string {
  return isTypeDefinition(item) ? item.name : item.type;
}

function toCompletion(item: Suggestible): Completion {
  return {
    label: item.name,
    type: getCompletionType(item),
    detail: item.description,
  };
}

function completeVariables(from: number, text: string) {
  const items = suggestGlobals(text);
  const options = items.map(toCompletion);
  return {
    from,
    options,
    span: /^[\w$]*$/,
  };
}

function completeProperties(from: number, search: string) {
  const items = suggestMembers(search);
  if (!items?.length) return null;
  const options = items.map(toCompletion);
  return {
    from,
    options,
    span: /^[\w$]*$/,
  };
}
