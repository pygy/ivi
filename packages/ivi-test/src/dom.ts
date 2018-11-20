import { OpNode, render, requestDirtyCheck, withNextFrame } from "ivi";
import { VNodeWrapper } from "./vdom";

/**
 * DOMRenderer is a helper object for testing Virtual DOM in a real DOM.
 */
export class DOMRenderer {
  constructor(private container: HTMLDivElement) { }

  /**
   * reset resets current state.
   */
  reset = () => {
    withNextFrame(() => { render(null, this.container); })();
  }

  /**
   * render renders a VNode in a test container and returns a VNodeWrapper object.
   *
   * @param vnode VNode.
   * @returns VNodeWrapper object.
   */
  render(vnode: OpNode): VNodeWrapper {
    withNextFrame(() => { render(vnode, this.container); })();
    return new VNodeWrapper(vnode, null, {});
  }

  /**
   * dirtyCheck triggers dirty checking.
   */
  dirtyCheck(): void {
    withNextFrame(() => { requestDirtyCheck(); })();
  }
}

/**
 * createDOMRenderer instantiates and initializes DOMRenderer object.
 *
 * @returns DOMRenderer.
 */
export function createDOMRenderer(): DOMRenderer {
  const container = document.createElement("div");
  container.className = "ivi-test-container";
  document.body.appendChild(container);

  return new DOMRenderer(container);
}
