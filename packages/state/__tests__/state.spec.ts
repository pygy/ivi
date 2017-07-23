import { expect } from "iko";
import { mut } from "../src/mutable";
import { createStore } from "../src/store";

describe("state", function () {
  describe("mutable data", function () {
    it("init", function () {
      const m = { a: 1 };
      const a = mut(m);
      expect(a.ref).toBeEqual(m);
    });

    it("mutate", function () {
      const m = { a: 1 };
      const a = mut(m);
      const b = mut(a.ref);
      expect(b.ref).toBeEqual(m);
      expect(a).notToBeEqual(b);
    });
  });

  describe("store", function () {
    it("init", function () {
      const store = createStore(
        { a: 1 },
        function (state: any) { return state; },
        function () { return; },
      );
      expect(store.getState().a).toBeEqual(1);
    });

    it("should not trigger onUpdate when state isn't changed", function () {
      let updated = false;
      const store = createStore(
        { a: 1 },
        function (state: any) { return state; },
        function () { updated = true; },
      );
      store.dispatch(0);
      expect(updated).toBeEqual(false);
    });

    it("should trigger onUpdate when state is changed", function () {
      let updated = false;
      const store = createStore(
        { a: 1 },
        function (state: any) { return Object.assign({}, state); },
        function () { updated = true; },
      );
      store.dispatch(0);
      expect(updated).toBeEqual(true);
    });

    it("should update state after dispatch", function () {
      const store = createStore(
        { a: 1, b: 2 },
        function (state: any) { return Object.assign({}, state, { b: 3 }); },
        function () { return; },
      );
      store.dispatch(0);
      expect(store.getState().a).toBeEqual(1);
      expect(store.getState().b).toBeEqual(3);
    });

    it("should pass action to reducer", function () {
      const store = createStore(
        { a: 0 },
        function (state: any, action: any) { return Object.assign({}, state, { a: action }); },
        function () { return; },
      );
      store.dispatch(1);
      expect(store.getState().a).toBeEqual(1);
    });
  });
});
