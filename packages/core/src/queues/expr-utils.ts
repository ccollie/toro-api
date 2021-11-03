import jsep from 'jsep';
import fnv from 'fnv-plus';
import { KeywordValueFn, ValueKeyword, parse } from '@alpen/shared';

export type FilterMeta = {
    expr: jsep.Expression;
    filter: string;
    hash: string;
    globals: Record<string, any> | undefined;
};

export const KeywordValues: Record<ValueKeyword, KeywordValueFn> = {
    $NOW: () => Date.now(),
};

type AnyExpression = jsep.ArrayExpression
    | jsep.BinaryExpression
    | jsep.MemberExpression
    | jsep.CallExpression
    | jsep.ConditionalExpression
    | jsep.Identifier
    | jsep.Literal
    | jsep.ThisExpression
    | jsep.UnaryExpression;

export function getExpressionHash(expr: string): string {
    return fnv.hash(expr).hex();
}

export function compileFilter(filter: string): FilterMeta {
    const expr = parse(filter);
    const hash = getExpressionHash(filter);
    const uniqIds: Set<string> = new Set<string>();
    const idNodes = collectIdentifierNodes(expr);

    idNodes.forEach(x => uniqIds.add(x.name));
    const _globs = Array.from(uniqIds);

   return {
       expr,
       filter,
       hash,
       get globals(): Record<string, any> | undefined {
           if (!_globs.length) return undefined;
            const res = {};
            _globs.forEach(name => {
                const fn = KeywordValues[name];
                if (fn) res[name] = fn();
            })
            return res;
       }
    };
}

function evalCollectIdentifiers(_node: jsep.Expression, context: object, result: jsep.Identifier[]) {

    function evaluateArray(list, context) {
        return list.map((v) => evalCollectIdentifiers(v, context, result));
    }

    function evaluateMember(node: jsep.MemberExpression, context: object) {
        const object = evalCollectIdentifiers(node.object, context, result);
        let key: string;
        if (node.computed) {
            key = evalCollectIdentifiers(node.property, context, result);
        } else {
            key = (node.property as jsep.Identifier).name;
        }
        return [object, object[key]];
    }

    const node = _node as AnyExpression;
    switch (node.type) {

        case 'ArrayExpression':
            return evaluateArray(node.elements, context);

        case 'BinaryExpression':
            evalCollectIdentifiers(node.left, context, result);
            evalCollectIdentifiers(node.right, context, result);
            return

        case 'CallExpression':
            if (node.callee.type === 'MemberExpression') {
                evaluateMember(node.callee as jsep.MemberExpression, context);
            } else {
                evalCollectIdentifiers(node.callee, context, result);
            }
            return evaluateArray(node.arguments, context);

        case 'ConditionalExpression':
            evalCollectIdentifiers(node.test, context, result);
            evalCollectIdentifiers(node.consequent, context, result);
            evalCollectIdentifiers(node.alternate, context, result);
            return '';

        case 'Identifier':
            return context[node.name];

        case 'Literal':
            return node.value;

        case 'MemberExpression':
            return evaluateMember(node, context)[1];

        case 'ThisExpression':
            return context;

        case 'UnaryExpression':
            return evalCollectIdentifiers(node.argument, context, result);

        default:
            return undefined;
    }
}

export function collectIdentifierNodes(node: jsep.Expression): jsep.Identifier[] {
    let result: jsep.Identifier[] = [];
    evalCollectIdentifiers(node, {}, result);
    return result;
}
