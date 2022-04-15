import { getFuzzyRegex, isEqual } from 'src/lib';
import { flatMap, initial, uniqWith } from 'src/lib/nodash';
import {
  ClassMap,
  GlobalsMap, isCallable,
  isClassType,
  isMethodType,
  isParam,
  isProperty,
  isUnionType,
  isVariable,
  TypesInformation,
  Variables,
} from 'src/components/CodeEditor/autocomplete/types';
import type {
  ClassMember,
  FunctionParameter,
  Method,
  Suggestible,
  TypeDefinition,
  Definition,
  UnionType,
  Variable
} from 'src/components/CodeEditor/autocomplete/types';

const typeCache = new Map<string, Definition>();
const memberCache = new Map<Definition, ClassMember[] | undefined>();
const globalNames = Object.keys(GlobalsMap);

function initCache() {
  if (typeCache.size === 0) {
    TypesInformation.forEach((info) => {
      typeCache.set(info.name, info);
    });
  }
}

export function resolveTypeInfo(
  clazz: Suggestible | FunctionParameter | string
): TypeDefinition | undefined {
  initCache();
  let name: string | undefined = undefined;
  if (isClassType(clazz)) {
    return clazz;
  } else if (isCallable(clazz)) {
    name = clazz.returnType;
  } else if (isProperty(clazz) || isParam(clazz) || isVariable(clazz)) {
    name = clazz.typeName;
  } else {
    name = clazz;
  }
  return name ? ClassMap[name] || typeCache.get(name) : undefined;
}

export function getPropType(
  member: Suggestible | UnionType | string,
  prop: string
): TypeDefinition | undefined {
  if (isUnionType(member)) {
    const res = getClazzMember(member, prop);
    if (res) {
      return resolveTypeInfo(res);
    }
  } else if (typeof member === 'string') {
    const type = ClassMap[member] || typeCache.get(member);
    if (type) {
      return type;
    }
  } else {
    const clazz = resolveTypeInfo(member);
    if (clazz) {
      const member = getClazzMember(clazz, prop);
      if (member) {
        return resolveTypeInfo(member);
      }
    }
  }
  return undefined;
}

function getClassMembersBase(currentType: TypeDefinition): ClassMember[] {
  const result: ClassMember[] = [...currentType.fields, ...currentType.methods];
  return result;
}

export function getClazzMethods(currentType: Definition): Method[] {
  const items = getClassMembers(currentType);
  return items.filter((item) => isMethodType(item)) as Method[];
}

export function getClassMembers(currentType: Definition, filter?: string): ClassMember[] {
  let result = memberCache.get(currentType);
  if (!result) {
    if (isUnionType(currentType)) {
      const allItems = flatMap(currentType.types, (clazz) => {
        return getClassMembersBase(clazz);
      });
      // TODO: compute union of extracted methods types
      result = uniqWith(allItems, (typeA, typeB) => isEqual(typeA, typeB));
    } else if (isClassType(currentType)) {
      result = getClassMembersBase(currentType);
    }
    result = result || [];
    memberCache.set(currentType, result);
  }
  if (filter) {
    const regex = getFuzzyRegex(filter);
    return result.filter((member) => regex.test(member.name));
  }
  return result;
}

export function getClazzMember(
  clazz: Definition,
  prop: string
): ClassMember | undefined {
  const members = getClassMembers(clazz) || [];
  return members.find((member) => member.name === prop);
}

export function suggestGlobals(name: string) {
  if (!name) {
    return globalNames.map((name) => GlobalsMap[name]);
  }
  const lower = (name ?? '').toLowerCase();
  const regex = getFuzzyRegex(lower);
  const found = globalNames.filter((item) => regex.test(item)).map((name) => GlobalsMap[name]);
  return found;
}

export function resolveProperty(path: string | string[]): TypeDefinition | null {
  const segments: string[] = Array.isArray(path) ? path : path.split('.');
  const variableName = segments[0];
  const root = Variables[variableName];
  if (root) {
    let parentClazz = resolveTypeInfo(root);
    for (let i = 1; !!parentClazz && i < segments.length; i++) {
      parentClazz = getPropType(parentClazz, segments[i]);
    }
    return parentClazz || null;
  } else {
    return null;
  }
}

export function suggestMembers(property: string): ClassMember[] | null {
  const path = property.split('.');
  const basePath = initial(path);
  const propName = path[path.length - 1];
  const focusedClazz = resolveProperty(basePath);
  if (focusedClazz) {
    return getClassMembers(focusedClazz, propName);
  }
  return null;
}

export function suggestVariables(name: string): Variable[] {
  const lower = (name ?? '').toLowerCase();
  const regex = getFuzzyRegex(lower);
  const keys = Object.keys(Variables);
  return keys.filter((item) => regex.test(item)).map((name) => Variables[name]);
}
