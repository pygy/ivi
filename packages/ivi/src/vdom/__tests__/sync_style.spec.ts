import { _ } from "ivi";
import * as h from "ivi-html";
import { startRender } from "./utils";

describe(`sync element style`, () => {
  test(`{} => null`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, { style: {} }));
      const n = r(h.div());

      expect(n.style.length).toBe(0);
    });
  });

  test(`undefined => {}`, () => {
    startRender<HTMLElement>(r => {
      r(h.div());
      const n = r(h.div(_, { style: {} }));

      expect(n.style.length).toBe(0);
    });
  });

  test(`{} => {}`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, { style: {} }));
      const n = r(h.div(_, { style: {} }));

      expect(n.style.length).toBe(0);
    });
  });

  test(`undefined => { top: "10px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div());
      const n = r(h.div(_, { style: { top: "10px" } }));

      expect(n.style.length).toBe(1);
      expect(n.style.getPropertyValue("top")).toBe("10px");
    });
  });

  test(`{} => { top: "10px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, { style: {} }));
      const n = r(h.div(_, { style: { top: "10px" } }));

      expect(n.style.length).toBe(1);
      expect(n.style.getPropertyValue("top")).toBe("10px");
    });
  });

  test(`{ top: "10px" } => { top: undefined }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, { style: { top: "10px" } }));
      const n = r(h.div(_, { style: { top: undefined } }));

      expect(n.style.length).toBe(0);
    });
  });

  test(`{ top: "10px" } => { top: "10px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, { style: { top: "10px" } }));
      const n = r(h.div(_, { style: { top: "10px" } }));

      expect(n.style.length).toBe(1);
      expect(n.style.getPropertyValue("top")).toBe("10px");
    });
  });

  test(`undefined => { top: "10px", left: "20px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div());
      const n = r(h.div(_, {
        style: {
          top: "10px",
          left: "20px",
        },
      }));

      expect(n.style.length).toBe(2);
      expect(n.style.getPropertyValue("top")).toBe("10px");
      expect(n.style.getPropertyValue("left")).toBe("20px");
    });
  });

  test(`{ top: "1px" } => undefined`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, {
        style: { top: "1px" },
      }));
      const n = r(h.div());

      expect(n.style.length).toBe(1);
      expect(n.style.getPropertyValue("top")).toBe("1px");
    });
  });

  test(`{ top: "1px", left: "1px" } => undefined`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, {
        style: {
          top: "1px",
          left: "1px",
        },
      }));
      const n = r(h.div());

      expect(n.style.length).toBe(2);
      expect(n.style.getPropertyValue("top")).toBe("1px");
      expect(n.style.getPropertyValue("left")).toBe("1px");
    });
  });

  test(`{ top: "1px" } => { top: "10px", left: "20px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, { style: { top: "1px" } }));
      const n = r(h.div(_, {
        style: {
          top: "10px",
          left: "20px",
        },
      }));

      expect(n.style.length).toBe(2);
      expect(n.style.getPropertyValue("top")).toBe("10px");
      expect(n.style.getPropertyValue("left")).toBe("20px");
    });
  });

  test(`{ top: "1px", left: "1px" } => { top: "10px", left: "20px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, {
        style: {
          top: "1px",
          left: "1px",
        }
      }));
      const n = r(h.div(_, {
        style: {
          top: "10px",
          left: "20px",
        },
      }));

      expect(n.style.length).toBe(2);
      expect(n.style.getPropertyValue("top")).toBe("10px");
      expect(n.style.getPropertyValue("left")).toBe("20px");
    });
  });

  test(`{ top: "1px", left: "1px" } => { top: "10px", left: "20px", right: "30px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, {
        style: {
          top: "1px",
          left: "1px",
        },
      }));
      const n = r(h.div(_, {
        style: {
          top: "10px",
          left: "20px",
          right: "30px",
        },
      }));

      expect(n.style.length).toBe(3);
      expect(n.style.getPropertyValue("top")).toBe("10px");
      expect(n.style.getPropertyValue("left")).toBe("20px");
      expect(n.style.getPropertyValue("right")).toBe("30px");
    });
  });

  test(`{ top: "1px", left: "1px" } => { top: "10px", right: "30px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, {
        style: {
          top: "1px",
          left: "1px",
        },
      }));
      const n = r(h.div(_, {
        style: {
          top: "10px",
          right: "30px",
        },
      }));

      expect(n.style.length).toBe(3);
      expect(n.style.getPropertyValue("top")).toBe("10px");
      expect(n.style.getPropertyValue("right")).toBe("30px");
      expect(n.style.getPropertyValue("left")).toBe("1px");
    });
  });

  test(`{ top: "1px", left: "1px" } => { right: "30px" }`, () => {
    startRender<HTMLElement>(r => {
      r(h.div(_, {
        style: {
          top: "1px",
          left: "1px",
        },
      }));
      const n = r(h.div(_, {
        style: {
          right: "30px",
        },
      }));

      expect(n.style.length).toBe(3);
      expect(n.style.getPropertyValue("right")).toBe("30px");
      expect(n.style.getPropertyValue("top")).toBe("1px");
      expect(n.style.getPropertyValue("left")).toBe("1px");
    });
  });
});
