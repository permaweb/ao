import { configureStore, applyMiddleware } from "@reduxjs/toolkit";
import { connectRoutes } from "redux-first-router";
import page, { routesMap } from "./router";

const { reducer, middleware, enhancer } = connectRoutes(routesMap, {
  basename: "#",
});

export const store = configureStore({
  reducer: {
    location: reducer,
    page,
  },
  // Additional middleware can be passed to this array
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      // This is required to use thunks in ./routes/pages.ts
      serializableCheck: { ignoredPaths: ["location"] },
    }).concat(middleware),
  devTools: import.meta.env["ENVIRONMENT"] !== "prod",
  // Optional Redux store enhancers
  enhancers: (defaultEnhancers) => [
    ...defaultEnhancers,
    enhancer,
    // You need this to dispatch "thunk" actions when someone comes with a link
    // For example: If you give someone a link to an assertion permafacts.io/<address>/<assertiontx>
    // The UI isn't aware of that assertion, so it needs to take the id and fetch the assertion before
    // loading the route
    // See: `routesMap` in this file for an example of how these thunks are used.
    applyMiddleware(middleware),
  ],
});
