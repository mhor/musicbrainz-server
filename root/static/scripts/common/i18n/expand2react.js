/*
 * @flow
 * Copyright (C) 2018 MetaBrainz Foundation
 *
 * This file is part of MusicBrainz, the open internet music database,
 * and is licensed under the GPL version 2, or (at your option) any
 * later version: http://www.gnu.org/licenses/gpl-2.0.txt
 */

import he from 'he';
import * as React from 'react';

import expand, {
  accept,
  createCondSubstParser,
  createTextContentParser,
  createVarSubstParser,
  error,
  getString,
  gotMatch,
  hasArg,
  NO_MATCH_VALUE,
  parseContinuous,
  parseContinuousString,
  parseStringVarSubst,
  saveMatch,
  state,
  substEnd,
  type NO_MATCH,
  type Parser,
  type VarArgs,
} from './expand2';

export type Input = VarSubstArg | AnchorProps;
export type Output = string | AnyReactElem;

const EMPTY_ARRAY: Array<any> = Object.freeze([]);

const textContent = /^[^<>{}]+/;
const condSubstThenTextContent = /^[^<>{}|]+/;
const percentSign = /(%)/;
const linkSubstStart = /^\{([0-9A-z_]+)\|/;
const htmlTagStart = /^<(?=[a-z])/;
const htmlTagName = /^(a|abbr|b|br|code|em|li|span|strong|ul)(?=[\s\/>])/;
const htmlTagEnd = /^>/;
const htmlSelfClosingTagEnd = /^\s*\/>/;
const htmlAttrStart = /^\s+(?=[a-z])/;
const htmlAttrName = /^(class|href|id|key|target|title)="/;
const htmlAttrTextContent = /^[^{}"]+/;
const hrefValueStart = /^(?:\/|https?:\/\/)/;

function handleTextContentText(text: string) {
  if (typeof state.replacement === 'string') {
    text = text.replace(/%/g, he.encode(state.replacement));
  }
  return he.decode(text);
}

function handleTextContentReact(text: string) {
  const replacement = state.replacement;
  if (gotMatch(replacement) && percentSign.test(text)) {
    const parts = text.split(percentSign);
    const result: Array<Output> = [];
    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      if (part === '%') {
        result.push(replacement);
      } else {
        result.push(he.decode(part));
      }
    }
    return result;
  } else {
    return he.decode(text);
  }
}

const parseRootTextContent = createTextContentParser<Output, VarSubstArg>(
  textContent,
  handleTextContentReact,
);

export function getVarSubstArg(x: mixed): Output {
  if (React.isValidElement(x)) {
    return ((x: any): AnyReactElem);
  }
  return getString(x);
}

const parseVarSubst = createVarSubstParser<Output, Input>(
  getVarSubstArg,
);

const parseLinkSubst = saveMatch<
  React.Element<'a'> | string | NO_MATCH,
  Input,
>(function (args) {
  const name = accept(linkSubstStart);
  if (typeof name !== 'string') {
    return NO_MATCH_VALUE;
  }
  const children = parseRoot(args);
  if (!gotMatch(accept(substEnd))) {
    throw error('expected }');
  }
  if (args && hasArg(args, name)) {
    let props = args[name];
    if (typeof props === 'string') {
      props = ({href: props}: AnchorProps);
    }
    if (!props || typeof props === 'number' || !props.href) {
      throw error('bad link props');
    }
    return React.createElement('a', props, ...children);
  }
  return state.match;
});

function pushChild<-T>(
  children: Array<T>,
  match: T,
): Array<T> {
  const lastIndex = children.length - 1;
  if (lastIndex >= 0 &&
      typeof match === 'string' &&
      typeof children[lastIndex] === 'string') {
    children[lastIndex] += match;
  } else {
    children.push(match);
  }
  return children;
}

function concatArrayMatch<-T>(
  children: Array<T> | NO_MATCH,
  match: Array<T> | T,
): Array<T> {
  if (!gotMatch(children)) {
    children = [];
  }
  if (Array.isArray(match)) {
    for (let j = 0; j < match.length; j++) {
      pushChild(children, match[j]);
    }
  } else {
    pushChild(children, match);
  }
  return children;
}

function parseContinuousArray<-T, -V>(
  parsers: $ReadOnlyArray<Parser<Array<T> | T | NO_MATCH, V>>,
  args: ?VarArgs<V>,
): $ReadOnlyArray<T> {
  return parseContinuous<Array<T> | T, Array<T>, V>(
    parsers,
    args,
    concatArrayMatch,
    EMPTY_ARRAY,
  );
}

const parseHtmlAttrValue = args => (
  parseContinuousString(htmlAttrValueParsers, args)
);

const parseHtmlAttrValueCondSubst =
  createCondSubstParser<string, StrOrNum>(
    args => parseContinuousString(htmlAttrCondSubstThenParsers, args),
    args => parseContinuousString(htmlAttrCondSubstElseParsers, args),
  );

const htmlAttrCondSubstThenParsers = [
  createTextContentParser<string, StrOrNum>(
    condSubstThenTextContent,
    handleTextContentText,
  ),
  parseStringVarSubst,
  parseHtmlAttrValueCondSubst,
];

const htmlAttrCondSubstElseParsers = [
  parseRootTextContent,
  parseStringVarSubst,
  parseHtmlAttrValueCondSubst,
];

const htmlAttrValueParsers = [
  createTextContentParser<string, StrOrNum>(
    htmlAttrTextContent,
    handleTextContentText,
  ),
  parseStringVarSubst,
  parseHtmlAttrValueCondSubst,
];

function parseHtmlAttr(args) {
  if (!gotMatch(accept(htmlAttrStart))) {
    return NO_MATCH_VALUE;
  }

  let name = accept(htmlAttrName);
  if (typeof name !== 'string') {
    throw error('bad HTML attribute');
  }

  if (name === 'class') {
    name = 'className';
  }

  const value = parseHtmlAttrValue(args);

  if (!gotMatch(accept(/^"/))) {
    throw error('expected "');
  }

  if (name === 'href' && !hrefValueStart.test(value)) {
    throw error('bad href value');
  }

  return {[name]: value};
}

const htmlAttrParsers = [parseHtmlAttr];

function parseHtmlTag(args) {
  if (!gotMatch(accept(htmlTagStart))) {
    return NO_MATCH_VALUE;
  }

  const name = accept(htmlTagName);
  if (typeof name !== 'string') {
    throw error('bad HTML tag');
  }

  type HtmlAttr = {[string]: string};

  const attributes = parseContinuousArray<HtmlAttr, Array<HtmlAttr>, Input>(
    htmlAttrParsers,
    args,
  );

  if (gotMatch(accept(htmlSelfClosingTagEnd))) {
    // Self-closing tag
    return React.createElement(
      name,
      Object.assign({}, ...attributes),
    );
  }

  if (!gotMatch(accept(htmlTagEnd))) {
    throw error('expected >');
  }

  const children = parseRoot(args);

  if (!gotMatch(accept(new RegExp('^</' + name + '>')))) {
    throw error('expected </' + name + '>');
  }

  return React.createElement(
    name,
    Object.assign({}, ...attributes),
    ...children,
  );
}

const parseCondSubst = createCondSubstParser<$ReadOnlyArray<Output>, Input>(
  args => parseContinuousArray(condSubstThenParsers, args),
  args => parseContinuousArray(condSubstElseParsers, args),
);

const condSubstThenParsers = [
  createTextContentParser<Output, VarSubstArg>(
    condSubstThenTextContent,
    handleTextContentReact,
  ),
  parseVarSubst,
  parseLinkSubst,
  parseCondSubst,
  parseHtmlTag,
];

const condSubstElseParsers = [
  parseRootTextContent,
  parseVarSubst,
  parseLinkSubst,
  parseCondSubst,
  parseHtmlTag,
];

const rootParsers = [
  parseRootTextContent,
  parseVarSubst,
  parseLinkSubst,
  parseCondSubst,
  parseHtmlTag,
];

const parseRoot = args => parseContinuousArray(rootParsers, args);

/*
 * `expand2react` takes a translated string and
 *  (1) interpolates values (React nodes) into it,
 *  (2) converts HTML to React elements.
 *
 * The output is intended for use with React, so the result is a valid
 * React node (a string, a React element, or null).
 *
 * A (safe) subset of HTML is supported, in addition to the variable
 * substitution syntax. In order to display a character reserved by
 * either syntax, HTML character entities must be used.
 */
export default function expand2react(
  source: string,
  args?: ?{+[string]: Input},
) {
  const result = expand<$ReadOnlyArray<Output>, Input>(
    parseRoot,
    source,
    args,
  );
  if (typeof result === 'string') {
    return result;
  }
  return result.length ? (
    result.length > 1
      ? React.createElement(React.Fragment, null, ...result)
      : result[0]
  ) : '';
}
