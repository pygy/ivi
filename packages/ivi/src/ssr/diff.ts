/**
 * **EXPERIMENTAL** diff/patch server-side renderer.
 *
 * TODO:
 * - replace lis-based keyed algo with simple hashmap algo
 */
import { Op, OpArray, OpNode, OpData, ContextData, Key, EventsData, ElementData } from "../vdom/operations";
import { OpState, createStateNode } from "../vdom/state";
import { NodeFlags } from "../vdom/node_flags";
import { ComponentHooks, ComponentDescriptor, StatelessComponentDescriptor } from "../vdom/component";
import { setContext, restoreContext, context } from "../vdom/context";

export interface RootSSR {
  state: OpState | null;
}

export function renderSSR(op: Op): RootSSR {
  return { state: _render(op) };
}

export function updateSSR(root: RootSSR, next: Op): void {
  root.state = _update(root.state, next);
}

export function dirtyCheckSSR(root: RootSSR): void {
  if (root.state !== null) {
    _dirtyCheck(root.state);
  }
}

let _deepStateFlags!: NodeFlags;
let _dirtyContext!: boolean;

export function _resetState(): void {
  _deepStateFlags = 0;
  _dirtyContext = false;
}

function _pushDeepState(): NodeFlags {
  const s = _deepStateFlags;
  _deepStateFlags = 0;
  return s;
}

function _popDeepState(prev: NodeFlags, current: NodeFlags): NodeFlags {
  const r = current | _deepStateFlags;
  _deepStateFlags |= prev;
  return r;
}

function _renderText(opState: OpState, op: string | number) {
  opState.f = NodeFlags.Text;
}

function _dirtyCheck(opState: OpState): void {
  const { f, c } = opState;
  let state;
  let deepState;
  let i;

  if ((f & NodeFlags.Component) !== 0) {
    state = opState.s as ComponentHooks;
    deepState = _pushDeepState();
    if (
      ((f & NodeFlags.Stateful) !== 0) && (
        ((f & NodeFlags.Dirty) !== 0) ||
        (state.s !== null && state.s() === true)
      )
    ) {
      opState.c = _update(
        c as OpState,
        state.r!((opState.o as OpNode).d),
      );
    } else if ((f & NodeFlags.DeepStateDirtyCheck) !== 0) {
      _dirtyCheck(c as OpState);
    }
    opState.f = (opState.f & NodeFlags.SelfFlags) | _deepStateFlags;
    _deepStateFlags |= deepState | ((opState.f & NodeFlags.DeepStateFlags) << NodeFlags.DeepStateShift);
  } else if ((f & NodeFlags.DeepStateDirtyCheck) !== 0) {
    deepState = _pushDeepState();
    if ((f & (NodeFlags.Element | NodeFlags.Text)) !== 0) {
      state = opState.s as Node;
      if (c !== null) {
        _dirtyCheck(c as OpState);
      }
    } else if ((f & (NodeFlags.Fragment | NodeFlags.TrackByKey)) !== 0) {
      i = (c as Array<OpState | null>).length;
      while (i > 0) {
        if ((state = (c as Array<OpState | null>)[--i]) !== null) {
          _dirtyCheck(state);
        }
      }
    } else if ((f & NodeFlags.Events) !== 0) {
      _dirtyCheck(opState.c as OpState);
    } else { // Context
      if (_dirtyContext === true) {
        opState.s = { ...context(), ...(opState.o as OpNode<ContextData>).d.v };
      }
      const prevContext = setContext(opState.s as {});
      _dirtyCheck(opState.c as OpState);
      restoreContext(prevContext);
    }
    opState.f = _popDeepState(deepState, opState.f);
  }
}

function _renderObject(opState: OpState, op: OpNode): void {
  const { t, d } = op;
  const flags = t.f;
  let deepStateFlags;
  let prevState;
  let value;

  if ((flags & NodeFlags.Component) !== 0) {
    deepStateFlags = _pushDeepState();
    if ((flags & NodeFlags.Stateful) !== 0) {
      opState.s = prevState = { r: null, s: null, u: null } as ComponentHooks;
      // Reusing value variable.
      (prevState as ComponentHooks).r = value = (op.t.d as ComponentDescriptor).c(opState);
    } else {
      value = (op.t.d as StatelessComponentDescriptor).c;
    }
    opState.c = _render(value(d));
    opState.f = (opState.f & NodeFlags.SelfFlags) | flags | _deepStateFlags;
    _deepStateFlags |= deepStateFlags | ((opState.f & NodeFlags.DeepStateFlags) << NodeFlags.DeepStateShift);
  } else {
    deepStateFlags = _pushDeepState();
    if ((flags & NodeFlags.Element) !== 0) {
      value = d.c;
      if (value !== null) {
        opState.c = _render(value);
      }
    } else if ((flags & (NodeFlags.Events | NodeFlags.Context)) !== 0) {
      if ((flags & NodeFlags.Context) !== 0) {
        prevState = setContext(
          opState.s = { ...context(), ...(d as OpData<ContextData>).v },
        );
        opState.c = _render((d as OpData<ContextData>).c);
        restoreContext(prevState);
      } else {
        opState.c = _render((d as OpData<ContextData>).c);
      }
    } else { // ((opFlags & NodeFlags.TrackByKey) !== 0)
      let i = (d as Key<any, OpNode>[]).length;
      opState.c = value = Array(i);
      while (i > 0) {
        value[--i] = _render((d as Key<any, OpNode>[])[i].v);
      }
    }
    opState.f = _popDeepState(deepStateFlags, flags);
  }
}

function _renderFragment(opState: OpState, childrenOps: OpArray): void {
  let i = childrenOps.length;
  const newChildren = Array(i);
  const deepStateFlags = _pushDeepState();
  while (i > 0) {
    newChildren[--i] = _render(childrenOps[i]);
  }
  opState.c = newChildren;
  opState.f = _popDeepState(deepStateFlags, NodeFlags.Fragment);
}

function _render(op: Op): OpState | null {
  if (op !== null) {
    const stateNode = createStateNode(op);
    if (typeof op === "object") {
      if (op instanceof Array) {
        _renderFragment(stateNode, op);
      } else {
        _renderObject(stateNode, op);
      }
    } else {
      _renderText(stateNode, op);
    }
    return stateNode;
  }
  return null;
}

function _hasDifferentType(
  a: OpNode | OpArray,
  b: OpNode | OpArray | string | number,
): boolean {
  if (typeof b !== "object") {
    return true;
  }
  if (a instanceof Array) {
    return !(b instanceof Array);
  }
  return (b instanceof Array || a.t !== b.t);
}

function _update(opState: OpState | null, nextOp: Op): OpState | null {
  if (nextOp === null) {
    // if (opState !== null) {
    //   _destroy(opState);
    // }
    return null;
  }
  if (opState === null) {
    return _render(nextOp);
  }
  const { o } = opState;
  let flags = opState.f;

  if ((flags & NodeFlags.Text) !== 0) {
    if (typeof nextOp !== "object") {
      // Reassign to reduce memory consumption even if nextOp is strictly equal to the prev op.
      opState.o = nextOp;
    } else {
      return _render(nextOp);
    }
  } else {
    // Here we don't need to reassign nextOp because op should always be an object, and strict equality will guarantee
    // that this object is occupying the same memory region.
    if (o === nextOp) {
      _dirtyCheck(opState);
      return opState;
    }
    if (_hasDifferentType(o as OpNode | OpArray, nextOp) === true) {
      // _destroy(opState);
      return _render(nextOp);
    }
    opState.o = nextOp;
    const opStateChildren = opState.c;
    let deepStateFlags;
    let prevData;
    let nextData;
    let nextValue;

    if ((flags & NodeFlags.Component) !== 0) {
      prevData = (o as OpNode).d;
      nextData = (nextOp as OpNode).d;
      const descriptor = ((nextOp as OpNode).t.d as StatelessComponentDescriptor | ComponentDescriptor);
      if (
        ((flags & NodeFlags.Dirty) !== 0) ||
        (
          (prevData !== nextData) &&
          (descriptor.su === void 0 || descriptor.su(prevData, nextData) === true)
        )
      ) {
        deepStateFlags = _pushDeepState();
        opState.c = _update(
          opStateChildren as OpState,
          ((flags & NodeFlags.Stateful) !== 0) ?
            (opState.s as ComponentHooks).r!(nextData) :
            (descriptor as StatelessComponentDescriptor).c(nextData),
        );
        // opState.f can be changed after `_update()`.
        flags = opState.f;
        opState.f = (flags & NodeFlags.SelfFlags) | _deepStateFlags;
        _deepStateFlags |= deepStateFlags | ((flags & NodeFlags.DeepStateFlags) << NodeFlags.DeepStateShift);
      } else {
        _dirtyCheck(opState);
      }
    } else {
      deepStateFlags = _pushDeepState();
      if ((flags & NodeFlags.Element) !== 0) {
        prevData = (o as OpNode<ElementData>).d;
        nextData = (nextOp as OpNode<ElementData>).d;

        nextValue = nextData.c;
        if (prevData.c !== nextValue) {
          opState.c = _update(opStateChildren as OpState, nextValue);
        }
      } else if ((flags & (NodeFlags.Fragment | NodeFlags.TrackByKey)) !== 0) {
        if ((flags & NodeFlags.Fragment) !== 0) {
          let i = (nextOp as OpArray).length;
          // When there is a different length for statically positioned elements, it is much more likely that internal
          // elements should have a different internal state, so it is better to destroy previous state and instantiate
          // a new one. This heuristics is slightly different from React, but it should be better at handling some
          // use cases.
          if ((opStateChildren as Array<OpState | null>).length === i) {
            while (i > 0) {
              (opStateChildren as Array<OpState | null>)[--i] =
                _update(
                  (opStateChildren as Array<OpState | null>)[i],
                  (nextOp as OpArray)[i],
                );
            }
          } else {
            // _destroy(opState);
            _renderFragment(opState, nextOp as OpArray);
          }
        } else {
          _updateChildrenTrackByKeys(
            opState,
            (o as OpNode).d,
            (nextOp as OpNode).d,
          );
        }
      } else if ((flags & NodeFlags.Events) !== 0) {
        opState.c = _update(
          opStateChildren as OpState,
          (nextOp as OpNode<EventsData>).d.c,
        );
      } else { // if ((stateFlags & NodeFlags.Context) !== 0) {
        const dirtyContext = _dirtyContext;
        nextData = (nextOp as OpNode<ContextData>).d;
        nextValue = nextData.v;
        if ((o as OpNode<ContextData>).d.v !== nextValue || _dirtyContext === true) {
          opState.s = { ...context(), ...nextValue };
          _dirtyContext = true;
        }
        // reusing variable name, it is actually a previous value in the context stack.
        nextValue = setContext(opState.s as {});
        _update(opStateChildren as OpState, nextData.c);
        restoreContext(nextValue);
        _dirtyContext = dirtyContext;
      }
      opState.f = _popDeepState(deepStateFlags, opState.f);
    }
  }

  return opState;
}

function _updateChildrenTrackByKeys(
  opState: OpState,
  a: Key<any, OpNode>[],
  b: Key<any, OpNode>[],
): void {
  let i = b.length;
  let j: number | undefined = a.length;
  const result = Array(i);

  if (i === 0) { // New children list is empty.
    if (j > 0) { // Unmount nodes from the old children list.
      // _destroy(opState);
    }
  } else if (j === 0) { // Old children list is empty.
    while (i > 0) { // Mount nodes from the new children list.
      result[--i] = _render(b[i].v);
    }
  } else {
    const opStateChildren = opState.c as Array<OpState | null>;
    let aEnd = j - 1; // a.length - 1
    let bEnd = i - 1; // b.length - 1
    let start = 0;
    let node: OpNode | Key<any, OpNode> | OpState | null = b[bEnd];

    // Step 1
    outer: while (true) {
      // Update nodes with the same key at the end.
      while (a[aEnd].k === node.k) {
        result[bEnd] = _update(opStateChildren[aEnd--], node.v);
        if (start > --bEnd || start > aEnd) {
          break outer;
        }
        node = b[bEnd];
      }

      // Update nodes with the same key at the beginning.
      while (a[start].k === b[start].k) {
        // delayed update (all updates should be performed from right-to-left).
        if (++start > aEnd || start > bEnd) {
          break outer;
        }
      }

      break;
    }

    if (start > aEnd) {
      // All nodes from `a` are updated, insert the rest from `b`.
      while (bEnd >= start) {
        result[bEnd] = _render(b[bEnd--].v);
      }
    } else if (start > bEnd) {
      // All nodes from `b` are updated, remove the rest from `a`.
      // i = start;
      // do {
      //   if ((node = opStateChildren[i++]) !== null) {
      //     _destroy(parentElement, node, false);
      //   }
      // } while (i <= aEnd);
    } else { // Step 2
      // When `pos === -1`, it means that one of the nodes is in the wrong position and we should rearrange nodes with
      // lis-based algorithm.
      let pos = 0;
      // Number of updated nodes after prefix/suffix phase. It is used for an optimization that removes all child nodes
      // with `textContent=""` when there are no updated nodes.
      let updated = 0;

      const aLength = aEnd - start + 1;
      const bLength = bEnd - start + 1;
      const sources = Array(bLength); // Maps positions in the new children list to positions in the old children list.
      const keyIndex = new Map<any, number>(); // Maps keys to their positions in the new children list.
      for (i = 0; i < bLength; ++i) {
        j = i + start;
        sources[i] = -1; // Special value `-1` indicates that node doesn't exist in the old children list.
        keyIndex.set(b[j].k, j);
      }

      for (i = start; i <= aEnd && updated < bLength; ++i) {
        j = keyIndex.get(a[i].k);
        if (j !== void 0) {
          pos = (j < pos) ? j : -1;
          ++updated;
          sources[j - start] = i;
          result[j] = opStateChildren[i];
          // remove updated nodes from previous array, so that we could remove the rest from the document.
          opStateChildren[i] = null;
        }
      }

      if (aLength === a.length && updated === 0) {
        // Zero updated nodes in step 1 and 2, remove all nodes and insert new ones.
        // _remove(opState);
        while (bEnd >= 0) {
          result[bEnd] = _render(b[bEnd--].v);
        }
      } else {
        // Step 3
        // Remove nodes that weren't updated in the old children list.
        // for (i = start; i <= aEnd; i++) {
        //   if ((node = opStateChildren[i]) !== null) {
        //     _remove(node);
        //   }
        // }

        i = bLength;
        if (pos !== -1) {
          while (i > 0) {
            pos = --i + start;
            node = b[pos].v;
            result[pos] = (sources[i] === -1) ?
              _render(node) :
              _update(result[pos], node);
          }
        } else {
          const seq = lis(sources);
          j = seq.length - 1;
          while (i > 0) {
            pos = --i + start;
            node = b[pos].v;
            if (sources[i] === -1) {
              result[pos] = _render(node);
            } else {
              result[pos] = _update(result[pos], node);
            }
          }
        }
      }
    }

    // update nodes from Step 1 (prefix only)
    while (start > 0) {
      result[--start] = _update(opStateChildren[start], b[start].v);
    }
  }
  opState.c = result;
}

function lis(a: number[]): number[] {
  const p = a.slice();
  // result is instantiated as an empty array to prevent instantiation with CoW backing store.
  const result: number[] = [];
  let n = 0;
  let i = 0;
  let u: number;
  let v: number;
  let j: number;

  result[0] = 0;
  for (; i < a.length; ++i) {
    const k = a[i];
    if (k > -1) {
      j = result[n];
      if (a[j] < k) {
        p[i] = j;
        result[++n] = i;
      } else {
        u = 0;
        v = n;

        while (u < v) {
          j = (u + v) >> 1;
          if (a[result[j]] < k) {
            u = j + 1;
          } else {
            v = j;
          }
        }

        if (k < a[result[u]]) {
          if (u > 0) {
            p[i] = result[u - 1];
          }
          result[u] = i;
        }
      }
    }
  }

  v = result[n];

  while (n >= 0) {
    result[n--] = v;
    v = p[v];
  }

  return result;
}
