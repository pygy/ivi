import { OpNode, _, component, useDetached, useEffect, useMutationEffect, useLayoutEffect } from "ivi";
import * as h from "ivi-html";
import { startRender, Static, checkLifecycle, lifecycleTouch } from "./utils";

function createLifecycleTester(id: string) {
  return component<OpNode>(
    (c) => {
      lifecycleTouch(id, "constructor");

      const mutation = useMutationEffect(c, () => {
        lifecycleTouch(id, "mutationEffect");
      });

      const layout = useLayoutEffect(c, () => {
        lifecycleTouch(id, "layoutEffect");
      });

      const effect = useEffect(c, () => {
        lifecycleTouch(id, "effect");
      });

      useDetached(c, () => {
        lifecycleTouch(id, "detached");
      });

      return (child) => {
        mutation();
        layout();
        effect();
        lifecycleTouch(id, "render");
        return child;
      };
    },
    (prev, next) => {
      lifecycleTouch(id, "shouldUpdate");
      return true;
    },
  );
}

test(`<C><div></C>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      render(createLifecycleTester("1")(h.div()));

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("1", "mutationEffect")).toBe(2);
      expect(c("1", "layoutEffect")).toBe(3);
      expect(c("1", "effect")).toBe(4);

      expect(c("1", "shouldUpdate")).toBe(-1);
      expect(c("1", "detached")).toBe(-1);
    });
  });
});

test(`<C><div></C> => <div>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      render(createLifecycleTester("1")(h.div()));
      render(h.div());

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("1", "mutationEffect")).toBe(2);
      expect(c("1", "layoutEffect")).toBe(3);
      expect(c("1", "effect")).toBe(4);
      expect(c("1", "detached")).toBe(5);

      expect(c("1", "shouldUpdate")).toBe(-1);
    });
  });
});

test(`<div> => <C><div></C>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      render(h.div());
      render(createLifecycleTester("1")(h.div()));

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("1", "mutationEffect")).toBe(2);
      expect(c("1", "layoutEffect")).toBe(3);
      expect(c("1", "effect")).toBe(4);

      expect(c("1", "shouldUpdate")).toBe(-1);
      expect(c("1", "detached")).toBe(-1);
    });
  });
});

test(`<div></div> => <div><C><div></C></div>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      render(h.div());
      render(h.div(_, _, createLifecycleTester("1")(h.div())));

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("1", "mutationEffect")).toBe(2);
      expect(c("1", "layoutEffect")).toBe(3);
      expect(c("1", "effect")).toBe(4);

      expect(c("1", "shouldUpdate")).toBe(-1);
      expect(c("1", "detached")).toBe(-1);
    });
  });
});

test(`<div><C><div></C></div> => <div></div>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      render(h.div(_, _, createLifecycleTester("1")(h.div())));
      render(h.div());

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("1", "mutationEffect")).toBe(2);
      expect(c("1", "layoutEffect")).toBe(3);
      expect(c("1", "effect")).toBe(4);
      expect(c("1", "detached")).toBe(5);

      expect(c("1", "shouldUpdate")).toBe(-1);
    });
  });
});

test(`<C><C><div></C></C>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      render(createLifecycleTester("1")(createLifecycleTester("2")(h.div())));

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("2", "constructor")).toBe(2);
      expect(c("2", "render")).toBe(3);
      expect(c("1", "mutationEffect")).toBe(4);
      expect(c("2", "mutationEffect")).toBe(5);
      expect(c("1", "layoutEffect")).toBe(6);
      expect(c("2", "layoutEffect")).toBe(7);
      expect(c("1", "effect")).toBe(8);
      expect(c("2", "effect")).toBe(9);

      expect(c("1", "shouldUpdate")).toBe(-1);
      expect(c("1", "detached")).toBe(-1);

      expect(c("2", "shouldUpdate")).toBe(-1);
      expect(c("2", "detached")).toBe(-1);
    });
  });
});

test(`<C><C><div></C></C> => <div>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      render(createLifecycleTester("1")(createLifecycleTester("2")(h.div())));
      render(h.div());

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("2", "constructor")).toBe(2);
      expect(c("2", "render")).toBe(3);
      expect(c("1", "mutationEffect")).toBe(4);
      expect(c("2", "mutationEffect")).toBe(5);
      expect(c("1", "layoutEffect")).toBe(6);
      expect(c("2", "layoutEffect")).toBe(7);
      expect(c("1", "effect")).toBe(8);
      expect(c("2", "effect")).toBe(9);
      expect(c("2", "detached")).toBe(10);
      expect(c("1", "detached")).toBe(11);

      expect(c("1", "shouldUpdate")).toBe(-1);

      expect(c("2", "shouldUpdate")).toBe(-1);
    });
  });
});

test(`<C><div></C> => <C><div></C>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      const lc = createLifecycleTester("1");
      render(lc(h.div()));
      render(lc(h.div()));

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "mutationEffect")).toBe(2);
      expect(c("1", "layoutEffect")).toBe(3);
      expect(c("1", "effect")).toBe(4);
      expect(c("1", "shouldUpdate")).toBe(5);
      expect(c("1", "render")).toBe(6); // 1

      expect(c("1", "render", false)).toBe(1);

      expect(c("1", "detached")).toBe(-1);
    });
  });
});

test(`<S><C><div></C></S> => <S><C><div></C></S>`, () => {
  startRender(render => {
    checkLifecycle(c => {
      const lc = createLifecycleTester("1");
      render(Static(lc(h.div())));
      render(Static(lc(h.div())));

      expect(c("1", "constructor")).toBe(0);
      expect(c("1", "render")).toBe(1);
      expect(c("1", "mutationEffect")).toBe(2);
      expect(c("1", "layoutEffect")).toBe(3);
      expect(c("1", "effect")).toBe(4);

      expect(c("1", "shouldUpdate")).toBe(-1);

      expect(c("1", "detached")).toBe(-1);
    });
  });
});
